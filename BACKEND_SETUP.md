# Backend Setup Instructions

This Chrome extension now uses a local backend server to handle AI processing and API calls. This approach provides better security and flexibility.

## Quick Setup

1. **Run the setup script:**
   ```bash
   ./setup-backend.sh
   ```

2. **Set your API key:**
   Edit `backend/.env` and replace `YOUR_CEREBRAS_API_KEY_HERE` with your actual Cerebras API key.

3. **Start the backend server:**
   ```bash
   cd backend
   npm start
   ```

4. **Load the Chrome extension** as usual - it will now communicate with your local backend.

## Development Mode

For development with auto-reload:
```bash
cd backend
npm run dev
```

## API Endpoints

The backend provides these endpoints:

- `GET /health` - Health check
- `POST /api/process-instruction` - Process user instructions with AI
- `POST /api/get-summary` - Get website summary
- `POST /api/get-suggestions` - Get action suggestions

## Architecture Benefits

- **Security**: API keys stay on your local machine
- **Performance**: Offload heavy processing from extension
- **Flexibility**: Easy to add database, caching, or other services
- **Development**: Better debugging and testing capabilities

## Troubleshooting

- Make sure the backend server is running on port 3000
- Check that your API key is correctly set in `backend/.env`
- Verify the extension can connect to `http://localhost:3000`
- Check browser console and backend logs for errors

## Environment Variables

- `CEREBRAS_API_KEY`: Your Cerebras API key
- `PORT`: Backend server port (default: 3000)
