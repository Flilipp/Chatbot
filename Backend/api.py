import os
import json
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import ollama
from datetime import datetime
import psutil

try:
    from pynvml import *

    NVML_SUPPORT = True
except ImportError:
    NVML_SUPPORT = False

# --- Konfiguracja ---
CHAT_HISTORY_DIR = "chat_history"
os.makedirs(CHAT_HISTORY_DIR, exist_ok=True)
if NVML_SUPPORT:
    try:
        nvmlInit()
    except Exception:
        NVML_SUPPORT = False

app = FastAPI()

# Konfiguracja CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Modele danych (Pydantic) ---
class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    # NOWOŚĆ: Opcjonalny własny system prompt
    system_prompt: Optional[str] = None


class Conversation(BaseModel):
    id: str
    messages: List[ChatMessage]
    # NOWOŚĆ: Zapisujemy też system prompt
    system_prompt: Optional[str] = None


# --- Funkcje pomocnicze ---
def generate_chat_title(messages: List[dict]):
    messages_for_summary = list(messages)
    prompt = "Podsumuj tę rozmowę w 2 do 4 słowach. To będzie użyte jako tytuł. Odpowiedz tylko i wyłącznie samym tytułem, bez żadnych dodatkowych zdań i znaków interpunkcyjnych."
    messages_for_summary.append({"role": "user", "content": prompt})
    try:
        response = ollama.chat(model='llama3', messages=messages_for_summary, stream=False)
        title = response['message']['content'].strip().replace('"', '').replace("'", "")
        return title if title else "Nowy czat"
    except Exception:
        return "Nowy czat"


# --- Punkty końcowe API (Endpointy) ---

# NOWOŚĆ: Endpoint do statystyk systemowych
@app.get("/api/stats")
async def get_system_stats():
    cpu = psutil.cpu_percent()
    ram = psutil.virtual_memory().percent
    vram = None
    if NVML_SUPPORT:
        try:
            handle = nvmlDeviceGetHandleByIndex(0)
            info = nvmlDeviceGetMemoryInfo(handle)
            vram = round((info.used / info.total) * 100, 2)
        except Exception:
            vram = "N/A"
    return {"cpu": cpu, "ram": ram, "vram": vram}


@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    messages_dict = [msg.dict() for msg in request.messages]

    # Użyj własnego promptu, jeśli jest, albo domyślnego
    system_prompt_content = request.system_prompt or "Jesteś pomocnym asystentem AI. Zawsze odpowiadaj na pytania i prowadź konwersację wyłącznie w języku polskim."

    if not any(msg.get("role") == "system" for msg in messages_dict):
        messages_dict.insert(0, {"role": "system", "content": system_prompt_content})

    async def response_stream():
        stream = ollama.chat(model='llama3', messages=messages_dict, stream=True)
        for chunk in stream:
            response_chunk = {'message': {'role': chunk['message']['role'], 'content': chunk['message']['content']}}
            yield json.dumps(response_chunk) + "\n"

    return StreamingResponse(response_stream(), media_type="application/x-ndjson")


@app.post("/api/conversations")
async def save_conversation(conversation: Conversation):
    if conversation.id == "new":
        title = generate_chat_title([msg.dict() for msg in conversation.messages])
        safe_title = title.replace(" ", "_").lower()
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        conversation.id = f"{safe_title}_{timestamp}"

    file_path = os.path.join(CHAT_HISTORY_DIR, f"{conversation.id}.json")
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(conversation.dict(), f, ensure_ascii=False, indent=2)
    return {"status": "success", "conversation_id": conversation.id}


@app.get("/api/conversations")
async def get_conversations():
    conversations = []
    for filename in sorted(os.listdir(CHAT_HISTORY_DIR), reverse=True):
        if filename.endswith(".json"):
            base_name = filename.replace(".json", "")
            try:
                title_part = base_name.rsplit('_', 1)[0]
                title = title_part.replace("_", " ").capitalize()
            except IndexError:
                title = base_name.replace("_", " ").capitalize()
            conversations.append({"id": base_name, "title": title})
    return JSONResponse(content=conversations)


@app.get("/api/conversations/{conversation_id}")
async def get_conversation(conversation_id: str):
    file_path = os.path.join(CHAT_HISTORY_DIR, f"{conversation_id}.json")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Conversation not found")
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return JSONResponse(content=data)


@app.delete("/api/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str):
    file_path = os.path.join(CHAT_HISTORY_DIR, f"{conversation_id}.json")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Conversation not found")
    try:
        os.remove(file_path)
        return {"status": "success", "message": "Conversation deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete file: {e}")