# NetLanding Development Guide

## Prerequisites

- **Python 3.11+**
- **Node 18+**
- Two terminal windows (one for backend, one for frontend)

## Setup & Running

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

- Runs on `http://127.0.0.1:8000`
- SQLite database (`netlanding.db`) auto-creates on first run — no migration step needed
- API docs available at `http://127.0.0.1:8000/docs`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

- Runs on `http://localhost:5173`
- Proxies all `/api/*` requests to the backend automatically

