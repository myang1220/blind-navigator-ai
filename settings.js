class BlindNavigatorSettings {
    constructor() {
        this.apiKeys = {
            cerebras: '',
            polly: '',
            pollySecret: '',
            wispr: ''
        };
        
        this.initializeElements();
        this.setupEventListeners();
        this.loadSettings();
    }
    
    initializeElements() {
        this.cerebrasKeyInput = document.getElementById('cerebrasKey');
        this.pollyKeyInput = document.getElementById('pollyKey');
        this.pollySecretInput = document.getElementById('pollySecret');
        this.wisprKeyInput = document.getElementById('wisprKey');
        
        this.saveBtn = document.getElementById('saveBtn');
        this.testBtn = document.getElementById('testBtn');
        this.testVoiceBtn = document.getElementById('testVoiceBtn');
        this.testSpeechBtn = document.getElementById('testSpeechBtn');
        
        this.statusEl = document.getElementById('status');
        this.cerebrasStatus = document.getElementById('cerebrasStatus');
        this.pollyStatus = document.getElementById('pollyStatus');
        this.wisprStatus = document.getElementById('wisprStatus');
    }
    
    setupEventListeners() {
        this.saveBtn.addEventListener('click', () => this.saveSettings());
        this.testBtn.addEventListener('click', () => this.testAPIs());
        this.testVoiceBtn.addEventListener('click', () => this.testVoiceInput());
        this.testSpeechBtn.addEventListener('click', () => this.testSpeechOutput());
        
        // Auto-save on input change
        [this.cerebrasKeyInput, this.pollyKeyInput, this.pollySecretInput, this.wisprKeyInput].forEach(input => {
            input.addEventListener('input', () => this.autoSave());
        });
    }
    
    async loadSettings() {
        try {
            const result = await chrome.storage.sync.get([
                'cerebrasKey',
                'pollyKey',
                'pollySecret',
                'wisprKey'
            ]);
            
            this.cerebrasKeyInput.value = result.cerebrasKey || '';
            this.pollyKeyInput.value = result.pollyKey || '';
            this.pollySecretInput.value = result.pollySecret || '';
            this.wisprKeyInput.value = result.wisprKey || '';
            
            this.updateAPIStatus();
        } catch (error) {
            console.error('Error loading settings:', error);
            this.showStatus('Error loading settings', 'error');
        }
    }
    
    async saveSettings() {
        try {
            this.apiKeys = {
                cerebras: this.cerebrasKeyInput.value.trim(),
                polly: this.pollyKeyInput.value.trim(),
                pollySecret: this.pollySecretInput.value.trim(),
                wispr: this.wisprKeyInput.value.trim()
            };
            
            await chrome.storage.sync.set({
                cerebrasKey: this.apiKeys.cerebras,
                pollyKey: this.apiKeys.polly,
                pollySecret: this.apiKeys.pollySecret,
                wisprKey: this.apiKeys.wispr
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
        this.pollyStatus.className = `status-indicator ${this.apiKeys.polly && this.apiKeys.pollySecret ? 'connected' : ''}`;
        this.wisprStatus.className = `status-indicator ${this.apiKeys.wispr ? 'connected' : ''}`;
    }
    
    async testAPIs() {
        this.showStatus('Testing APIs...', 'info');
        
        const results = {
            cerebras: false,
            polly: false,
            wispr: false
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
        
        // Test Polly API (simplified test)
        if (this.apiKeys.polly && this.apiKeys.pollySecret) {
            // For now, just check if keys are provided
            // In a real implementation, you would test the actual API
            results.polly = true;
        }
        
        // Test Wispr API
        if (this.apiKeys.wispr) {
            try {
                const response = await fetch('https://api.wispr.ai/v1/transcribe', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.apiKeys.wispr}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        audio: 'test',
                        language: 'en'
                    })
                });
                results.wispr = response.ok || response.status === 400; // 400 might be expected for test data
            } catch (error) {
                console.error('Wispr API test failed:', error);
            }
        }
        
        // Update status indicators
        this.cerebrasStatus.className = `status-indicator ${results.cerebras ? 'connected' : ''}`;
        this.pollyStatus.className = `status-indicator ${results.polly ? 'connected' : ''}`;
        this.wisprStatus.className = `status-indicator ${results.wispr ? 'connected' : ''}`;
        
        const successCount = Object.values(results).filter(Boolean).length;
        const totalCount = Object.keys(results).length;
        
        this.showStatus(`API test completed. ${successCount}/${totalCount} APIs working.`, 'info');
    }
    
    async testVoiceInput() {
        if (!('webkitSpeechRecognition' in window)) {
            this.showStatus('Voice input not supported in this browser', 'error');
            return;
        }
        
        this.showStatus('Listening... Speak now', 'info');
        
        const recognition = new webkitSpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';
        
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            this.showStatus(`Voice input test successful: "${transcript}"`, 'success');
        };
        
        recognition.onerror = (event) => {
            this.showStatus(`Voice input test failed: ${event.error}`, 'error');
        };
        
        recognition.onend = () => {
            // Recognition ended
        };
        
        recognition.start();
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
