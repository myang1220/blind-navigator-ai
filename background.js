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
            console.log('Calling Cerebras API with instruction:', instruction);
            
            // Get API key from instance variable
            const apiKey = this.apiKeys.cerebras;
            
            if (!apiKey || apiKey === 'YOUR_CEREBRAS_API_KEY_HERE') {
                console.log('API key not configured');
                return {
                    success: false,
                    message: 'Cerebras API key not configured. Please set it in the code.'
                };
            }
            
            // Build the prompt with website context
            const prompt = this.buildCerebrasPrompt(instruction);
            console.log('Generated prompt:', prompt);
            
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
            
            console.log('API response status:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('API error response:', errorText);
                throw new Error(`Cerebras API error: ${response.status} - ${errorText}`);
            }
            
            const data = await response.json();
            console.log('API response data:', data);
            
            if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                throw new Error('Invalid API response format');
            }
            
            const aiResponse = data.choices[0].message.content;
            console.log('AI response content:', aiResponse);
            
            // Parse the AI response
            const result = this.parseCerebrasResponse(aiResponse);
            console.log('Parsed result:', result);
            return result;
            
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
If no exact matches exist, use the closest match available out of the interactable elements.

IMPORTANT: For CSS selectors, use simple and valid selectors. Avoid complex Tailwind CSS classes with special characters like colons, brackets, or spaces. Prefer:
- Simple class names like ".button" or ".link"
- ID selectors like "#submit-btn"
- Tag selectors like "button" or "a"
- Simple attribute selectors like "[href='/login']"

Return a JSON response with this structure. Do not return any other reasoning, just a JSON object:
{
    "action": {
        "type": "click|fill|navigate|scroll",
        "selector": "Simple CSS selector for the element (avoid special characters)",
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
            console.log("Raw AI response:", response);
            
            if (!response || typeof response !== 'string') {
                throw new Error('Invalid response format');
            }
            
            const parsed = JSON.parse(response);
            console.log("Parsed JSON:", parsed);
            
            if (!parsed || typeof parsed !== 'object') {
                throw new Error('Response is not a valid JSON object');
            }
            
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
            console.error('Response that failed to parse:', response);
            return {
                success: false,
                message: 'Error parsing AI response: ' + error.message
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