class BlindNavigatorOverlay {
    constructor() {
        this.isMinimized = false;
        this.isProcessing = false;
        
        this.initializeElements();
        this.setupEventListeners();
        this.initializeAudio();
        this.show();
    }
    
    initializeElements() {
        // Main elements
        this.overlay = document.getElementById('blind-nav-overlay');
        this.statusEl = document.getElementById('status');
        this.textInput = document.getElementById('textInput');
        this.submitBtn = document.getElementById('submitBtn');
        this.options = document.getElementById('options');
        this.loading = document.getElementById('loading');
        this.summaryBtn = document.getElementById('summaryBtn');
        this.suggestionsBtn = document.getElementById('suggestionsBtn');
        this.highlightBtn = document.getElementById('highlightBtn');
        this.minimizeBtn = document.getElementById('minimizeBtn');
        
        // Set initial state
        this.updateStatus('Ready to help you navigate');
    }
    
    setupEventListeners() {
        // Submit button
        this.submitBtn.addEventListener('click', () => {
            this.submitTextInput();
        });
        
        // Enter key in text input
        this.textInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.submitTextInput();
            }
        });
        
        // Minimize button
        this.minimizeBtn.addEventListener('click', () => {
            this.toggleMinimize();
        });
        
        // Option buttons
        this.summaryBtn.addEventListener('click', () => {
            this.getPageSummary();
        });
        
        this.suggestionsBtn.addEventListener('click', () => {
            this.getSuggestions();
        });
        
        this.highlightBtn.addEventListener('click', () => {
            this.highlightElements();
        });
    }
    
    initializeAudio() {
        // Initialize audio context for text-to-speech
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (error) {
            console.log('Audio not supported:', error);
        }
    }
    
    show() {
        this.overlay.classList.add('visible');
        // Focus the input after a short delay to ensure overlay is visible
        setTimeout(() => {
            this.textInput.focus();
        }, 100);
    }
    
    hide() {
        this.overlay.classList.remove('visible');
    }
    
    toggleMinimize() {
        this.isMinimized = !this.isMinimized;
        
        if (this.isMinimized) {
            this.overlay.classList.add('minimized');
            this.minimizeBtn.textContent = '+';
        } else {
            this.overlay.classList.remove('minimized');
            this.minimizeBtn.textContent = '−';
            // Focus input when expanding
            setTimeout(() => {
                this.textInput.focus();
            }, 100);
        }
    }
    
    submitTextInput() {
        const instruction = this.textInput.value.trim();
        if (instruction && !this.isProcessing) {
            this.processInstruction(instruction);
            this.textInput.value = ''; // Clear the input after submission
        }
    }
    
    async processInstruction(instruction) {
        if (this.isProcessing) return;
        
        this.isProcessing = true;
        this.showLoading(true);
        this.updateStatus('Processing your instruction...');
        
        try {
            // Send message to content script to process the instruction
            const response = await this.sendMessageToContent({
                action: 'processInstruction',
                instruction: instruction
            });
            
            if (response && response.success) {
                this.updateStatus('Instruction processed successfully');
                
                // Speak the result if available
                if (response.result && response.result.message) {
                    this.speak(response.result.message);
                }
            } else {
                this.updateStatus('Error: ' + (response?.message || 'Failed to process instruction'));
            }
        } catch (error) {
            console.error('Error processing instruction:', error);
            this.updateStatus('Error processing instruction: ' + error.message);
        } finally {
            this.isProcessing = false;
            this.showLoading(false);
        }
    }
    
    async getPageSummary() {
        if (this.isProcessing) return;
        
        this.isProcessing = true;
        this.showLoading(true);
        this.updateStatus('Getting page summary...');
        
        try {
            const response = await this.sendMessageToContent({
                action: 'getSummary'
            });
            
            if (response && response.success) {
                this.updateStatus('Page summary retrieved');
                if (response.summary) {
                    this.speak(response.summary);
                }
            } else {
                this.updateStatus('Error getting summary');
            }
        } catch (error) {
            console.error('Error getting summary:', error);
            this.updateStatus('Error getting summary');
        } finally {
            this.isProcessing = false;
            this.showLoading(false);
        }
    }
    
    async getSuggestions() {
        if (this.isProcessing) return;
        
        this.isProcessing = true;
        this.showLoading(true);
        this.updateStatus('Getting suggestions...');
        
        try {
            const response = await this.sendMessageToContent({
                action: 'getSuggestions'
            });
            
            if (response && response.success) {
                this.updateStatus('Suggestions retrieved');
                if (response.suggestions) {
                    this.speak(response.suggestions);
                }
            } else {
                this.updateStatus('Error getting suggestions');
            }
        } catch (error) {
            console.error('Error getting suggestions:', error);
            this.updateStatus('Error getting suggestions');
        } finally {
            this.isProcessing = false;
            this.showLoading(false);
        }
    }
    
    async highlightElements() {
        try {
            const response = await this.sendMessageToContent({
                action: 'highlightElements'
            });
            
            if (response && response.success) {
                this.updateStatus('Elements highlighted');
            } else {
                this.updateStatus('Error highlighting elements');
            }
        } catch (error) {
            console.error('Error highlighting elements:', error);
            this.updateStatus('Error highlighting elements');
        }
    }
    
    sendMessageToContent(message) {
        return new Promise((resolve, reject) => {
            // Send message to the content script
            window.postMessage({
                type: 'BLIND_NAV_OVERLAY_MESSAGE',
                data: message
            }, '*');
            
            // Listen for response
            const handleResponse = (event) => {
                if (event.data.type === 'BLIND_NAV_OVERLAY_RESPONSE') {
                    window.removeEventListener('message', handleResponse);
                    resolve(event.data.data);
                }
            };
            
            window.addEventListener('message', handleResponse);
            
            // Timeout after 10 seconds
            setTimeout(() => {
                window.removeEventListener('message', handleResponse);
                reject(new Error('Request timeout'));
            }, 10000);
        });
    }
    
    updateStatus(message) {
        this.statusEl.textContent = message;
    }
    
    showLoading(show) {
        if (show) {
            this.loading.classList.add('visible');
            this.submitBtn.disabled = true;
        } else {
            this.loading.classList.remove('visible');
            this.submitBtn.disabled = false;
        }
    }
    
    speak(text) {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 0.9;
            utterance.pitch = 1;
            utterance.volume = 1;
            speechSynthesis.speak(utterance);
        }
    }
    
    handleMessage(message, sender, sendResponse) {
        switch (message.action) {
            case 'updateStatus':
                this.updateStatus(message.message);
                break;
            case 'speak':
                this.speak(message.text);
                break;
            case 'showOptions':
                this.options.classList.add('visible');
                break;
            case 'hideOptions':
                this.options.classList.remove('visible');
                break;
        }
    }
}

// Initialize overlay when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new BlindNavigatorOverlay();
});
