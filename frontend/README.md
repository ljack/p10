# Notes App Frontend

A clean and modern React frontend for the Notes API.

## Features

- **NotesList Component**: Displays all notes in a responsive grid layout
- **Clean UI**: Modern card-based design with hover effects
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Loading States**: Shows spinner while fetching notes
- **Error Handling**: Displays error messages with retry functionality
- **Empty State**: Friendly message when no notes exist

## Getting Started

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn
- Notes API running on port 3001

### Installation

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Start the development server:
```bash
npm start
```

3. Open http://localhost:3000 in your browser

### API Integration

The frontend expects the Notes API to be running on `localhost:3001`. The proxy is configured in `package.json` to forward API requests.

## Component Structure

```
src/
├── App.js                 # Main app component
├── App.css               # App styles
├── index.js              # React entry point
├── index.css            # Global styles
└── components/
    ├── NotesList.js      # Notes list component
    └── NotesList.css     # Notes list styles
```

## NotesList Component

The main component that:

- Fetches notes from `/api/notes`
- Displays them in a responsive grid
- Shows title, content preview, and creation date
- Handles loading, error, and empty states
- Responsive design for all screen sizes

### Features

- **Card Layout**: Each note displayed as a clean card
- **Content Preview**: Shows first 120 characters of content
- **Date Formatting**: User-friendly date display
- **Hover Effects**: Smooth animations on card hover
- **Mobile Responsive**: Optimized for mobile devices

## Styling

Uses a modern, clean design with:
- Blue accent colors (#3498db)
- Card-based layout with shadows
- Responsive grid system
- Smooth hover transitions
- Mobile-first responsive design

## Scripts

- `npm start`: Run development server
- `npm build`: Build for production
- `npm test`: Run tests
- `npm run eject`: Eject from Create React App