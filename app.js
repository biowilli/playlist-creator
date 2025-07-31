import 'dotenv/config';
import { getAccessToken } from './auth.js';

async function fetchWebApi(endpoint, method, body, token) {
  const options = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    method,
  };
  
  if (body && method !== 'GET' && method !== 'HEAD') {
    options.body = JSON.stringify(body);
    options.headers['Content-Type'] = 'application/json';
  }
  
  const res = await fetch(`https://api.spotify.com/${endpoint}`, options);
  return await res.json();
}

async function getTopTracks(token) {
  return (
    await fetchWebApi("v1/me/top/tracks?time_range=long_term&limit=50", "GET", null, token)
  ).items;
}

async function createPlaylist(tracksUri, token) {
  const { id: user_id } = await fetchWebApi('v1/me', 'GET', null, token);

  const playlist = await fetchWebApi(
    `v1/users/${user_id}/playlists`, 'POST', {
      "name": "My Top 50 Tracks",
      "description": "My top 50 most played tracks",
      "public": false
    }, token);

  await fetchWebApi(
    `v1/playlists/${playlist.id}/tracks?uris=${tracksUri.join(',')}`,
    'POST',
    null,
    token
  );

  return playlist;
}

async function main() {
  try {
    console.log('🎵 Spotify Top 50 Playlist Creator\n');
    
    // Get access token through OAuth flow
    const accessToken = await getAccessToken();
    
    console.log('✅ Authorization successful! Fetching your top tracks...\n');
    
    // Get top tracks
    const topTracks = await getTopTracks(accessToken);
    
    if (!topTracks || topTracks.length === 0) {
      console.error('❌ Could not fetch top tracks. Please try again.');
      process.exit(1);
    }

    console.log(`🎶 Found ${topTracks.length} top tracks:`);
    topTracks.forEach((track, index) => {
      const artists = track.artists.map(artist => artist.name).join(', ');
      console.log(`${index + 1}. ${track.name} by ${artists}`);
    });

    // Create playlist
    console.log('\n🎯 Creating playlist...');
    const tracksUri = topTracks.map(track => track.uri);
    const createdPlaylist = await createPlaylist(tracksUri, accessToken);
    
    console.log(`\n✅ Playlist created successfully!`);
    console.log(`📝 Name: ${createdPlaylist.name}`);
    console.log(`🔗 URL: https://open.spotify.com/playlist/${createdPlaylist.id}`);
    console.log(`\n🎉 Enjoy your Top 50 playlist!`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();