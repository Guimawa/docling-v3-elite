import asyncio
import os
import sys
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv

# Add apps/api to path to import core.db_url
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from core.db_url import strip_postgresql_dsn_query

async def test_db():
    load_dotenv(os.path.join(os.path.dirname(__file__), "../../.env"))
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("DATABASE_URL not found in .env")
        return
    
    print(f"Original URL: {db_url}")
    stripped_url = strip_postgresql_dsn_query(db_url)
    print(f"Stripped URL: {stripped_url}")
    
    # Adapt for asyncpg
    if stripped_url.startswith("postgresql://"):
        async_url = stripped_url.replace("postgresql://", "postgresql+asyncpg://")
    else:
        async_url = stripped_url

    try:
        # For Neon, we usually need SSL. asyncpg uses ssl=True if needed
        # But SQLAlchemy create_async_engine needs to handle it.
        # usually just pass connect_args
        connect_args = {}
        if ".neon.tech" in db_url:
            connect_args["ssl"] = True

        engine = create_async_engine(async_url, connect_args=connect_args)
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT 1"))
            print(f"Connection successful: {result.scalar()}")
        await engine.dispose()
    except Exception as e:
        print(f"Connection failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_db())
