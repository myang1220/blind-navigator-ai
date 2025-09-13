class BlindNavigatorBackground {
    constructor() {
        this.websiteData = null;
        
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
                    this.websiteData = message.data;
                    sendResponse({ success: true });
                    break;
                    
                case 'setApiKeys':
                    await this.setApiKeys(message.keys);
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
            if (!this.websiteData) {
                return { success: false, message: 'Website data not available. Please refresh the page.' };
            }
            
            // Use Cerebras API to interpret the instruction
            const interpretation = await this.interpretInstruction(instruction);
            
            if (!interpretation.success) {
                return interpretation;
            }
            
            // Execute the interpreted action
            const executionResult = await this.executeAction(interpretation.action);
            
            return {
                success: executionResult.success,
                message: executionResult.message
            };
        } catch (error) {
            console.error('Error processing instruction:', error);
            return { success: false, message: 'Error processing instruction: ' + error.message };
        }
    }
    
    async interpretInstruction(instruction) {
        try {
            // Use simple rule-based interpretation (no API required)
            return this.simpleInterpretation(instruction);
        } catch (error) {
            console.error('Error interpreting instruction:', error);
            return {
                success: false,
                message: 'Unable to process instruction. Please try a different wording.'
            };
        }
    }
    
    simpleInterpretation(instruction) {
        const lowerInstruction = instruction.toLowerCase();
        
        // Simple keyword-based interpretation
        if (lowerInstruction.includes('click') || lowerInstruction.includes('press')) {
            const element = this.findElementByText(instruction);
            if (element) {
                return {
                    success: true,
                    action: {
                        type: 'click',
                        selector: element.selector,
                        text: element.text
                    }
                };
            }
        }
        
        if (lowerInstruction.includes('fill') || lowerInstruction.includes('type') || lowerInstruction.includes('enter')) {
            const element = this.findInputElement(instruction);
            if (element) {
                const value = this.extractValueFromInstruction(instruction);
                return {
                    success: true,
                    action: {
                        type: 'fill',
                        selector: element.selector,
                        text: element.text,
                        value: value
                    }
                };
            }
        }
        
        if (lowerInstruction.includes('scroll')) {
            const direction = this.extractScrollDirection(instruction);
            return {
                success: true,
                action: {
                    type: 'scroll',
                    direction: direction
                }
            };
        }
        
        return {
            success: false,
            message: 'Could not understand the instruction. Please try being more specific.'
        };
    }
    
    findElementByText(instruction) {
        if (!this.websiteData || !this.websiteData.interactableElements) {
            return null;
        }
        
        const elements = this.websiteData.interactableElements;
        const lowerInstruction = instruction.toLowerCase();
        
        // Find exact text match
        let element = elements.find(el => 
            el.text.toLowerCase().includes(lowerInstruction) || 
            lowerInstruction.includes(el.text.toLowerCase())
        );
        
        if (element) return element;
        
        // Find partial match
        element = elements.find(el => 
            el.text.toLowerCase().split(' ').some(word => 
                lowerInstruction.includes(word) && word.length > 3
            )
        );
        
        return element;
    }
    
    findInputElement(instruction) {
        if (!this.websiteData || !this.websiteData.interactableElements) {
            return null;
        }
        
        const inputElements = this.websiteData.interactableElements.filter(el => el.type === 'input');
        const lowerInstruction = instruction.toLowerCase();
        
        return inputElements.find(el => 
            el.text.toLowerCase().includes(lowerInstruction) || 
            lowerInstruction.includes(el.text.toLowerCase())
        );
    }
    
    extractValueFromInstruction(instruction) {
        // Simple extraction of quoted text or text after "with" or "as"
        const patterns = [
            /with\s+["']([^"']+)["']/i,
            /as\s+["']([^"']+)["']/i,
            /["']([^"']+)["']/,
            /type\s+(.+)/i,
            /enter\s+(.+)/i
        ];
        
        for (const pattern of patterns) {
            const match = instruction.match(pattern);
            if (match) {
                return match[1].trim();
            }
        }
        
        return '';
    }
    
    extractScrollDirection(instruction) {
        const lowerInstruction = instruction.toLowerCase();
        
        if (lowerInstruction.includes('up')) return 'up';
        if (lowerInstruction.includes('down')) return 'down';
        if (lowerInstruction.includes('top')) return 'top';
        if (lowerInstruction.includes('bottom')) return 'bottom';
        
        return 'down'; // default
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
            
            const summary = this.websiteData.summary;
            return { success: true, summary: summary };
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
            
            const suggestions = this.websiteData.suggestions;
            return { success: true, suggestions: suggestions };
        } catch (error) {
            console.error('Error getting suggestions:', error);
            return { success: false, message: 'Error generating suggestions' };
        }
    }
    
}

// Initialize background script
new BlindNavigatorBackground();