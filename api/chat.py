from fastapi import APIRouter, Depends, Request, HTTPException, File, UploadFile, Form
from sqlalchemy.orm import Session
from db.session import get_db
from services.chat_ai import run_chat_agent
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import json
import asyncio
from db.models.chat import ChatSession, ChatMessage

router = APIRouter(
    prefix="/v1/chat",
    tags=["Chat Coach"]
)

def generate_chat_title(user_message: str) -> str:
    try:
        from langchain_google_genai import ChatGoogleGenerativeAI
        from core.config import settings
        llm = ChatGoogleGenerativeAI(
            model=settings.GEMINI_CHAT_MODEL,
            temperature=0.7,
            google_api_key=settings.GEMINI_API_KEY
        )
        prompt = (
            "Generate a short, concise, and catchy 2 to 5 words title for a chat conversation "
            "that begins with the following message. Respond ONLY with the title. Do not include quotes, "
            "punctuation, or markdown formatting.\n\n"
            f"Message: {user_message}"
        )
        res = llm.invoke(prompt)
        content = res.content
        if isinstance(content, list):
            text_parts = []
            for part in content:
                if isinstance(part, dict) and "text" in part:
                    text_parts.append(part["text"])
                elif isinstance(part, str):
                    text_parts.append(part)
            title = "".join(text_parts)
        else:
            title = str(content)
        title = title.strip().replace('"', '').replace("'", "")
        if len(title) > 40:
            title = title[:37] + "..."
        return title if title else "New Conversation"
    except Exception:
        return "New Conversation"


class ChatMessageSchema(BaseModel):
    role: str
    content: str
    image_preview: Optional[str] = None


class ChatRequestSchema(BaseModel):
    messages: List[ChatMessageSchema]
    session_id: Optional[int] = None


class SessionCreateSchema(BaseModel):
    title: Optional[str] = None


class SessionResponseSchema(BaseModel):
    id: int
    title: str
    created_at: datetime

    class Config:
        from_attributes = True


class ChatMessageResponseSchema(BaseModel):
    role: str
    content: str
    image_preview: Optional[str] = None

    class Config:
        from_attributes = True


@router.get("/sessions", response_model=List[SessionResponseSchema])
def list_sessions(request: Request, db: Session = Depends(get_db)):
    user = request.state.user
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    sessions = db.query(ChatSession).filter(ChatSession.user_id == user.id).order_by(ChatSession.id.desc()).all()
    return sessions


@router.post("/sessions", response_model=SessionResponseSchema)
def create_session(request: Request, body: SessionCreateSchema, db: Session = Depends(get_db)):
    user = request.state.user
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    title = body.title or f"Chat - {datetime.now().strftime('%Y-%m-%d %H:%M')}"
    session = ChatSession(user_id=user.id, title=title)
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.delete("/sessions/{session_id}")
def delete_session(session_id: int, request: Request, db: Session = Depends(get_db)):
    user = request.state.user
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    session = db.query(ChatSession).filter(ChatSession.id == session_id, ChatSession.user_id == user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    
    db.delete(session)
    db.commit()
    return {"message": "Chat session deleted successfully"}


@router.get("/sessions/{session_id}/messages", response_model=List[ChatMessageResponseSchema])
def get_session_messages(session_id: int, request: Request, db: Session = Depends(get_db)):
    user = request.state.user
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    session = db.query(ChatSession).filter(ChatSession.id == session_id, ChatSession.user_id == user.id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Chat session not found")
    
    messages = db.query(ChatMessage).filter(ChatMessage.session_id == session_id).order_by(ChatMessage.id).all()
    return messages


@router.post("/")
async def chat_with_coach(request: Request, body: ChatRequestSchema, db: Session = Depends(get_db)):
    user = request.state.user
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    session_id = body.session_id
    if not session_id:
        session = ChatSession(user_id=user.id, title=f"Chat - {datetime.now().strftime('%Y-%m-%d %H:%M')}")
        db.add(session)
        db.commit()
        db.refresh(session)
        session_id = session.id
    else:
        session = db.query(ChatSession).filter(ChatSession.id == session_id, ChatSession.user_id == user.id).first()
        if not session:
            raise HTTPException(status_code=404, detail="Chat session not found")

    db_messages = db.query(ChatMessage).filter(ChatMessage.session_id == session_id).order_by(ChatMessage.id).all()
    messages_list = [{"role": msg.role, "content": msg.content} for msg in db_messages]
    
    if not body.messages:
        raise HTTPException(status_code=400, detail="Messages array cannot be empty")
    new_msg = body.messages[-1]
    
    user_db_msg = ChatMessage(
        session_id=session_id,
        role=new_msg.role,
        content=new_msg.content,
        image_preview=new_msg.image_preview
    )
    db.add(user_db_msg)
    db.commit()

    # Rename the conversation dynamically based on user's first prompt
    msg_count = db.query(ChatMessage).filter(ChatMessage.session_id == session_id).count()
    if msg_count == 1:
        new_title = await asyncio.to_thread(generate_chat_title, new_msg.content)
        session.title = new_title
        db.commit()

    messages_list.append({"role": new_msg.role, "content": new_msg.content})

    try:
        response_text = await asyncio.to_thread(run_chat_agent, db, user, messages_list)
        
        ai_db_msg = ChatMessage(
            session_id=session_id,
            role="assistant",
            content=response_text
        )
        db.add(ai_db_msg)
        db.commit()
        
        return {"response": response_text, "session_id": session_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat agent execution failed: {str(e)}")


@router.post("/with-image")
async def chat_with_image(
    request: Request,
    messages: str = Form(..., description="JSON array of {role, content}"),
    session_id: Optional[int] = Form(None),
    image_preview: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
):
    """Chat with optional meal photo for vision identification + tool logging."""
    user = request.state.user
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    try:
        messages_list_input = json.loads(messages)
        if not isinstance(messages_list_input, list):
            raise ValueError("messages must be a JSON array")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid messages JSON: {e}")

    if not session_id:
        session = ChatSession(user_id=user.id, title=f"Chat - {datetime.now().strftime('%Y-%m-%d %H:%M')}")
        db.add(session)
        db.commit()
        db.refresh(session)
        session_id = session.id
    else:
        session = db.query(ChatSession).filter(ChatSession.id == session_id, ChatSession.user_id == user.id).first()
        if not session:
            raise HTTPException(status_code=404, detail="Chat session not found")

    db_messages = db.query(ChatMessage).filter(ChatMessage.session_id == session_id).order_by(ChatMessage.id).all()
    messages_list = [{"role": msg.role, "content": msg.content} for msg in db_messages]

    if not messages_list_input:
        raise HTTPException(status_code=400, detail="Messages array cannot be empty")
    new_msg = messages_list_input[-1]
    
    user_db_msg = ChatMessage(
        session_id=session_id,
        role=new_msg.get("role"),
        content=new_msg.get("content"),
        image_preview=image_preview
    )
    db.add(user_db_msg)
    db.commit()

    # Rename the conversation dynamically based on user's first prompt
    msg_count = db.query(ChatMessage).filter(ChatMessage.session_id == session_id).count()
    if msg_count == 1:
        new_title = await asyncio.to_thread(generate_chat_title, new_msg.get("content") or "Meal Photo Analysis")
        session.title = new_title
        db.commit()

    messages_list.append({"role": new_msg.get("role"), "content": new_msg.get("content")})

    image_bytes = None
    image_mime = "image/jpeg"
    from core.config import settings
    if file is not None:
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > settings.MAX_IMAGE_BYTES:
            raise HTTPException(status_code=413, detail="File too large")
            
        image_bytes = await file.read()
        if len(image_bytes) > settings.MAX_IMAGE_BYTES:
            raise HTTPException(status_code=413, detail="File too large")
        image_mime = file.content_type or "image/jpeg"
        if image_bytes and not image_mime.startswith("image/"):
            raise HTTPException(status_code=400, detail="File must be an image")

    try:
        response_text = await asyncio.to_thread(
            run_chat_agent,
            db, user, messages_list,
            image_bytes if image_bytes else None,
            image_mime,
        )
        
        ai_db_msg = ChatMessage(
            session_id=session_id,
            role="assistant",
            content=response_text
        )
        db.add(ai_db_msg)
        db.commit()

        return {"response": response_text, "session_id": session_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat agent execution failed: {str(e)}")
