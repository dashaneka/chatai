// DOM Elements
const messagesContainer = document.getElementById('messages');
const inputElement = document.getElementById('input');
const chatForm = document.getElementById('chat-form');
const sendBtn = document.querySelector('.send-btn');
const modelBtn = document.getElementById('model-btn');
const modelDropdown = document.getElementById('model-dropdown-inline');
const newChatBtn = document.querySelector('.new-chat-btn');
const conversationsList = document.querySelector('.conversations-list');
const sidebar = document.querySelector('.sidebar');
const sidebarToggle = document.getElementById('sidebar-toggle');
const app = document.querySelector('.app');

// Models list
const models = [
    'gpt-4.1', 'gpt-4o', 'gpt-4.5-preview', 'gpt-4.1-mini', 'gpt-4.1-nano', 'gpt-4o-mini',
    'gpt-5', 'gpt-5-mini', 'gpt-5-nano', 'gpt-5-chat-latest',
    'o1', 'o1-mini', 'o1-pro', 'o3', 'o3-mini', 'o4-mini',
    'claude-sonnet-4', 'claude-opus-4',
    'x-ai/grok-4', 'x-ai/grok-3', 'x-ai/grok-3-beta', 'x-ai/grok-3-mini',
    'x-ai/grok-3-mini-beta', 'x-ai/grok-2-1212', 'x-ai/grok-2-vision-1212', 'x-ai/grok-vision-beta'
];

// State
let conversationHistory = [];
let conversationsList_data = [];
let currentSelectedModel = 'gpt-4.1';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupMarkdown();
    setupModelSelector();
    setupEventListeners();
    setupSidebarToggle();
    addWelcomeMessage();
    autoResizeTextarea();
});

// Setup Markdown
function setupMarkdown() {
    marked.setOptions({
        gfm: true,
        breaks: true,
        headerIds: false,
        mangle: false
    });
}

// Setup Model Selector
function setupModelSelector() {
    renderModelDropdown();

    modelBtn.addEventListener('click', (e) => {
        e.preventDefault();
        modelDropdown.classList.toggle('show');
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.model-selector-inline')) {
            modelDropdown.classList.remove('show');
        }
    });
}

function renderModelDropdown() {
    modelDropdown.innerHTML = models.map(model => `
        <div class="model-option" data-value="${model}">${model}</div>
    `).join('');

    modelDropdown.querySelectorAll('.model-option').forEach(option => {
        option.addEventListener('click', () => {
            currentSelectedModel = option.getAttribute('data-value');
            modelBtn.textContent = option.textContent;
            modelDropdown.querySelectorAll('.model-option').forEach(o => o.classList.remove('selected'));
            option.classList.add('selected');
            modelDropdown.classList.remove('show');
        });
    });
}

// Setup Sidebar Toggle
function setupSidebarToggle() {
    sidebarToggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        sidebar.classList.toggle('open');
        app.classList.toggle('sidebar-open');
    });

    // Close sidebar when clicking outside (mobile)
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768) {
            if (!e.target.closest('.sidebar') && !e.target.closest('.sidebar-toggle')) {
                sidebar.classList.remove('open');
                app.classList.remove('sidebar-open');
            }
        }
    });
}

// Setup Event Listeners
function setupEventListeners() {
    chatForm.addEventListener('submit', handleSendMessage);
    inputElement.addEventListener('input', autoResizeTextarea);
    inputElement.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!sendBtn.disabled) {
                chatForm.requestSubmit();
            }
        }
    });
    newChatBtn.addEventListener('click', startNewChat);
}

// Auto resize textarea
function autoResizeTextarea() {
    inputElement.style.height = '1.5em';
    const scrollHeight = inputElement.scrollHeight;
    inputElement.style.height = Math.min(scrollHeight, 200) + 'px';
    
    sendBtn.disabled = !inputElement.value.trim();
}

// Add Welcome Message
function addWelcomeMessage() {
    const message = createMessageElement('assistant', 'Hello! How can I help you today?');
    messagesContainer.appendChild(message);
    conversationHistory.push({ role: 'assistant', content: 'Hello! How can I help you today?' });
}

// Handle Send Message
async function handleSendMessage(e) {
    e.preventDefault();

    const userMessage = inputElement.value.trim();
    if (!userMessage) return;

    // Add user message
    conversationHistory.push({ role: 'user', content: userMessage });
    const userMessageEl = createMessageElement('user', userMessage);
    messagesContainer.appendChild(userMessageEl);

    // Clear input
    inputElement.value = '';
    autoResizeTextarea();

    // Add typing indicator
    const typingEl = createTypingIndicator();
    messagesContainer.appendChild(typingEl);

    // Scroll to bottom
    scrollToBottom();

    try {
        // Get AI response
        const responseStream = await puter.ai.chat(conversationHistory, {
            model: currentSelectedModel,
            stream: true
        });

        // Remove typing indicator
        typingEl.remove();

        // Create AI message element
        const aiMessageEl = createMessageElement('assistant', '');
        messagesContainer.appendChild(aiMessageEl);

        const contentDiv = aiMessageEl.querySelector('.message-content');
        let fullResponse = '';

        // Stream response
        let lastRenderTime = 0;
        const renderInterval = 100; // Update every 100ms to avoid too frequent updates
        
        for await (const part of responseStream) {
            const textChunk = part?.text || '';
            fullResponse += textChunk;
            
            const now = Date.now();
            if (now - lastRenderTime > renderInterval) {
                contentDiv.textContent = fullResponse;
                lastRenderTime = now;
                scrollToBottom();
            }
        }
        
        // Final render with markdown
        contentDiv.textContent = fullResponse;
        scrollToBottom();
        renderMarkdown(contentDiv, fullResponse);

        // Update copy button with full response content
        const copyBtn = aiMessageEl.querySelector('.copy-btn');
        if (copyBtn) {
            copyBtn.setAttribute('data-content', fullResponse);
        }

        // Add to history
        conversationHistory.push({ role: 'assistant', content: fullResponse });

        scrollToBottom();

    } catch (error) {
        console.error('Error:', error);
        typingEl.remove();
        const errorEl = createMessageElement('assistant', 'Sorry, there was an error. Please try again.');
        messagesContainer.appendChild(errorEl);
    }
}

// Create Message Element
function createMessageElement(role, content) {
    const message = document.createElement('div');
    message.className = `message ${role === 'user' ? 'user' : ''}`;

    const bubble = document.createElement('div');
    bubble.className = `message-bubble ${role === 'user' ? 'user' : 'assistant'}`;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = content;

    // Create copy button
    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-btn';
    copyBtn.type = 'button';
    copyBtn.setAttribute('data-content', content);
    copyBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
        <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
    </svg> Copy`;
    
    copyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const textToCopy = copyBtn.getAttribute('data-content');
        copyMessageAsMarkdown(textToCopy, copyBtn);
    });

    bubble.appendChild(contentDiv);
    bubble.appendChild(copyBtn);
    message.appendChild(bubble);

    return message;
}

// Copy message as markdown
function copyMessageAsMarkdown(content, button) {
    if (!content) {
        console.error('No content to copy');
        return;
    }

    let textToCopy = content;
    
    try {
        // Try to copy with clipboard API first
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(textToCopy).then(() => {
                showCopySuccess(button);
            }).catch(err => {
                console.error('Clipboard API failed:', err);
                fallbackCopy(textToCopy, button);
            });
        } else {
            fallbackCopy(textToCopy, button);
        }
    } catch (err) {
        console.error('Error:', err);
        fallbackCopy(textToCopy, button);
    }
}

// Fallback copy method using textarea
function fallbackCopy(content, button) {
    const textarea = document.createElement('textarea');
    textarea.value = content;
    textarea.style.position = 'fixed';
    textarea.style.left = '-999999px';
    textarea.style.top = '-999999px';
    document.body.appendChild(textarea);
    
    try {
        textarea.focus();
        textarea.select();
        const successful = document.execCommand('copy');
        if (successful) {
            showCopySuccess(button);
        } else {
            console.error('execCommand copy failed');
        }
    } catch (err) {
        console.error('Fallback copy failed:', err);
    } finally {
        document.body.removeChild(textarea);
    }
}

// Show copy success feedback
function showCopySuccess(button) {
    const originalText = button.innerHTML;
    button.classList.add('copied');
    button.textContent = 'Copied!';
    
    // Reset after 2 seconds
    setTimeout(() => {
        button.classList.remove('copied');
        button.innerHTML = originalText;
    }, 2000);
}

// Create Typing Indicator
function createTypingIndicator() {
    const message = document.createElement('div');
    message.className = 'message';

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble assistant';

    const indicator = document.createElement('div');
    indicator.className = 'typing-indicator';
    indicator.innerHTML = '<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>';

    bubble.appendChild(indicator);
    message.appendChild(bubble);

    return message;
}

// Render Markdown
function renderMarkdown(container, text) {
    container.innerHTML = marked.parse(text);

    // Syntax highlight
    container.querySelectorAll('pre code').forEach(block => {
        try {
            hljs.highlightElement(block);
        } catch (e) {
            // Skip highlighting errors
        }
    });

    // Add copy buttons
    container.querySelectorAll('pre').forEach(pre => {
        if (pre.querySelector('.copy-btn')) return;

        const btn = document.createElement('button');
        btn.className = 'copy-btn';
        btn.type = 'button';
        btn.textContent = 'Copy';

        btn.addEventListener('click', async () => {
            const code = pre.querySelector('code');
            const text = code ? code.innerText : pre.innerText;

            try {
                await navigator.clipboard.writeText(text);
                const originalText = btn.textContent;
                btn.textContent = 'Copied!';
                setTimeout(() => {
                    btn.textContent = originalText;
                }, 1200);
            } catch (err) {
                console.error('Copy failed:', err);
            }
        });

        pre.appendChild(btn);
    });
}

// Start New Chat
function startNewChat() {
    const name = prompt('Chat name (or leave blank):');
    const chatName = name || `Chat ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    conversationsList_data.unshift({
        id: Date.now(),
        name: chatName,
        history: [...conversationHistory]
    });

    conversationHistory = [];
    messagesContainer.innerHTML = '';
    addWelcomeMessage();
    updateConversationsList();
}

// Update Conversations List
function updateConversationsList() {
    conversationsList.innerHTML = conversationsList_data.map(conv => `
        <div class="conversation-item" data-id="${conv.id}">
            ${conv.name}
        </div>
    `).join('');

    conversationsList.querySelectorAll('.conversation-item').forEach(item => {
        item.addEventListener('click', () => {
            const convId = parseInt(item.getAttribute('data-id'));
            const conv = conversationsList_data.find(c => c.id === convId);
            if (conv) {
                conversationHistory = [...conv.history];
                messagesContainer.innerHTML = '';
                conversationHistory.forEach(msg => {
                    const msgEl = createMessageElement(msg.role, msg.content);
                    messagesContainer.appendChild(msgEl);
                });
                scrollToBottom();
            }
        });
    });
}

// Scroll to bottom
function scrollToBottom() {
    const chatContainer = document.querySelector('.chat-container');
    setTimeout(() => {
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }, 0);
}
