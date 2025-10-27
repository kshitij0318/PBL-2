#!/usr/bin/env python3
"""
Comprehensive database migration script to run all migrations in the correct order.
This script will:
1. Add role column to users table
2. Add due_date column to users table
3. Add share_consent column to users table
4. Create mother_health_logs table
5. Create nurse_mother_assignments table
6. Create test_results table
7. Create test_scores table
"""

import os
import sys
from pathlib import Path
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load environment variables from .env file in the same directory
env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path, override=True)

# Debug: Print current working directory and files
print("Current working directory:", os.getcwd())
print("Files in directory:", os.listdir())
print("\nEnvironment variables:")
for key, value in os.environ.items():
    if 'DATABASE' in key or 'POSTGRES' in key:
        print(f"{key}: {value}")

# Hardcoded database URL for testing with SSL disabled
DATABASE_URL = "postgresql://postgres:guru1803@localhost:5432/symbihelp?sslmode=disable"
print(f"\n🔗 Using hardcoded database URL: {DATABASE_URL}\n")

# Add SSL configuration
db_config = {
    'url': DATABASE_URL,
    'pool_pre_ping': True,
    'connect_args': {
        'sslmode': 'disable',
        'connect_timeout': 5
    }
}

# Create engine with configuration
engine = create_engine(
    db_config['url'],
    pool_pre_ping=db_config['pool_pre_ping'],
    connect_args=db_config['connect_args']
)

def run_migrations():
    """Run all database migrations in the correct order"""
    try:
        # Use the pre-configured engine
        with engine.connect() as connection:
            print("Connected to database successfully")
            print("Starting comprehensive migration...\n")
            
            # Migration 1: Add role column
            print("1. Checking/Adding role column...")
            result = connection.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'users' AND column_name = 'role'
            """))
            
            if not result.fetchone():
                print("   Adding role column to users table...")
                connection.execute(text("""
                    ALTER TABLE users 
                    ADD COLUMN role VARCHAR(50) DEFAULT 'mother' NOT NULL
                """))
                
                # Update existing users based on is_admin flag
                connection.execute(text("""
                    UPDATE users 
                    SET role = CASE 
                        WHEN is_admin = true THEN 'admin'
                        ELSE 'mother'
                    END
                """))
                print("   ✓ role column added and existing users updated")
            else:
                print("   ✓ role column already exists")
            
            # Migration 2: Add due_date column
            print("\n2. Checking/Adding due_date column...")
            result = connection.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'users' AND column_name = 'due_date'
            """))
            
            if not result.fetchone():
                print("   Adding due_date column to users table...")
                connection.execute(text("""
                    ALTER TABLE users 
                    ADD COLUMN due_date DATE
                """))
                print("   ✓ due_date column added")
            else:
                print("   ✓ due_date column already exists")
            
            # Migration 3: Add share_consent column
            print("\n3. Checking/Adding share_consent column...")
            result = connection.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'users' AND column_name = 'share_consent'
            """))
            
            if not result.fetchone():
                print("   Adding share_consent column to users table...")
                connection.execute(text("""
                    ALTER TABLE users 
                    ADD COLUMN share_consent BOOLEAN DEFAULT FALSE
                """))
                print("   ✓ share_consent column added")
            else:
                print("   ✓ share_consent column already exists")
            
            # Migration 4: Create mother_health_logs table
            print("\n4. Checking/Creating mother_health_logs table...")
            result = connection.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_name = 'mother_health_logs'
            """))
            
            if not result.fetchone():
                print("   Creating mother_health_logs table...")
                connection.execute(text("""
                    CREATE TABLE mother_health_logs (
                        id SERIAL PRIMARY KEY,
                        user_id INTEGER NOT NULL,
                        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        data JSONB NOT NULL,
                        consent_shared BOOLEAN DEFAULT FALSE,
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                    )
                """))
                print("   ✓ mother_health_logs table created")
            else:
                print("   ✓ mother_health_logs table already exists")
            
            # Migration 5: Create nurse_mother_assignments table
            print("\n5. Checking/Creating nurse_mother_assignments table...")
            result = connection.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_name = 'nurse_mother_assignments'
            """))
            
            if not result.fetchone():
                print("   Creating nurse_mother_assignments table...")
                connection.execute(text("""
                    CREATE TABLE nurse_mother_assignments (
                        id SERIAL PRIMARY KEY,
                        nurse_id INTEGER NOT NULL,
                        mother_id INTEGER NOT NULL,
                        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        CONSTRAINT unique_nurse_mother UNIQUE (nurse_id, mother_id),
                        CONSTRAINT fk_nurse_mother_assignments_nurse_id 
                            FOREIGN KEY (nurse_id) REFERENCES users(id) ON DELETE CASCADE,
                        CONSTRAINT fk_nurse_mother_assignments_mother_id 
                            FOREIGN KEY (mother_id) REFERENCES users(id) ON DELETE CASCADE
                    )
                """))
                print("   ✓ nurse_mother_assignments table created")
            else:
                print("   ✓ nurse_mother_assignments table already exists")
            
            # Migration 6: Create test_results table
            print("\n6. Checking/Creating test_results table...")
            result = connection.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_name = 'test_results'
            """))
            
            if not result.fetchone():
                print("   Creating test_results table...")
                connection.execute(text("""
                    CREATE TABLE test_results (
                        id SERIAL PRIMARY KEY,
                        user_id INTEGER NOT NULL,
                        score FLOAT NOT NULL,
                        test_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        risk_level VARCHAR(50) NOT NULL,
                        details JSONB,
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                    )
                """))
                print("   ✓ test_results table created")
            else:
                print("   ✓ test_results table already exists")
            
            # Migration 7: Create test_scores table
            print("\n7. Checking/Creating test_scores table...")
            result = connection.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_name = 'test_scores'
            """))
            
            if not result.fetchone():
                print("   Creating test_scores table...")
                connection.execute(text("""
                    CREATE TABLE test_scores (
                        id SERIAL PRIMARY KEY,
                        user_id INTEGER NOT NULL,
                        score INTEGER NOT NULL,
                        max_score INTEGER DEFAULT 15 NOT NULL,
                        test_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        topics JSONB,
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                    )
                """))
                print("   ✓ test_scores table created")
            else:
                print("   ✓ test_scores table already exists")
            
            # Commit all changes
            connection.commit()
            print("\n🎉 All migrations completed successfully!")
            print("\nDatabase schema is now up to date with the application code.")
            
    except Exception as e:
        print(f"\n❌ Error during migration: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    print("🚀 Starting comprehensive database migration...")
    print("This will ensure all required columns and tables exist.")
    print("=" * 60)
    run_migrations()
