class BlindNavigatorBackground {
    constructor() {
        this.websiteData = null;
        
        // Backend configuration
        this.backendUrl = 'http://localhost:3000';
        
        this.initialize();
    }
    
    initialize() {
        this.setupMessageListener();
        this.setupKeyboardShortcuts();
    }
    
    setupMessageListener() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleMessage(message, sender, sendResponse);
        });
    }
    
    setupKeyboardShortcuts() {
        chrome.commands.onCommand.addListener((command) => {
            if (command === 'toggle-extension') {
                this.toggleExtension();
            }
        });
    }
    
    
    async toggleExtension() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab) {
                await chrome.tabs.sendMessage(tab.id, { action: 'toggleExtension' });
            }
        } catch (error) {
            console.error('Error toggling extension:', error);
        }
    }
    
    async handleMessage(message, sender, sendResponse) {
        try {
            switch (message.action) {
                case 'processInstruction':
                    const result = await this.processInstruction(message.instruction);
                    sendResponse(result);
                    break;
                    
                case 'getSummary':
                    const summary = await this.getSummary();
                    sendResponse(summary);
                    break;
                    
                case 'getSuggestions':
                    const suggestions = await this.getSuggestions();
                    sendResponse(suggestions);
                    break;
                    
                case 'websiteAnalyzed':
                    console.log('Received website data from content script:', message.data);
                    this.websiteData = message.data;
                    sendResponse({ success: true });
                    break;
                    
                    
                default:
                    sendResponse({ success: false, message: 'Unknown action' });
            }
        } catch (error) {
            console.error('Error handling message:', error);
            sendResponse({ success: false, message: error.message });
        }
    }
    
    async processInstruction(instruction) {
        try {
            console.log('Processing instruction:', instruction);
            console.log('Website data available:', !!this.websiteData);
            
            if (!this.websiteData) {
                console.log('No website data available, requesting from content script...');
                // Try to get website data from content script
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (tab) {
                    try {
                        const response = await chrome.tabs.sendMessage(tab.id, {
                            action: 'getWebsiteData'
                        });
                        if (response && response.success && response.data) {
                            this.websiteData = response.data;
                            console.log('Website data retrieved from content script:', this.websiteData);
                        }
                    } catch (error) {
                        console.error('Error getting website data from content script:', error);
                    }
                }
                
                if (!this.websiteData) {
                    return { success: false, message: 'Website data not available. Please refresh the page and try again.' };
                }
            }
            
            // Call Cerebras API to interpret the instruction
            const interpretation = await this.callCerebrasAPI(instruction);
            console.log('Interpretation result:', interpretation);
            
            // Ensure interpretation is a valid object
            if (!interpretation || typeof interpretation !== 'object') {
                console.error('Invalid interpretation result:', interpretation);
                return { 
                    success: false, 
                    message: 'Failed to interpret instruction. Please try again.' 
                };
            }
            
            if (!interpretation.success) {
                return interpretation;
            }
            
            // Execute the interpreted action
            const executionResult = await this.executeAction(interpretation.action);
            console.log('Execution result:', executionResult);
            
            if (!executionResult) {
                return { success: true, message: 'Something happened but I dont know what' };
            }

            return {
                success: executionResult.success,
                message: executionResult.message
            };
        } catch (error) {
            console.error('Error processing instruction:', error);
            return { success: false, message: 'Error processing instruction: ' + error.message };
        }
    }
    
    async callCerebrasAPI(instruction) {
        try {
            console.log('Calling backend API with instruction:', instruction);
            
            // Call local backend instead of Cerebras directly
            const response = await fetch(`${this.backendUrl}/api/process-instruction`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    instruction: instruction,
                    websiteData: this.websiteData
                })
            });
            
            console.log('Backend API response status:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Backend API error response:', errorText);
                throw new Error(`Backend API error: ${response.status} - ${errorText}`);
            }
            
            const data = await response.json();
            console.log('Backend API response data:', data);
            
            return data;
            
        } catch (error) {
            console.error('Backend API error:', error);
            return {
                success: false,
                message: 'Error calling backend API: ' + error.message
            };
        }
    }
    
    
    
    async executeAction(action) {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) {
                return { success: false, message: 'No active tab found' };
            }
            
            const response = await chrome.tabs.sendMessage(tab.id, {
                action: 'executeAction',
                actionData: action
            });
            
            return response;
        } catch (error) {
            console.error('Error executing action:', error);
            return { success: false, message: 'Error executing action: ' + error.message };
        }
    }
    
    async getSummary() {
        try {
            if (!this.websiteData) {
                return { success: false, message: 'Website data not available' };
            }
            
            // Call backend for summary
            const response = await fetch(`${this.backendUrl}/api/get-summary`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    websiteData: this.websiteData
                })
            });
            
            if (!response.ok) {
                throw new Error(`Backend API error: ${response.status}`);
            }
            
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Error getting summary:', error);
            return { success: false, message: 'Error generating summary' };
        }
    }
    
    async getSuggestions() {
        try {
            if (!this.websiteData) {
                return { success: false, message: 'Website data not available' };
            }
            
            // Call backend for suggestions
            const response = await fetch(`${this.backendUrl}/api/get-suggestions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    websiteData: this.websiteData
                })
            });
            
            if (!response.ok) {
                throw new Error(`Backend API error: ${response.status}`);
            }
            
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Error getting suggestions:', error);
            return { success: false, message: 'Error generating suggestions' };
        }
    }
    
}

// Initialize background script
new BlindNavigatorBackground();