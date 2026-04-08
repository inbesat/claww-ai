# Claw AI Chat Application

A modern chat interface powered by your existing Rust AI logic, featuring a sleek developer-themed UI with neon accents.

## System Overview

- **Backend**: Node.js/Express server that interfaces with your existing Rust AI binary
- **Frontend**: React/Vite application with Tailwind CSS styling
- **Communication**: HTTP API between frontend and backend

## Features

### Backend (`chat-app/backend/`)
- Express server with CORS enabled
- POST `/api/chat` endpoint for sending messages to AI
- Integrates with existing Rust AI logic via `claw.exe` binary
- Proper error handling and logging
- Health check endpoint

### Frontend (`chat-app/frontend/`)
- React 18 with Vite for fast development
- Tailwind CSS with dark theme and neon accents
- Developer/pixel-inspired UI design
- Real-time chat interface
- Loading states and error handling
- Code block syntax highlighting
- Session management

## UI Design

- **Color Scheme**: Dark background (`#0a0a0a`) with neon green (`#00ff88`) and cyan (`#00ffff`) accents
- **Typography**: Monospace font (Fira Code/Courier)
- **Style**: Sharp edges, pixel/developer aesthetic, glow effects
- **Chat Layout**: User messages right-aligned, AI messages left-aligned
- **Special Features**: Code block styling with PrismJS syntax highlighting

## Setup Instructions

### Prerequisites
- Node.js (v16+)
- Rust AI binary built and available at `rust/target/debug/claw.exe`
- Valid OpenAI or XAI API key

### Backend Setup
1. Navigate to backend directory:
   ```bash
   cd chat-app/backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set your API key (required for AI to work):
   ```bash
   # PowerShell
   $env:OPENAI_API_KEY="your-actual-api-key-here"
   
   # CMD
   set OPENAI_API_KEY=your-actual-api-key-here
   ```

4. Start the server:
   ```bash
   npm start
   # or for development with auto-restart
   npm run dev
   ```

### Frontend Setup
1. Navigate to frontend directory:
   ```bash
   cd chat-app/frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser to `http://localhost:5173`

## API Endpoint

### POST `/api/chat`
Send a message to the AI and get a response.

**Request:**
```json
{
  "message": "Your message here",
  "sessionId": "optional-session-id"
}
```

**Response:**
```json
{
  "reply": "AI response text"
}
```

## Development

### Backend
- Runs on port 3001 by default
- Proxy configured in frontend to forward `/api` requests
- Uses `claw.exe` with `-p` flag for one-shot prompts
- Returns JSON-formatted AI responses

### Frontend
- Runs on port 5173 by default
- Proxy configured to forward API requests to backend
- Hot module replacement enabled during development
- Optimistic UI updates for better responsiveness

## Environment Variables

Backend requires:
- `OPENAI_API_KEY` or `XAI_API_KEY` - Your API key for the AI service

## Notes

- The backend reuses your existing Rust AI logic without modification
- All AI processing happens in your original Rust code
- The frontend/backend communication is purely for message passing
- Error handling is implemented at all levels
- UI is designed to be lightweight and responsive

## Troubleshooting

1. **AI not responding**: Verify your API key is set correctly and has sufficient credits
2. **Connection issues**: Ensure backend is running on port 3001
3. **Build problems**: Make sure `rust/target/debug/claw.exe` exists and is executable
4. **Styling issues**: Check that Tailwind CSS classes are properly applied

## Customization

- Modify colors in `tailwind.config.cjs`
- Adjust UI components in `chat-app/frontend/src/components/`
- Update API endpoint in frontend Vite proxy configuration
- Change session ID generation logic in `App.jsx`