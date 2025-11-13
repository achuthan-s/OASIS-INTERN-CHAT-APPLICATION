// Socket.io client is loaded via CDN in the HTML
// This file is for additional socket-related functionality if needed

// Socket event constants
const SOCKET_EVENTS = {
    CONNECT: 'connect',
    DISCONNECT: 'disconnect',
    JOIN_ROOM: 'join_room',
    LEAVE_ROOM: 'leave_room',
    SEND_MESSAGE: 'send_message',
    NEW_MESSAGE: 'new_message',
    TYPING: 'typing',
    USER_TYPING: 'user_typing',
    USER_JOINED: 'user_joined',
    USER_LEFT: 'user_left',
    ONLINE_USERS: 'online_users'
};