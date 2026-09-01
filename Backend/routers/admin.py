from typing import Optional
from pydantic import BaseModel, EmailStr
from fastapi import APIRouter, Depends, HTTPException, status
from asyncpg import Connection
import logging

from database import get_db

router = APIRouter(
    prefix="/admin",
    tags=["admin"]
)

logger = logging.getLogger(__name__)

class UserCreate(BaseModel):
    name: str
    email: str
    role: Optional[str] = "viewer"

class UserUpdate(BaseModel):
    role: Optional[str] = None
    is_active: Optional[bool] = None

@router.get("/users")
async def list_users(conn: Connection = Depends(get_db)):
    rows = await conn.fetch(
        "SELECT id, name, email, role, is_active, created_at FROM dashboard_users ORDER BY id ASC"
    )
    return [
        {
            "id": r["id"],
            "name": r["name"],
            "email": r["email"],
            "role": r["role"],
            "is_active": r["is_active"],
            "created_at": r["created_at"].isoformat() if r["created_at"] else None
        }
        for r in rows
    ]

@router.post("/users", status_code=status.HTTP_201_CREATED)
async def create_user(user: UserCreate, conn: Connection = Depends(get_db)):
    try:
        row = await conn.fetchrow(
            """
            INSERT INTO dashboard_users (name, email, role)
            VALUES ($1, $2, $3)
            RETURNING id, name, email, role, is_active, created_at
            """,
            user.name.strip(), user.email.strip().lower(), user.role or "viewer"
        )
        return {
            "id": row["id"],
            "name": row["name"],
            "email": row["email"],
            "role": row["role"],
            "is_active": row["is_active"],
            "created_at": row["created_at"].isoformat() if row["created_at"] else None
        }
    except Exception as e:
        logger.error(f"Error creating user: {e}")
        if "unique" in str(e).lower() or "duplicate" in str(e).lower():
            raise HTTPException(status_code=400, detail="User with this email already exists")
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/users/{user_id}")
async def update_user(user_id: int, update: UserUpdate, conn: Connection = Depends(get_db)):
    existing = await conn.fetchrow("SELECT * FROM dashboard_users WHERE id = $1", user_id)
    if not existing:
        raise HTTPException(status_code=404, detail="User not found")

    new_role = update.role if update.role is not None else existing["role"]
    new_active = update.is_active if update.is_active is not None else existing["is_active"]

    row = await conn.fetchrow(
        """
        UPDATE dashboard_users
        SET role = $1, is_active = $2
        WHERE id = $3
        RETURNING id, name, email, role, is_active, created_at
        """,
        new_role, new_active, user_id
    )

    return {
        "id": row["id"],
        "name": row["name"],
        "email": row["email"],
        "role": row["role"],
        "is_active": row["is_active"],
        "created_at": row["created_at"].isoformat() if row["created_at"] else None
    }

@router.delete("/users/{user_id}")
async def delete_user(user_id: int, conn: Connection = Depends(get_db)):
    res = await conn.execute("DELETE FROM dashboard_users WHERE id = $1", user_id)
    if res == "DELETE 0":
        raise HTTPException(status_code=404, detail="User not found")
    return {"status": "deleted", "id": user_id}
