import os
import json
import sqlite3
import uuid
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from typing import List, Optional
import ollama
from datetime import datetime, timedelta, timezone

import hashlib
import hmac

from jose import JWTError, jwt

# --- KONFIGURACJA ---
SECRET_KEY = "super-tajny-klucz-zmien-go"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")
DB_FILE = "chat_history.db"
app = FastAPI()


@app.on_event("startup")
def startup_event(): init_db()


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
    # ... reszta tabel
    conn.commit()
    conn.close()


def get_db_connection():
    conn = sqlite3.connect(DB_FILE);
    conn.row_factory = sqlite3.Row;
    return conn


app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:8080"], allow_credentials=True, allow_methods=["*"],
                   allow_headers=["*"])


# --- FUNKCJE HASEŁ ---
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return hmac.compare_digest(hashlib.sha256(plain_password.encode()).hexdigest(), hashed_password)


def get_password_hash(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


# --- MODELE I FUNKCJE JWT ---
class User(BaseModel): id: int; email: str


class UserInDB(User): hashed_password: str


class Token(BaseModel): access_token: str; token_type: str


class TokenData(BaseModel): email: Optional[str] = None


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


# --- ENDPOINTY LOGOWANIA ---
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
    if not user_row:
        conn.close()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Nieprawidłowy email lub hasło")

    if not verify_password(form_data.password, user_row['hashed_password']):
        conn.close()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Nieprawidłowy email lub hasło")

    conn.close()
    access_token = create_access_token(data={"sub": user_row['email']})
    return {"access_token": access_token, "token_type": "bearer"}


# --- BARDZO PROSTY ENDPOINT TESTOWY ---
@app.get("/api/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user