// Simple test script to verify backend connection
// Run this with: node test-backend.js

const fetch = require('node-fetch');

async function testBackend() {
    console.log('Testing backend connection...');
    
    try {
        // Test health endpoint
        const healthResponse = await fetch('http://localhost:3000/health');
        if (healthResponse.ok) {
            const healthData = await healthResponse.json();
            console.log('✓ Backend health check passed:', healthData);
        } else {
            console.log('✗ Backend health check failed:', healthResponse.status);
            return;
        }
        
        // Test process instruction endpoint
        const testInstruction = {
            instruction: "click on the login button",
            websiteData: {
                title: "Test Page",
                url: "https://example.com",
                interactableElements: [
                    {
                        type: "clickable",
                        text: "Login",
                        selector: ".login-btn",
                        id: "login-btn"
                    }
                ]
            }
        };
        
        const instructionResponse = await fetch('http://localhost:3000/api/process-instruction', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testInstruction)
        });
        
        if (instructionResponse.ok) {
            const instructionData = await instructionResponse.json();
            console.log('✓ Process instruction test passed:', instructionData);
        } else {
            const errorText = await instructionResponse.text();
            console.log('✗ Process instruction test failed:', instructionResponse.status, errorText);
        }
        
    } catch (error) {
        console.log('✗ Backend connection failed:', error.message);
        console.log('Make sure the backend server is running: cd backend && npm start');
    }
}

testBackend();
