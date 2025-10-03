import streamlit as st
import ollama
import json
import os
from datetime import datetime
import psutil
from pynvml import *  # <--- TO JEST JEDYNY POPRAWNY IMPORT. Proszę, upewnij się, że Twój plik go zawiera.
import re

# --- Konfiguracja i inicjalizacja ---

# Inicjalizacja biblioteki do monitorowania GPU NVIDIA
try:
    nvmlInit()
    GPU_SUPPORT = True
except NVMLError as error:
    GPU_SUPPORT = False

st.set_page_config(
    page_title="Lokalny Chatbot AI",
    page_icon="🤖",
    layout="wide"
)

# Tworzenie folderu na historię czatów, jeśli nie istnieje
if not os.path.exists("chat_history"):
    os.makedirs("chat_history")


# --- Funkcje pomocnicze ---

def generate_chat_title(messages):
    """Wysyła zapytanie do modelu AI o wygenerowanie krótkiego tytułu dla rozmowy."""
    messages_for_summary = list(messages)
    prompt = "Podsumuj tę rozmowę w 2 do 4 słowach. To będzie użyte jako nazwa pliku. Odpowiedz tylko i wyłącznie samym tytułem, bez żadnych dodatkowych zdań i znaków interpunkcyjnych."
    messages_for_summary.append({"role": "user", "content": prompt})
    try:
        response = ollama.chat(model='llama3', messages=messages_for_summary, stream=False)
        title = response['message']['content'].strip().replace('"', '').replace("'", "")
        return title if title else "Nowy czat"
    except Exception as e:
        print(f"Błąd podczas generowania tytułu: {e}")
        return "Nowy czat"


def create_safe_filename(title):
    """Tworzy bezpieczną nazwę pliku z tytułu."""
    safe_title = re.sub(r'[^\w\s-]', '', title).strip().replace(' ', '_').lower()
    timestamp = datetime.now().strftime("%H%M%S")
    return f"{safe_title}_{timestamp}"


def get_system_stats():
    """Pobiera i zwraca statystyki zużycia CPU, RAM i VRAM."""
    cpu_usage = psutil.cpu_percent()
    ram_usage = psutil.virtual_memory().percent
    vram_usage = None
    if GPU_SUPPORT:
        try:
            handle = nvmlDeviceGetHandleByIndex(0)
            info = nvmlDeviceGetMemoryInfo(handle)
            vram_usage = (info.used / info.total) * 100
        except NVMLError as error:
            vram_usage = None
    return cpu_usage, ram_usage, vram_usage


def save_chat_history(chat_id, messages):
    """Zapisuje historię czatu do pliku JSON."""
    file_path = os.path.join("chat_history", f"{chat_id}.json")
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(messages, f, ensure_ascii=False, indent=4)


def load_chat_history(chat_id):
    """Wczytuje historię czatu z pliku JSON."""
    file_path = os.path.join("chat_history", f"{chat_id}.json")
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)


# --- Główny interfejs aplikacji ---

st.title("🤖 Polski Chatbot AI")
st.caption("Oparty na modelu Llama 3 z historią rozmów i monitorem zasobów.")

# --- Panel boczny (Sidebar) ---

with st.sidebar:
    st.header("Zarządzanie Czatami")

    if st.button("➕ Nowy Czat"):
        st.session_state.messages = [
            {"role": "system",
             "content": "Jesteś pomocnym asystentem AI. Zawsze odpowiadaj na pytania i prowadź konwersację wyłącznie w języku polskim."}
        ]
        st.session_state.active_chat_id = None
        st.rerun()

    st.subheader("Historia Konwersacji")

    try:
        chat_files = sorted(
            os.listdir("chat_history"),
            key=lambda x: os.path.getmtime(os.path.join("chat_history", x)),
            reverse=True
        )

        for chat_file in chat_files:
            chat_id = chat_file.replace(".json", "")
            col1, col2 = st.columns([3, 1])
            with col1:
                try:
                    last_underscore_index = chat_id.rindex('_')
                    display_name = chat_id[:last_underscore_index].replace("_", " ").capitalize()
                except ValueError:
                    display_name = chat_id.replace("_", " ").capitalize()

                if st.button(display_name, key=f"load_{chat_id}", use_container_width=True):
                    st.session_state.messages = load_chat_history(chat_id)
                    st.session_state.active_chat_id = chat_id
                    st.rerun()
            with col2:
                if st.button("🗑️", key=f"del_{chat_id}", help="Usuń ten czat"):
                    os.remove(os.path.join("chat_history", chat_file))
                    if st.session_state.get("active_chat_id") == chat_id:
                        st.session_state.messages = []
                        st.session_state.active_chat_id = None
                    st.rerun()
    except FileNotFoundError:
        st.info("Brak zapisanych rozmów.")

    st.header("Monitor Zasobów")

    cpu_usage, ram_usage, vram_usage = get_system_stats()

    st.metric(label="Użycie CPU", value=f"{cpu_usage:.1f}%")
    st.metric(label="Użycie RAM", value=f"{ram_usage:.1f}%")
    if vram_usage is not None:
        st.metric(label="Użycie VRAM (GPU)", value=f"{vram_usage:.1f}%")
    elif GPU_SUPPORT is False:
        st.warning("Nie można zainicjować biblioteki NVIDIA.")

# --- Inicjalizacja stanu sesji ---

if "messages" not in st.session_state:
    st.session_state.messages = [
        {"role": "system",
         "content": "Jesteś pomocnym asystentem AI. Zawsze odpowiadaj na pytania i prowadź konwersację wyłącznie w języku polskim."}
    ]
if "active_chat_id" not in st.session_state:
    st.session_state.active_chat_id = None

# --- Wyświetlanie wiadomości w głównym oknie ---

for message in st.session_state.messages:
    if message["role"] != "system":
        with st.chat_message(message["role"]):
            st.markdown(message["content"])

# --- Główna logika wysyłania i odbierania wiadomości ---

if prompt := st.chat_input("Napisz swoją wiadomość..."):
    st.session_state.messages.append({"role": "user", "content": prompt})

    with st.chat_message("user"):
        st.markdown(prompt)

    with st.chat_message("assistant"):
        message_placeholder = st.empty()
        full_response = ""

        stream = ollama.chat(
            model='llama3',
            messages=[m for m in st.session_state.messages if m["role"] != "system"],
            stream=True,
        )

        for chunk in stream:
            full_response += chunk['message']['content']
            message_placeholder.markdown(full_response + "▌")

        message_placeholder.markdown(full_response)

    st.session_state.messages.append({"role": "assistant", "content": full_response})

    is_new_chat = st.session_state.active_chat_id is None

    if is_new_chat:
        title = generate_chat_title(st.session_state.messages)
        new_chat_id = create_safe_filename(title)
        st.session_state.active_chat_id = new_chat_id

    save_chat_history(st.session_state.active_chat_id, st.session_state.messages)

    if is_new_chat:
        st.rerun()