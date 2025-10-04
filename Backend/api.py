import os
import json
import sqlite3
import uuid
import ffmpeg # Używamy tylko tego
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse, JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import ollama
from datetime import datetime
import psutil
from ddgs import DDGS
import torch
from faster_whisper import WhisperModel
import pyttsx3

try:
    from pynvml import *
    NVML_SUPPORT = True
except ImportError:
    NVML_SUPPORT = False

# --- Konfiguracja i ładowanie modeli ---
DB_FILE = "chat_history.db"
AUDIO_DIR = "generated_audio"
os.makedirs(AUDIO_DIR, exist_ok=True)

print("Ładowanie modeli AI. To może zająć chwilę...")
device = "cuda" if torch.cuda.is_available() else "cpu"
compute_type = "float16" if torch.cuda.is_available() else "int8"
print("Ładowanie modelu Whisper (baza)...")
whisper_model = WhisperModel("medium", device=device, compute_type=compute_type)
print("Modele AI załadowane i gotowe do pracy.")

def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS conversations (id TEXT PRIMARY KEY, title TEXT NOT NULL, system_prompt TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT,conversation_id TEXT NOT NULL,role TEXT NOT NULL,content TEXT NOT NULL,timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(conversation_id) REFERENCES conversations (id) ON DELETE CASCADE)
    """)
    conn.commit()
    conn.close()

init_db()
app = FastAPI()

def get_db_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatMessage(BaseModel):
    role: str
    content: str
class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    system_prompt: Optional[str] = None
class Conversation(BaseModel):
    id: str
    messages: List[ChatMessage]
    system_prompt: Optional[str] = None

# --- ENDPOINTY DLA CZATU GŁOSOWEGO ---

@app.post("/api/transcribe")
async def transcribe_audio(audio_file: UploadFile = File(...)):
    temp_input_path = f"temp_in_{uuid.uuid4()}"
    temp_output_path = f"temp_out_{uuid.uuid4()}.wav"
    try:
        with open(temp_input_path, "wb") as f:
            f.write(await audio_file.read())

        ffmpeg.input(temp_input_path).output(temp_output_path, acodec='pcm_s16le', ac=1, ar='16k').run(
    cmd=r"C:\Users\flol6\Documents\ffmpeg-8.0-full_build\ffmpeg-8.0-full_build\bin\ffmpeg.exe",  # <-- WSTAW TUTAJ SWOJĄ ŚCIEŻKĘ!
    overwrite_output=True,
    quiet=True
)

        segments, _ = whisper_model.transcribe(temp_output_path, beam_size=5, language="pl")
        transcribed_text = "".join(segment.text for segment in segments).strip()

        return JSONResponse(content={"transcription": transcribed_text})
    except Exception as e:
        print(f"Błąd transkrypcji: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_input_path): os.remove(temp_input_path)
        if os.path.exists(temp_output_path): os.remove(temp_output_path)

@app.post("/api/synthesize")
async def synthesize_speech(request: dict):
    text = request.get("text")
    if not text:
        raise HTTPException(status_code=400, detail="Brak tekstu.")

    output_path = os.path.join(AUDIO_DIR, f"speech_{uuid.uuid4()}.mp3")
    try:
        engine = pyttsx3.init()
        engine.setProperty('rate', 160)
        engine.save_to_file(text, output_path)
        engine.runAndWait()

        if not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
             raise HTTPException(status_code=500, detail="Nie udało się wygenerować pliku audio.")

        return FileResponse(output_path, media_type="audio/mpeg")
    except Exception as e:
        print(f"Błąd syntezy mowy: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- Reszta API ---

def generate_chat_title(messages: List[dict]):
    messages_for_summary = list(messages)
    prompt = "Podsumuj tę rozmowę w 2-4 słowach. Odpowiedz tylko tytułem."
    messages_for_summary.append({"role": "user", "content": prompt})
    try:
        response = ollama.chat(model='llama3', messages=messages_for_summary, stream=False)
        title = response['message']['content'].strip().replace('"', '').replace("'", "")
        return title if title else "Nowy czat"
    except Exception: return "Nowy czat"

def perform_web_search(query: str):
    print(f"--- Wyszukiwanie: {query} ---")
    try:
        with DDGS() as ddgs:
            results = [f"Tytuł: {r['title']}\nTreść: {r['body']}" for r in ddgs.text(query, max_results=3)]
            return "\n\n".join(results) if results else "Brak wyników."
    except Exception as e:
        print(f"Błąd wyszukiwania: {e}"); return "Błąd podczas wyszukiwania."

@app.get("/api/stats")
async def get_system_stats():
    cpu, ram, vram = psutil.cpu_percent(), psutil.virtual_memory().percent, "N/A"
    if NVML_SUPPORT:
        try:
            handle = nvmlDeviceGetHandleByIndex(0)
            info = nvmlDeviceGetMemoryInfo(handle)
            vram = round((info.used / info.total) * 100, 1)
        except Exception: pass
    return {"cpu": cpu, "ram": ram, "vram": vram}

@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    messages_dict = [msg.model_dump() for msg in request.messages]
    base_prompt = request.system_prompt or "Jesteś pomocnym asystentem AI. Odpowiadaj po polsku."
    search_instruction = "\nWAŻNE: Jeśli potrzebujesz aktualnych informacji, odpowiedz TYLKO komendą: [SEARCH: zapytanie]."
    final_system_prompt = base_prompt + search_instruction

    if not any(msg.get("role") == "system" for msg in messages_dict):
        messages_dict.insert(0, {"role": "system", "content": final_system_prompt})
    else:
        for msg in messages_dict:
            if msg.get("role") == "system": msg["content"] = final_system_prompt; break

    initial_response = ollama.chat(model='llama3', messages=messages_dict, stream=False)
    content = initial_response['message']['content'].strip()

    if content.startswith("[SEARCH:") and "]" in content:
        search_query = content.split("[SEARCH:")[1].split("]")[0].strip()
        async def search_stream():
            yield json.dumps({"status": "searching", "query": search_query}) + "\n"
            search_results = perform_web_search(search_query)
            context_prompt = f"Użyj poniższych wyników, aby odpowiedzieć na ostatnie pytanie.\nWYNIKI:\n{search_results}"
            messages_dict.append({"role": "user", "content": context_prompt})
            stream = ollama.chat(model='llama3', messages=messages_dict, stream=True)
            for chunk in stream:
                yield json.dumps({'message': chunk['message']}) + "\n"
        return StreamingResponse(search_stream(), media_type="application/x-ndjson")
    else:
        async def simple_stream():
            yield json.dumps({'message': {'role': 'assistant', 'content': content}}) + "\n"
        return StreamingResponse(simple_stream(), media_type="application/x-ndjson")

@app.post("/api/conversations")
async def save_conversation(conversation: Conversation):
    conn = get_db_connection()
    cursor = conn.cursor()
    if conversation.id == "new":
        user_msgs = [msg for msg in conversation.messages if msg.role == "user"]
        title = generate_chat_title([msg.model_dump() for msg in conversation.messages]) if user_msgs else "Nowy czat"
        safe_title = title.replace(" ", "_").lower()[:50]
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        conversation.id = f"{safe_title}_{timestamp}"
        cursor.execute("INSERT INTO conversations (id, title, system_prompt) VALUES (?, ?, ?)", (conversation.id, title, conversation.system_prompt))
    else:
        cursor.execute("UPDATE conversations SET system_prompt = ? WHERE id = ?", (conversation.system_prompt, conversation.id))
        cursor.execute("DELETE FROM messages WHERE conversation_id = ?", (conversation.id,))

    messages_to_insert = [(conversation.id, msg.role, msg.content) for msg in conversation.messages if msg.role != "system"]
    if messages_to_insert:
        cursor.executemany("INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)", messages_to_insert)

    conn.commit()
    conn.close()
    return {"status": "success", "conversation_id": conversation.id}

@app.get("/api/conversations")
async def get_conversations():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, title FROM conversations ORDER BY created_at DESC")
    conversations = [{"id": row["id"], "title": row["title"]} for row in cursor.fetchall()]
    conn.close()
    return JSONResponse(content=conversations)

@app.get("/api/conversations/{conversation_id}")
async def get_conversation(conversation_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, system_prompt FROM conversations WHERE id = ?", (conversation_id,))
    conv_row = cursor.fetchone()
    if not conv_row: conn.close(); raise HTTPException(status_code=404, detail="Conversation not found")
    cursor.execute("SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC", (conversation_id,))
    messages = [{"role": row["role"], "content": row["content"]} for row in cursor.fetchall()]
    conn.close()
    return JSONResponse(content={"id": conv_row["id"], "messages": messages, "system_prompt": conv_row["system_prompt"]})

@app.delete("/api/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM conversations WHERE id = ?", (conversation_id,))
    conn.commit()
    conn.close()
    return {"status": "success", "message": "Conversation deleted"}