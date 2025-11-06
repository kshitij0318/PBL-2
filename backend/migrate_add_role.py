#!/usr/bin/env python3
"""
Database migration script to add role column to users table
"""
import os
import sys
from sqlalchemy import text
from dotenv import load_dotenv

# Add the current directory to the path so we can import from main
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from main import app, db

def migrate_add_role_column():
    """Add role column to users table and set default values"""
    with app.app_context():
        try:
            # Check if role column already exists
            result = db.session.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'users' AND column_name = 'role'
            """))
            
            if result.fetchone():
                print("Role column already exists. Skipping migration.")
                return
            
            # Add role column
            print("Adding role column to users table...")
            db.session.execute(text("""
                ALTER TABLE users 
                ADD COLUMN role VARCHAR(50) DEFAULT 'mother' NOT NULL
            """))
            
            # Update existing users based on is_admin flag
            print("Updating existing users with appropriate roles...")
            db.session.execute(text("""
                UPDATE users 
                SET role = CASE 
                    WHEN is_admin = true THEN 'admin'
                    ELSE 'mother'
                END
            """))
            
            db.session.commit()
            print("Migration completed successfully!")
            
        except Exception as e:
            db.session.rollback()
            print(f"Migration failed: {str(e)}")
            raise

if __name__ == "__main__":
    load_dotenv()
    migrate_add_role_column()
