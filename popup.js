class BlindNavigatorPopup {
    constructor() {
        this.audioContext = null;
        this.isProcessing = false;
        
        this.initializeElements();
        this.setupEventListeners();
        this.initializeAudio();
    }
    
    initializeElements() {
        this.statusEl = document.getElementById('status');
        this.textInput = document.getElementById('textInput');
        this.submitBtn = document.getElementById('submitBtn');
        this.options = document.getElementById('options');
        this.loading = document.getElementById('loading');
        this.summaryBtn = document.getElementById('summaryBtn');
        this.suggestionsBtn = document.getElementById('suggestionsBtn');
        this.directBtn = document.getElementById('directBtn');
        this.settingsBtn = document.getElementById('settingsBtn');
    }
    
    setupEventListeners() {
        // Text input
        this.submitBtn.addEventListener('click', () => this.submitTextInput());
        this.textInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                this.submitTextInput();
            }
        });
        
        // Options
        this.summaryBtn.addEventListener('click', () => this.requestSummary());
        this.suggestionsBtn.addEventListener('click', () => this.requestSuggestions());
        this.directBtn.addEventListener('click', () => this.showDirectInput());
        this.settingsBtn.addEventListener('click', () => this.openSettings());
        
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
            this.speak('Error generating suggestions');
        } finally {
            this.hideLoading();
        }
    }
    
    showDirectInput() {
        this.textInput.focus();
        this.updateStatus('Type your instruction');
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