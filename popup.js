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
        this.backendStatus = document.getElementById('backendStatus');
        
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

            if (!response) {
                return;
            }
            
            if (response.success) {
                this.updateStatus(response.message);
                this.speak(response.message);
            } else {
                this.updateStatus('Error: ' + response.message);
                this.speak('Error: ' + response.message);
            }
        } catch (error) {
            console.error('Error processing instruction:', error);
            this.updateStatus('Backend connection error - make sure backend is running');
            this.speak('Backend connection error. Please start the backend server.');
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
            this.updateStatus('Backend connection error - make sure backend is running');
            this.speak('Backend connection error. Please start the backend server.');
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
            this.updateStatus('Backend connection error - make sure backend is running');
            this.speak('Backend connection error. Please start the backend server.');
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
            const result = await chrome.storage.sync.get(['ttsSpeed']);
            if (result.ttsSpeed !== undefined) {
                this.currentSpeed = result.ttsSpeed;
                this.updateSpeedDisplay();
                this.updatePresetButtons();
            }
            
            // Check backend connection
            await this.checkBackendConnection();
        } catch (error) {
            console.error('Error loading settings:', error);
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
            this.updateBackendStatus('⚠ Backend not running - start with: cd backend && npm start', 'error');
        }
    }
    
    updateBackendStatus(message, type) {
        if (this.backendStatus) {
            this.backendStatus.textContent = message;
            this.backendStatus.className = `backend-status ${type}`;
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