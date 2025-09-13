// Configuration file for Blind Navigator AI Chrome Extension

const CONFIG = {
    // API Endpoints
    CEREBRAS_API_URL: 'https://api.cerebras.ai/v1/chat/completions',
    
    // Default settings
    DEFAULT_SPEECH_RATE: 0.9,
    DEFAULT_SPEECH_PITCH: 1.0,
    DEFAULT_SPEECH_VOLUME: 1.0,
    
    // UI Settings
    HIGHLIGHT_COLOR: '#4CAF50',
    HIGHLIGHT_OFFSET: '2px',
    
    // Content Analysis
    MAX_SUMMARY_LENGTH: 500,
    MAX_ELEMENTS_TO_ANALYZE: 50,
    MAX_SUGGESTIONS: 5,
    
    // Keyboard Shortcuts
    TOGGLE_SHORTCUT: 'Ctrl+Shift+V',
    MAC_TOGGLE_SHORTCUT: 'Command+Shift+V',
    
    // Error Messages
    ERRORS: {
        NO_WEBSITE_DATA: 'Website data not available. Please refresh the page.',
        NO_ACTIVE_TAB: 'No active tab found.',
        API_KEY_MISSING: 'API key not configured. Please set up your API keys in the extension settings.',
        ELEMENT_NOT_FOUND: 'Element not found on the page.',
        INVALID_INSTRUCTION: 'Could not understand the instruction. Please try being more specific.',
        NETWORK_ERROR: 'Network error. Please check your internet connection.',
        UNKNOWN_ERROR: 'An unknown error occurred. Please try again.'
    },
    
    // Success Messages
    SUCCESS: {
        ACTION_COMPLETED: 'Action completed successfully.',
        SUMMARY_GENERATED: 'Website summary generated.',
        SUGGESTIONS_GENERATED: 'Action suggestions generated.',
        ELEMENT_CLICKED: 'Element clicked successfully.',
        FORM_FILLED: 'Form filled successfully.',
        PAGE_SCROLLED: 'Page scrolled successfully.',
        NAVIGATION_STARTED: 'Navigation started successfully.'
    },
    
    // Text Commands
    TEXT_COMMANDS: {
        SUMMARY: ['summary', 'describe', 'tell me about', 'what is on this page'],
        SUGGESTIONS: ['suggestions', 'what can I do', 'options', 'actions'],
        CLICK: ['click', 'press', 'tap', 'select'],
        FILL: ['fill', 'type', 'enter', 'input'],
        SCROLL: ['scroll', 'move', 'go up', 'go down'],
        NAVIGATE: ['go to', 'visit', 'navigate', 'open']
    },
    
    // Element Selectors for Analysis
    SELECTORS: {
        HEADINGS: 'h1, h2, h3, h4, h5, h6',
        LINKS: 'a[href]',
        BUTTONS: 'button, input[type="button"], input[type="submit"]',
        INPUTS: 'input, textarea, select',
        FORMS: 'form',
        IMAGES: 'img',
        MAIN_CONTENT: 'main, [role="main"], .main-content, .content, #content, article, .article'
    },
    
    // Cerebras Model Configuration
    CEREBRAS_MODEL: 'cerebras-llama-2-7b-chat',
    CEREBRAS_MAX_TOKENS: 1000,
    CEREBRAS_TEMPERATURE: 0.1
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
} else if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
}