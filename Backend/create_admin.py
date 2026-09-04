import sys
import os
import asyncio
import asyncpg
import bcrypt
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://neondb_owner:npg_LM3pTJ4adVgl@ep-fancy-haze-az5mspgm-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require")

async def main():
    if len(sys.argv) >= 3:
        email = sys.argv[1].strip().lower()
        password = sys.argv[2]
        name = sys.argv[3] if len(sys.argv) >= 4 else "System Admin"
    else:
        email = "admin@mcl.gov.in"
        password = "admin123"
        name = "System Admin"

    print(f"Creating admin user: '{email}'...")

    hashed_bytes = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    hashed_password = hashed_bytes.decode('utf-8')

    conn = await asyncpg.connect(DATABASE_URL)
    try:
        # Create dashboard_users table if it doesn't exist
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS dashboard_users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash TEXT,
                role VARCHAR(20) DEFAULT 'admin',
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # Add password_hash column if missing
        await conn.execute("""
            ALTER TABLE dashboard_users ADD COLUMN IF NOT EXISTS password_hash TEXT;
        """)

        # Upsert admin user
        res = await conn.fetchrow("""
            INSERT INTO dashboard_users (name, email, password_hash, role, is_active)
            VALUES ($1, $2, $3, 'admin', TRUE)
            ON CONFLICT (email) DO UPDATE SET 
                password_hash = EXCLUDED.password_hash,
                role = 'admin',
                is_active = TRUE
            RETURNING id, email, role
        """, name, email, hashed_password)

        print(f"[OK] Admin user successfully created/updated: ID {res['id']}, Email: {res['email']}, Role: {res['role']}")

    except Exception as e:
        print(f"[ERROR] Failed to create admin user: {e}")
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
