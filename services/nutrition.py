"""Shared nutrition scaling helpers used by logs, dashboard, and AI agents."""
from __future__ import annotations

from typing import Any, Dict, Optional, Tuple


class UnitConversionError(ValueError):
    """Raised when a unit cannot be converted for a food item."""


def get_scale_factor(food: Any, quantity: float, unit: str) -> float:
    """
    Return the multiplier to scale macros from the food's reference portion
    to the logged quantity/unit.
    """
    qty = float(quantity)
    ref_amount = float(food.reference_amount or 0)
    if ref_amount <= 0:
        raise UnitConversionError(f"Food '{getattr(food, 'name', '?')}' has invalid reference_amount")

    ref_unit = (food.reference_unit or "").strip()
    unit = (unit or "").strip()

    if unit == ref_unit:
        return qty / ref_amount

    conversions = food.unit_conversions or {}
    if unit not in conversions:
        available = [ref_unit] + list(conversions.keys())
        raise UnitConversionError(
            f"Invalid unit '{unit}' for food '{getattr(food, 'name', '?')}'. "
            f"Available units: {available}"
        )

    converted_qty = qty * float(conversions[unit])
    return converted_qty / ref_amount


def scale_nutrients(food: Any, quantity: float, unit: str) -> Dict[str, Any]:
    """Scale calories/macros/vitamins for a logged portion."""
    scale = get_scale_factor(food, quantity, unit)
    vitamins_raw = food.vitamins or {}
    vitamins = {
        k: float(v) * scale for k, v in vitamins_raw.items()
    } if isinstance(vitamins_raw, dict) else {}

    return {
        "scale_factor": scale,
        "calories": float(food.calories or 0) * scale,
        "protein": float(food.protein or 0) * scale,
        "carbs": float(food.carbs or 0) * scale,
        "fats": float(food.fats or 0) * scale,
        "vitamins": vitamins,
    }


def available_units(food: Any) -> list:
    """Return list of units valid for a food item."""
    units = [food.reference_unit]
    conversions = food.unit_conversions or {}
    for u in conversions.keys():
        if u not in units:
            units.append(u)
    return units


def sum_scaled_logs(log_food_pairs) -> Dict[str, float]:
    """
    Sum nutrients for a sequence of (FoodLog, FoodItem) pairs.
    Silently skips invalid unit conversions (treats scale as 0).
    """
    totals = {"calories": 0.0, "protein": 0.0, "carbs": 0.0, "fats": 0.0}
    for log, food in log_food_pairs:
        try:
            n = scale_nutrients(food, float(log.quantity), log.unit)
            totals["calories"] += n["calories"]
            totals["protein"] += n["protein"]
            totals["carbs"] += n["carbs"]
            totals["fats"] += n["fats"]
        except UnitConversionError:
            continue
    return totals


def food_to_dict(food: Any) -> Dict[str, Any]:
    """Serialize a FoodItem for AI prompts / API responses."""
    return {
        "id": food.id,
        "name": food.name,
        "calories": float(food.calories or 0),
        "protein": float(food.protein or 0),
        "carbs": float(food.carbs or 0),
        "fats": float(food.fats or 0),
        "reference_amount": float(food.reference_amount or 0),
        "reference_unit": food.reference_unit,
        "unit_conversions": food.unit_conversions or {},
        "category": getattr(food, "category", None) or "food",
        "is_drink": bool(getattr(food, "is_drink", False)),
        "source": getattr(food, "source", None) or "system",
        "brand": getattr(food, "brand", None),
        "description": getattr(food, "description", None),
        "serving_label": getattr(food, "serving_label", None),
        "user_id": getattr(food, "user_id", None),
    }


def filter_foods_for_plan(foods: list, dietary_prefs: Any, max_items: int = 40) -> list:
    """
    Bound the food list sent into plan-generation prompts.
    Prefer system staples; include variety of categories.
    """
    prefs = dietary_prefs
    if isinstance(prefs, list):
        prefs_str = " ".join(str(p).lower() for p in prefs)
    else:
        prefs_str = str(prefs or "").lower()

    vegan_block = {"chicken", "egg", "fish", "mutton", "beef", "pork", "paneer", "milk", "ghee", "curd", "yogurt", "lassi", "butter", "cheese"}
    veg_block = {"chicken", "egg", "fish", "mutton", "beef", "pork", "seafood", "prawn"}

    def allowed(name: str) -> bool:
        n = name.lower()
        if "vegan" in prefs_str:
            return not any(b in n for b in vegan_block)
        if "veg" in prefs_str and "non" not in prefs_str:
            return not any(b in n for b in veg_block)
        return True

    filtered = [f for f in foods if allowed(f.name)]
    if not filtered:
        filtered = list(foods)

    # Prefer a balanced mix of categories
    by_cat: Dict[str, list] = {}
    for f in filtered:
        cat = getattr(f, "category", None) or "food"
        by_cat.setdefault(cat, []).append(f)

    selected = []
    cats = list(by_cat.keys()) or ["food"]
    idx = 0
    while len(selected) < max_items and any(by_cat.values()):
        cat = cats[idx % len(cats)]
        if by_cat.get(cat):
            selected.append(by_cat[cat].pop(0))
        idx += 1
        if idx > max_items * 4:
            break

    return selected
