# TaskFlow

Reconstructed from the TaskFlow source shared from Emergent.

## Stack
- React 19 + CRACO + Tailwind CSS
- FastAPI + Motor + MongoDB
- JWT authentication
- WebSocket realtime updates
- dnd-kit Kanban drag-and-drop
- Sonner notifications

## Run backend
1. Copy `backend/.env.example` to `backend/.env` and set your MongoDB/JWT/admin values.
2. Start MongoDB.
3. `cd backend`
4. `python -m venv .venv`
5. Activate the virtual environment.
6. `pip install -r requirements.txt`
7. `uvicorn server:app --reload --port 8001`

## Run frontend
1. Copy `frontend/.env.example` to `frontend/.env`
2. Set `REACT_APP_BACKEND_URL=http://localhost:8001`
3. `cd frontend`
4. `npm install`
5. `npm start`

The frontend source supplied by Emergent used a larger shadcn UI directory. This reconstruction includes the UI primitives actually imported by the supplied application files, keeping the project self-contained.
