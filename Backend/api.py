from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import ollama
import json

# Inicjalizacja aplikacji FastAPI
app = FastAPI()

# Konfiguracja CORS (Cross-Origin Resource Sharing)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Definicja struktury danych przychodzących z frontendu
class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]


# Generator do strumieniowania odpowiedzi z Ollama
async def get_ollama_response_stream(messages: List[dict]):
    """Strumieniuje odpowiedź z Ollama kawałek po kawałku."""
    stream = ollama.chat(
        model='llama3',
        messages=messages,
        stream=True,
    )
    for chunk in stream:
        yield json.dumps(chunk) + "\n"


# Główny punkt końcowy API dla czatu
@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    # Konwertujemy obiekty Pydantic na słowniki, których oczekuje Ollama
    messages_dict = [msg.dict() for msg in request.messages]

    # Dodajemy instrukcję systemową, aby bot mówił po polsku
    if not any(msg.get("role") == "system" for msg in messages_dict):
        messages_dict.insert(0, {
            "role": "system",
            "content": "Jesteś pomocnym asystentem AI. Zawsze odpowiadaj na pytania i prowadź konwersację wyłącznie w języku polskim."
        })

    return StreamingResponse(
        get_ollama_response_stream(messages_dict),
        media_type="application/x-ndjson"
    )


# Prosty punkt końcowy do testowania, czy serwer działa
@app.get("/")
def read_root():
    return {"Hello": "World"}