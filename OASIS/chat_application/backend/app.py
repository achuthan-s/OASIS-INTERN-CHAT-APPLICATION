from flask import Flask, request, jsonify, send_from_directory
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_cors import CORS
import os
from config import Config
from database import Database
from encryption import EncryptionService
from auth import AuthService

# Initialize Flask app
app = Flask(__name__)
config = Config()
app.config.from_object(config)

# Enable CORS for local development origins
CORS(
    app,
    resources={r"/api/*": {"origins": [
        "http://localhost:5000",
        "http://127.0.0.1:5000",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ]}},
    supports_credentials=True
)

# Initialize SocketIO
socketio = SocketIO(app, cors_allowed_origins="*", logger=True, engineio_logger=True)

# Initialize services
db = Database(config)
encryption = EncryptionService(config)
auth_service = AuthService(config)
app.config['auth_service'] = auth_service

# Store active users
active_users = {}

# Serve frontend files
@app.route('/')
def serve_frontend():
    return send_from_directory('../frontend', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('../frontend', path)

# Authentication routes
@app.route('/api/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')
        
        if not all([username, email, password]):
            return jsonify({'error': 'All fields are required'}), 400
        
        success, result = db.create_user(username, email, password)
        
        if success:
            token = auth_service.generate_token(result['id'], result['username'])
            return jsonify({
                'message': 'User created successfully',
                'token': token,
                'user': {
                    'id': result['id'],
                    'username': result['username'],
                    'email': result['email'],
                    'avatar': result['avatar']
                }
            }), 201
        else:
            return jsonify({'error': result}), 400
            
    except Exception as e:
        return jsonify({'error': 'Registration failed'}), 500

@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        
        if not all([username, password]):
            return jsonify({'error': 'Username and password are required'}), 400
        
        success, result = db.authenticate_user(username, password)
        
        if success:
            token = auth_service.generate_token(result['id'], result['username'])
            return jsonify({
                'message': 'Login successful',
                'token': token,
                'user': {
                    'id': result['id'],
                    'username': result['username'],
                    'email': result['email'],
                    'avatar': result['avatar']
                }
            }), 200
        else:
            return jsonify({'error': result}), 401
            
    except Exception as e:
        return jsonify({'error': 'Login failed'}), 500

# Chat rooms routes
@app.route('/api/rooms', methods=['GET'])
@auth_service.token_required
def get_rooms():
    try:
        rooms = db.get_chat_rooms()
        return jsonify({'rooms': rooms}), 200
    except Exception as e:
        return jsonify({'error': 'Failed to fetch rooms'}), 500

@app.route('/api/rooms', methods=['POST'])
@auth_service.token_required
def create_room():
    try:
        data = request.get_json()
        name = data.get('name')
        description = data.get('description', '')
        
        if not name:
            return jsonify({'error': 'Room name is required'}), 400
        
        room = db.create_chat_room(
            name=name,
            description=description,
            created_by=request.user_data['user_id']
        )
        
        return jsonify({'room': room}), 201
    except Exception as e:
        return jsonify({'error': 'Failed to create room'}), 500

# Messages routes
@app.route('/api/rooms/<room_id>/messages', methods=['GET'])
@auth_service.token_required
def get_room_messages(room_id):
    try:
        messages = db.get_messages(room_id)
        # Decrypt messages if needed
        for message in messages:
            if message.get('encrypted') == 'true':
                message['message'] = encryption.decrypt_message(message['message'])
        return jsonify({'messages': messages}), 200
    except Exception as e:
        return jsonify({'error': 'Failed to fetch messages'}), 500

# SocketIO events
@socketio.on('connect')
def handle_connect():
    print(f'Client connected: {request.sid}')

@socketio.on('disconnect')
def handle_disconnect():
    user_id = None
    for uid, sid in active_users.items():
        if sid == request.sid:
            user_id = uid
            break
    
    if user_id:
        del active_users[user_id]
        emit('user_offline', {'user_id': user_id}, broadcast=True)
    
    print(f'Client disconnected: {request.sid}')

@socketio.on('join_room')
def handle_join_room(data):
    room_id = data.get('room_id')
    user_data = data.get('user_data')
    
    if room_id and user_data:
        join_room(room_id)
        active_users[user_data['id']] = request.sid
        emit('user_joined', {
            'user': user_data,
            'message': f"{user_data['username']} joined the room"
        }, room=room_id)
        emit('online_users', {'users': list(active_users.keys())}, room=room_id)

@socketio.on('leave_room')
def handle_leave_room(data):
    room_id = data.get('room_id')
    user_data = data.get('user_data')
    
    if room_id and user_data:
        leave_room(room_id)
        emit('user_left', {
            'user': user_data,
            'message': f"{user_data['username']} left the room"
        }, room=room_id)

@socketio.on('send_message')
def handle_send_message(data):
    room_id = data.get('room_id')
    user_id = data.get('user_id')
    username = data.get('username')
    message = data.get('message')
    encrypt = data.get('encrypt', False)
    
    if not all([room_id, user_id, username, message]):
        return
    
    # Encrypt message if requested
    if encrypt:
        message = encryption.encrypt_message(message)
        encrypted_flag = 'true'
    else:
        encrypted_flag = 'false'
    
    # Save message to database
    saved_message = db.save_message(
        room_id,
        user_id,
        username,
        message,
        'text',
        encrypted=encrypt
    )
    saved_message['encrypted'] = encrypted_flag
    
    # Decrypt for broadcasting if needed
    if encrypted_flag == 'true':
        broadcast_message = encryption.decrypt_message(message)
    else:
        broadcast_message = message
    
    # Broadcast message to room
    emit('new_message', {
        'id': saved_message['id'],
        'room_id': room_id,
        'user_id': user_id,
        'username': username,
        'message': broadcast_message,
        'message_type': 'text',
        'timestamp': saved_message['timestamp'],
        'encrypted': encrypted_flag
    }, room=room_id)

@socketio.on('typing')
def handle_typing(data):
    room_id = data.get('room_id')
    username = data.get('username')
    is_typing = data.get('is_typing')
    
    emit('user_typing', {
        'username': username,
        'is_typing': is_typing
    }, room=room_id)

if __name__ == '__main__':
    # Create default rooms if they don't exist
    rooms = db.get_chat_rooms()
    if not rooms:
        db.create_chat_room('General', 'Main chat room for everyone', 'system')
        db.create_chat_room('Random', 'Casual conversations', 'system')
        db.create_chat_room('Tech Talk', 'Discuss technology and programming', 'system')
    
    socketio.run(app, debug=True, port=5000)