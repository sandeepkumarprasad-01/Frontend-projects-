require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
// Serve static files from the public folder
app.use(express.static('public'));

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID ? process.env.SPOTIFY_CLIENT_ID.trim() : '';
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET ? process.env.SPOTIFY_CLIENT_SECRET.trim() : '';

// Helper function to get the Spotify access token
async function getSpotifyToken() {
    if (!CLIENT_ID || !CLIENT_SECRET) {
        throw new Error("Missing Spotify credentials. Please check your .env file.");
    }
    try {
        const response = await axios.post('https://accounts.spotify.com/api/token', 
            `grant_type=client_credentials&client_id=${encodeURIComponent(CLIENT_ID)}&client_secret=${encodeURIComponent(CLIENT_SECRET)}`, 
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );
        return response.data.access_token;
    } catch (error) {
        console.error("Error getting Spotify token:", error.response ? error.response.data : error.message);
        throw error;
    }
}

// Endpoint to proxy search requests to Spotify
app.get('/api/search', async (req, res) => {
    const query = req.query.q;
    if (!query) {
        return res.status(400).json({ error: 'Search query is required' });
    }

    try {
        const token = await getSpotifyToken();
        const response = await axios.get(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        res.json(response.data);
    } catch (error) {
        const errorMsg = error.response && error.response.data && error.response.data.error 
            ? error.response.data.error.message || error.response.data 
            : error.message;
        console.error("Error searching Spotify:", errorMsg);
        res.status(error.response ? error.response.status : 500).json({ error: errorMsg });
    }
});

// Endpoint for Home Page Data
app.get('/api/home', async (req, res) => {
    try {
        const token = await getSpotifyToken();
        const config = { headers: { 'Authorization': `Bearer ${token}` } };
        
        // Spotify deprecated the Browse API, so we use Search to get Playlists and Albums
        const [featuredRes, newReleasesRes] = await Promise.all([
            axios.get('https://api.spotify.com/v1/search?q=top+hits&type=playlist&limit=8', config),
            axios.get('https://api.spotify.com/v1/search?q=year:2025&type=album&limit=8', config)
        ]);

        const featuredPlaylists = featuredRes.data.playlists.items.filter(i => i);
        const newReleases = newReleasesRes.data.albums.items.filter(i => i);

        res.json({ featuredPlaylists, newReleases });
    } catch (error) {
        console.error("Error fetching home data:", error.message);
        res.status(500).json({ error: 'Failed to fetch home data' });
    }
});

// Endpoint for Library Data
app.get('/api/library', async (req, res) => {
    try {
        const token = await getSpotifyToken();
        const config = { headers: { 'Authorization': `Bearer ${token}` } };
        
        // Spotify deprecated Browse Categories, so we search for popular playlists/mixes
        const libraryRes = await axios.get('https://api.spotify.com/v1/search?q=mixes&type=playlist&limit=10', config);
        const categories = libraryRes.data.playlists.items.filter(i => i);

        res.json({ categories });
    } catch (error) {
        console.error("Error fetching library data:", error.message);
        res.status(500).json({ error: 'Failed to fetch library data' });
    }
});

// Endpoint for Sidebar Data (Mocking User's Library)
app.get('/api/sidebar', async (req, res) => {
    try {
        const token = await getSpotifyToken();
        const config = { headers: { 'Authorization': `Bearer ${token}` } };
        
        // Fetch some common playlist names to simulate a user's library
        const sidebarRes = await axios.get('https://api.spotify.com/v1/search?q=daily+mix&type=playlist&limit=6', config);
        const playlists = sidebarRes.data.playlists.items.filter(i => i);

        // Prepend a mocked "Liked Songs"
        playlists.unshift({
            id: 'liked-songs',
            name: 'Liked Songs',
            owner: { display_name: 'Spotify' },
            images: [{ url: 'https://misc.scdn.co/liked-songs/liked-songs-64.png' }]
        });

        res.json({ playlists });
    } catch (error) {
        console.error("Error fetching sidebar data:", error.message);
        res.status(500).json({ error: 'Failed to fetch sidebar data' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// Export the Express API for Vercel Serverless Functions
module.exports = app;
