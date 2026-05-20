const express = require('express');
const router = express.Router();
const axios = require('axios');
const querystring = require('querystring');
const auth = require('../middleware/auth');

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = 'http://127.0.0.1:5000/api/spotify/callback';

// We'll store the tokens globally in memory for this private couple app
let globalAccessToken = null;
let globalRefreshToken = null;
let tokenExpirationTime = null;

router.get('/login', (req, res) => {
  const scope = 'streaming user-read-email user-read-private user-library-read user-library-modify user-read-playback-state user-modify-playback-state';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: CLIENT_ID,
      scope: scope,
      redirect_uri: REDIRECT_URI,
    }));
});

router.get('/callback', async (req, res) => {
  const code = req.query.code || null;
  if (!code) return res.status(400).send('No code provided');

  try {
    const response = await axios.post('https://accounts.spotify.com/api/token', querystring.stringify({
      code: code,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code'
    }), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + (Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64'))
      }
    });

    globalAccessToken = response.data.access_token;
    globalRefreshToken = response.data.refresh_token;
    tokenExpirationTime = Date.now() + (response.data.expires_in * 1000);

    // Redirect back to frontend music page
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}/music`);
  } catch (error) {
    res.status(500).json({ error: 'Failed to authenticate with Spotify' });
  }
});

router.get('/token', async (req, res) => {
  if (!globalAccessToken) {
    return res.status(401).json({ error: 'Not authenticated with Spotify' });
  }

  // Check if token needs refresh
  if (Date.now() > tokenExpirationTime - 60000) { // Refresh 1 minute before expiry
    try {
      const response = await axios.post('https://accounts.spotify.com/api/token', querystring.stringify({
        grant_type: 'refresh_token',
        refresh_token: globalRefreshToken
      }), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + (Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64'))
        }
      });
      globalAccessToken = response.data.access_token;
      if (response.data.refresh_token) {
        globalRefreshToken = response.data.refresh_token;
      }
      tokenExpirationTime = Date.now() + (response.data.expires_in * 1000);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to refresh token' });
    }
  }

  res.json({ accessToken: globalAccessToken });
});

router.get('/search', auth, async (req, res) => {
  if (!globalAccessToken) return res.status(401).json({ error: 'Spotify not connected' });
  const { q, type } = req.query;
  try {
    const { data } = await axios.get(`https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=${type || 'track'}&limit=10`, {
      headers: { 'Authorization': `Bearer ${globalAccessToken}` }
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

// Playback endpoints can just be called directly from frontend using the access token, 
// but we provide them here if needed. Since we will use Web Playback SDK, the frontend will use the token.

module.exports = router;
