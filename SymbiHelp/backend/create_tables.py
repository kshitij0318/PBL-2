#!/usr/bin/env python3
"""
Script to initialize the database tables.
This should be run before running the migrations.
"""
from sqlalchemy import create_engine, text
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path, override=True)

# Database configuration
DATABASE_URL = "postgresql://postgres:guru1803@localhost:5432/symbihelp?sslmode=disable"

# Create tables SQL
SQL_CREATE_TABLES = """
-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'mother' NOT NULL,
    due_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_admin BOOLEAN DEFAULT FALSE,
    share_consent BOOLEAN DEFAULT FALSE
);

-- Create test_results table
CREATE TABLE IF NOT EXISTS test_results (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score FLOAT NOT NULL,
    test_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    risk_level VARCHAR(50) NOT NULL,
    details JSONB
);

-- Create test_scores table
CREATE TABLE IF NOT EXISTS test_scores (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    max_score INTEGER DEFAULT 15 NOT NULL,
    test_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    topics JSONB
);

-- Create mother_health_logs table
CREATE TABLE IF NOT EXISTS mother_health_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data JSONB NOT NULL,
    consent_shared BOOLEAN DEFAULT FALSE
);

-- Create nurse_mother_assignments table
CREATE TABLE IF NOT EXISTS nurse_mother_assignments (
    id SERIAL PRIMARY KEY,
    nurse_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mother_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_nurse_mother UNIQUE (nurse_id, mother_id)
);

-- Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
    id SERIAL PRIMARY KEY,
    mother_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    nurse_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date_time TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' NOT NULL,
    notes TEXT
);
"""

def create_tables():
    """Create all database tables"""
    try:
        print("🔌 Attempting to connect to database...")
        print(f"Database URL: postgresql://postgres:****@localhost:5432/symbihelp")
        
        # Create database engine with explicit parameters
        engine = create_engine(
            "postgresql://postgres:guru1803@localhost:5432/symbihelp",
            pool_pre_ping=True,
            connect_args={
                'sslmode': 'disable',
                'connect_timeout': 5,
                'host': 'localhost',
                'port': '5432'
            }
        )
        
        # Test connection
        with engine.connect() as conn:
            print("✅ Successfully connected to the database")
            print("🛠️  Creating tables...")
            
            # Split the SQL into individual statements and execute them one by one
            for statement in SQL_CREATE_TABLES.split(';'):
                if statement.strip():
                    try:
                        conn.execute(text(statement + ';'))
                        conn.commit()
                    except Exception as e:
                        print(f"⚠️  Warning: {str(e)}")
                        conn.rollback()
            
            print("✅ Database tables created successfully!")
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        print("\nTroubleshooting tips:")
        print("1. Make sure PostgreSQL is running")
        print("2. Verify the database 'symbihelp' exists")
        print("3. Check your PostgreSQL username and password")
        print("4. Ensure PostgreSQL is listening on port 5432")
        print("5. Try connecting manually with: psql -U postgres -h localhost -p 5432 symbihelp")
        raise
    
    """Create all database tables"""
    try:
        # Create database engine
        engine = create_engine(
            DATABASE_URL,
            pool_pre_ping=True,
            connect_args={
                'sslmode': 'disable',
                'connect_timeout': 5
            }
        )
        
        with engine.connect() as conn:
            print("🔌 Connected to database successfully")
            print("🛠️  Creating tables...")
            
            # Execute the SQL to create tables
            conn.execute(text(SQL_CREATE_TABLES))
            conn.commit()
            
            print("✅ Database tables created successfully!")
            print("\nYou can now run the migrations with: python3 run_all_migrations.py")
            
    except Exception as e:
        print(f"❌ Error creating tables: {str(e)}")
        raise

if __name__ == "__main__":
    print("🚀 Starting database setup...")
    print("This will create all required tables in the database.")
    print("=" * 60)
    
    # Print the database URL (with password hidden for security)
    safe_url = DATABASE_URL.replace(
        DATABASE_URL.split('@')[0].split('//')[1].split(':')[1],
        '***'
    )
    print(f"📊 Database: {safe_url}")
    
    # Ask for confirmation
    confirm = input("\nDo you want to continue? (y/n): ")
    if confirm.lower() != 'y':
        print("❌ Operation cancelled by user")
        exit(0)
    
    # Create the tables
    create_tables()
