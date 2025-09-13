class BlindNavigatorContent {
    constructor() {
        this.isActive = false;
        this.currentElement = null;
        this.interactableElements = [];
        this.websiteData = null;
        
        this.initialize();
    }
    
    initialize() {
        this.setupMessageListener();
        this.analyzeWebsite();
        this.setupKeyboardShortcuts();
    }
    
    setupMessageListener() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleMessage(message, sender, sendResponse);
        });
    }
    
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+Shift+V or Cmd+Shift+V to toggle extension
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'V') {
                e.preventDefault();
                this.toggleExtension();
            }
        });
    }
    
    toggleExtension() {
        this.isActive = !this.isActive;
        if (this.isActive) {
            this.highlightInteractableElements();
            this.announcePageContent();
        } else {
            this.removeHighlights();
        }
    }
    
    async analyzeWebsite() {
        try {
            console.log('Starting website analysis...');
            this.websiteData = {
                title: document.title,
                url: window.location.href,
                summary: this.generateWebsiteSummary(),
                interactableElements: this.findInteractableElements(),
                suggestions: this.generateActionSuggestions(),
                timestamp: Date.now()
            };
            
            console.log('Website analysis complete:', {
                title: this.websiteData.title,
                url: this.websiteData.url,
                elementsCount: this.websiteData.interactableElements.length
            });
            
            // Send data to background script
            chrome.runtime.sendMessage({
                action: 'websiteAnalyzed',
                data: this.websiteData
            });
            console.log('Website data sent to background script');
        } catch (error) {
            console.error('Error analyzing website:', error);
        }
    }
    
    generateWebsiteSummary() {
        const summary = {
            title: document.title,
            headings: this.extractHeadings(),
            links: this.extractLinks(),
            forms: this.extractForms(),
            images: this.extractImages(),
            buttons: this.extractButtons(),
            mainContent: this.extractMainContent()
        };
        
        return this.formatSummary(summary);
    }
    
    extractHeadings() {
        const headings = [];
        const headingElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        
        headingElements.forEach((heading, index) => {
            const text = heading.textContent.trim();
            if (text) {
                headings.push({
                    level: parseInt(heading.tagName[1]),
                    text: text,
                    id: heading.id || `heading-${index}`,
                    element: heading
                });
            }
        });
        
        return headings;
    }
    
    extractLinks() {
        const links = [];
        const linkElements = document.querySelectorAll('a[href]');
        
        linkElements.forEach((link, index) => {
            const text = this.getElementText(link);
            const href = link.href;
            const isExternal = !href.startsWith(window.location.origin);
            
            if (text && href) {
                links.push({
                    text: text,
                    href: href,
                    isExternal: isExternal,
                    id: link.id || `link-${index}`,
                    element: link
                });
            }
        });
        
        return links;
    }
    
    extractForms() {
        const forms = [];
        const formElements = document.querySelectorAll('form');
        
        formElements.forEach((form, index) => {
            const inputs = Array.from(form.querySelectorAll('input, textarea, select')).map(input => ({
                type: input.type || input.tagName.toLowerCase(),
                name: input.name || input.id || 'unnamed',
                placeholder: input.placeholder || '',
                required: input.required,
                element: input
            }));
            
            if (inputs.length > 0) {
                forms.push({
                    id: form.id || `form-${index}`,
                    inputs: inputs,
                    action: form.action,
                    method: form.method,
                    element: form
                });
            }
        });
        
        return forms;
    }
    
    extractImages() {
        const images = [];
        const imgElements = document.querySelectorAll('img');
        
        imgElements.forEach((img, index) => {
            const alt = img.alt || '';
            const src = img.src;
            const title = img.title || '';
            
            images.push({
                alt: alt,
                src: src,
                title: title,
                id: img.id || `image-${index}`,
                element: img
            });
        });
        
        return images;
    }
    
    extractButtons() {
        const buttons = [];
        const buttonElements = document.querySelectorAll('button, input[type="button"], input[type="submit"]');
        
        buttonElements.forEach((button, index) => {
            const text = this.getElementText(button);
            const type = button.type || 'button';
            
            if (text) {
                buttons.push({
                    text: text,
                    type: type,
                    id: button.id || `button-${index}`,
                    element: button
                });
            }
        });
        
        return buttons;
    }
    
    extractMainContent() {
        // Try to find main content areas
        const mainSelectors = [
            'main',
            '[role="main"]',
            '.main-content',
            '.content',
            '#content',
            'article',
            '.article'
        ];
        
        for (const selector of mainSelectors) {
            const element = document.querySelector(selector);
            if (element) {
                return this.getElementText(element).substring(0, 500);
            }
        }
        
        // Fallback to body content
        return this.getElementText(document.body).substring(0, 500);
    }
    
    getElementText(element) {
        // Get text content while preserving some structure
        let text = '';
        
        if (element.tagName === 'IMG') {
            text = element.alt || element.title || 'Image';
        } else {
            text = element.textContent || element.innerText || '';
        }
        
        return text.trim().replace(/\s+/g, ' ');
    }
    
    formatSummary(data) {
        let summary = `Website: ${data.title}\n\n`;
        
        if (data.headings.length > 0) {
            summary += `Headings:\n`;
            data.headings.forEach(heading => {
                summary += `- ${heading.text}\n`;
            });
            summary += '\n';
        }
        
        if (data.links.length > 0) {
            summary += `Links (${data.links.length} found):\n`;
            data.links.slice(0, 10).forEach(link => {
                summary += `- ${link.text}${link.isExternal ? ' (external)' : ''}\n`;
            });
            if (data.links.length > 10) {
                summary += `... and ${data.links.length - 10} more links\n`;
            }
            summary += '\n';
        }
        
        if (data.buttons.length > 0) {
            summary += `Buttons (${data.buttons.length} found):\n`;
            data.buttons.slice(0, 5).forEach(button => {
                summary += `- ${button.text}\n`;
            });
            if (data.buttons.length > 5) {
                summary += `... and ${data.buttons.length - 5} more buttons\n`;
            }
            summary += '\n';
        }
        
        if (data.forms.length > 0) {
            summary += `Forms (${data.forms.length} found):\n`;
            data.forms.forEach((form, index) => {
                summary += `- Form ${index + 1} with ${form.inputs.length} fields\n`;
            });
            summary += '\n';
        }
        
        if (data.mainContent) {
            summary += `Main content: ${data.mainContent}...\n`;
        }
        
        return summary;
    }
    
    findInteractableElements() {
        const elements = [];
        
        // Find clickable elements
        const clickableSelectors = [
            'a[href]',
            'button',
            'input[type="button"]',
            'input[type="submit"]',
            '[onclick]',
            '[role="button"]',
            '[tabindex]'
        ];
        
        clickableSelectors.forEach(selector => {
            const found = document.querySelectorAll(selector);
            found.forEach((element, index) => {
                const text = this.getElementText(element);
                if (text) {
                    elements.push({
                        type: 'clickable',
                        text: text,
                        selector: this.generateSelector(element),
                        element: element,
                        id: `clickable-${elements.length}`
                    });
                }
            });
        });
        
        // Find form inputs
        const inputSelectors = [
            'input',
            'textarea',
            'select'
        ];
        
        inputSelectors.forEach(selector => {
            const found = document.querySelectorAll(selector);
            found.forEach((element, index) => {
                const text = this.getElementText(element);
                const placeholder = element.placeholder || '';
                const name = element.name || element.id || '';
                
                elements.push({
                    type: 'input',
                    text: text || placeholder || name || 'Input field',
                    selector: this.generateSelector(element),
                    element: element,
                    inputType: element.type || element.tagName.toLowerCase(),
                    id: `input-${elements.length}`
                });
            });
        });
        
        return elements;
    }
    
    generateActionSuggestions() {
        const suggestions = [];
        const elements = this.findInteractableElements();
        
        // Group elements by type
        const clickableElements = elements.filter(el => el.type === 'clickable');
        const inputElements = elements.filter(el => el.type === 'input');
        
        if (clickableElements.length > 0) {
            suggestions.push(`You can click on ${clickableElements.length} interactive elements like buttons and links`);
        }
        
        if (inputElements.length > 0) {
            suggestions.push(`You can fill out ${inputElements.length} form fields`);
        }
        
        // Add specific suggestions based on content
        if (document.querySelector('form')) {
            suggestions.push('You can fill out forms on this page');
        }
        
        if (document.querySelector('a[href]')) {
            suggestions.push('You can navigate to other pages using links');
        }
        
        if (document.querySelector('button')) {
            suggestions.push('You can interact with buttons to perform actions');
        }
        
        return suggestions.join('. ') + '.';
    }
    
    generateSelector(element) {
        // Generate a simple selector for the element
        if (element.id) {
            return `#${element.id}`;
        }
        
        if (element.className) {
            const classes = element.className.split(' ').filter(c => c).join('.');
            return `.${classes}`;
        }
        
        return element.tagName.toLowerCase();
    }
    
    highlightInteractableElements() {
        this.removeHighlights();
        
        const elements = this.findInteractableElements();
        elements.forEach((item, index) => {
            if (item.element) {
                item.element.style.outline = '2px solid #4CAF50';
                item.element.style.outlineOffset = '2px';
                item.element.setAttribute('data-blind-nav-highlight', index);
            }
        });
    }
    
    removeHighlights() {
        const highlighted = document.querySelectorAll('[data-blind-nav-highlight]');
        highlighted.forEach(element => {
            element.style.outline = '';
            element.style.outlineOffset = '';
            element.removeAttribute('data-blind-nav-highlight');
        });
    }
    
    async executeAction(action) {
        try {
            switch (action.type) {
                case 'click':
                    return await this.performClick(action);
                case 'fill':
                    return await this.performFill(action);
                case 'navigate':
                    return await this.performNavigation(action);
                case 'scroll':
                    return await this.performScroll(action);
                default:
                    return { success: false, message: 'Unknown action type' };
            }
        } catch (error) {
            console.error('Error executing action:', error);
            return { success: false, message: 'Error executing action: ' + error.message };
        }
    }
    
    async performClick(action) {
        const element = document.querySelector(action.selector);
        if (!element) {
            return { success: false, message: 'Element not found' };
        }
        
        // Scroll element into view
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Wait a bit for scroll to complete
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Perform click
        element.click();
        
        return { 
            success: true, 
            message: `Clicked on "${action.text || 'element'}"` 
        };
    }
    
    async performFill(action) {
        const element = document.querySelector(action.selector);
        if (!element) {
            return { success: false, message: 'Input element not found' };
        }
        
        // Focus the element
        element.focus();
        
        // Clear existing value
        element.value = '';
        
        // Set new value
        element.value = action.value;
        
        // Trigger input events
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        
        return { 
            success: true, 
            message: `Filled "${action.field || 'field'}" with "${action.value}"` 
        };
    }
    
    async performNavigation(action) {
        if (action.url) {
            window.location.href = action.url;
            return { success: true, message: `Navigating to ${action.url}` };
        }
        
        return { success: false, message: 'No URL provided for navigation' };
    }
    
    async performScroll(action) {
        const direction = action.direction || 'down';
        const amount = action.amount || 300;
        
        if (direction === 'down') {
            window.scrollBy(0, amount);
        } else if (direction === 'up') {
            window.scrollBy(0, -amount);
        } else if (direction === 'top') {
            window.scrollTo(0, 0);
        } else if (direction === 'bottom') {
            window.scrollTo(0, document.body.scrollHeight);
        }
        
        return { 
            success: true, 
            message: `Scrolled ${direction}` 
        };
    }
    
    announcePageContent() {
        const summary = this.generateWebsiteSummary();
        this.speak(summary);
    }
    
    speak(text) {
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
            case 'executeAction':
                this.executeAction(message.actionData).then(result => {
                    sendResponse(result);
                });
                return true; // Keep message channel open for async response
                
            case 'getWebsiteData':
                sendResponse({ success: true, data: this.websiteData });
                break;
                
            case 'highlightElements':
                this.highlightInteractableElements();
                sendResponse({ success: true });
                break;
                
            case 'removeHighlights':
                this.removeHighlights();
                sendResponse({ success: true });
                break;
                
            case 'announceContent':
                this.announcePageContent();
                sendResponse({ success: true });
                break;
        }
    }
}

// Initialize content script
new BlindNavigatorContent();
