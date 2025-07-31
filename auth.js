import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = 'http://127.0.0.1:8888/callback';
const SCOPES = 'user-top-read playlist-modify-public playlist-modify-private user-read-recently-played user-library-read';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Error: SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET are required');
  console.error('Please add them to your .env file');
  process.exit(1);
}

export async function getAccessToken() {
  return new Promise((resolve, reject) => {
    const app = express();
    const server = createServer(app);
    
    // Generate authorization URL
    const authUrl = `https://accounts.spotify.com/authorize?` +
      `client_id=${CLIENT_ID}&` +
      `response_type=code&` +
      `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
      `scope=${encodeURIComponent(SCOPES)}`;

    console.log('\n🎵 Spotify Authorization Required');
    console.log('Please open this URL in your browser to authorize the app:');
    console.log(`\n${authUrl}\n`);
    
    // Handle callback
    app.get('/callback', async (req, res) => {
      const { code, error } = req.query;
      
      if (error) {
        res.send(`<h1>Authorization failed: ${error}</h1>`);
        server.close();
        reject(new Error(`Authorization failed: ${error}`));
        return;
      }

      if (!code) {
        res.send('<h1>No authorization code received</h1>');
        server.close();
        reject(new Error('No authorization code received'));
        return;
      }

      try {
        // Exchange code for access token
        const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`
          },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: REDIRECT_URI
          })
        });

        const tokenData = await tokenResponse.json();
        
        if (tokenData.access_token) {
          res.send(`
            <h1>✅ Authorization Successful!</h1>
            <p>You can now close this browser tab and return to the terminal.</p>
            <p>Creating your Top 50 playlist...</p>
          `);
          server.close();
          resolve(tokenData.access_token);
        } else {
          res.send(`<h1>Token exchange failed: ${JSON.stringify(tokenData)}</h1>`);
          server.close();
          reject(new Error(`Token exchange failed: ${JSON.stringify(tokenData)}`));
        }
      } catch (error) {
        res.send(`<h1>Error: ${error.message}</h1>`);
        server.close();
        reject(error);
      }
    });

    // Start server
    server.listen(8888, () => {
      console.log('🚀 Authorization server started on http://localhost:8888');
      console.log('Waiting for authorization...\n');
    });

    // Handle server errors
    server.on('error', (error) => {
      console.error('Server error:', error);
      reject(error);
    });
  });
}