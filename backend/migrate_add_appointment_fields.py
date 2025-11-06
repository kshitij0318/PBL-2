#!/usr/bin/env python3
"""
Migration script to add missing columns to appointments table.
Adds: requested_date, reschedule_notes, created_at, updated_at
"""
import sys
from pathlib import Path

# Add parent directory to path to import main
sys.path.insert(0, str(Path(__file__).parent))

from main import app, db
from sqlalchemy import text

def run_migration():
    """Add missing columns to appointments table"""
    with app.app_context():
        try:
            with db.engine.connect() as conn:
                # Start transaction
                trans = conn.begin()
                
                try:
                    # Add requested_date column (nullable first, then we'll update existing rows)
                    conn.execute(text("""
                        ALTER TABLE appointments 
                        ADD COLUMN IF NOT EXISTS requested_date TIMESTAMP;
                    """))
                    
                    # For existing rows, set requested_date = date_time if date_time exists
                    conn.execute(text("""
                        UPDATE appointments 
                        SET requested_date = date_time 
                        WHERE requested_date IS NULL AND date_time IS NOT NULL;
                    """))
                    
                    # Now make requested_date NOT NULL (after setting values)
                    # Use a try-except in case it's already NOT NULL
                    try:
                        conn.execute(text("""
                            ALTER TABLE appointments 
                            ALTER COLUMN requested_date SET NOT NULL;
                        """))
                    except Exception:
                        # Column might already be NOT NULL, that's fine
                        pass
                    
                    # Add reschedule_notes column
                    conn.execute(text("""
                        ALTER TABLE appointments 
                        ADD COLUMN IF NOT EXISTS reschedule_notes TEXT;
                    """))
                    
                    # Add created_at column
                    conn.execute(text("""
                        ALTER TABLE appointments 
                        ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
                    """))
                    
                    # Add updated_at column
                    conn.execute(text("""
                        ALTER TABLE appointments 
                        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
                    """))
                    
                    # Make date_time nullable (since it's only set when approved)
                    # Check if it's currently NOT NULL first
                    try:
                        conn.execute(text("""
                            ALTER TABLE appointments 
                            ALTER COLUMN date_time DROP NOT NULL;
                        """))
                    except Exception:
                        # Might already be nullable, that's fine
                        pass
                    
                    # Commit transaction
                    trans.commit()
                    print("✅ Successfully added missing columns to appointments table")
                    print("   - requested_date (TIMESTAMP NOT NULL)")
                    print("   - reschedule_notes (TEXT)")
                    print("   - created_at (TIMESTAMP)")
                    print("   - updated_at (TIMESTAMP)")
                    print("   - Made date_time nullable")
                    
                except Exception as e:
                    trans.rollback()
                    print(f"❌ Error running migration: {str(e)}")
                    raise
                    
        except Exception as e:
            print(f"❌ Error connecting to database: {str(e)}")
            raise

if __name__ == '__main__':
    run_migration()

