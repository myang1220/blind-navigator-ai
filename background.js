class BlindNavigatorBackground {
    constructor() {
        this.websiteData = null;
        this.apiKeys = {
            cerebras: null
        };
        
        this.initialize();
    }
    
    initialize() {
        this.setupMessageListener();
        this.loadApiKeys();
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
    
    async loadApiKeys() {
        try {
            const result = await chrome.storage.sync.get(['cerebrasKey']);
            this.apiKeys.cerebras = result.cerebrasKey;
        } catch (error) {
            console.error('Error loading API keys:', error);
        }
    }
    
    async saveApiKeys() {
        try {
            await chrome.storage.sync.set({
                cerebrasKey: this.apiKeys.cerebras
            });
        } catch (error) {
            console.error('Error saving API keys:', error);
        }
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
            
            if (!interpretation.success) {
                return interpretation;
            }
            
            // Execute the interpreted action
            const executionResult = await this.executeAction(interpretation.action);
            console.log('Execution result:', executionResult);
            
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
            // Get API key from storage
            const result = await chrome.storage.sync.get(['cerebrasKey']);
            const apiKey = result.cerebrasKey;
            
            if (!apiKey) {
                return {
                    success: false,
                    message: 'Cerebras API key not configured. Please set it in settings.'
                };
            }
            
            // Build the prompt with website context
            const prompt = this.buildCerebrasPrompt(instruction);
            
            // Make API call to Cerebras
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
                            content: prompt
                        }
                    ],
                    max_tokens: 1000,
                    temperature: 0.1
                })
            });
            
            if (!response.ok) {
                throw new Error(`Cerebras API error: ${response.status}`);
            }
            
            const data = await response.json();
            const aiResponse = data.choices[0].message.content;
            
            // Parse the AI response
            return this.parseCerebrasResponse(aiResponse);
            
        } catch (error) {
            console.error('Cerebras API error:', error);
            return {
                success: false,
                message: 'Error calling Cerebras API: ' + error.message
            };
        }
    }
    
    buildCerebrasPrompt(instruction) {
        const context = {
            website: {
                title: this.websiteData.title,
                url: this.websiteData.url,
                elements: this.websiteData.interactableElements
            },
            instruction: instruction
        };
        
        return `You are an AI assistant helping a blind user navigate a website. 

Website Context:
- Title: ${context.website.title}
- URL: ${context.website.url}
- Available elements: ${JSON.stringify(context.website.elements.slice(0, 10))}

User Instruction: "${instruction}"

Based on the user's instruction and the available website elements, determine what action to take. 

Return a JSON response with this structure. Do not return any other reasoning, just a JSON object:
{
    "action": {
        "type": "click|fill|navigate|scroll",
        "selector": "CSS selector for the element",
        "text": "Description of what will be clicked/filled",
        "value": "Value to fill (for fill actions)",
        "url": "URL to navigate to (for navigate actions)",
        "direction": "up|down|top|bottom (for scroll actions)"
    },
    "confidence": 0.0-1.0,
    "reasoning": "Brief explanation of why this action was chosen"
}

If the instruction is unclear or no suitable action can be determined, return (without any other reasoning either):
{
    "action": null,
    "confidence": 0.0,
    "reasoning": "Explanation of why no action could be determined"
}`;
    }
    
    parseCerebrasResponse(response) {
        try {
            console.log("response", response);
            const parsed = JSON.parse(response);
            
            if (!parsed.action) {
                return {
                    success: false,
                    message: parsed.reasoning || 'Could not determine action from instruction'
                };
            }
            
            return {
                success: true,
                action: parsed.action,
                confidence: parsed.confidence || 0.5,
                reasoning: parsed.reasoning
            };
        } catch (error) {
            console.error('Error parsing Cerebras response:', error);
            return {
                success: false,
                message: 'Error parsing AI response'
            };
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
    
    async setApiKeys(keys) {
        this.apiKeys = { ...this.apiKeys, ...keys };
        await this.saveApiKeys();
    }
}

// Initialize background script
new BlindNavigatorBackground();