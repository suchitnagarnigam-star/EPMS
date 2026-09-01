import asyncio, asyncpg, os
from dotenv import load_dotenv

load_dotenv('Backend/.env')

async def run():
    conn = await asyncpg.connect(os.getenv('DATABASE_URL'))
    for table in ['data_quality', 'dashboard_users', 'fact_works']:
        cols = await conn.fetch("SELECT column_name FROM information_schema.columns WHERE table_name=$1;", table)
        consts = await conn.fetch("SELECT constraint_name FROM information_schema.table_constraints WHERE table_name = $1;", table)
        print(f"=== {table} ===")
        print("Columns:", [r['column_name'] for r in cols])
        print("Constraints:", [r['constraint_name'] for r in consts])
    
    # Check definition of constraint uq_data_quality_work_id_flags
    uq = await conn.fetch("""
        SELECT pg_get_constraintdef(c.oid) as def
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        WHERE t.relname = 'data_quality';
    """)
    print("data_quality constraint definitions:", [r['def'] for r in uq])
    await conn.close()

asyncio.run(run())

