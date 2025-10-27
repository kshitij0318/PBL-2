#!/usr/bin/env python3
"""
Database migration script to add:
1. share_consent column to users table
2. nurse_mother_assignments table
"""

import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database configuration
DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    print("Error: DATABASE_URL environment variable not set")
    sys.exit(1)

# Replace postgres:// with postgresql:// for newer SQLAlchemy versions
if DATABASE_URL.startswith('postgres://'):
    DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)

def run_migration():
    """Run the database migration"""
    try:
        # Create database engine
        engine = create_engine(DATABASE_URL, connect_args={'sslmode': 'require'})
        
        with engine.connect() as connection:
            print("Connected to database successfully")
            
            # Check if share_consent column exists
            result = connection.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'users' AND column_name = 'share_consent'
            """))
            
            if not result.fetchone():
                print("Adding share_consent column to users table...")
                connection.execute(text("""
                    ALTER TABLE users 
                    ADD COLUMN share_consent BOOLEAN DEFAULT FALSE
                """))
                print("✓ share_consent column added successfully")
            else:
                print("✓ share_consent column already exists")
            
            # Check if nurse_mother_assignments table exists
            result = connection.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_name = 'nurse_mother_assignments'
            """))
            
            if not result.fetchone():
                print("Creating nurse_mother_assignments table...")
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
                print("✓ nurse_mother_assignments table created successfully")
            else:
                print("✓ nurse_mother_assignments table already exists")
            
            # Commit the changes
            connection.commit()
            print("\nMigration completed successfully!")
            
    except Exception as e:
        print(f"Error during migration: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    print("Starting database migration...")
    run_migration()
