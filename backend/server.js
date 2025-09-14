require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: ['chrome-extension://*', 'http://localhost:*', 'http://127.0.0.1:*'],
    credentials: true
}));
app.use(express.json());

// Configuration
const CEREBRAS_API_KEY = process.env.CEREBRAS_API_KEY;
const CEREBRAS_API_URL = 'https://api.cerebras.ai/v1/chat/completions';

// Debug: Log environment variable status
console.log('Environment variables loaded:');
console.log('- CEREBRAS_API_KEY:', CEREBRAS_API_KEY ? '✓ Set' : '✗ Not set');
console.log('- PORT:', PORT);

// Routes

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Process instruction endpoint
app.post('/api/process-instruction', async (req, res) => {
    try {
        const { instruction, websiteData } = req.body;
        
        console.log('Processing instruction:', instruction);
        console.log('Website data:', websiteData ? 'Present' : 'Missing');
        
        if (!instruction) {
            return res.status(400).json({
                success: false,
                message: 'Instruction is required'
            });
        }
        
        if (!websiteData) {
            return res.status(400).json({
                success: false,
                message: 'Website data is required'
            });
        }
        
        // Call Cerebras API
        const result = await callCerebrasAPI(instruction, websiteData);
        res.json(result);
        
    } catch (error) {
        console.error('Error processing instruction:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing instruction: ' + error.message
        });
    }
});

// Get summary endpoint
app.post('/api/get-summary', async (req, res) => {
    try {
        const { websiteData } = req.body;
        
        if (!websiteData) {
            return res.status(400).json({
                success: false,
                message: 'Website data is required'
            });
        }
        
        const summary = websiteData.summary;
        res.json({ success: true, summary: summary });
        
    } catch (error) {
        console.error('Error getting summary:', error);
        res.status(500).json({
            success: false,
            message: 'Error generating summary'
        });
    }
});

// Get suggestions endpoint
app.post('/api/get-suggestions', async (req, res) => {
    try {
        const { websiteData } = req.body;
        
        if (!websiteData) {
            return res.status(400).json({
                success: false,
                message: 'Website data is required'
            });
        }
        
        const suggestions = websiteData.suggestions;
        res.json({ success: true, suggestions: suggestions });
        
    } catch (error) {
        console.error('Error getting suggestions:', error);
        res.status(500).json({
            success: false,
            message: 'Error generating suggestions'
        });
    }
});

// Helper function to call Cerebras API
async function callCerebrasAPI(instruction, websiteData) {
    try {
        console.log('Calling Cerebras API with instruction:', instruction);
        console.log('Cerebras API key:', CEREBRAS_API_KEY);
        
        if (!CEREBRAS_API_KEY || CEREBRAS_API_KEY === 'YOUR_CEREBRAS_API_KEY_HERE') {
            console.log('API key not configured');
            return {
                success: false,
                message: 'Cerebras API key not configured. Please set the CEREBRAS_API_KEY environment variable.'
            };
        }
        
        // Build the prompt with website context
        const prompt = buildCerebrasPrompt(instruction, websiteData);
        console.log('Generated prompt:', prompt);
        
        // Make API call to Cerebras
        const response = await axios.post(CEREBRAS_API_URL, {
            model: 'llama-4-scout-17b-16e-instruct',
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: 1000,
            temperature: 0.1
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CEREBRAS_API_KEY}`
            }
        });
        
        console.log('API response status:', response.status);
        console.log('API response data:', response.data);
        
        if (!response.data.choices || !response.data.choices[0] || !response.data.choices[0].message) {
            throw new Error('Invalid API response format');
        }
        
        const aiResponse = response.data.choices[0].message.content;
        console.log('AI response content:', aiResponse);
        
        // Parse the AI response
        const result = parseCerebrasResponse(aiResponse);
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

function buildCerebrasPrompt(instruction, websiteData) {
    const context = {
        website: {
            title: websiteData.title,
            url: websiteData.url,
            elements: websiteData.interactableElements
        },
        instruction: instruction
    };
    
    return `You are an AI assistant helping a blind user navigate a website. 

Website Context:
- Title: ${context.website.title}
- URL: ${context.website.url}
- Available elements: ${JSON.stringify(context.website.elements)}

User Instruction: "${instruction}"

Based on the user's instruction and the available website elements, determine what action to take. 
If there is an exact match between the user's instruction and the text of an element, use that element. If not, make an educated guess
for which element the user is referring to, based on the available interactable elements provided in the prompt above. You should never 
use the name of an element that is not provided in the available interactable elements.

IMPORTANT: For CSS selectors, use simple and valid selectors. Avoid complex Tailwind CSS classes with special characters like colons, brackets, or spaces. Prefer:
- Simple class names like ".button" or ".link"
- ID selectors like "#submit-btn"
- Tag selectors like "button" or "a"
- Simple attribute selectors like "[href='/login']"

Return a JSON response with this structure. DO NOT RETURN ANY OTHER REASON UNDER ANY CIRCUMSTANCES, just a JSON object:
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

function parseCerebrasResponse(response) {
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

// Start server
app.listen(PORT, () => {
    console.log(`Blind Navigator Backend running on http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
