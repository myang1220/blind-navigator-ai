class BlindNavigatorPopup {
    constructor() {
        this.audioContext = null;
        this.isProcessing = false;
        
        this.initializeElements();
        this.setupEventListeners();
        this.initializeAudio();
    }
    
    initializeElements() {
        // Main view elements
        this.mainView = document.getElementById('mainView');
        this.settingsView = document.getElementById('settingsView');
        this.statusEl = document.getElementById('status');
        this.textInput = document.getElementById('textInput');
        this.submitBtn = document.getElementById('submitBtn');
        this.options = document.getElementById('options');
        this.loading = document.getElementById('loading');
        this.summaryBtn = document.getElementById('summaryBtn');
        this.suggestionsBtn = document.getElementById('suggestionsBtn');
        this.directBtn = document.getElementById('directBtn');
        this.settingsBtn = document.getElementById('settingsBtn');
        
        // Settings view elements
        this.exitBtn = document.getElementById('exitBtn');
        this.speedSlider = document.getElementById('speedSlider');
        this.speedValue = document.getElementById('speedValue');
        this.presetBtns = document.querySelectorAll('.preset-btn');
        this.testSpeechBtn = document.getElementById('testSpeechBtn');
        this.apiKeyInput = document.getElementById('apiKeyInput');
        this.apiKeyStatus = document.getElementById('apiKeyStatus');
        
        this.currentSpeed = 1.0;
        this.currentView = 'main';
    }
    
    setupEventListeners() {
        // Text input
        this.submitBtn.addEventListener('click', () => this.submitTextInput());
        this.textInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault(); // Prevent default behavior (new line in textarea)
                this.submitTextInput();
            }
        });
        
        // Options
        this.summaryBtn.addEventListener('click', () => this.requestSummary());
        this.suggestionsBtn.addEventListener('click', () => this.requestSuggestions());
        this.directBtn.addEventListener('click', () => this.showDirectInput());
        this.settingsBtn.addEventListener('click', () => this.showSettings());
        this.exitBtn.addEventListener('click', () => this.showMain());
        
        // Settings event listeners
        this.speedSlider.addEventListener('input', (e) => {
            this.currentSpeed = parseFloat(e.target.value);
            this.updateSpeedDisplay();
            this.updatePresetButtons();
            this.saveSettings();
        });
        
        this.presetBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const speed = parseFloat(e.target.dataset.speed);
                this.currentSpeed = speed;
                this.speedSlider.value = speed;
                this.updateSpeedDisplay();
                this.updatePresetButtons();
                this.saveSettings();
            });
        });
        
        this.testSpeechBtn.addEventListener('click', () => this.testSpeech());
        this.apiKeyInput.addEventListener('input', () => this.saveApiKey());
        
        // Listen for messages from content script
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleMessage(message, sender, sendResponse);
        });
    }
    
    submitTextInput() {
        const instruction = this.textInput.value.trim();
        if (instruction) {
            this.processInstruction(instruction);
            this.textInput.value = ''; // Clear the input after submission
        }
    }
    
    initializeAudio() {
        // Initialize audio context for text-to-speech
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    updateStatus(message) {
        this.statusEl.textContent = message;
    }
    
    showLoading() {
        this.loading.classList.remove('hidden');
        this.options.classList.add('hidden');
        this.isProcessing = true;
    }
    
    hideLoading() {
        this.loading.classList.add('hidden');
        this.isProcessing = false;
    }
    
    showOptions() {
        this.options.classList.remove('hidden');
        this.hideLoading();
    }
    
    async processInstruction(instruction) {
        if (this.isProcessing || !instruction.trim()) return;
        
        this.showLoading();
        this.updateStatus('Processing your instruction...');
        
        try {
            // Send instruction to background script
            console.log("sending instruction to background script", instruction);
            const response = await chrome.runtime.sendMessage({
                action: 'processInstruction',
                instruction: instruction.trim()
            });
            console.log("response from background script", response);
            
            if (response.success) {
                this.updateStatus(response.message);
                this.speak(response.message);
            } else {
                this.updateStatus('Error: ' + response.message);
                this.speak('Error: ' + response.message);
            }
        } catch (error) {
            console.error('Error processing instruction:', error);
            this.updateStatus('Error processing instruction');
            this.speak('Error processing instruction');
        } finally {
            this.hideLoading();
        }
    }
    
    async requestSummary() {
        this.showLoading();
        this.updateStatus('Analyzing website...');
        
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'getSummary'
            });
            
            if (response.success) {
                this.updateStatus('Website summary generated');
                this.speak(response.summary);
            } else {
                this.updateStatus('Error generating summary');
                this.speak('Error generating summary');
            }
        } catch (error) {
            console.error('Error getting summary:', error);
            this.updateStatus('Error getting summary');
            this.speak('Error getting summary');
        } finally {
            this.hideLoading();
        }
    }
    
    async requestSuggestions() {
        this.showLoading();
        this.updateStatus('Analyzing available actions...');
        
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'getSuggestions'
            });
            
            if (response.success) {
                this.updateStatus('Action suggestions generated');
                this.speak(response.suggestions);
            } else {
                this.updateStatus('Error generating suggestions');
                this.speak('Error generating suggestions');
            }
        } catch (error) {
            console.error('Error getting suggestions:', error);
            this.updateStatus('Error getting suggestions');
            this.speak('Error generating suggestions');
        } finally {
            this.hideLoading();
        }
    }
    
    showDirectInput() {
        this.textInput.focus();
        this.updateStatus('Type your instruction');
    }
    
    showSettings() {
        this.mainView.classList.remove('active');
        this.settingsView.classList.add('active');
        this.currentView = 'settings';
        this.initializeSettings();
    }
    
    showMain() {
        this.settingsView.classList.remove('active');
        this.mainView.classList.add('active');
        this.currentView = 'main';
    }
    
    async initializeSettings() {
        // Load saved settings
        try {
            const result = await chrome.storage.sync.get(['ttsSpeed', 'apiKey']);
            if (result.ttsSpeed !== undefined) {
                this.currentSpeed = result.ttsSpeed;
                this.updateSpeedDisplay();
                this.updatePresetButtons();
            }
            if (result.apiKey !== undefined) {
                this.apiKeyInput.value = result.apiKey;
                this.updateApiKeyStatus();
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
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
        } catch (error) {
            console.error('Error saving settings:', error);
        }
    }
    
    async saveApiKey() {
        try {
            const apiKey = this.apiKeyInput.value.trim();
            await chrome.storage.sync.set({
                apiKey: apiKey
            });
            
            // Notify background script of API key change
            chrome.runtime.sendMessage({
                action: 'setApiKeys',
                keys: { cerebras: apiKey }
            });
            
            this.updateApiKeyStatus();
        } catch (error) {
            console.error('Error saving API key:', error);
        }
    }
    
    updateApiKeyStatus() {
        const apiKey = this.apiKeyInput.value.trim();
        if (apiKey) {
            this.apiKeyStatus.textContent = '✓ API key saved';
            this.apiKeyStatus.style.color = '#4CAF50';
        } else {
            this.apiKeyStatus.textContent = 'Using simple interpretation (no API key)';
            this.apiKeyStatus.style.color = 'rgba(255, 255, 255, 0.7)';
        }
    }
    
    async testSpeech() {
        if (!('speechSynthesis' in window)) {
            this.updateStatus('Speech synthesis not supported in this browser');
            return;
        }
        
        this.updateStatus('Testing speech output...');
        
        const utterance = new SpeechSynthesisUtterance('This is a test of your current speech speed settings. The Blind Navigator AI is ready to help you navigate the web.');
        utterance.rate = this.currentSpeed;
        utterance.pitch = 1;
        utterance.volume = 1;
        
        utterance.onend = () => {
            this.updateStatus('Speech test completed successfully!');
        };
        
        utterance.onerror = (event) => {
            this.updateStatus(`Speech test failed: ${event.error}`);
        };
        
        speechSynthesis.speak(utterance);
    }
    
    async speak(text) {
        if ('speechSynthesis' in window) {
            // Get the saved TTS speed setting
            const result = await chrome.storage.sync.get(['ttsSpeed']);
            const speed = result.ttsSpeed || 1.0;
            
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = speed;
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
                this.showOptions();
                break;
        }
    }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new BlindNavigatorPopup();
});