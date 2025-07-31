# 🎵 Spotify Playlist Creator

A comprehensive Node.js application for creating and organizing Spotify playlists with top tracks and genre-based organization.

## 🚀 Features

- **Top 50 Playlist** - Create playlists from your most played tracks
- **Genre Organization** - Automatically sort your library by musical genres  
- **DJ Harmonizer** - Experimental tool for harmonic DJ playlists (WIP)
- **Playlist Management** - List and manage your existing playlists
- **OAuth Authentication** - Secure Spotify API integration

## 📦 Installation

```bash
# Clone repository
git clone <repo-url>
cd createplaylists

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Add your Spotify Client ID and Secret
```

## 🎵 Available Commands

### Quick Start - Show Help
```bash
npm run help
```

### 📱 Main Features

**Create Top 50 Playlist:**
```bash
npm start
# or
npm run top50
```
Creates a playlist with your 50 most played tracks.

**Organize by Genres:**
```bash
npm run genres
```
Organizes your library into genre-based playlists.

**Organize All Tracks:**
```bash
npm run organize
```
Organizes all your tracks by genres into separate playlists.

### 🎧 DJ Tools

**DJ Harmonizer (Experimental):**
```bash
npm run dj
# or  
npm run harmonizer
```
⚠️ **Status:** Limited by deprecated Spotify Audio Features API.

### 🔧 Utilities

**List Playlists:**
```bash
npm run list
```

**Delete Recent Playlists:**
```bash
npm run clean
```

**Development Mode:**
```bash
npm run dev
```

## ⚙️ Configuration

1. **Create Spotify App:**
   - Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
   - Create a new app
   - Note down Client ID and Client Secret

2. **Set Environment Variables:**
   ```bash
   SPOTIFY_CLIENT_ID=your_client_id
   SPOTIFY_CLIENT_SECRET=your_client_secret
   SPOTIFY_REDIRECT_URI=http://localhost:3000/callback
   ```

## 🛠️ Development

**System Requirements:**
- Node.js >= 18.0.0
- NPM

**Getting Started:**
```bash
npm run help    # Shows all available commands
npm start       # Starts the default function (Top 50)
```
