import os
import json
import sqlite3
import uuid
import ffmpeg
from fastapi import FastAPI, HTTPException, Depends, status, UploadFile, File
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from typing import List, Optional
import ollama
from datetime import datetime, timedelta, timezone
import psutil
import torch

from passlib.context import CryptContext
from jose import JWTError, jwt

from faster_whisper import WhisperModel
import pyttsx3

from langchain_community.llms import Ollama
from langchain.agents import AgentExecutor, create_react_agent
from langchain_community.tools.ddg_search import DuckDuckGoSearchRun
from langchain_core.prompts import PromptTemplate
from langchain_core.tools import Tool
import requests
from bs4 import BeautifulSoup

# --- KONFIGURACJA BEZPIECZEŃSTWA ---
SECRET_KEY = "zmien-to-na-swoj-wlasny-dlugi-losowy-ciag-znakow"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 dni

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# --- Reszta Konfiguracji ---
DB_FILE = "chat_history.db"
AUDIO_DIR = "generated_audio"
IMAGE_DIR = "generated_images"
os.makedirs(AUDIO_DIR, exist_ok=True)
os.makedirs(IMAGE_DIR, exist_ok=True)

whisper_model = None
agent_executor = None


def load_models_and_agent():
    global whisper_model, agent_executor
    if whisper_model is None:
        print("Ładowanie modeli i agenta AI...")
        device = "cuda" if torch.cuda.is_available() else "cpu"
        compute_type = "float16" if torch.cuda.is_available() else "int8"
        whisper_model = WhisperModel("base", device=device, compute_type=compute_type)

        llm = Ollama(model="llama3")
        search_tool = DuckDuckGoSearchRun()

        def browse_web_page(url: str) -> str:
            print(f"--- Agent przegląda: {url} ---")
            try:
                response = requests.get(url.strip(), headers={'User-Agent': 'Mozilla/5.0'}, timeout=10)
                response.raise_for_status()
                soup = BeautifulSoup(response.text, 'html.parser')
                for el in soup(['script', 'style', 'header', 'footer', 'nav', 'aside']): el.decompose()
                text = ' '.join(soup.stripped_strings)
                return f"Treść strony {url}: {text[:4000]}"
            except Exception as e:
                return f"Nie udało się pobrać strony. Błąd: {e}"

        browse_tool = Tool(name="WebBrowser", func=browse_web_page,
                           description="Użyj, aby przeczytać treść strony, gdy znasz jej DOKŁADNY adres URL.")
        tools = [search_tool, browse_tool]

        template = """Jesteś pomocnym asystentem AI. Odpowiadaj po polsku. Masz dostęp do narzędzi: {tools}. Używaj formatu:
Thought: Zastanów się, co zrobić. Twoje myśli muszą być po angielsku.
Action: Nazwa narzędzia, jedna z [{tool_names}].
Action Input: Wejście dla narzędzia. Musi być to string, bez żadnych dodatkowych znaków jak nowa linia.
Observation: Wynik działania.
... (ten cykl może się powtórzyć)
Thought: I now know the final answer.
Final Answer: Ostateczna, wyczerpująca odpowiedź na pytanie użytkownika po polsku.

Pytanie: {input}
{agent_scratchpad}"""
        prompt = PromptTemplate.from_template(template)
        agent = create_react_agent(llm, tools, prompt)
        agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True, handle_parsing_errors=True)

        print("Modele i agent AI załadowane.")


app = FastAPI()


@app.on_event("startup")
async def startup_event():
    init_db()
    load_models_and_agent()


def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("""CREATE TABLE IF NOT EXISTS users
                      (
                          id
                          INTEGER
                          PRIMARY
                          KEY
                          AUTOINCREMENT,
                          email
                          TEXT
                          UNIQUE
                          NOT
                          NULL,
                          hashed_password
                          TEXT
                          NOT
                          NULL
                      )""")
    cursor.execute("""CREATE TABLE IF NOT EXISTS conversations
    (
        id
        TEXT
        PRIMARY
        KEY,
        user_id
        INTEGER
        NOT
        NULL,
        title
        TEXT
        NOT
        NULL,
        created_at
        TIMESTAMP
        DEFAULT
        CURRENT_TIMESTAMP,
        FOREIGN
        KEY
                      (
        user_id
                      ) REFERENCES users
                      (
                          id
                      ))""")
    cursor.execute("""CREATE TABLE IF NOT EXISTS messages
    (
        id
        INTEGER
        PRIMARY
        KEY
        AUTOINCREMENT,
        conversation_id
        TEXT
        NOT
        NULL,
        role
        TEXT
        NOT
        NULL,
        content
        TEXT
        NOT
        NULL,
        timestamp
        TIMESTAMP
        DEFAULT
        CURRENT_TIMESTAMP,
        FOREIGN
        KEY
                      (
        conversation_id
                      ) REFERENCES conversations
                      (
                          id
                      ) ON DELETE CASCADE)""")
    conn.commit()
    conn.close()


def get_db_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn


app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:8080"], allow_credentials=True, allow_methods=["*"],
                   allow_headers=["*"])


class User(BaseModel): id: int; email: str


class UserInDB(User): hashed_password: str


class Token(BaseModel): access_token: str; token_type: str


class TokenData(BaseModel): email: Optional[str] = None


class ChatMessage(BaseModel): role: str; content: str


class ChatRequest(BaseModel): messages: List[ChatMessage]; system_prompt: Optional[str] = None


class Conversation(BaseModel): id: str; messages: List[ChatMessage]


def verify_password(p, h): return pwd_context.verify(p, h)


def get_password_hash(p): return pwd_context.hash(p)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                                          detail="Could not validate credentials",
                                          headers={"WWW-Authenticate": "Bearer"})
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None: raise credentials_exception
    except JWTError:
        raise credentials_exception
    conn = get_db_connection()
    user_row = conn.execute('SELECT * FROM users WHERE email = ?', (email,)).fetchone()
    conn.close()
    if user_row is None: raise credentials_exception
    return UserInDB(**user_row)


@app.post("/register")
async def register_user(form_data: OAuth2PasswordRequestForm = Depends()):
    conn = get_db_connection()
    if conn.execute('SELECT id FROM users WHERE email = ?', (form_data.username,)).fetchone():
        conn.close();
        raise HTTPException(status_code=400, detail="Ten email jest już zajęty")
    hashed_password = get_password_hash(form_data.password)
    conn.execute('INSERT INTO users (email, hashed_password) VALUES (?, ?)', (form_data.username, hashed_password))
    conn.commit()
    conn.close()
    return {"message": "Użytkownik stworzony pomyślnie. Możesz się teraz zalogować."}


@app.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    conn = get_db_connection()
    user_row = conn.execute('SELECT * FROM users WHERE email = ?', (form_data.username,)).fetchone()
    conn.close()
    if not user_row or not verify_password(form_data.password, user_row['hashed_password']):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Nieprawidłowy email lub hasło")
    access_token = create_access_token(data={"sub": user_row['email']})
    return {"access_token": access_token, "token_type": "bearer"}


@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest, current_user: User = Depends(get_current_user)):
    user_input = request.messages[-1].content if request.messages else ""
    if not user_input:
        raise HTTPException(status_code=400, detail="Brak wiadomości.")

    async def agent_stream():
        async for event in agent_executor.astream_events({"input": user_input}, version="v1"):
            kind = event["event"]
            if kind == "on_agent_thought":
                thought = event["data"]["thought"]
                if thought: yield json.dumps({"type": "thought", "content": thought}) + "\n"
            elif kind == "on_tool_start":
                yield json.dumps(
                    {"type": "action", "tool": event["name"], "input": str(event["data"].get("input"))}) + "\n"
            elif kind == "on_tool_end":
                observation = event["data"].get("output")
                if observation: yield json.dumps(
                    {"type": "observation", "content": str(observation)[:500] + "..."}) + "\n"
            elif kind == "on_agent_finish":
                final_answer = event["data"].get("output")
                if final_answer:
                    yield json.dumps({"type": "final_answer", "content": final_answer}) + "\n"

    return StreamingResponse(agent_stream(), media_type="application/x-ndjson")


@app.get("/api/conversations", response_model=List[dict])
async def get_conversations(current_user: User = Depends(get_current_user)):
    conn = get_db_connection()
    conversations = conn.execute("SELECT id, title FROM conversations WHERE user_id = ? ORDER BY created_at DESC",
                                 (current_user.id,)).fetchall()
    conn.close()
    return [dict(row) for row in conversations]


@app.post("/api/conversations")
async def save_conversation(conversation: Conversation, current_user: User = Depends(get_current_user)):
    conn = get_db_connection()
    title = conversation.messages[0].content[:30] if conversation.messages else "Nowy czat"
    if conversation.id == "new":
        new_id = str(uuid.uuid4())
        conn.execute("INSERT INTO conversations (id, user_id, title) VALUES (?, ?, ?)",
                     (new_id, current_user.id, title))
        conversation.id = new_id
    else:
        # Sprawdź, czy użytkownik jest właścicielem konwersacji
        owner_check = conn.execute("SELECT id FROM conversations WHERE id = ? AND user_id = ?",
                                   (conversation.id, current_user.id)).fetchone()
        if not owner_check:
            conn.close();
            raise HTTPException(status_code=403, detail="Brak uprawnień")
        conn.execute("DELETE FROM messages WHERE conversation_id = ?", (conversation.id,))

    messages_to_insert = [(conversation.id, msg.role, msg.content) for msg in conversation.messages]
    if messages_to_insert:
        conn.executemany("INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)", messages_to_insert)

    conn.commit()
    conn.close()
    return {"status": "success", "conversation_id": conversation.id}


@app.get("/api/conversations/{conversation_id}")
async def get_conversation(conversation_id: str, current_user: User = Depends(get_current_user)):
    conn = get_db_connection()
    conv_row = conn.execute("SELECT id FROM conversations WHERE id = ? AND user_id = ?",
                            (conversation_id, current_user.id)).fetchone()
    if not conv_row:
        conn.close();
        raise HTTPException(status_code=404, detail="Not Found")

    messages_rows = conn.execute("SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC",
                                 (conversation_id,)).fetchall()
    conn.close()
    return {"id": conversation_id, "messages": [dict(row) for row in messages_rows]}


@app.delete("/api/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str, current_user: User = Depends(get_current_user)):
    conn = get_db_connection()
    conv_row = conn.execute("SELECT id FROM conversations WHERE id = ? AND user_id = ?",
                            (conversation_id, current_user.id)).fetchone()
    if not conv_row:
        conn.close();
        raise HTTPException(status_code=404, detail="Not Found")

    conn.execute("DELETE FROM conversations WHERE id = ?", (conversation_id,))
    conn.commit()
    conn.close()
    return {"status": "success"}