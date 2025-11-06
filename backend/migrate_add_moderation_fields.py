#!/usr/bin/env python3
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
from pathlib import Path
import os

env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path, override=True)

DATABASE_URL = os.getenv('DATABASE_URL')

SQL = """
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS is_muted BOOLEAN DEFAULT FALSE;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS muted_until TIMESTAMP NULL;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE;
"""

def run():
    engine = create_engine(DATABASE_URL.replace("postgres://", "postgresql://"), pool_pre_ping=True)
    with engine.connect() as conn:
        conn.execute(text(SQL))
        conn.commit()
        print('✅ Moderation fields added to users table')

if __name__ == '__main__':
    run()


