import asyncio, asyncpg, os
from dotenv import load_dotenv

load_dotenv()

async def run():
    conn = await asyncpg.connect(os.getenv('DATABASE_URL'))
    rows = await conn.fetch("SELECT column_name FROM information_schema.columns WHERE table_name='fact_works';")
    print([r['column_name'] for r in rows])
    await conn.close()

asyncio.run(run())
