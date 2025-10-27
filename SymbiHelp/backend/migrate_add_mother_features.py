#!/usr/bin/env python3
"""
Migration script to add mother-specific features to the database.
This script adds:
1. due_date column to users table
2. mother_health_logs table
"""

import os
import sys
from datetime import datetime
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database configuration
DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    print("Error: DATABASE_URL environment variable not set")
    sys.exit(1)

# Update the URL for SQLAlchemy
DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://")

def run_migration():
    """Run the migration to add mother-specific features."""
    try:
        # Create engine
        engine = create_engine(DATABASE_URL, connect_args={'sslmode': 'require'})
        
        with engine.connect() as connection:
            print("Starting migration...")
            
            # Check if due_date column exists in users table
            result = connection.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'users' AND column_name = 'due_date'
            """))
            
            if not result.fetchone():
                print("Adding due_date column to users table...")
                connection.execute(text("""
                    ALTER TABLE users 
                    ADD COLUMN due_date DATE
                """))
                print("✓ due_date column added to users table")
            else:
                print("✓ due_date column already exists in users table")
            
            # Check if mother_health_logs table exists
            result = connection.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_name = 'mother_health_logs'
            """))
            
            if not result.fetchone():
                print("Creating mother_health_logs table...")
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
                print("✓ mother_health_logs table created")
            else:
                print("✓ mother_health_logs table already exists")
            
            # Commit the changes
            connection.commit()
            print("Migration completed successfully!")
            
    except Exception as e:
        print(f"Error during migration: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    run_migration()
