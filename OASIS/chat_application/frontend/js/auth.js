const API_BASE = `${window.location.origin}/api`;

// DOM Elements (gracefully handle pages that don't render all elements)
const authContainer = document.getElementById('authContainer');
const chatContainer = document.getElementById('chatContainer');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');

// Tab switching
function showTab(tabName, evt) {
    const eventObj = evt || window.event || null;

    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const tabContent = document.getElementById(`${tabName}Tab`);
    if (tabContent) {
        tabContent.classList.add('active');
    }

    if (eventObj && eventObj.target) {
        eventObj.target.classList.add('active');
    }
}

// Form handling
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleAuth('login', loginForm);
    });
}

if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleAuth('register', registerForm);
    });
}

async function handleAuth(type, formElement) {
    const form = formElement || (type === 'login' ? loginForm : registerForm);
    if (!form) return;

    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn ? submitBtn.textContent : null;
    
    try {
        if (submitBtn) {
            submitBtn.textContent = 'Loading...';
            submitBtn.disabled = true;
        }
        
        const response = await fetch(`${API_BASE}/${type}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            localStorage.setItem('token', result.token);
            localStorage.setItem('user', JSON.stringify(result.user));
            
            loadChatInterface();
        } else {
            showError(form, result.error || 'Authentication failed');
        }
    } catch (error) {
        showError(form, 'Network error. Please try again.');
    } finally {
        if (submitBtn && originalText !== null) {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }
}

function showError(form, message) {
    // Remove existing error
    const existingError = form.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
    
    // Add new error
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    form.insertBefore(errorDiv, form.firstChild);
}

function loadChatInterface() {
    if (authContainer && chatContainer) {
        authContainer.classList.add('hidden');
        chatContainer.classList.remove('hidden');
        
        // Load chat JavaScript lazily for SPA
        if (!document.querySelector('script[src*="js/chat.js"]')) {
            const script = document.createElement('script');
            script.src = 'js/chat.js';
            document.body.appendChild(script);
        }
    } else {
        // Standalone auth pages: redirect to chat view
        window.location.href = 'chat.html';
    }
}

// Check if user is already logged in
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
        loadChatInterface();
    }
});