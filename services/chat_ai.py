from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from datetime import date, datetime, timedelta
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, ToolMessage
from langchain_core.tools import tool
from core.config import settings
from db.models.tracking import WaterLog, StepLog
from db.models.workout import Workout, WorkoutLog
from db.models.food import FoodItem, FoodLog
from services.nutrition import scale_nutrients, UnitConversionError, available_units


def run_chat_agent(
    db: Session,
    user: Any,
    messages: List[Dict[str, str]],
    image_bytes: Optional[bytes] = None,
    image_mime: str = "image/jpeg",
) -> str:
    """
    SmartSprout Chat Agent with multi-round tool calling (ReAct-style loop).
    Optional image_bytes enables meal photo identification in the same turn.
    """
    llm = ChatGoogleGenerativeAI(
        model=settings.GEMINI_CHAT_MODEL,
        temperature=0.4,
        google_api_key=settings.GEMINI_API_KEY
    )

    @tool
    def log_water(amount_ml: int) -> str:
        """Log water intake in milliliters (ml) for today. E.g. log_water(amount_ml=250)"""
        try:
            log = db.query(WaterLog).filter(WaterLog.user_id == user.id, WaterLog.date == date.today()).first()
            if not log:
                log = WaterLog(user_id=user.id, date=date.today(), amount=0)
                db.add(log)
            log.amount += amount_ml
            db.commit()
            return f"Successfully logged {amount_ml}ml of water. Total for today: {log.amount}ml."
        except Exception as e:
            db.rollback()
            return f"Error logging water: {str(e)}"

    @tool
    def log_steps(steps: int) -> str:
        """Log step count for today. E.g. log_steps(steps=5000)"""
        try:
            log = db.query(StepLog).filter(StepLog.user_id == user.id, StepLog.date == date.today()).first()
            if not log:
                log = StepLog(user_id=user.id, date=date.today(), steps=0)
                db.add(log)
            log.steps += steps
            db.commit()
            return f"Successfully added {steps} steps. Total steps today: {log.steps}."
        except Exception as e:
            db.rollback()
            return f"Error logging steps: {str(e)}"

    @tool
    def search_foods(query: str, category: str = None) -> str:
        """
        Search the food/drink catalog by name. Optionally filter category:
        food, drink, snack, condiment, supplement, other.
        Always search before creating or logging unknown items.
        """
        q = db.query(FoodItem).filter(
            FoodItem.name.ilike(f"%{query}%")
        ).filter(
            (FoodItem.user_id == user.id) | (FoodItem.user_id.is_(None))
        )
        if category:
            q = q.filter(FoodItem.category == category)
        foods = q.limit(10).all()
        if not foods:
            return f"No foods matching '{query}'. Use create_food_item to add a custom food/drink."
        lines = []
        for f in foods:
            units = available_units(f)
            lines.append(
                f"id={f.id} name={f.name} cat={getattr(f, 'category', 'food')} "
                f"is_drink={bool(getattr(f, 'is_drink', False))} "
                f"cal={float(f.calories or 0)}/{f.reference_amount}{f.reference_unit} "
                f"units={units}"
            )
        return "Matches:\n" + "\n".join(lines)

    @tool
    def create_food_item(
        name: str,
        calories: float,
        protein: float = 0,
        carbs: float = 0,
        fats: float = 0,
        reference_amount: float = 100,
        reference_unit: str = "g",
        category: str = "food",
        is_drink: bool = False,
        serving_label: str = None,
    ) -> str:
        """
        Create a custom food or drink in the user's catalog when it does not exist.
        Use for any food type: meals, snacks, beverages, sauces, supplements, etc.
        For drinks prefer reference_unit='ml'. Returns the new food_id.
        """
        try:
            if is_drink or category == "drink":
                is_drink = True
                category = "drink"
                if reference_unit == "g":
                    reference_unit = "ml"
            food = FoodItem(
                name=name.strip(),
                calories=calories,
                protein=protein,
                carbs=carbs,
                fats=fats,
                vitamins={},
                reference_amount=reference_amount,
                reference_unit=reference_unit,
                unit_conversions={},
                category=category or "food",
                is_drink=is_drink,
                source="user",
                user_id=user.id,
                serving_label=serving_label,
            )
            db.add(food)
            db.commit()
            db.refresh(food)
            return f"Created food_id={food.id} name={food.name} ({food.calories} kcal per {food.reference_amount}{food.reference_unit})"
        except Exception as e:
            db.rollback()
            return f"Error creating food: {str(e)}"

    @tool
    def log_food(food_name: str = None, quantity: float = 1, unit: str = "g", food_id: int = None, meal_name: str = None) -> str:
        """
        Log food or drink intake for today.
        Prefer food_id from search_foods/create_food_item. Otherwise food_name is matched.
        Examples: log_food(food_id=3, quantity=200, unit='ml'); log_food(food_name='Banana', quantity=1, unit='piece')
        """
        try:
            food_item = None
            if food_id is not None:
                food_item = db.query(FoodItem).filter(FoodItem.id == food_id).first()
            if food_item is None and food_name:
                food_item = (
                    db.query(FoodItem)
                    .filter(FoodItem.name.ilike(f"%{food_name}%"))
                    .filter((FoodItem.user_id == user.id) | (FoodItem.user_id.is_(None)))
                    .first()
                )
            if not food_item:
                return (
                    f"Could not find food matching name={food_name!r} food_id={food_id}. "
                    "Call search_foods or create_food_item first."
                )

            try:
                nutrients = scale_nutrients(food_item, float(quantity), unit)
            except UnitConversionError as e:
                return str(e)

            food_log = FoodLog(
                user_id=user.id,
                food_id=food_item.id,
                quantity=quantity,
                unit=unit,
                meal_name=meal_name,
            )
            db.add(food_log)
            db.commit()
            db.refresh(food_log)

            return (
                f"Successfully logged {quantity} {unit} of {food_item.name} "
                f"(~{nutrients['calories']:.1f} kcal, P{nutrients['protein']:.1f} "
                f"C{nutrients['carbs']:.1f} F{nutrients['fats']:.1f})."
            )
        except Exception as e:
            db.rollback()
            return f"Error logging food: {str(e)}"

    @tool
    def log_foods_batch(items_json: str) -> str:
        """
        Log multiple foods/drinks at once as a meal.
        items_json is a JSON array of objects:
        [{"food_id": 1, "quantity": 100, "unit": "g"}, {"food_name": "Milk", "quantity": 200, "unit": "ml"}]
        Prefer food_id when known.
        """
        import json as _json
        try:
            items = _json.loads(items_json)
            if not isinstance(items, list) or not items:
                return "items_json must be a non-empty JSON array"
            results = []
            for it in items:
                fid = it.get("food_id")
                fname = it.get("food_name") or it.get("name")
                qty = float(it.get("quantity") or 1)
                unit = it.get("unit") or "g"
                meal = it.get("meal_name")
                food_item = None
                if fid:
                    food_item = db.query(FoodItem).filter(FoodItem.id == int(fid)).first()
                if food_item is None and fname:
                    food_item = (
                        db.query(FoodItem)
                        .filter(FoodItem.name.ilike(f"%{fname}%"))
                        .filter((FoodItem.user_id == user.id) | (FoodItem.user_id.is_(None)))
                        .first()
                    )
                if not food_item:
                    results.append(f"SKIP missing: {fname or fid}")
                    continue
                try:
                    nutrients = scale_nutrients(food_item, qty, unit)
                except UnitConversionError as e:
                    results.append(f"SKIP {food_item.name}: {e}")
                    continue
                db.add(FoodLog(
                    user_id=user.id,
                    food_id=food_item.id,
                    quantity=qty,
                    unit=unit,
                    meal_name=meal,
                ))
                results.append(f"OK {food_item.name} {qty}{unit} (~{nutrients['calories']:.0f} kcal)")
            db.commit()
            return "Batch log results:\n" + "\n".join(results)
        except Exception as e:
            db.rollback()
            return f"Error batch logging: {str(e)}"

    @tool
    def identify_food_image() -> str:
        """
        Identify foods and drinks in the photo the user just sent with this chat message.
        Call this when the user uploaded a meal photo. Then use log_foods_batch to log items after confirming.
        """
        if not image_bytes:
            return "No image attached to this message. Ask the user to send a meal photo."
        try:
            from services.food_vision import process_identification
            result = process_identification(db, user.id, image_bytes, image_mime)
            import json as _json
            return (
                f"Identified meal ({result.get('meal_suggestion') or 'unknown'}). "
                f"Notes: {result.get('notes') or 'none'}. "
                f"Totals ~{result.get('total_calories', 0):.0f} kcal. "
                f"Items JSON for logging: {_json.dumps(result.get('items') or [])}"
            )
        except Exception as e:
            return f"Vision identification failed: {e}"

    @tool
    def log_workout(workout_name: str, duration_minutes: int = None, sets: int = None, reps_per_set: int = None) -> str:
        """
        Log an exercise/workout for today. E.g. log_workout(workout_name='Push-ups', sets=3, reps_per_set=10)
        or log_workout(workout_name='Yoga (general)', duration_minutes=30)
        """
        try:
            workout = db.query(Workout).filter(Workout.name.ilike(f"%{workout_name}%")).first()
            if not workout:
                workouts = db.query(Workout).limit(5).all()
                names = ", ".join([w.name for w in workouts])
                return f"Could not find workout matching '{workout_name}'. Available: {names}."

            if workout.unit == "reps":
                if not sets or not reps_per_set:
                    return f"For '{workout.name}', sets and reps_per_set are required."
                total_reps = sets * reps_per_set
                estimated_calories = float(workout.calories_per_unit) * total_reps
                log = WorkoutLog(
                    user_id=user.id,
                    workout_id=workout.id,
                    sets=sets,
                    reps_per_set=reps_per_set,
                    total_reps=total_reps,
                    estimated_calories=estimated_calories
                )
            else:
                if not duration_minutes:
                    return f"For '{workout.name}', duration_minutes is required."
                estimated_calories = float(workout.calories_per_unit) * duration_minutes
                log = WorkoutLog(
                    user_id=user.id,
                    workout_id=workout.id,
                    duration_minutes=duration_minutes,
                    estimated_calories=estimated_calories
                )

            db.add(log)
            db.commit()
            return f"Successfully logged workout: {workout.name} (~{estimated_calories:.1f} kcal burned)."
        except Exception as e:
            db.rollback()
            return f"Error logging workout: {str(e)}"

    @tool
    def get_todays_progress() -> str:
        """Get the current user's water, steps, food calories, and workout logs for today."""
        try:
            water = db.query(WaterLog).filter(WaterLog.user_id == user.id, WaterLog.date == date.today()).first()
            steps = db.query(StepLog).filter(StepLog.user_id == user.id, StepLog.date == date.today()).first()

            water_amt = water.amount if water else 0
            step_cnt = steps.steps if steps else 0

            day_start = datetime.combine(date.today(), datetime.min.time())
            day_end = day_start + timedelta(days=1)
            food_logs = (
                db.query(FoodLog, FoodItem)
                .join(FoodItem)
                .filter(
                    FoodLog.user_id == user.id,
                    FoodLog.logged_at >= day_start,
                    FoodLog.logged_at < day_end,
                )
                .all()
            )

            cal_in = 0.0
            food_lines = []
            for log, food in food_logs:
                try:
                    n = scale_nutrients(food, float(log.quantity), log.unit)
                    cal_in += n["calories"]
                    food_lines.append(f"  - {food.name}: {log.quantity}{log.unit} (~{n['calories']:.0f} kcal)")
                except UnitConversionError:
                    continue

            workout_logs = (
                db.query(WorkoutLog)
                .filter(
                    WorkoutLog.user_id == user.id,
                    WorkoutLog.logged_at >= day_start,
                    WorkoutLog.logged_at < day_end,
                )
                .all()
            )
            cal_out = sum(float(w.estimated_calories or 0) for w in workout_logs)

            foods_txt = "\n".join(food_lines) if food_lines else "  (none)"
            return (
                f"Today's stats:\n"
                f"- Water: {water_amt} ml\n"
                f"- Steps: {step_cnt} steps\n"
                f"- Calories Consumed: {cal_in:.1f} kcal\n"
                f"- Calories Burned (Active): {cal_out:.1f} kcal\n"
                f"- Foods logged:\n{foods_txt}"
            )
        except Exception as e:
            return f"Error getting summary: {str(e)}"

    tools = [
        log_water,
        log_steps,
        search_foods,
        create_food_item,
        log_food,
        log_foods_batch,
        identify_food_image,
        log_workout,
        get_todays_progress,
    ]
    tool_map = {t.name: t for t in tools}
    llm_with_tools = llm.bind_tools(tools)

    image_hint = (
        " The user attached a meal photo to their latest message — call identify_food_image first, "
        "then offer to log items with log_foods_batch."
        if image_bytes else ""
    )

    formatted_messages = [
        SystemMessage(content=(
            f"You are the SmartSprout Wellness Coach, an advanced Agentic AI assistant. "
            f"You help the user stay healthy, track activities, and give custom coaching. "
            f"User Profile: Name={user.name}, Age={user.age}, BMI={user.bmi}, "
            f"Goals={user.goals}, Diet={user.dietary_prefs}, Allergies={getattr(user, 'allergies', None)}.\n"
            f"You have tools that write to the user's account in real-time. "
            f"When the user asks to log something, use tools immediately (multi-step is fine: "
            f"search → create if missing → log → get_todays_progress). "
            f"Support ANY food or drink type via create_food_item. "
            f"Never invent food_ids — always search or create first.{image_hint}"
        ))
    ]

    for i, msg in enumerate(messages):
        is_last_user = i == len(messages) - 1 and msg.get("role") == "user"
        if msg["role"] == "user":
            if is_last_user and image_bytes:
                import base64
                b64 = base64.b64encode(image_bytes).decode("utf-8")
                formatted_messages.append(HumanMessage(content=[
                    {"type": "text", "text": msg["content"] or "Please identify the foods in this photo."},
                    {"type": "image_url", "image_url": f"data:{image_mime};base64,{b64}"},
                ]))
            else:
                formatted_messages.append(HumanMessage(content=msg["content"]))
        else:
            formatted_messages.append(AIMessage(content=msg["content"]))

    # Multi-round agent loop
    max_rounds = settings.MAX_CHAT_TOOL_ROUNDS
    res = llm_with_tools.invoke(formatted_messages)

    for _ in range(max_rounds):
        if not getattr(res, "tool_calls", None):
            break
        formatted_messages.append(res)
        for tool_call in res.tool_calls:
            tool_name = tool_call["name"]
            tool_args = tool_call["args"]
            tool_fn = tool_map.get(tool_name)
            if tool_fn:
                tool_output = tool_fn.invoke(tool_args)
            else:
                tool_output = f"Unknown tool: {tool_name}"
            formatted_messages.append(ToolMessage(
                content=str(tool_output),
                tool_call_id=tool_call["id"]
            ))
        res = llm_with_tools.invoke(formatted_messages)

    content = res.content
    if isinstance(content, list):
        content = " ".join(
            part.get("text", "") if isinstance(part, dict) else str(part)
            for part in content
        )
    return content or "Done."
