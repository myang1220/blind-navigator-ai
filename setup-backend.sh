#!/bin/bash

echo "Setting up Blind Navigator Backend..."

# Create backend directory if it doesn't exist
mkdir -p backend

# Navigate to backend directory
cd backend

# Install dependencies
echo "Installing backend dependencies..."
npm install

# Set up environment variables
echo "Setting up environment variables..."
if [ ! -f .env ]; then
    echo "CEREBRAS_API_KEY=YOUR_CEREBRAS_API_KEY_HERE" > .env
    echo "PORT=3000" >> .env
    echo "Created .env file. Please update CEREBRAS_API_KEY with your actual API key."
fi

echo "Backend setup complete!"
echo "To start the backend server, run:"
echo "  cd backend && npm start"
echo ""
echo "To start with auto-reload for development, run:"
echo "  cd backend && npm run dev"
