#!/usr/bin/env python3
"""
Script to set up environment variables for SymbiHelp Backend
This script creates a .env file with the required environment variables
"""

import os
import secrets
import string

def generate_jwt_secret():
    """Generate a secure JWT secret key"""
    return ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(32))

def create_env_file():
    """Create .env file with environment variables"""
    env_content = f"""# Environment Variables for SymbiHelp Backend
# Generated automatically - update with your actual values

# Database Configuration
DATABASE_URL=postgresql://username:password@host:port/database_name

# JWT Secret Key (generated automatically)
JWT_SECRET_KEY={generate_jwt_secret()}

# Groq AI API Key (required for AI functionality)
# Get your API key from https://console.groq.com/
GROQ_API_KEY=your_groq_api_key_here

# Flask Environment
FLASK_ENV=production

# Optional: Logging Level
LOG_LEVEL=INFO
"""
    
    env_file_path = os.path.join(os.path.dirname(__file__), '.env')
    
    if os.path.exists(env_file_path):
        print(f"⚠️  .env file already exists at {env_file_path}")
        response = input("Do you want to overwrite it? (y/N): ").strip().lower()
        if response != 'y':
            print("❌ Setup cancelled. No changes made.")
            return False
    
    try:
        with open(env_file_path, 'w') as f:
            f.write(env_content)
        print(f"✅ .env file created successfully at {env_file_path}")
        print("\n📝 Next steps:")
        print("1. Update DATABASE_URL with your actual PostgreSQL connection string")
        print("2. Verify other settings are correct")
        print("3. Never commit the .env file to version control")
        return True
    except Exception as e:
        print(f"❌ Error creating .env file: {e}")
        return False

def main():
    print("🔧 SymbiHelp Backend Environment Setup")
    print("=" * 40)
    
    if create_env_file():
        print("\n🎉 Environment setup complete!")
        print("\n⚠️  Important Security Notes:")
        print("- Keep your .env file secure and never commit it to Git")
        print("- The JWT_SECRET_KEY has been generated automatically")
        print("- Update DATABASE_URL with your actual database connection")
        print("- The Groq API key is already configured")
    else:
        print("\n❌ Setup failed. Please check the error messages above.")

if __name__ == "__main__":
    main()
