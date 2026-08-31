import asyncio, asyncpg, os
from dotenv import load_dotenv

load_dotenv()

async def run():
    conn = await asyncpg.connect(os.getenv('DATABASE_URL'))
    
    # Check if id_type exists
    rows = await conn.fetch("SELECT column_name FROM information_schema.columns WHERE table_name='fact_works' AND column_name='id_type';")
    if not rows:
        print("Adding id_type column...")
        await conn.execute("ALTER TABLE fact_works ADD COLUMN id_type VARCHAR(20) DEFAULT 'REAL';")
        print("Column id_type added successfully.")
    else:
        print("Column id_type already exists.")
        
    await conn.close()

asyncio.run(run())
