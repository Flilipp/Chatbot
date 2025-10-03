# Lokalny Chatbot AI z Interfejsem Webowym

Jest to w pełni funkcjonalna aplikacja typu "full-stack", która pozwala na prowadzenie rozmów z lokalnym modelem językowym (AI) za pośrednictwem nowoczesnego interfejsu webowego. Backend aplikacji został zbudowany w Pythonie przy użyciu FastAPI, a frontend w React (TypeScript) i Tailwind CSS.


---

## Główne Funkcje

*   🧠 **Lokalny Model AI**: Cała logika AI działa na Twoim komputerze dzięki **Ollama**, zapewniając prywatność i brak kosztów.
*   📜 **Historia Konwersacji**: Wszystkie rozmowy są automatycznie zapisywane i można je wczytywać, usuwać oraz nadawać im tytuły generowane przez AI.
*   🎨 **Nowoczesny Interfejs**: Czysty, responsywny i przyjemny dla oka interfejs zbudowany w React.
*   ⚙️ **Własny "System Prompt"**: Możliwość zdefiniowania "osobowości" lub roli bota dla każdej konwersacji.
*   💻 **Obsługa Markdown i Kodu**: Odpowiedzi bota formatują się, a bloki kodu mają podświetlaną składnię.
*   📋 **Przycisk Kopiuj**: Łatwe kopiowanie odpowiedzi bota jednym kliknięciem.
*   📊 **Monitor Zasobów**: Panel boczny na żywo pokazuje zużycie CPU, RAM i VRAM.

---

## Stack Technologiczny

*   **Frontend**: React (TypeScript), Vite, Tailwind CSS
*   **Backend**: Python 3.x, FastAPI, Uvicorn
*   **Główne Narzędzia**: Ollama

---

## Instalacja i Uruchomienie (Lokalne)

Procedura do wykonania **tylko za pierwszym razem**.

### Wymagania Wstępne

1.  **Node.js i npm**: [Pobierz i zainstaluj](https://nodejs.org/en/) (wersja LTS).
2.  **Python**: [Pobierz i zainstaluj](https://www.python.org/downloads/) (wersja 3.10+).
3.  **Ollama**: Postępuj zgodnie z instrukcją instalacji na [ollama.com](https://ollama.com/).

### Kroki Instalacji

1.  **Klonowanie Repozytorium**:
    ```bash
    git clone https://github.com/Flilipp/Chatbot
    cd chatbot-projekt
    ```

2.  **Konfiguracja Ollama**: Upewnij się, że Ollama działa i pobierz model:
    ```bash
    ollama pull llama3
    ```

3.  **Instalacja Backendu (Terminal 1)**:
    ```bash
    cd backend
    python -m venv venv
    # Windows
    venv\Scripts\activate
    # macOS/Linux
    # source venv/bin/activate
    pip install -r requirements.txt
    ```

4.  **Instalacja Frontendu (Terminal 2)**:
    ```bash
    cd frontend
    npm install
    ```

---

## Jak Uruchomić Aplikację Ponownie

To jest procedura, której będziesz używać na co dzień.

### Krok 1: Upewnij się, że Ollama działa

Ollama powinna uruchamiać się automatycznie w tle po starcie systemu. Jeśli nie, uruchom ją ręcznie.

### Krok 2: Uruchom Backend

1.  Otwórz **pierwszy terminal** i przejdź do folderu projektu.
2.  Wejdź do folderu `backend` i aktywuj środowisko wirtualne:
    ```bash
    cd backend
    # Windows
    venv\Scripts\activate
    # macOS/Linux
    # source venv/bin/activate
    ```
3.  Uruchom serwer:
    ```bash
    uvicorn api:app
    ```
    *Backend będzie działał na `http://127.0.0.1:8000`. Zostaw ten terminal otwarty.*

### Krok 3: Uruchom Frontend

1.  Otwórz **drugi, osobny terminal** i przejdź do folderu projektu.
2.  Wejdź do folderu `frontend`:
    ```bash
    cd frontend
    ```
3.  Uruchom serwer deweloperski:
    ```bash
    npm run dev
    ```
    *Frontend będzie dostępny w przeglądarce pod adresem `http://localhost:8080/`. Zostaw ten terminal otwarty.*

### Gotowe!

Otwórz przeglądarkę i wejdź na adres **`http://localhost:8080/`**.
