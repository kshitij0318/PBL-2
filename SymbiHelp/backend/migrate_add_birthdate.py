#!/usr/bin/env python3
"""
Migration to add birthdate column to users table
"""
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import os
from pathlib import Path

# Load environment variables
env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path, override=True)

# Database configuration
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://postgres:guru1803@localhost:5432/symbihelp?sslmode=disable')

def run_migration():
    """Run the migration to add birthdate column"""
    try:
        # Create engine
        engine = create_engine(DATABASE_URL)
        
        with engine.connect() as connection:
            print("Starting birthdate migration...")
            
            # Check if birthdate column exists in users table
            result = connection.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'users' AND column_name = 'birthdate'
            """))
            
            if not result.fetchone():
                print("Adding birthdate column to users table...")
                connection.execute(text("""
                    ALTER TABLE users 
                    ADD COLUMN birthdate DATE
                """))
                print("✓ birthdate column added to users table")
            else:
                print("✓ birthdate column already exists in users table")
            
            # Commit the changes
            connection.commit()
            print("\nMigration completed successfully!")
            
    except Exception as e:
        print(f"Error during migration: {str(e)}")

if __name__ == "__main__":
    print("Starting database migration...")
    run_migration()

