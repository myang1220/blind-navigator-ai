class BlindNavigatorPopup {
    constructor() {
        this.isRecording = false;
        this.recognition = null;
        this.audioContext = null;
        this.isProcessing = false;
        
        this.initializeElements();
        this.setupEventListeners();
        this.initializeSpeechRecognition();
        this.initializeAudio();
    }
    
    initializeElements() {
        this.statusEl = document.getElementById('status');
        this.voiceInput = document.getElementById('voiceInput');
        this.voiceBtn = document.getElementById('voiceBtn');
        this.options = document.getElementById('options');
        this.loading = document.getElementById('loading');
        this.summaryBtn = document.getElementById('summaryBtn');
        this.suggestionsBtn = document.getElementById('suggestionsBtn');
        this.directBtn = document.getElementById('directBtn');
        this.settingsBtn = document.getElementById('settingsBtn');
    }
    
    setupEventListeners() {
        this.voiceBtn.addEventListener('click', () => this.toggleVoiceRecording());
        this.voiceInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.processInstruction(this.voiceInput.value);
            }
        });
        
        this.summaryBtn.addEventListener('click', () => this.requestSummary());
        this.suggestionsBtn.addEventListener('click', () => this.requestSuggestions());
        this.directBtn.addEventListener('click', () => this.showDirectInput());
        this.settingsBtn.addEventListener('click', () => this.openSettings());
        
        // Listen for messages from content script
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleMessage(message, sender, sendResponse);
        });
    }
    
    initializeSpeechRecognition() {
        if ('webkitSpeechRecognition' in window) {
            this.recognition = new webkitSpeechRecognition();
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.lang = 'en-US';
            
            this.recognition.onstart = () => {
                this.isRecording = true;
                this.voiceBtn.classList.add('recording');
                this.updateStatus('Listening...');
            };
            
            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                this.voiceInput.value = transcript;
                this.processInstruction(transcript);
            };
            
            this.recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                this.updateStatus('Voice recognition error. Please try again.');
                this.stopRecording();
            };
            
            this.recognition.onend = () => {
                this.stopRecording();
            };
        } else {
            this.voiceBtn.style.display = 'none';
            this.updateStatus('Voice input not supported. Please type your instructions.');
        }
    }
    
    initializeAudio() {
        // Initialize audio context for text-to-speech
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    toggleVoiceRecording() {
        if (this.isRecording) {
            this.stopRecording();
        } else {
            this.startRecording();
        }
    }
    
    startRecording() {
        if (this.recognition) {
            this.recognition.start();
        }
    }
    
    stopRecording() {
        if (this.recognition) {
            this.recognition.stop();
        }
        this.isRecording = false;
        this.voiceBtn.classList.remove('recording');
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
            const response = await chrome.runtime.sendMessage({
                action: 'processInstruction',
                instruction: instruction.trim()
            });
            
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
            this.speak('Error getting suggestions');
        } finally {
            this.hideLoading();
        }
    }
    
    showDirectInput() {
        this.voiceInput.focus();
        this.updateStatus('Type or speak your instruction');
    }
    
    openSettings() {
        chrome.runtime.openOptionsPage();
    }
    
    async speak(text) {
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
                this.showOptions();
                break;
        }
    }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new BlindNavigatorPopup();
});
