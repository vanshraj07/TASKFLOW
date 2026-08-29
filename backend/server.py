from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import uuid
import json
import logging
import bcrypt
import jwt as pyjwt
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Set

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, WebSocket, WebSocketDisconnect, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict


# --------------------------------------------------------------------
# App / DB setup
# --------------------------------------------------------------------
import certifi

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url, tlsCAFile=certifi.where())
db = client[os.environ['DB_NAME']]

app = FastAPI(title="TaskFlow API")
api_router = APIRouter(prefix="/api")

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_HOURS = 24 * 7  # 7-day access token for simplicity

security = HTTPBearer(auto_error=False)
logger = logging.getLogger("taskflow")
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')


# --------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return str(uuid.uuid4())


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_HOURS),
        "type": "access",
    }
    return pyjwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def strip_user(doc: dict) -> dict:
    if not doc:
        return doc
    doc = {**doc}
    doc.pop("password_hash", None)
    doc.pop("_id", None)
    return doc


async def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> dict:
    if not credentials or not credentials.credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = credentials.credentials
    try:
        payload = pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"id": payload["sub"]})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return strip_user(user)
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except pyjwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# --------------------------------------------------------------------
# Models
# --------------------------------------------------------------------
class RegisterInput(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1, max_length=80)


class LoginInput(BaseModel):
    email: EmailStr
    password: str


class WorkspaceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    description: Optional[str] = ""


class InviteMemberInput(BaseModel):
    email: EmailStr


class TaskCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    workspace_id: str
    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = ""
    status: str = Field(default="todo")  # todo | in_progress | done
    priority: str = Field(default="medium")  # low | medium | high | urgent
    labels: List[str] = []
    due_date: Optional[str] = None  # ISO date
    assignee_id: Optional[str] = None


class TaskUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    labels: Optional[List[str]] = None
    due_date: Optional[str] = None
    assignee_id: Optional[str] = None


class CommentCreate(BaseModel):
    body: str = Field(min_length=1, max_length=2000)


# --------------------------------------------------------------------
# WebSocket manager
# --------------------------------------------------------------------
class WSManager:
    def __init__(self):
        # user_id -> set of websockets
        self.connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, user_id: str, ws: WebSocket):
        await ws.accept()
        self.connections.setdefault(user_id, set()).add(ws)

    def disconnect(self, user_id: str, ws: WebSocket):
        if user_id in self.connections:
            self.connections[user_id].discard(ws)
            if not self.connections[user_id]:
                self.connections.pop(user_id, None)

    async def send_to_user(self, user_id: str, message: dict):
        if user_id not in self.connections:
            return
        dead = []
        for ws in list(self.connections[user_id]):
            try:
                await ws.send_text(json.dumps(message))
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(user_id, ws)

    async def broadcast_to_users(self, user_ids: List[str], message: dict):
        for uid in set(user_ids):
            await self.send_to_user(uid, message)


ws_manager = WSManager()


async def workspace_member_ids(workspace_id: str) -> List[str]:
    ws = await db.workspaces.find_one({"id": workspace_id})
    return ws.get("member_ids", []) if ws else []


async def ensure_workspace_member(workspace_id: str, user_id: str) -> dict:
    ws = await db.workspaces.find_one({"id": workspace_id})
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    if user_id not in ws.get("member_ids", []):
        raise HTTPException(status_code=403, detail="Not a member of this workspace")
    return ws


# --------------------------------------------------------------------
# Auth endpoints
# --------------------------------------------------------------------
@api_router.post("/auth/register")
async def register(payload: RegisterInput):
    email = payload.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = {
        "id": new_id(),
        "email": email,
        "name": payload.name.strip(),
        "password_hash": hash_password(payload.password),
        "avatar_color": ["#FF4500", "#007AFF", "#00C853", "#FFB300", "#8E44AD"][
            len(payload.name) % 5
        ],
        "created_at": now_iso(),
    }
    await db.users.insert_one(user)
    token = create_access_token(user["id"], user["email"])
    return {"token": token, "user": strip_user(user)}


@api_router.post("/auth/login")
async def login(payload: LoginInput):
    email = payload.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(user["id"], user["email"])
    return {"token": token, "user": strip_user(user)}


@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


@api_router.get("/users/search")
async def search_users(q: str = "", user: dict = Depends(get_current_user)):
    q = q.strip().lower()
    if len(q) < 2:
        return []
    cursor = db.users.find(
        {"$or": [{"email": {"$regex": q, "$options": "i"}}, {"name": {"$regex": q, "$options": "i"}}]}
    ).limit(10)
    users = []
    async for u in cursor:
        users.append(strip_user(u))
    return users


# --------------------------------------------------------------------
# Workspaces
# --------------------------------------------------------------------
@api_router.post("/workspaces")
async def create_workspace(payload: WorkspaceCreate, user: dict = Depends(get_current_user)):
    ws = {
        "id": new_id(),
        "name": payload.name.strip(),
        "description": (payload.description or "").strip(),
        "owner_id": user["id"],
        "member_ids": [user["id"]],
        "created_at": now_iso(),
    }
    await db.workspaces.insert_one(ws)
    ws.pop("_id", None)
    return ws


@api_router.get("/workspaces")
async def list_workspaces(user: dict = Depends(get_current_user)):
    cursor = db.workspaces.find({"member_ids": user["id"]}).sort("created_at", 1)
    result = []
    async for ws in cursor:
        ws.pop("_id", None)
        result.append(ws)
    return result


@api_router.get("/workspaces/{workspace_id}")
async def get_workspace(workspace_id: str, user: dict = Depends(get_current_user)):
    ws = await ensure_workspace_member(workspace_id, user["id"])
    # attach members info
    members = []
    async for u in db.users.find({"id": {"$in": ws.get("member_ids", [])}}):
        members.append(strip_user(u))
    ws.pop("_id", None)
    ws["members"] = members
    return ws


@api_router.post("/workspaces/{workspace_id}/invite")
async def invite_member(workspace_id: str, payload: InviteMemberInput, user: dict = Depends(get_current_user)):
    ws = await ensure_workspace_member(workspace_id, user["id"])
    invitee = await db.users.find_one({"email": payload.email.lower().strip()})
    if not invitee:
        raise HTTPException(status_code=404, detail="No user found with that email")
    if invitee["id"] in ws.get("member_ids", []):
        raise HTTPException(status_code=400, detail="User already in workspace")
    await db.workspaces.update_one(
        {"id": workspace_id}, {"$addToSet": {"member_ids": invitee["id"]}}
    )
    # notify invitee
    notif = {
        "id": new_id(),
        "user_id": invitee["id"],
        "type": "workspace_invite",
        "message": f"{user['name']} added you to workspace '{ws['name']}'",
        "workspace_id": workspace_id,
        "task_id": None,
        "read": False,
        "created_at": now_iso(),
    }
    await db.notifications.insert_one(notif)
    notif.pop("_id", None)
    await ws_manager.send_to_user(invitee["id"], {"type": "notification", "data": notif})
    return {"ok": True, "member": strip_user(invitee)}


# --------------------------------------------------------------------
# Tasks
# --------------------------------------------------------------------
@api_router.get("/workspaces/{workspace_id}/tasks")
async def list_tasks(workspace_id: str, user: dict = Depends(get_current_user)):
    await ensure_workspace_member(workspace_id, user["id"])
    cursor = db.tasks.find({"workspace_id": workspace_id}).sort("created_at", -1)
    tasks = []
    async for t in cursor:
        t.pop("_id", None)
        tasks.append(t)
    return tasks


@api_router.post("/tasks")
async def create_task(payload: TaskCreate, user: dict = Depends(get_current_user)):
    ws = await ensure_workspace_member(payload.workspace_id, user["id"])
    task = {
        "id": new_id(),
        "workspace_id": payload.workspace_id,
        "title": payload.title.strip(),
        "description": payload.description or "",
        "status": payload.status,
        "priority": payload.priority,
        "labels": payload.labels or [],
        "due_date": payload.due_date,
        "assignee_id": payload.assignee_id,
        "creator_id": user["id"],
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.tasks.insert_one(task)
    task.pop("_id", None)

    # notify assignee
    if payload.assignee_id and payload.assignee_id != user["id"]:
        notif = {
            "id": new_id(),
            "user_id": payload.assignee_id,
            "type": "task_assigned",
            "message": f"{user['name']} assigned you: {task['title']}",
            "workspace_id": payload.workspace_id,
            "task_id": task["id"],
            "read": False,
            "created_at": now_iso(),
        }
        await db.notifications.insert_one(notif)
        notif.pop("_id", None)
        await ws_manager.send_to_user(payload.assignee_id, {"type": "notification", "data": notif})

    # broadcast task_created to all workspace members
    await ws_manager.broadcast_to_users(
        ws.get("member_ids", []), {"type": "task_created", "data": task}
    )
    return task


@api_router.patch("/tasks/{task_id}")
async def update_task(task_id: str, payload: TaskUpdate, user: dict = Depends(get_current_user)):
    task = await db.tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    await ensure_workspace_member(task["workspace_id"], user["id"])

    updates = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None or k in ("description", "due_date", "assignee_id", "labels")}
    if not updates:
        task.pop("_id", None)
        return task
    updates["updated_at"] = now_iso()
    prev_assignee = task.get("assignee_id")

    await db.tasks.update_one({"id": task_id}, {"$set": updates})
    task = await db.tasks.find_one({"id": task_id})
    task.pop("_id", None)

    # notify new assignee if changed
    new_assignee = updates.get("assignee_id")
    if "assignee_id" in updates and new_assignee and new_assignee != prev_assignee and new_assignee != user["id"]:
        notif = {
            "id": new_id(),
            "user_id": new_assignee,
            "type": "task_assigned",
            "message": f"{user['name']} assigned you: {task['title']}",
            "workspace_id": task["workspace_id"],
            "task_id": task_id,
            "read": False,
            "created_at": now_iso(),
        }
        await db.notifications.insert_one(notif)
        notif.pop("_id", None)
        await ws_manager.send_to_user(new_assignee, {"type": "notification", "data": notif})

    member_ids = await workspace_member_ids(task["workspace_id"])
    await ws_manager.broadcast_to_users(member_ids, {"type": "task_updated", "data": task})
    return task


@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, user: dict = Depends(get_current_user)):
    task = await db.tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    await ensure_workspace_member(task["workspace_id"], user["id"])
    await db.tasks.delete_one({"id": task_id})
    await db.comments.delete_many({"task_id": task_id})
    member_ids = await workspace_member_ids(task["workspace_id"])
    await ws_manager.broadcast_to_users(
        member_ids, {"type": "task_deleted", "data": {"id": task_id, "workspace_id": task["workspace_id"]}}
    )
    return {"ok": True}


# --------------------------------------------------------------------
# Comments
# --------------------------------------------------------------------
@api_router.get("/tasks/{task_id}/comments")
async def list_comments(task_id: str, user: dict = Depends(get_current_user)):
    task = await db.tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    await ensure_workspace_member(task["workspace_id"], user["id"])
    cursor = db.comments.find({"task_id": task_id}).sort("created_at", 1)
    comments = []
    async for c in cursor:
        c.pop("_id", None)
        comments.append(c)
    return comments


@api_router.post("/tasks/{task_id}/comments")
async def create_comment(task_id: str, payload: CommentCreate, user: dict = Depends(get_current_user)):
    task = await db.tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    await ensure_workspace_member(task["workspace_id"], user["id"])
    comment = {
        "id": new_id(),
        "task_id": task_id,
        "workspace_id": task["workspace_id"],
        "author_id": user["id"],
        "author_name": user["name"],
        "author_color": user.get("avatar_color", "#FF4500"),
        "body": payload.body.strip(),
        "created_at": now_iso(),
    }
    await db.comments.insert_one(comment)
    comment.pop("_id", None)

    # notify assignee if different
    if task.get("assignee_id") and task["assignee_id"] != user["id"]:
        notif = {
            "id": new_id(),
            "user_id": task["assignee_id"],
            "type": "task_comment",
            "message": f"{user['name']} commented on: {task['title']}",
            "workspace_id": task["workspace_id"],
            "task_id": task_id,
            "read": False,
            "created_at": now_iso(),
        }
        await db.notifications.insert_one(notif)
        notif.pop("_id", None)
        await ws_manager.send_to_user(task["assignee_id"], {"type": "notification", "data": notif})

    member_ids = await workspace_member_ids(task["workspace_id"])
    await ws_manager.broadcast_to_users(member_ids, {"type": "comment_created", "data": comment})
    return comment


# --------------------------------------------------------------------
# Notifications
# --------------------------------------------------------------------
@api_router.get("/notifications")
async def list_notifications(user: dict = Depends(get_current_user)):
    cursor = db.notifications.find({"user_id": user["id"]}).sort("created_at", -1).limit(50)
    out = []
    async for n in cursor:
        n.pop("_id", None)
        out.append(n)
    return out


@api_router.post("/notifications/{notif_id}/read")
async def mark_notification_read(notif_id: str, user: dict = Depends(get_current_user)):
    await db.notifications.update_one(
        {"id": notif_id, "user_id": user["id"]}, {"$set": {"read": True}}
    )
    return {"ok": True}


@api_router.post("/notifications/read-all")
async def mark_all_read(user: dict = Depends(get_current_user)):
    await db.notifications.update_many({"user_id": user["id"]}, {"$set": {"read": True}})
    return {"ok": True}


# --------------------------------------------------------------------
# WebSocket endpoint (token auth via query param)
# --------------------------------------------------------------------
@app.websocket("/api/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = ""):
    try:
        payload = pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            await websocket.close(code=1008)
            return
        user = await db.users.find_one({"id": user_id})
        if not user:
            await websocket.close(code=1008)
            return
    except Exception:
        await websocket.close(code=1008)
        return

    await ws_manager.connect(user_id, websocket)
    try:
        while True:
            # Keep-alive; the server pushes updates from other routes.
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(user_id, websocket)
    except Exception:
        ws_manager.disconnect(user_id, websocket)


# --------------------------------------------------------------------
# Health
# --------------------------------------------------------------------
@api_router.get("/")
async def root():
    return {"message": "TaskFlow API", "status": "ok"}


# --------------------------------------------------------------------
# Startup
# --------------------------------------------------------------------
@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.workspaces.create_index("member_ids")
    await db.tasks.create_index("workspace_id")
    await db.comments.create_index("task_id")
    await db.notifications.create_index("user_id")
    # Seed admin user
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@taskflow.io")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "id": new_id(),
            "email": admin_email,
            "name": "Admin",
            "password_hash": hash_password(admin_password),
            "avatar_color": "#FF4500",
            "created_at": now_iso(),
        })
    logger.info("TaskFlow startup complete")


@app.on_event("shutdown")
async def on_shutdown():
    client.close()


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
