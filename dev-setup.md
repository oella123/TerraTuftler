# TerraTüftler Development Setup

## Backend Integration for Persistent Data

This project now includes a Node.js/Express backend for persistent data storage.

### Prerequisites

1. Node.js (version 14 or higher)
2. npm (comes with Node.js)

### Installation

1. Install dependencies:
```bash
npm install
```

### Development Workflow

#### Option 1: Full Development (Recommended)
Run both frontend and backend together:
```bash
npm run build
npm run start
```
This builds the frontend and starts the backend server on port 3001.

#### Option 2: Frontend Only (Static Development)
For frontend-only development without backend features:
```bash
npm run dev
```
This runs only the Vite development server on port 5173.

#### Option 3: Backend Only
To run just the backend server:
```bash
npm run dev:backend
```

### How It Works

1. **Data Loading**: The application first tries to load data from the backend API. If the backend is not available, it falls back to static JSON files.

2. **Data Saving**: When you add categories or questions through the admin interface:
   - Data is saved to the backend API (which writes to JSON files)
   - Data is also saved to localStorage as a backup
   - If the backend is unavailable, only localStorage is used

3. **Leaderboard**: Leaderboard data is also saved persistently through the backend API.

### File Structure

- `server.js` - Express backend server
- `src/js/api.js` - Frontend API utility functions
- `src/data/` - JSON data files (updated by backend)
- `src/js/data.js` - Data loading with backend integration
- `src/js/leaderboardData.js` - Leaderboard with backend integration
- `src/js/admin.js` - Admin interface with backend integration

### API Endpoints

- `GET /api/quiz-data` - Load quiz data
- `POST /api/quiz-data` - Save complete quiz data
- `GET /api/leaderboard-data` - Load leaderboard data
- `POST /api/leaderboard-data` - Save leaderboard data
- `POST /api/add-category` - Add new category
- `POST /api/add-question` - Add new question

### Production Deployment

1. Build the frontend:
```bash
npm run build
```

2. Start the production server:
```bash
npm start
```

The server will serve the built frontend files and handle API requests.

### Troubleshooting

- If you get CORS errors, make sure the backend server is running
- If data doesn't persist, check the browser console for API errors
- The application will work in fallback mode (localStorage only) if the backend is unavailable
