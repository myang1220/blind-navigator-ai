class SettingsManager {
    constructor() {
        this.speedSlider = document.getElementById('speedSlider');
        this.speedValue = document.getElementById('speedValue');
        this.cerebrasKeyInput = document.getElementById('cerebrasKey');
        this.saveBtn = document.getElementById('saveBtn');
        this.testBtn = document.getElementById('testBtn');
        this.statusEl = document.getElementById('status');
        this.presetBtns = document.querySelectorAll('.preset-btn');
        
        this.currentSpeed = 1.0;
        this.initializeSettings();
        this.setupEventListeners();
    }
    
    async initializeSettings() {
        // Load saved settings
        const result = await chrome.storage.sync.get(['ttsSpeed', 'cerebrasKey']);
        if (result.ttsSpeed !== undefined) {
            this.currentSpeed = result.ttsSpeed;
            this.updateSpeedDisplay();
            this.updatePresetButtons();
        }
        if (result.cerebrasKey) {
            this.cerebrasKeyInput.value = result.cerebrasKey;
        }
    }
    
    setupEventListeners() {
        // Speed slider
        this.speedSlider.addEventListener('input', (e) => {
            this.currentSpeed = parseFloat(e.target.value);
            this.updateSpeedDisplay();
            this.updatePresetButtons();
            this.autoSave();
        });
        
        // Preset buttons
        this.presetBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const speed = parseFloat(e.target.dataset.speed);
                this.currentSpeed = speed;
                this.speedSlider.value = speed;
                this.updateSpeedDisplay();
                this.updatePresetButtons();
                this.autoSave();
            });
        });
        
        // Save button
        this.saveBtn.addEventListener('click', () => this.saveSettings());
        
        // Test button
        this.testBtn.addEventListener('click', () => this.testAPI());
    }
    
    updateSpeedDisplay() {
        this.speedValue.textContent = `${this.currentSpeed.toFixed(1)}x`;
        this.speedSlider.value = this.currentSpeed;
    }
    
    updatePresetButtons() {
        this.presetBtns.forEach(btn => {
            btn.classList.remove('active');
            const btnSpeed = parseFloat(btn.dataset.speed);
            if (Math.abs(btnSpeed - this.currentSpeed) < 0.05) {
                btn.classList.add('active');
            }
        });
    }
    
    async saveSettings() {
        try {
            await chrome.storage.sync.set({
                ttsSpeed: this.currentSpeed,
                cerebrasKey: this.cerebrasKeyInput.value.trim()
            });
            
            // Send updated keys to background script
            await chrome.runtime.sendMessage({
                action: 'setApiKeys',
                keys: {
                    cerebras: this.cerebrasKeyInput.value.trim()
                }
            });
            
            this.showStatus('Settings saved successfully!', 'success');
        } catch (error) {
            this.showStatus('Failed to save settings', 'error');
            console.error('Error saving settings:', error);
        }
    }
    
    async autoSave() {
        // Auto-save after a short delay to avoid too many saves
        clearTimeout(this.autoSaveTimeout);
        this.autoSaveTimeout = setTimeout(() => {
            this.saveSettings();
        }, 500);
    }
    
    async testAPI() {
        const apiKey = this.cerebrasKeyInput.value.trim();
        if (!apiKey) {
            this.showStatus('Please enter your Cerebras API key first', 'error');
            return;
        }
        
        this.showStatus('Testing Cerebras API...', 'info');
        
        try {
            const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'llama-4-scout-17b-16e-instruct',
                    messages: [
                        {
                            role: 'user',
                            content: 'Test message - please respond with "API test successful"'
                        }
                    ],
                    max_tokens: 50
                })
            });
            
            if (response.ok) {
                this.showStatus('Cerebras API test successful!', 'success');
            } else {
                this.showStatus(`API test failed: ${response.status}`, 'error');
            }
        } catch (error) {
            this.showStatus(`API test failed: ${error.message}`, 'error');
            console.error('API test error:', error);
        }
    }
    
    async testSpeech() {
        if (!('speechSynthesis' in window)) {
            this.showStatus('Speech synthesis not supported in this browser', 'error');
            return;
        }
        
        this.showStatus('Testing speech output...', 'info');
        
        const utterance = new SpeechSynthesisUtterance('This is a test of your current speech speed settings. The Blind Navigator AI is ready to help you navigate the web.');
        utterance.rate = this.currentSpeed;
        utterance.pitch = 1;
        utterance.volume = 1;
        
        utterance.onend = () => {
            this.showStatus('Speech test completed successfully!', 'success');
        };
        
        utterance.onerror = (event) => {
            this.showStatus(`Speech test failed: ${event.error}`, 'error');
        };
        
        speechSynthesis.speak(utterance);
    }
    
    showStatus(message, type) {
        this.statusEl.textContent = message;
        this.statusEl.className = `status ${type}`;
        this.statusEl.classList.remove('hidden');
        
        // Auto-hide success and info messages after 3 seconds
        if (type === 'success' || type === 'info') {
            setTimeout(() => {
                this.statusEl.classList.add('hidden');
            }, 3000);
        }
    }
}

// Initialize settings when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SettingsManager();
});