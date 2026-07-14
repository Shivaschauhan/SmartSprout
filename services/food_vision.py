"""Gemini multimodal food identification from meal photos."""
from __future__ import annotations

import base64
import io
import json
import re
from typing import Any, Dict, List, Optional, Tuple

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage
from sqlalchemy.orm import Session

from core.config import settings
from db.models.food import FoodItem
from services.nutrition import scale_nutrients


def _extract_json(text: Any) -> dict:
    import ast
    if isinstance(text, list):
        text = "".join(
            part.get("text", "") if isinstance(part, dict) else str(part)
            for part in text
        )
    elif isinstance(text, dict):
        text = text.get("text", "")

    if not isinstance(text, str):
        text = str(text)

    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        raise ValueError("No JSON object found in vision model response")
    raw_json = match.group(0)
    try:
        return json.loads(raw_json)
    except Exception:
        try:
            return ast.literal_eval(raw_json)
        except Exception:
            raise ValueError("No valid JSON found in vision model response: " + text)


def _compress_image(image_bytes: bytes, max_side: int = 1280, quality: int = 85) -> Tuple[bytes, str]:
    """Resize/compress image with Pillow when available; otherwise pass through."""
    try:
        from PIL import Image
    except ImportError:
        return image_bytes, "image/jpeg"

    img = Image.open(io.BytesIO(image_bytes))
    if img.mode in ("RGBA", "P"):
        img = img.convert("RGB")
    w, h = img.size
    scale = min(1.0, max_side / max(w, h))
    if scale < 1.0:
        img = img.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=quality, optimize=True)
    return buf.getvalue(), "image/jpeg"


def identify_foods_from_image(image_bytes: bytes, mime_type: str = "image/jpeg") -> dict:
    """
    Call Gemini vision and return structured identification payload:
    { items: [...], meal_suggestion, notes }
    """
    if len(image_bytes) > settings.MAX_IMAGE_BYTES:
        raise ValueError(f"Image too large (max {settings.MAX_IMAGE_BYTES // (1024*1024)}MB)")

    compressed, mime_type = _compress_image(image_bytes)
    b64 = base64.b64encode(compressed).decode("utf-8")

    llm = ChatGoogleGenerativeAI(
        model=settings.GEMINI_VISION_MODEL,
        temperature=0.2,
        google_api_key=settings.GEMINI_API_KEY,
    )

    prompt = (
        "You are a nutrition vision expert. Identify every distinct food and drink visible in this photo. "
        "Estimate portion sizes carefully. Include beverages if present.\n\n"
        "Return ONLY a JSON object with this shape:\n"
        "{\n"
        '  "items": [\n'
        "    {\n"
        '      "name": "Food name",\n'
        '      "estimated_quantity": 150,\n'
        '      "unit": "g",\n'
        '      "category": "food|drink|snack|condiment|supplement|other",\n'
        '      "is_drink": false,\n'
        '      "confidence": 0.85,\n'
        '      "estimated_calories": 250,\n'
        '      "estimated_protein": 20,\n'
        '      "estimated_carbs": 30,\n'
        '      "estimated_fats": 8,\n'
        '      "reference_amount": 100,\n'
        '      "reference_unit": "g"\n'
        "    }\n"
        "  ],\n"
        '  "meal_suggestion": "Breakfast|Lunch|Dinner|Snack",\n'
        '  "notes": "optional short note"\n'
        "}\n"
        "Use ml for liquids when appropriate. Use g or piece for solids. "
        "estimated_* macros should match the estimated_quantity portion, not per 100g only.\n\n"
        "IMPORTANT: Your output must be valid, parseable JSON. "
        "Use double quotes for all keys and string values. Do not use single quotes or trailing commas."
    )

    message = HumanMessage(
        content=[
            {"type": "text", "text": prompt},
            {
                "type": "image_url",
                "image_url": f"data:{mime_type};base64,{b64}",
            },
        ]
    )

    res = llm.invoke([message])
    return _extract_json(res.content)


def _normalize_name(name: str) -> str:
    return re.sub(r"\s+", " ", (name or "").strip().lower())


def match_or_create_food(
    db: Session,
    user_id: int,
    item: dict,
) -> Tuple[FoodItem, bool]:
    """
    Match catalog food by name (user custom first, then system).
    Create AI-vision item if missing.
    Returns (FoodItem, created: bool).
    """
    name = (item.get("name") or "Unknown food").strip()
    norm = _normalize_name(name)

    # Prefer exact-ish match for this user or system catalog
    candidates = (
        db.query(FoodItem)
        .filter(FoodItem.name.ilike(f"%{name}%"))
        .filter((FoodItem.user_id == user_id) | (FoodItem.user_id.is_(None)))
        .limit(20)
        .all()
    )
    best = None
    for c in candidates:
        cn = _normalize_name(c.name)
        if cn == norm or norm in cn or cn in norm:
            best = c
            break
    if best is None and candidates:
        best = candidates[0]

    if best is not None:
        return best, False

    is_drink = bool(item.get("is_drink", False))
    category = item.get("category") or ("drink" if is_drink else "food")
    ref_unit = item.get("reference_unit") or item.get("unit") or ("ml" if is_drink else "g")
    ref_amount = float(item.get("reference_amount") or (100 if ref_unit in ("g", "ml") else 1))
    qty = float(item.get("estimated_quantity") or ref_amount)
    unit = item.get("unit") or ref_unit

    # Vision estimates macros for the portion; store per-reference by scaling down
    est_cal = float(item.get("estimated_calories") or 0)
    est_pro = float(item.get("estimated_protein") or 0)
    est_carb = float(item.get("estimated_carbs") or 0)
    est_fat = float(item.get("estimated_fats") or 0)

    if unit == ref_unit and qty > 0:
        scale_to_ref = ref_amount / qty
    else:
        scale_to_ref = 1.0

    food = FoodItem(
        name=name,
        calories=round(est_cal * scale_to_ref, 2),
        protein=round(est_pro * scale_to_ref, 2),
        carbs=round(est_carb * scale_to_ref, 2),
        fats=round(est_fat * scale_to_ref, 2),
        vitamins={},
        reference_amount=ref_amount,
        reference_unit=ref_unit,
        unit_conversions={},
        category=category,
        is_drink=is_drink,
        source="ai_vision",
        user_id=user_id,
        description=item.get("notes") or "Created from meal photo scan",
        serving_label=f"{qty} {unit}" if qty else None,
    )
    db.add(food)
    db.commit()
    db.refresh(food)
    return food, True


def process_identification(
    db: Session,
    user_id: int,
    image_bytes: bytes,
    mime_type: str = "image/jpeg",
) -> dict:
    """Identify foods, match/create catalog entries, return API-ready payload."""
    raw = identify_foods_from_image(image_bytes, mime_type)
    items_out: List[Dict[str, Any]] = []
    totals = {"calories": 0.0, "protein": 0.0, "carbs": 0.0, "fats": 0.0}

    for raw_item in raw.get("items") or []:
        food, created = match_or_create_food(db, user_id, raw_item)
        qty = float(raw_item.get("estimated_quantity") or food.reference_amount or 1)
        unit = raw_item.get("unit") or food.reference_unit
        try:
            nutrients = scale_nutrients(food, qty, unit)
        except Exception:
            # Fall back to model estimates for the portion
            nutrients = {
                "calories": float(raw_item.get("estimated_calories") or 0),
                "protein": float(raw_item.get("estimated_protein") or 0),
                "carbs": float(raw_item.get("estimated_carbs") or 0),
                "fats": float(raw_item.get("estimated_fats") or 0),
            }

        for k in totals:
            totals[k] += nutrients.get(k, 0)

        items_out.append({
            "name": food.name,
            "food_id": food.id,
            "estimated_quantity": qty,
            "unit": unit,
            "category": getattr(food, "category", None) or "food",
            "is_drink": bool(getattr(food, "is_drink", False)),
            "confidence": float(raw_item.get("confidence") or 0.5),
            "calories": nutrients.get("calories", 0),
            "protein": nutrients.get("protein", 0),
            "carbs": nutrients.get("carbs", 0),
            "fats": nutrients.get("fats", 0),
            "created": created,
        })

    return {
        "items": items_out,
        "meal_suggestion": raw.get("meal_suggestion"),
        "notes": raw.get("notes"),
        "total_calories": totals["calories"],
        "total_protein": totals["protein"],
        "total_carbs": totals["carbs"],
        "total_fats": totals["fats"],
    }


def estimate_food_macros(name: str, category: Optional[str] = None, is_drink: Optional[bool] = None) -> dict:
    """LLM estimate macros for a free-text food/drink name (no image)."""
    llm = ChatGoogleGenerativeAI(
        model=settings.GEMINI_CHAT_MODEL,
        temperature=0.2,
        google_api_key=settings.GEMINI_API_KEY,
    )
    hint = ""
    if category:
        hint += f" category={category}"
    if is_drink is not None:
        hint += f" is_drink={is_drink}"

    prompt = (
        f"Estimate typical nutrition for: '{name}'.{hint}\n"
        "Return ONLY JSON:\n"
        "{\n"
        '  "name": "...",\n'
        '  "calories": 0,\n'
        '  "protein": 0,\n'
        '  "carbs": 0,\n'
        '  "fats": 0,\n'
        '  "reference_amount": 100,\n'
        '  "reference_unit": "g",\n'
        '  "unit_conversions": {},\n'
        '  "category": "food",\n'
        '  "is_drink": false,\n'
        '  "serving_label": "100 g",\n'
        '  "description": "brief"\n'
        "}\n"
        "Use ml for drinks. Be realistic.\n\n"
        "IMPORTANT: Your output must be valid, parseable JSON. "
        "Use double quotes for all keys and string values. Do not use single quotes or trailing commas."
    )
    res = llm.invoke(prompt)
    return _extract_json(res.content)
