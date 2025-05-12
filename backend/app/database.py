from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import QueuePool
import os
import logging
import sqlalchemy.orm

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Use PACER-specific environment variable to avoid conflicts
# First try PACER_DATABASE_URL, then fall back to DATABASE_URL, then use default SQLite
SQLALCHEMY_DATABASE_URL = os.getenv("PACER_DATABASE_URL", 
                                   os.getenv("DATABASE_URL", 
                                           "sqlite:///./pacer_game.db"))

print(f"\n\nPACER DATABASE URL: {SQLALCHEMY_DATABASE_URL}\n\n")

# Configure SQLAlchemy engine with improved connection pool settings
engine_kwargs = {
    # Increase pool size for better handling of WebSocket connections
    "pool_size": 20,
    "max_overflow": 30,
    # Set timeouts to avoid connection issues
    "pool_timeout": 60,
    "pool_recycle": 1800,  # 30 minutes
    "pool_pre_ping": True,  # Verify connections before using them
}

# Use different settings for SQLite
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    # SQLite doesn't support the same pool settings
    engine_kwargs = {
        "connect_args": {"check_same_thread": False},
        "poolclass": QueuePool,
        "pool_size": 20,
        "max_overflow": 30,
        "pool_recycle": 1800,
        "pool_pre_ping": True
    }

# Create engine with appropriate settings
engine = create_engine(SQLALCHEMY_DATABASE_URL, **engine_kwargs)

# Configure session with expire_on_commit=False to keep objects usable after commit
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, expire_on_commit=False)

# Base class for models
Base = declarative_base()

# Initialize variables to avoid reference errors
async_engine = None

# Try to import async SQLAlchemy modules
try:
    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
    HAS_ASYNC_DB = True
except ImportError:
    logger.warning("SQLAlchemy async support not available")
    HAS_ASYNC_DB = False

# Try to set up async database engine
if HAS_ASYNC_DB:
    try:
        # Check if aiosqlite is available
        if SQLALCHEMY_DATABASE_URL.startswith("sqlite:///"):
            try:
                import aiosqlite
                ASYNC_DB_URL = SQLALCHEMY_DATABASE_URL.replace("sqlite:///", "sqlite+aiosqlite:///")
            except ImportError:
                logger.warning("aiosqlite not installed, async SQLite support will be disabled")
                HAS_ASYNC_DB = False
        elif SQLALCHEMY_DATABASE_URL.startswith("postgresql:"):
            try:
                import asyncpg
                ASYNC_DB_URL = SQLALCHEMY_DATABASE_URL.replace("postgresql:", "postgresql+asyncpg:")
            except ImportError:
                logger.warning("asyncpg not installed, async PostgreSQL support will be disabled")
                HAS_ASYNC_DB = False
        else:
            # Fallback for other database types
            ASYNC_DB_URL = SQLALCHEMY_DATABASE_URL
    except Exception as e:
        logger.error(f"Error setting up async database URL: {e}")
        HAS_ASYNC_DB = False
        
# Create async engine if all dependencies are available
if HAS_ASYNC_DB:
    try:
        # Create async engine
        async_engine = create_async_engine(
            ASYNC_DB_URL,
            echo=False,
            pool_size=20,
            max_overflow=30
        )
        
        # Create async session factory
        AsyncSessionLocal = sessionmaker(
            async_engine, 
            class_=AsyncSession, 
            expire_on_commit=False
        )
        
        logger.info("Async database support initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize async database engine: {e}")
        HAS_ASYNC_DB = False

# Add event listeners for better connection tracking
@event.listens_for(engine, "checkout")
def checkout(dbapi_connection, connection_record, connection_proxy):
    logging.debug("Database connection checked out")

@event.listens_for(engine, "checkin")
def checkin(dbapi_connection, connection_record):
    logging.debug("Database connection checked in")

# Event listener to catch when sessions are used after they've been closed
@event.listens_for(sqlalchemy.orm.Session, "after_soft_rollback")
def _warn_after_rollback(session, previous_transaction):
    if not session.is_active:
        logger.warning("DB session used after it was closed! This can lead to data not being saved.")
        # Log stack trace to help identify where this is happening
        import traceback
        logger.warning(f"Stack trace: {traceback.format_stack()}")

# Dependency for getting DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        # Ensure connections are properly closed
        db.close()

# Dependency for getting async DB session
async def get_async_db():
    if not HAS_ASYNC_DB:
        logger.warning("Attempted to use async database but support is not available")
        raise RuntimeError("Async database support is not available")
        
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close() 