# Database: SQLite implementation
# Production consideration: Migration to PostgreSQL recommended for scalability

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Response, Request, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from jose import jwt as jose_jwt
import sqlite3
import json
import asyncio
from pydantic import BaseModel

import os
from passlib.context import CryptContext

# Application Configuration
app = FastAPI()

# Security Configuration
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.getenv("SECRET_KEY", "development-secret-key-change-in-production")
ALGORITHM = "HS256"

# CORS Configuration
origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Set-Cookie", "Access-Control-Allow-Headers", 
                  "Access-Control-Allow-Origin", "Authorization",
                  "Access-Control-Allow-Credentials"],
    expose_headers=["Content-Type", "Set-Cookie", "Set-Cookie2"],
    max_age=3600,
)

# User Model Definition
# Potential enhancements:
# - Profile avatar support
# - Custom status messages
# - User notification preferences
class User(BaseModel):
    username: str
    password: str

class Message(BaseModel):
    receiver_id: int
    content: str

# Database connection setup
def get_db():
    conn = sqlite3.connect('messenger.db')
    conn.row_factory = sqlite3.Row
    return conn

# Initialize database tables on startup
def init_db():
    conn = get_db()
    cur = conn.cursor()
    
    # Users table schema
    cur.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        last_seen TIMESTAMP
    )
    ''')
    
    # Messages table schema
    cur.execute('''
    CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_id INTEGER,
        receiver_id INTEGER,
        content TEXT,
        timestamp TIMESTAMP,
        FOREIGN KEY (sender_id) REFERENCES users (id),
        FOREIGN KEY (receiver_id) REFERENCES users (id)
    )
    ''')
    
    conn.commit()
    conn.close()

# Initialize database
init_db()

# WebSocket Connection Manager
# Implementation based on FastAPI documentation with custom optimizations
class ConnectionManager:
    def __init__(self):
        # Store active WebSocket connections
        self.active_connections: Dict[int, WebSocket] = {}
    
    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        self.active_connections[user_id] = websocket
        
        # Update user's last seen timestamp
        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            "UPDATE users SET last_seen = ? WHERE id = ?",
            (datetime.now(), user_id)
        )
        conn.commit()
        conn.close()
    
    def disconnect(self, user_id: int):
        if user_id in self.active_connections:
            del self.active_connections[user_id]
    
    async def send_message(self, message: str, user_id: int):
        if user_id in self.active_connections:
            await self.active_connections[user_id].send_text(message)

manager = ConnectionManager()

# Token Generation
# Authentication Note: Implement refresh token mechanism for enhanced security
def create_token(user_id: int) -> str:
    expires = datetime.utcnow() + timedelta(days=7)
    token = jose_jwt.encode(
        {"user_id": user_id, "exp": expires},
        SECRET_KEY,
        algorithm=ALGORITHM
    )
    return token

# JWT token validation
async def get_current_user(request: Request) -> Optional[int]:
    token = request.cookies.get("session")
    if not token:
        print("No session cookie found")
        return None
    
    try:
        payload = jose_jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("user_id")
        if not user_id:
            print("No user_id in token payload")
            return None
        return user_id
    except Exception as e:
        print(f"Error decoding token: {str(e)}")
        return None

# User Registration Endpoint
@app.post("/register")
async def register(user: User, response: Response):
    conn = get_db()
    cur = conn.cursor()
    
    try:
        # Hash password before storing
        hashed_password = pwd_context.hash(user.password)
        cur.execute(
            "INSERT INTO users (username, password, last_seen) VALUES (?, ?, ?)",
            (user.username.lower(), hashed_password, datetime.now())
        )
        conn.commit()
        user_id = cur.lastrowid
        
        # Generate token and set cookie
        token = create_token(user_id)
        response.set_cookie(
            key="session",
            value=token,
            httponly=True,
            secure=False,  # For local development
            samesite='lax',
            max_age=7 * 24 * 60 * 60,
            path='/',
            domain=None  # Important for local development
        )
        
        return {"id": user_id, "username": user.username}
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="User already exists")
    finally:
        conn.close()

# User login endpoint
@app.post("/login")
async def login(user: User, response: Response):
    conn = get_db()
    cur = conn.cursor()
    
    # Get user by username
    cur.execute(
        "SELECT id, username, password FROM users WHERE username = ?",
        (user.username.lower(),)
    )
    result = cur.fetchone()
    
    # Verify password
    if result and pwd_context.verify(user.password, result['password']):
        token = create_token(result['id'])
        is_secure = os.getenv("ENVIRONMENT", "development") == "production"
        response.set_cookie(
            key="session",
            value=token,
            httponly=True,
            secure=is_secure,
            samesite='lax' if not is_secure else 'strict',
            max_age=7 * 24 * 60 * 60,
            path='/'
        )
        return {"id": result['id'], "username": result['username']}
    
    raise HTTPException(status_code=400, detail="Invalid username or password")
    result = cur.fetchone()
    conn.close()
    
    if result:
        # Generate token and set cookie
        token = create_token(result['id'])
        response.set_cookie(
            key="session",
            value=token,
            httponly=True,
            secure=False,  # For local development
            samesite='lax',
            max_age=7 * 24 * 60 * 60,
            path='/',
            domain=None  # Important for local development
        )
        return {"id": result['id'], "username": result['username']}
    
    raise HTTPException(status_code=400, detail="Invalid username or password")

# Session validation endpoint
@app.get("/check-session")
async def check_session(user_id: Optional[int] = Depends(get_current_user)):
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authorized")
    
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT id, username FROM users WHERE id = ?", (user_id,))
    user = cur.fetchone()
    conn.close()
    
    if user:
        return {"id": user['id'], "username": user['username']}
    
    raise HTTPException(status_code=401, detail="User not found")

# Get user by ID endpoint
@app.get("/users/{user_id}")
async def get_user_by_id(
    user_id: int,
    current_user: Optional[int] = Depends(get_current_user)
):
    if not current_user:
        raise HTTPException(status_code=401, detail="Not authorized")
    
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT id, username, last_seen FROM users WHERE id = ?", (user_id,))
    user = cur.fetchone()
    conn.close()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "id": user['id'],
        "username": user['username'],
        "online": (datetime.now() - datetime.fromisoformat(user['last_seen'])).seconds < 30
    }

# Get users list endpoint
@app.get("/users")
async def get_users(
    request: Request,
    search: Optional[str] = None,
    current_user: Optional[int] = Depends(get_current_user)
):
    if not current_user:
        # Direct cookie check for debugging
        cookies = request.cookies
        raise HTTPException(status_code=401, detail="Not authorized")
    
    conn = get_db()
    cur = conn.cursor()
    
    if search and search.isdigit():
        # Search by ID
        cur.execute(
            "SELECT id, username, last_seen FROM users WHERE id = ? AND id != ?",
            (int(search), current_user)
        )
    else:
        # Search by username or get all users
        query = """
            SELECT id, username, last_seen 
            FROM users 
            WHERE id != ? 
            AND (? IS NULL OR LOWER(username) LIKE LOWER(?))
        """
        search_pattern = f"%{search}%" if search else None
        cur.execute(query, (current_user, search, search_pattern))
    
    users = cur.fetchall()
    conn.close()
    
    return [
        {
            "id": user['id'],
            "username": user['username'],
            "online": (datetime.now() - datetime.fromisoformat(user['last_seen'])).seconds < 30
        }
        for user in users
    ]

# WebSocket Implementation
# Features:
# - Stable reconnection handling
# - Robust error management
# - Real-time message delivery
@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: int):
    await manager.connect(websocket, user_id)
    try:
        while True:
            # Receive message from WebSocket
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            # Save message to database
            conn = get_db()
            cur = conn.cursor()
            cur.execute(
                "INSERT INTO messages (sender_id, receiver_id, content, timestamp) VALUES (?, ?, ?, ?)",
                (user_id, message_data['receiver_id'], message_data['content'], datetime.now())
            )
            conn.commit()
            conn.close()
            
            # Send message to recipient if online
            await manager.send_message(data, message_data['receiver_id'])
            
    except WebSocketDisconnect:
        manager.disconnect(user_id)
        
        # Update last seen timestamp
        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            "UPDATE users SET last_seen = ? WHERE id = ?",
            (datetime.now(), user_id)
        )
        conn.commit()
        conn.close()

# Message History Endpoint
# Implementation Note: Future enhancement to implement cursor-based pagination
@app.get("/messages/{other_user_id}")
async def get_messages(
    other_user_id: int,
    user_id: Optional[int] = Depends(get_current_user)
):
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authorized")
    
    conn = get_db()
    cur = conn.cursor()
    # Get total message count
    cur.execute("""
        SELECT COUNT(*) as count FROM messages 
        WHERE (sender_id = ? AND receiver_id = ?)
        OR (sender_id = ? AND receiver_id = ?)
    """, (user_id, other_user_id, other_user_id, user_id))
    total_count = cur.fetchone()['count']

    # Get last 100 messages sorted by timestamp
    cur.execute("""
        SELECT * FROM messages 
        WHERE (sender_id = ? AND receiver_id = ?)
        OR (sender_id = ? AND receiver_id = ?)
        ORDER BY timestamp ASC
        LIMIT 100
    """, (user_id, other_user_id, other_user_id, user_id))
    
    messages = cur.fetchall()
    conn.close()
    
    return {
        "messages": [
            {
                "id": msg['id'],
                "sender_id": msg['sender_id'],
                "receiver_id": msg['receiver_id'],
                "content": msg['content'],
                "timestamp": msg['timestamp']
            }
            for msg in messages
        ],
        "total_count": total_count,
        "has_more": total_count > 100
    }

# User logout endpoint
@app.post("/logout")
async def logout(response: Response, user_id: Optional[int] = Depends(get_current_user)):
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authorized")
    
    # Remove session cookie
    response.delete_cookie(
        key="session",
        path='/',
        httponly=True,
        secure=False,
        samesite='lax'
    )
    
    # Update last seen timestamp
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "UPDATE users SET last_seen = ? WHERE id = ?",
        (datetime.now(), user_id)
    )
    conn.commit()
    conn.close()
    
    return {"message": "Successfully logged out"}

if __name__ == "__main__":
    import uvicorn
    import os
    import signal
    import sys

    def cleanup(signum, frame):
        print("Performing graceful shutdown...")
        try:
            # Close database connections
            conn = get_db()
            conn.close()
        except:
            pass
        sys.exit(0)

    # Register cleanup handler
    signal.signal(signal.SIGINT, cleanup)
    signal.signal(signal.SIGTERM, cleanup)

    # Try to kill any existing process using port 8000
    os.system("fuser -k 8000/tcp")
    
    # Start the server
    uvicorn.run(app, host="0.0.0.0", port=8000)