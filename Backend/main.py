import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import asyncpg

from database import DATABASE_URL, get_pool_params
from routers import sync, kpis, works, contractor, data_quality, admin

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize the asyncpg connection pool
    if not DATABASE_URL:
        logger.error("DATABASE_URL is not set!")
        raise ValueError("DATABASE_URL is not set in environment variables")
        
    logger.info("Initializing database pool...")
    pool_params = get_pool_params(DATABASE_URL)
    
    try:
        app.state.db_pool = await asyncpg.create_pool(**pool_params)
        logger.info("Database pool initialized successfully.")
    except Exception as e:
        logger.error(f"Failed to initialize database connection pool: {e}")
        raise e
        
    yield
    
    # Shutdown: Close the database pool
    logger.info("Closing database pool...")
    if hasattr(app.state, "db_pool") and app.state.db_pool:
        await app.state.db_pool.close()
        logger.info("Database pool closed.")

app = FastAPI(
    title="MCL Analytics API",
    description="Backend API for Ludhiana Municipal Corporation Infrastructure Analytics Platform",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for all origins in development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(sync.router)
app.include_router(kpis.router)
app.include_router(works.router)
app.include_router(contractor.router)
app.include_router(data_quality.router)
app.include_router(admin.router)

@app.get("/health")
async def health_check():
    return {"status": "healthy", "database_connected": hasattr(app.state, "db_pool") and app.state.db_pool is not None}
