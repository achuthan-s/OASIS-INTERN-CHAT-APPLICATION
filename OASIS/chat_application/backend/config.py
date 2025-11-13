import os
from datetime import timedelta

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-2024'
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or 'jwt-secret-2024'
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    
    # File paths
    USERS_CSV = 'data/users.csv'
    MESSAGES_CSV = 'data/messages.csv'
    CHAT_ROOMS_CSV = 'data/chat_rooms.csv'
    
    # Encryption
    ENCRYPTION_KEY = b'16byteencryptionkey'  # In production, use env variable