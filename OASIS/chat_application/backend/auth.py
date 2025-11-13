import jwt
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify

class AuthService:
    def __init__(self, config):
        self.config = config
    
    def generate_token(self, user_id, username):
        """Generate JWT token"""
        payload = {
            'user_id': user_id,
            'username': username,
            'exp': datetime.utcnow() + self.config.JWT_ACCESS_TOKEN_EXPIRES,
            'iat': datetime.utcnow()
        }
        return jwt.encode(payload, self.config.JWT_SECRET_KEY, algorithm='HS256')
    
    def verify_token(self, token):
        """Verify JWT token"""
        try:
            payload = jwt.decode(token, self.config.JWT_SECRET_KEY, algorithms=['HS256'])
            return payload
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None
    
    @staticmethod
    def token_required(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            token = request.headers.get('Authorization')
            
            if not token:
                return jsonify({'error': 'Token is missing'}), 401
            
            try:
                if token.startswith('Bearer '):
                    token = token[7:]
                
                from flask import current_app
                auth_service = current_app.config['auth_service']
                user_data = auth_service.verify_token(token)
                
                if not user_data:
                    return jsonify({'error': 'Invalid token'}), 401
                
                request.user_data = user_data
            except Exception as e:
                return jsonify({'error': 'Token is invalid'}), 401
            
            return f(*args, **kwargs)
        return decorated