import os
import ssl
import logging
import urllib.parse as urlparse
import asyncpg
from dotenv import load_dotenv
from fastapi import Request

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

def get_pool_params(dsn: str):
    if not dsn:
        return {}
    
    cleaned_dsn = dsn
    has_sslmode = "sslmode=" in dsn
    
    if has_sslmode:
        parsed = urlparse.urlparse(dsn)
        query_params = urlparse.parse_qs(parsed.query)
        # Remove sslmode from query params because asyncpg doesn't accept it as a URL query param
        query_params.pop('sslmode', None)
        new_query = urlparse.urlencode(query_params, doseq=True)
        cleaned_dsn = urlparse.urlunparse(parsed._replace(query=new_query))
        
    params = {"dsn": cleaned_dsn}
    # Pass ssl="require" explicitly if sslmode was require, or if neon.tech is in the host
    if has_sslmode or "sslmode=require" in dsn or "neon.tech" in dsn:
        params["ssl"] = "require"
    return params

async def get_db(request: Request):
    """
    FastAPI dependency that yields a database connection from the pool.
    """
    if not hasattr(request.app.state, "db_pool") or not request.app.state.db_pool:
        raise RuntimeError("Database pool is not initialized")
    
    async with request.app.state.db_pool.acquire() as connection:
        yield connection
