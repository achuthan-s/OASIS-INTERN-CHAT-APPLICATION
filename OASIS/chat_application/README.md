# ChatApp

ChatApp is a lightweight real-time messaging demo that pairs a Flask backend with a vanilla JavaScript frontend. It showcases authentication, JWT-protected APIs, CSV-backed persistence, optional message encryption, and Socket.IO powered live updates.

## Project structure

```
chat_application/
├── backend/
│   ├── app.py                # Flask entry point & Socket.IO events
│   ├── auth.py               # JWT utilities and request guard
│   ├── config.py             # Application configuration values
│   ├── database.py           # CSV-backed persistence helpers
│   ├── encryption.py         # Fernet-based message encryption
│   └── requirements.txt      # Backend dependencies
├── data/                     # CSV datasets used by the Database class
├── frontend/
│   ├── index.html            # SPA landing page (login/register + chat)
│   ├── login.html            # Standalone login entry point
│   ├── register.html         # Standalone registration entry point
│   ├── chat.html             # Standalone chat entry point
│   ├── css/
│   │   ├── style.css         # Core layout & chat styling
│   │   └── auth.css          # Dedicated auth page styling
│   └── js/
│       ├── auth.js           # Authentication logic
│       ├── chat.js           # Chat client logic
│       └── socket.js         # Socket.IO bootstrap helper
└── README.md
```

## Prerequisites

- Python 3.10+
- Node.js is **not** required; the frontend is plain HTML/CSS/JS.

## Getting started

1. Install backend dependencies:

   ```powershell
   cd chat_application\backend
   pip install -r requirements.txt
   ```

2. Run the development server:

   ```powershell
   python app.py
   ```

   The Flask development server listens on `http://127.0.0.1:5000`.

3. Open the frontend:

   - Default SPA: `http://127.0.0.1:5000/`
   - Standalone pages: `login.html`, `register.html`, or `chat.html`

4. Sign in using the seeded account:

   - Username: `alice`
   - Password: `password123`

   Or register a new account via the UI.

## Features

- **Authentication:** Registration, login, JWT issuance, and protected endpoints.
- **Persistent storage:** Users, rooms, and messages are stored in CSV files for simplicity.
- **Real-time chat:** Socket.IO handles room joins, typing notifications, and live message delivery.
- **Optional encryption:** Users can opt-in to encrypt messages; ciphertext is stored, while decrypted text is broadcast to the room.
- **Responsive frontend:** Modern, clean UI built with vanilla JavaScript.

## Development tips

- CSV files located under `data/` can be reset by deleting them; they recreate automatically with headers on next launch.
- Update `Config` in `backend/config.py` for different secrets or dataset paths.
- Run the server with `debug=True` (default) to auto-reload on backend changes.

## License

This project is intended for educational use. Adapt and extend it to fit your needs.

