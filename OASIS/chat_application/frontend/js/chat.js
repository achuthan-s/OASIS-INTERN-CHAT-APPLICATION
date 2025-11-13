class ChatApp {
    constructor() {
        this.socket = null;
        this.currentUser = JSON.parse(localStorage.getItem('user'));
        this.currentRoom = null;
        this.rooms = [];
        this.onlineUsers = new Set();
        this.typingTimeout = null;
        
        this.init();
    }
    
    async init() {
        await this.loadRooms();
        this.renderChatInterface();
        this.connectSocket();
        
        // Join general room by default
        if (this.rooms.length > 0) {
            this.joinRoom(this.rooms[0]);
        }
    }
    
    async loadRooms() {
        try {
            const response = await this.apiCall('/rooms');
            this.rooms = response.rooms;
        } catch (error) {
            console.error('Failed to load rooms:', error);
        }
    }
    
    renderChatInterface() {
        const chatHTML = `
            <div class="sidebar">
                <div class="sidebar-header">
                    <div class="user-info">
                        <div class="user-avatar">
                            ${this.currentUser.username.charAt(0).toUpperCase()}
                        </div>
                        <div class="user-details">
                            <h3>${this.currentUser.username}</h3>
                            <p>Online</p>
                        </div>
                    </div>
                    <button class="btn-logout" onclick="chatApp.logout()">Logout</button>
                </div>
                
                <div class="rooms-list" id="roomsList">
                    ${this.rooms.map(room => `
                        <div class="room-item" data-room-id="${room.id}" onclick="chatApp.joinRoom(${JSON.stringify(room).replace(/"/g, '&quot;')})">
                            <div class="room-header">
                                <div class="room-name">${room.name}</div>
                            </div>
                            <div class="room-meta">${room.description}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="chat-area">
                <div class="chat-header">
                    <div class="room-info">
                        <h2 id="currentRoomName">Select a room</h2>
                        <p id="currentRoomDescription">Choose a chat room to start messaging</p>
                    </div>
                    <div class="online-indicator hidden" id="onlineIndicator">
                        <div class="indicator-dot"></div>
                        <span id="onlineCount">0 users online</span>
                    </div>
                </div>
                
                <div class="messages-container" id="messagesContainer">
                    <div class="welcome-message">
                        <p>Welcome to ChatApp! Select a room to start chatting.</p>
                    </div>
                </div>
                
                <div class="typing-indicator" id="typingIndicator"></div>
                
                <div class="message-input-container hidden" id="messageInputContainer">
                    <form class="message-input-form" id="messageForm">
                        <div class="message-input-wrapper">
                            <textarea 
                                class="message-input" 
                                id="messageInput" 
                                placeholder="Type your message..." 
                                rows="1"
                            ></textarea>
                            <div class="message-options">
                                <label class="encryption-toggle">
                                    <input type="checkbox" id="encryptToggle">
                                    <span>Encrypt message</span>
                                </label>
                                <button type="submit" class="send-btn" id="sendBtn">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        document.getElementById('chatContainer').innerHTML = chatHTML;
        this.setupChatEventListeners();
    }
    
    connectSocket() {
        this.socket = io(window.location.origin);
        
        this.socket.on('connect', () => {
            console.log('Connected to server');
        });
        
        this.socket.on('new_message', (data) => {
            this.displayMessage(data);
        });
        
        this.socket.on('user_joined', (data) => {
            this.showSystemMessage(data.message);
        });
        
        this.socket.on('user_left', (data) => {
            this.showSystemMessage(data.message);
        });
        
        this.socket.on('online_users', (data) => {
            this.updateOnlineUsers(data.users);
        });
        
        this.socket.on('user_typing', (data) => {
            this.showTypingIndicator(data);
        });
        
        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
        });
    }
    
    joinRoom(room) {
        if (this.currentRoom) {
            this.leaveCurrentRoom();
        }
        
        this.currentRoom = room;
        this.updateRoomUI();
        this.loadRoomMessages();
        this.showMessageInput();
        
        // Join room via socket
        this.socket.emit('join_room', {
            room_id: room.id,
            user_data: this.currentUser
        });
    }
    
    leaveCurrentRoom() {
        if (this.currentRoom && this.socket) {
            this.socket.emit('leave_room', {
                room_id: this.currentRoom.id,
                user_data: this.currentUser
            });
        }
    }
    
    updateRoomUI() {
        // Update active room in sidebar
        document.querySelectorAll('.room-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-room-id="${this.currentRoom.id}"]`).classList.add('active');
        
        // Update chat header
        document.getElementById('currentRoomName').textContent = this.currentRoom.name;
        document.getElementById('currentRoomDescription').textContent = this.currentRoom.description;
        document.getElementById('onlineIndicator').classList.remove('hidden');
    }
    
    async loadRoomMessages() {
        try {
            const response = await this.apiCall(`/rooms/${this.currentRoom.id}/messages`);
            const messagesContainer = document.getElementById('messagesContainer');
            messagesContainer.innerHTML = '';
            
            if (response.messages.length === 0) {
                messagesContainer.innerHTML = `
                    <div class="welcome-message">
                        <p>No messages yet. Start the conversation!</p>
                    </div>
                `;
            } else {
                response.messages.forEach(message => {
                    this.displayMessage(message);
                });
            }
            
            this.scrollToBottom();
        } catch (error) {
            console.error('Failed to load messages:', error);
        }
    }
    
    displayMessage(message) {
        const messagesContainer = document.getElementById('messagesContainer');
        const isOwnMessage = message.user_id === this.currentUser.id;
        
        const messageElement = document.createElement('div');
        messageElement.className = `message ${isOwnMessage ? 'own' : 'other'}`;
        messageElement.innerHTML = `
            <div class="message-header">
                <span class="message-sender">${message.username}</span>
                <span class="message-time">${this.formatTime(message.timestamp)}</span>
            </div>
            <div class="message-content">${this.escapeHtml(message.message)}</div>
            ${message.encrypted === 'true' ? '<div class="encryption-badge">🔒 Encrypted</div>' : ''}
        `;
        
        // Remove welcome message if it exists
        const welcomeMessage = messagesContainer.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }
        
        messagesContainer.appendChild(messageElement);
        this.scrollToBottom();
    }
    
    showSystemMessage(message) {
        const messagesContainer = document.getElementById('messagesContainer');
        const systemMessage = document.createElement('div');
        systemMessage.className = 'system-message';
        systemMessage.textContent = message;
        messagesContainer.appendChild(systemMessage);
        this.scrollToBottom();
    }
    
    showMessageInput() {
        document.getElementById('messageInputContainer').classList.remove('hidden');
    }
    
    setupChatEventListeners() {
        const messageForm = document.getElementById('messageForm');
        const messageInput = document.getElementById('messageInput');
        
        messageForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendMessage();
        });
        
        messageInput.addEventListener('input', (e) => {
            this.adjustTextareaHeight(e.target);
            this.handleTyping();
        });
        
        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Focus on message input when room is selected
        messageInput.focus();
    }
    
    adjustTextareaHeight(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
    
    handleTyping() {
        if (this.currentRoom && this.socket) {
            this.socket.emit('typing', {
                room_id: this.currentRoom.id,
                username: this.currentUser.username,
                is_typing: true
            });
            
            // Clear typing indicator after 2 seconds
            clearTimeout(this.typingTimeout);
            this.typingTimeout = setTimeout(() => {
                this.socket.emit('typing', {
                    room_id: this.currentRoom.id,
                    username: this.currentUser.username,
                    is_typing: false
                });
            }, 2000);
        }
    }
    
    showTypingIndicator(data) {
        const typingIndicator = document.getElementById('typingIndicator');
        if (data.is_typing) {
            typingIndicator.textContent = `${data.username} is typing...`;
        } else {
            typingIndicator.textContent = '';
        }
    }
    
    sendMessage() {
        const messageInput = document.getElementById('messageInput');
        const encryptToggle = document.getElementById('encryptToggle');
        const message = messageInput.value.trim();
        
        if (!message || !this.currentRoom) return;
        
        this.socket.emit('send_message', {
            room_id: this.currentRoom.id,
            user_id: this.currentUser.id,
            username: this.currentUser.username,
            message: message,
            encrypt: encryptToggle.checked
        });
        
        // Clear input and reset height
        messageInput.value = '';
        messageInput.style.height = 'auto';
        
        // Uncheck encrypt toggle
        encryptToggle.checked = false;
        
        // Hide typing indicator
        document.getElementById('typingIndicator').textContent = '';
    }
    
    updateOnlineUsers(userIds) {
        this.onlineUsers = new Set(userIds);
        const onlineCount = document.getElementById('onlineCount');
        const count = this.onlineUsers.size;
        onlineCount.textContent = `${count} user${count !== 1 ? 's' : ''} online`;
    }
    
    scrollToBottom() {
        const messagesContainer = document.getElementById('messagesContainer');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    formatTime(timestamp) {
        return new Date(timestamp).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
    
    async apiCall(endpoint, options = {}) {
        const token = localStorage.getItem('token');
        const response = await fetch(`${window.location.origin}/api${endpoint}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        if (!response.ok) {
            throw new Error(`API call failed: ${response.statusText}`);
        }
        
        return await response.json();
    }
    
    logout() {
        if (this.socket) {
            this.socket.disconnect();
        }
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        location.reload();
    }
}

// Initialize chat app when the script loads
const chatApp = new ChatApp();