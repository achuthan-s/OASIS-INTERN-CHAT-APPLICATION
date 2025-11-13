
import csv
import os
from datetime import datetime
import bcrypt

class Database:
    def __init__(self, config):
        self.config = config
        self._init_files()
    
    def _init_files(self):
        """Initialize CSV files with headers if they don't exist"""
        files = {
            self.config.USERS_CSV: ['id', 'username', 'email', 'password', 'created_at', 'avatar'],
            self.config.MESSAGES_CSV: ['id', 'room_id', 'user_id', 'username', 'message', 'message_type', 'timestamp', 'encrypted'],
            self.config.CHAT_ROOMS_CSV: ['id', 'name', 'description', 'created_by', 'created_at', 'is_private']
        }
        
        for file_path, headers in files.items():
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            if not os.path.exists(file_path):
                with open(file_path, 'w', newline='', encoding='utf-8') as f:
                    writer = csv.DictWriter(f, fieldnames=headers)
                    writer.writeheader()
    
    def _read_csv(self, file_path):
        """Read CSV file and return list of dictionaries"""
        try:
            with open(file_path, 'r', newline='', encoding='utf-8') as f:
                return list(csv.DictReader(f))
        except FileNotFoundError:
            return []
    
    def _write_csv(self, file_path, data):
        """Write list of dictionaries to CSV file"""
        with open(file_path, 'w', newline='', encoding='utf-8') as f:
            if data:
                writer = csv.DictWriter(f, fieldnames=data[0].keys())
                writer.writeheader()
                writer.writerows(data)
    
    def create_user(self, username, email, password):
        """Create new user with hashed password"""
        users = self._read_csv(self.config.USERS_CSV)
        
        # Check if user exists
        if any(user['username'] == username for user in users):
            return False, "Username already exists"
        if any(user['email'] == email for user in users):
            return False, "Email already exists"
        
        # Hash password
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        user_data = {
            'id': str(len(users) + 1),
            'username': username,
            'email': email,
            'password': hashed_password,
            'created_at': datetime.now().isoformat(),
            'avatar': f'https://ui-avatars.com/api/?name={username}&background=4F46E5&color=fff'
        }
        
        users.append(user_data)
        self._write_csv(self.config.USERS_CSV, users)
        return True, user_data
    
    def authenticate_user(self, username, password):
        """Authenticate user with username and password"""
        users = self._read_csv(self.config.USERS_CSV)
        
        for user in users:
            if user['username'] == username:
                if bcrypt.checkpw(password.encode('utf-8'), user['password'].encode('utf-8')):
                    return True, user
                else:
                    return False, "Invalid password"
        
        return False, "User not found"
    
    def get_user_by_id(self, user_id):
        """Get user by ID"""
        users = self._read_csv(self.config.USERS_CSV)
        return next((user for user in users if user['id'] == user_id), None)
    
    def save_message(self, room_id, user_id, username, message, message_type='text', encrypted=False):
        """Save message to CSV"""
        messages = self._read_csv(self.config.MESSAGES_CSV)
        
        message_data = {
            'id': str(len(messages) + 1),
            'room_id': room_id,
            'user_id': user_id,
            'username': username,
            'message': message,
            'message_type': message_type,
            'timestamp': datetime.now().isoformat(),
            'encrypted': str(encrypted).lower()
        }
        
        messages.append(message_data)
        self._write_csv(self.config.MESSAGES_CSV, messages)
        return message_data
    
    def get_messages(self, room_id, limit=100):
        """Get messages for a room"""
        messages = self._read_csv(self.config.MESSAGES_CSV)
        room_messages = [msg for msg in messages if msg['room_id'] == room_id]
        return sorted(room_messages, key=lambda x: x['timestamp'])[-limit:]
    
    def get_chat_rooms(self):
        """Get all chat rooms"""
        return self._read_csv(self.config.CHAT_ROOMS_CSV)
    
    def create_chat_room(self, name, description, created_by, is_private=False):
        """Create new chat room"""
        rooms = self._read_csv(self.config.CHAT_ROOMS_CSV)
        
        room_data = {
            'id': str(len(rooms) + 1),
            'name': name,
            'description': description,
            'created_by': created_by,
            'created_at': datetime.now().isoformat(),
            'is_private': str(is_private).lower()
        }
        
        rooms.append(room_data)
        self._write_csv(self.config.CHAT_ROOMS_CSV, rooms)
        return room_data