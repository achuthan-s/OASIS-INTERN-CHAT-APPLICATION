from cryptography.fernet import Fernet
import base64
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import os

class EncryptionService:
    def __init__(self, config):
        self.config = config
        self.fernet = self._create_fernet()
    
    def _create_fernet(self):
        """Create Fernet instance for encryption"""
        password = self.config.ENCRYPTION_KEY
        salt = b'salt_1234567890'  # In production, use random salt
        
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(password))
        return Fernet(key)
    
    def encrypt_message(self, message):
        """Encrypt message"""
        encrypted = self.fernet.encrypt(message.encode('utf-8'))
        return encrypted.decode('utf-8')
    
    def decrypt_message(self, encrypted_message):
        """Decrypt message"""
        try:
            decrypted = self.fernet.decrypt(encrypted_message.encode('utf-8'))
            return decrypted.decode('utf-8')
        except Exception:
            return encrypted_message  # Return original if decryption fails