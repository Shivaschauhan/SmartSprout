import json
import re
from typing import List, Dict, TypedDict
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langgraph.graph import StateGraph, END
from core.config import settings
from schemas.health_plan import CompleteHealthPlanSchema
from utils import get_day_name
from services.nutrition import filter_foods_for_plan, food_to_dict


class GraphState(TypedDict):
    user_profile: dict
    food_items: List[Dict]
    day_name: str
    context: str
    custom_instructions: str
    meal_draft: str
    workout_draft: str
    critic_feedback: str
    iterations: int
    final_plan: dict


def extract_json(text) -> dict | list:
    import ast
    import json
    if isinstance(text, (dict, list)) and not isinstance(text, str):
        if isinstance(text, list):
            try:
                text = "".join(part["text"] if isinstance(part, dict) and "text" in part else str(part) for part in text)
            except Exception:
                text = str(text)
        else:
            return text
            
    if not isinstance(text, str):
        text = str(text)
        
    match = re.search(r"(\{.*\}|\[.*\])", text, re.DOTALL)
    if not match:
        raise ValueError("No JSON object or array found in AI response")
    raw_json = match.group(0)
    try:
        return json.loads(raw_json)
    except Exception:
        try:
            return ast.literal_eval(raw_json)
        except Exception:
            raise ValueError("No valid JSON found in AI response: " + text)


def get_llm():
    if not settings.GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is missing from environment. Please add it to your .env file.")
    return ChatGoogleGenerativeAI(
        model=settings.GEMINI_CHAT_MODEL,
        temperature=0.7,
        google_api_key=settings.GEMINI_API_KEY
    )


async def retrieve_context_node(state: GraphState):
    """Retrieve nutritional guidelines via FAISS RAG when available."""
    context = "Follow general healthy guidelines."
    try:
        from services.rag_service import get_rag_retriever
        retriever = get_rag_retriever()
        profile = state["user_profile"]
        query = (
            f"Nutritional guidelines for {profile.get('dietary_prefs')} diet "
            f"and {profile.get('goals')} goal. Allergies: {profile.get('allergies')}"
        )
        docs = retriever.invoke(query) if hasattr(retriever, "invoke") else retriever.get_relevant_documents(query)
        if docs:
            context = "\n\n".join(d.page_content for d in docs)
    except Exception:
        import os
        kb_path = os.path.join(
            os.path.dirname(os.path.dirname(__file__)),
            "knowledge_base",
            "general_guidelines.txt",
        )
        try:
            with open(kb_path, "r", encoding="utf-8") as f:
                context = f.read()
        except Exception:
            pass
    return {"context": context}


async def meal_planner_node(state: GraphState):
    prompt = ChatPromptTemplate.from_messages([
        ("system",
         "You are a Meal Planner AI. Generate a meal plan for {day_name} based on the profile, "
         "constraints, and guidelines context. Include drinks (water is tracked separately — prefer "
         "nutritious beverages like milk/lassi/tea if appropriate).\n"
         "Context: {context}\n"
         "Profile: Diet={diet}, Goal={goal}, Allergies={allergies}, Budget={budget}\n"
         "Custom User Instructions (adhere to these strictly!): {custom_instructions}\n"
         "Available Foods (use ONLY these food_id values): {food_list}\n"
         "Feedback from Critic: {critic_feedback}\n\n"
         "Output ONLY a JSON array of meals:\n"
         '[{{"meal": "Breakfast", "items": [{{"food_id": 1, "quantity": 100, "unit": "g"}}]}}]'),
        ("human", "Generate the meal plan."),
    ])
    llm = get_llm()
    chain = prompt | llm
    res = await chain.ainvoke({
        "day_name": state["day_name"],
        "context": state["context"],
        "diet": state["user_profile"]["dietary_prefs"],
        "goal": state["user_profile"]["goals"],
        "allergies": state["user_profile"].get("allergies", "None"),
        "budget": state["user_profile"].get("budget", "Standard"),
        "custom_instructions": state.get("custom_instructions", ""),
        "food_list": json.dumps(state["food_items"], indent=2),
        "critic_feedback": state.get("critic_feedback", "None")
    })
    return {"meal_draft": res.content}


async def workout_planner_node(state: GraphState):
    prompt = ChatPromptTemplate.from_messages([
        ("system",
         "You are a Workout Planner AI. Generate a workout plan for {day_name} based on the profile. "
         "Vary the focus area (e.g., Upper Body, Lower Body, Core, Cardio, Active Recovery) depending "
         "on the day of the week so that the user gets a balanced weekly routine.\n"
         "Profile: Goal={goal}, BMI={bmi}\n"
         "Custom User Instructions (adhere to these strictly!): {custom_instructions}\n"
         "Feedback from Critic: {critic_feedback}\n\n"
         "Output ONLY a JSON object:\n"
         '{{"focus_area": "Cardio", "exercises": [{{"name": "Running", "sets": 1, "reps": "30 mins"}}]}}'),
        ("human", "Generate the workout plan."),
    ])
    llm = get_llm()
    chain = prompt | llm
    res = await chain.ainvoke({
        "day_name": state["day_name"],
        "goal": state["user_profile"]["goals"],
        "bmi": state["user_profile"]["bmi"],
        "custom_instructions": state.get("custom_instructions", ""),
        "critic_feedback": state.get("critic_feedback", "None")
    })
    return {"workout_draft": res.content}


async def critic_node(state: GraphState):
    prompt = ChatPromptTemplate.from_messages([
        ("system",
         "You are a Safety Critic. Review the drafted meal and workout plans against the user's "
         "allergies, budget, goals, and custom instructions.\n"
         "Profile: Diet={diet}, Goal={goal}, Allergies={allergies}, Budget={budget}\n"
         "Custom User Instructions: {custom_instructions}\n"
         "Available Foods (Cross-reference food_ids here): {food_list}\n\n"
         "Draft Meal Plan: {meal_draft}\n"
         "Draft Workout Plan: {workout_draft}\n\n"
         "If there are any violations (e.g. allergens included, budget ignored, invalid food_ids, or custom instructions ignored), "
         "output feedback starting with 'REJECTED: ' followed by the reasons.\n"
         "If it is safe and adheres to all constraints, output 'APPROVED'. You must be strict."),
        ("human", "Review the drafts."),
    ])
    llm = get_llm()
    chain = prompt | llm
    res = await chain.ainvoke({
        "diet": state["user_profile"]["dietary_prefs"],
        "goal": state["user_profile"]["goals"],
        "allergies": state["user_profile"].get("allergies", "None"),
        "budget": state["user_profile"].get("budget", "Standard"),
        "custom_instructions": state.get("custom_instructions", ""),
        "food_list": json.dumps(state["food_items"], indent=2),
        "meal_draft": state["meal_draft"],
        "workout_draft": state["workout_draft"]
    })

    iters = state.get("iterations", 0) + 1
    return {"critic_feedback": res.content, "iterations": iters}


async def compiler_node(state: GraphState):
    try:
        meal_plan = extract_json(state["meal_draft"])
        workout_plan = extract_json(state["workout_draft"])
    except Exception as e:
        raise ValueError(f"Failed to parse drafts: {e}")

    user_profile = state["user_profile"]
    allergies = user_profile.get("allergies", "")
    avoidance_list = []
    if allergies and str(allergies).lower() != "none":
        avoidance_list.append(f"Avoid foods containing {allergies}.")

    bmi = user_profile.get("bmi")
    if bmi and float(bmi) > 30:
        avoidance_list.append("Avoid high-impact exercises that strain joints.")

    budget = user_profile.get("budget", "Standard")
    budget_tips = [
        f"Choose locally sourced/seasonal ingredients to fit your {budget} budget.",
        "Prep meals in bulk to reduce costs."
    ]

    final_plan = {
        "day": state["day_name"],
        "meal_plan": meal_plan,
        "workout_plan": workout_plan,
        "avoidance_list": avoidance_list,
        "budget_tips": budget_tips
    }
    return {"final_plan": final_plan}


def route_critic(state: GraphState):
    feedback = state["critic_feedback"]
    if isinstance(feedback, list):
        feedback = str(feedback)
    print(f"--- CRITIC FEEDBACK (Iteration {state['iterations']}) ---")
    print(feedback)
    if "APPROVED" in str(feedback).upper() or state["iterations"] >= 3:
        return "compiler"
    # Re-run both planners with critic feedback
    return "revise"


async def unified_planner_node(state: GraphState):
    """Run meal and workout planners concurrently, avoiding LangGraph diamond double-execution."""
    import asyncio
    meal, workout = await asyncio.gather(
        meal_planner_node(state),
        workout_planner_node(state)
    )
    return {**meal, **workout}


workflow = StateGraph(GraphState)
workflow.add_node("retrieve", retrieve_context_node)
workflow.add_node("unified_planner", unified_planner_node)
workflow.add_node("critic", critic_node)
workflow.add_node("compiler", compiler_node)

workflow.set_entry_point("retrieve")
workflow.add_edge("retrieve", "unified_planner")
workflow.add_edge("unified_planner", "critic")

workflow.add_conditional_edges(
    "critic",
    route_critic,
    {
        "compiler": "compiler",
        "revise": "unified_planner",
    }
)
workflow.add_edge("compiler", END)

health_plan_app = workflow.compile()


async def generate_complete_health_plan(user_profile: dict, food_items: List[Dict], day: int = 1, custom_instructions: str | None = None) -> CompleteHealthPlanSchema:
    # food_items may be full ORM list or dicts — normalize and bound
    if food_items and not isinstance(food_items[0], dict):
        bounded = filter_foods_for_plan(food_items, user_profile.get("dietary_prefs"), settings.MAX_PLAN_FOOD_ITEMS)
        food_dicts = [food_to_dict(f) for f in bounded]
    else:
        food_dicts = food_items[: settings.MAX_PLAN_FOOD_ITEMS]

    day_name = get_day_name(day)
    initial_state = {
        "user_profile": user_profile,
        "food_items": food_dicts,
        "day_name": day_name,
        "custom_instructions": custom_instructions or "",
        "iterations": 0
    }

    final_state = await health_plan_app.ainvoke(initial_state)
    return CompleteHealthPlanSchema(**final_state["final_plan"])
