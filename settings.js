class SettingsManager {
    constructor() {
        this.speedSlider = document.getElementById('speedSlider');
        this.speedValue = document.getElementById('speedValue');
        this.backendStatus = document.getElementById('backendStatus');
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
        const result = await chrome.storage.sync.get(['ttsSpeed']);
        if (result.ttsSpeed !== undefined) {
            this.currentSpeed = result.ttsSpeed;
            this.updateSpeedDisplay();
            this.updatePresetButtons();
        }
        
        // Check backend connection
        await this.checkBackendConnection();
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
                ttsSpeed: this.currentSpeed
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
        this.showStatus('Testing backend connection...', 'info');
        
        try {
            // Test backend health endpoint
            const response = await fetch('http://localhost:3000/health');
            if (response.ok) {
                this.showStatus('Backend connection successful!', 'success');
                this.updateBackendStatus('✓ Backend connected', 'success');
            } else {
                this.showStatus('Backend connection failed. Make sure backend is running.', 'error');
                this.updateBackendStatus('⚠ Backend connection failed', 'error');
            }
        } catch (error) {
            this.showStatus('Backend not running. Start with: cd backend && npm start', 'error');
            this.updateBackendStatus('⚠ Backend not running', 'error');
            console.error('Backend test error:', error);
        }
    }
    
    async checkBackendConnection() {
        try {
            const response = await fetch('http://localhost:3000/health');
            if (response.ok) {
                this.updateBackendStatus('✓ Backend connected', 'success');
            } else {
                this.updateBackendStatus('⚠ Backend connection failed', 'error');
            }
        } catch (error) {
            this.updateBackendStatus('⚠ Backend not running', 'error');
        }
    }
    
    updateBackendStatus(message, type) {
        if (this.backendStatus) {
            this.backendStatus.textContent = message;
            this.backendStatus.className = `backend-status ${type}`;
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