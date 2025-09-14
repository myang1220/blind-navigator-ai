# Blind Navigator AI - Chrome Extension

An agentic AI Chrome extension that helps blind users navigate any website through text input and audio feedback.

## Features

- **Text-First Interface**: Keyboard shortcut activation with text input and audio output
- **Intelligent Website Analysis**: Generates clear summaries and action suggestions
- **AI-Powered Navigation**: Uses Cerebras API to interpret and execute user instructions
- **Universal Compatibility**: Works on any website regardless of accessibility features
- **Audio Feedback**: Built-in browser TTS for clear audio responses
- **Manual Text Input**: Support for pasting text from external tools like Wispr

## Installation

1. Clone or download this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension folder
5. The extension will appear in your Chrome toolbar

## Setup

### Backend Server (Required)

This extension now uses a local backend server for enhanced security and performance:

1. **Install Backend Dependencies:**
   ```bash
   ./setup-backend.sh
   ```

2. **Configure API Key:**
   Edit `backend/.env` and set your Cerebras API key:
   ```
   CEREBRAS_API_KEY=your_actual_api_key_here
   PORT=3000
   ```

3. **Start Backend Server:**
   ```bash
   cd backend
   npm start
   ```

4. **Test Backend Connection:**
   ```bash
   cd backend
   npm test
   ```

### API Keys (Required for Full Functionality)

For enhanced functionality, you need to configure your API key:

1. **Cerebras API**: For intelligent instruction interpretation
   - Sign up at [Cerebras AI](https://cerebras.ai)
   - Get your API key from the dashboard
   - Add it to the backend/.env file

### Without Backend

The extension requires the backend server to be running. If the backend is not available:
- The extension will show connection errors
- AI-powered features will not work
- Basic functionality may be limited
- Uses simple rule-based instruction interpretation

## Usage

### Activation

- **Keyboard Shortcut**: `Ctrl+Shift+V` (Windows/Linux) or `Cmd+Shift+V` (Mac)
- **Click Extension Icon**: Click the Blind Navigator AI icon in your toolbar

### Input Methods

1. **Text Input**: Type directly in the text box and press Enter or click Submit
2. **Manual Input**: Paste text from external tools like Wispr

### Text Commands

1. **Get Website Summary**: "Tell me about this page" or "What's on this website"
2. **Get Action Suggestions**: "What can I do here?" or "Show me options"
3. **Direct Instructions**: "Click the login button" or "Fill the email field with my email"

### Example Commands

- "Click the search button"
- "Fill the password field with my password"
- "Scroll down to see more content"
- "Go to the contact page"
- "Tell me what's on this page"
- "What can I do on this website?"

## How It Works

1. **Website Analysis**: The extension analyzes the current page's HTML structure
2. **Element Detection**: Identifies clickable elements, forms, links, and content
3. **AI Interpretation**: Uses Cerebras API to understand user instructions
4. **Action Execution**: Performs the requested actions on the webpage
5. **Audio Feedback**: Provides spoken confirmation of actions taken

## File Structure

```
blind/
├── manifest.json          # Chrome extension manifest
├── popup.html            # Extension popup UI
├── popup.js              # Popup functionality
├── content.js            # Content script for DOM interaction
├── background.js         # Background script for API communication
├── settings.html         # Settings page
├── settings.js           # Settings functionality
├── config.js             # Configuration and constants
├── package.json          # Project metadata
├── README.md             # This file
└── INSTALL.md            # Installation guide
```

## Technical Details

### Content Script (`content.js`)
- Analyzes website structure and content
- Identifies interactive elements
- Executes user actions (clicks, form filling, scrolling)
- Provides audio feedback

### Background Script (`background.js`)
- Handles API communication
- Processes user instructions using AI
- Manages extension state
- Coordinates between popup and content scripts

### Popup Interface (`popup.html` + `popup.js`)
- Text input interface
- Manual text input for external tools
- User interaction controls
- Status updates and feedback

## Browser Compatibility

- Chrome 88+ (Manifest V3)
- Requires tab permissions for website interaction

## Privacy & Security

- All processing happens locally or through configured APIs
- No data is stored or transmitted without user consent
- API keys are stored locally in Chrome's sync storage
- Website data is only analyzed for navigation purposes

## Troubleshooting

### Actions Not Executing
- Make sure the website has finished loading
- Try being more specific in your instructions
- Check if the element you want to interact with is visible

### API Errors
- Verify your API keys are correct
- Check your internet connection
- Ensure you have sufficient API credits

## Development

### Local Development
1. Make changes to the source files
2. Go to `chrome://extensions/`
3. Click the refresh button on the extension
4. Test your changes

### Building for Production
1. Update version number in `manifest.json`
2. Test thoroughly on various websites
3. Package the extension for distribution

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the MIT License.

## Support

For issues, questions, or contributions, please open an issue on the project repository.

---

**Note**: This extension is designed to assist blind and visually impaired users in navigating websites. It works best when combined with screen readers and other accessibility tools.