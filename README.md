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
*   📊 **Monitor Zasobów**: Panel boczny na żywo pokazuje zużycie CPU, RAM i VRAM, pozwalając obserwować obciążenie komputera.

---

## Stack Technologiczny

*   **Frontend**: React (TypeScript), Vite, Tailwind CSS
*   **Backend**: Python 3.x, FastAPI, Uvicorn
*   **Główne Narzędzia**: Ollama

---

## Instalacja i Uruchomienie (Lokalne)

Aby uruchomić projekt na swoim komputerze, postępuj zgodnie z poniższymi krokami.

### Wymagania Wstępne

1.  **Node.js i npm**: [Pobierz i zainstaluj](https://nodejs.org/en/) (wersja LTS).
2.  **Python**: [Pobierz i zainstaluj](https://www.python.org/downloads/) (wersja 3.10+).
3.  **Ollama**: Postępuj zgodnie z instrukcją instalacji na [ollama.com](https://ollama.com/).

### Kroki Uruchomienia

1.  **Klonowanie Repozytorium**:
    ```bash
    git clone [adres-twojego-repozytorium-na-gicie]
    cd chatbot-projekt
    ```

2.  **Konfiguracja Ollama**: Upewnij się, że Ollama działa i pobierz model:
    ```bash
    ollama pull llama3
    ```

3.  **Uruchomienie Backendu (Terminal 1)**:
    ```bash
    cd backend
    python -m venv venv
    # Windows
    venv\Scripts\activate
    # macOS/Linux
    # source venv/bin/activate
    pip install -r requirements.txt
    uvicorn api:app --reload
    ```
    *Backend będzie działał na `http://127.0.0.1:8000`.*

4.  **Uruchomienie Frontendu (Terminal 2)**:
    ```bash
    cd frontend
    npm install
    npm run dev
    ```
    *Frontend będzie dostępny w przeglądarce pod adresem `http://localhost:8080/`.*

---
