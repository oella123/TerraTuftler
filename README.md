# TerraTüftler

A geography quiz game similar to GeoGuessr, where players guess locations based on images and maps.

## 🚀 New: Persistent Data Storage

TerraTüftler now includes a **Node.js/Express backend** for persistent data storage:

✅ **Admin changes are permanently saved** to JSON files on the server
✅ **Categories and questions persist** across browser sessions and devices
✅ **Leaderboard data is shared** between all users
✅ **No more data loss** when refreshing the browser or switching devices

## Features

- Interactive map-based quiz
- Multiple themes (Light, Dark, Colorful)
- Responsive design
- Mobile-friendly interface
- Score tracking
- Location-based questions
- **Admin interface** for adding categories and questions
- **Persistent leaderboard** with cross-session tracking
- **Backend API** for data management

## Project Structure

```
terratuftler/
├── src/
│   ├── css/
│   │   ├── styles.css      # Base styles
│   │   ├── themes.css      # Theme-specific styles
│   │   └── components.css  # UI component styles
│   ├── js/
│   │   ├── app.js         # Main application logic
│   │   ├── quiz.js        # Quiz functionality
│   │   ├── map.js         # Map functionality
│   │   └── theme.js       # Theme management
│   ├── assets/
│   │   ├── images/        # Image assets
│   │   └── icons/         # Icon assets
│   └── index.html         # Main HTML file
├── public/                # Static files
├── package.json          # Project dependencies
└── README.md            # Project documentation
```

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build and start the application:
   ```bash
   npm run build
   npm start
   ```

The application will be available at `http://localhost:3001`

## Development

### Full Development (Recommended)
```bash
npm run build    # Build frontend
npm start        # Start backend server with frontend
```

### Frontend-Only Development
```bash
npm run dev      # Start Vite dev server (no backend features)
```

### Available Scripts
- `npm start` - Start production server with backend (port 3001)
- `npm run dev` - Start frontend development server (port 5173)
- `npm run build` - Build frontend for production
- `npm run preview` - Preview production build

## Technologies Used

### Frontend
- HTML5
- CSS3
- JavaScript (ES6+)
- Leaflet.js (for maps)
- Vite (build tool)

### Backend
- Node.js
- Express.js
- File system API for JSON data persistence
- CORS for cross-origin requests

## License

MIT License 