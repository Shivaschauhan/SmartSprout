import json
import re
from typing import List, Dict
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from core.config import settings
from schemas.plan import GeneratedPlanSchema
from utils import get_day_name
from services.rag_service import get_rag_retriever

def extract_json(text: str) -> dict:
    """
    Extract JSON object from text, even if wrapped in markdown fences or extra text.
    """
    import ast
    # Try to locate the first and last curly braces
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        raise ValueError("No JSON object found in AI response")
    json_str = match.group(0)

    try:
        return json.loads(json_str)
    except Exception:
        try:
            return ast.literal_eval(json_str)
        except Exception:
            raise ValueError("No valid JSON found in AI response: " + text)

def format_docs(docs):
    return "\n\n".join(doc.page_content for doc in docs)

def generate_meal_plan(user_profile: dict, food_items: List[Dict], day: int = 1) -> GeneratedPlanSchema:
    llm = ChatGoogleGenerativeAI(
        model=settings.GEMINI_CHAT_MODEL,
        temperature=0.7,
        google_api_key=settings.GEMINI_API_KEY
    )

    system_prompt = (
        "You are a nutritionist AI. Use the following pieces of expert nutritional guidelines to "
        "generate a customized meal plan for the user for a specific day.\n\n"
        "Expert Nutritional Guidelines Context:\n{context}\n\n"
        "User Profile:\n"
        "Dietary Preference: {dietary_prefs}\n"
        "Goal: {goals}\n"
        "BMI: {bmi}\n\n"
        "Available Food Items (name, calories, protein, carbs, fats per reference unit):\n"
        "{food_list}\n\n"
        "Format the output STRICTLY as a JSON object for the given day ({day}):\n"
        "{{\n"
        '    "day": "{day}",\n'
        '    "meals": [\n'
        "        {{\n"
        '            "meal": "Breakfast",\n'
        '            "items": [\n'
        '                {{"food_id": 1, "quantity": 100, "unit": "g"}}\n'
        "            ]\n"
        "        }}\n"
        "    ]\n"
        "}}\n\n"
        "IMPORTANT: Your output must be valid, parseable JSON. Use double quotes for all keys and string values. Do not use single quotes or trailing commas.\n"
    )
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("human", "Generate a meal plan for {day}.")
    ])
    
    retriever = get_rag_retriever()
    
    rag_chain = (
        {
            "context": (lambda x: x["input"]) | retriever | format_docs,
            "day": lambda x: x["day"],
            "dietary_prefs": lambda x: x["dietary_prefs"],
            "goals": lambda x: x["goals"],
            "bmi": lambda x: x["bmi"],
            "food_list": lambda x: x["food_list"],
        }
        | prompt
        | llm
        | StrOutputParser()
    )

    day_name = get_day_name(day)
    
    # We formulate the "input" query to the RAG system so it retrieves relevant context.
    # The user's goal and dietary prefs are good search queries for the vector store.
    query_for_retrieval = f"Nutritional guidelines for {user_profile['dietary_prefs']} diet and {user_profile['goals']} goal."
    
    response_text = rag_chain.invoke({
        "input": query_for_retrieval, 
        "day": day_name,
        "dietary_prefs": user_profile["dietary_prefs"],
        "goals": user_profile["goals"],
        "bmi": user_profile["bmi"],
        "food_list": json.dumps(food_items, indent=2),
    })

    try:
        parsed_data = extract_json(response_text)
    except Exception as e:
        raise ValueError(f"AI response not in expected JSON format: {str(e)}")

    return GeneratedPlanSchema(**parsed_data)
