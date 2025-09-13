class BlindNavigatorSettings {
    constructor() {
        this.apiKeys = {
            cerebras: ''
        };
        
        this.initializeElements();
        this.setupEventListeners();
        this.loadSettings();
    }
    
    initializeElements() {
        this.cerebrasKeyInput = document.getElementById('cerebrasKey');
        
        this.saveBtn = document.getElementById('saveBtn');
        this.testBtn = document.getElementById('testBtn');
        this.testSpeechBtn = document.getElementById('testSpeechBtn');
        
        this.statusEl = document.getElementById('status');
        this.cerebrasStatus = document.getElementById('cerebrasStatus');
    }
    
    setupEventListeners() {
        this.saveBtn.addEventListener('click', () => this.saveSettings());
        this.testBtn.addEventListener('click', () => this.testAPIs());
        this.testSpeechBtn.addEventListener('click', () => this.testSpeechOutput());
        
        // Auto-save on input change
        [this.cerebrasKeyInput].forEach(input => {
            input.addEventListener('input', () => this.autoSave());
        });
    }
    
    async loadSettings() {
        try {
            const result = await chrome.storage.sync.get([
                'cerebrasKey'
            ]);
            
            this.cerebrasKeyInput.value = result.cerebrasKey || '';
            
            this.updateAPIStatus();
        } catch (error) {
            console.error('Error loading settings:', error);
            this.showStatus('Error loading settings', 'error');
        }
    }
    
    async saveSettings() {
        try {
            this.apiKeys = {
                cerebras: this.cerebrasKeyInput.value.trim()
            };
            
            await chrome.storage.sync.set({
                cerebrasKey: this.apiKeys.cerebras
            });
            
            // Send updated keys to background script
            await chrome.runtime.sendMessage({
                action: 'setApiKeys',
                keys: this.apiKeys
            });
            
            this.showStatus('Settings saved successfully!', 'success');
            this.updateAPIStatus();
        } catch (error) {
            console.error('Error saving settings:', error);
            this.showStatus('Error saving settings', 'error');
        }
    }
    
    async autoSave() {
        // Debounce auto-save
        clearTimeout(this.autoSaveTimeout);
        this.autoSaveTimeout = setTimeout(() => {
            this.saveSettings();
        }, 1000);
    }
    
    updateAPIStatus() {
        this.cerebrasStatus.className = `status-indicator ${this.apiKeys.cerebras ? 'connected' : ''}`;
    }
    
    async testAPIs() {
        this.showStatus('Testing APIs...', 'info');
        
        const results = {
            cerebras: false
        };
        
        // Test Cerebras API
        if (this.apiKeys.cerebras) {
            try {
                const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.apiKeys.cerebras}`
                    },
                    body: JSON.stringify({
                        model: 'cerebras-llama-2-7b-chat',
                        messages: [{ role: 'user', content: 'Test' }],
                        max_tokens: 10
                    })
                });
                results.cerebras = response.ok;
            } catch (error) {
                console.error('Cerebras API test failed:', error);
            }
        }
        
        // Update status indicators
        this.cerebrasStatus.className = `status-indicator ${results.cerebras ? 'connected' : ''}`;
        
        const successCount = Object.values(results).filter(Boolean).length;
        const totalCount = Object.keys(results).length;
        
        this.showStatus(`API test completed. ${successCount}/${totalCount} APIs working. Browser TTS and Wispr are always available.`, 'info');
    }
    
    async testSpeechOutput() {
        if (!('speechSynthesis' in window)) {
            this.showStatus('Speech output not supported in this browser', 'error');
            return;
        }
        
        this.showStatus('Testing speech output...', 'info');
        
        const utterance = new SpeechSynthesisUtterance('Blind Navigator AI speech output test successful!');
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 1;
        
        utterance.onend = () => {
            this.showStatus('Speech output test successful!', 'success');
        };
        
        utterance.onerror = (event) => {
            this.showStatus(`Speech output test failed: ${event.error}`, 'error');
        };
        
        speechSynthesis.speak(utterance);
    }
    
    showStatus(message, type) {
        this.statusEl.textContent = message;
        this.statusEl.className = `status ${type}`;
        this.statusEl.classList.remove('hidden');
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            this.statusEl.classList.add('hidden');
        }, 5000);
    }
}

// Initialize settings page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new BlindNavigatorSettings();
});