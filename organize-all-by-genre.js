import 'dotenv/config';
import { getAccessTokenWithLibraryScope } from './auth-library.js';

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

async function getAllSavedTracks(token) {
  let allTracks = [];
  let offset = 0;
  const limit = 50;
  
  console.log('📚 Fetching your saved tracks...');
  
  while (true) {
    const response = await fetchWebApi(`v1/me/tracks?limit=${limit}&offset=${offset}`, 'GET', null, token);
    
    if (!response.items || response.items.length === 0) {
      break;
    }
    
    allTracks = allTracks.concat(response.items);
    offset += limit;
    
    console.log(`   📖 Fetched ${allTracks.length} tracks so far...`);
    
    if (response.items.length < limit) {
      break;
    }
  }
  
  console.log(`✅ Total tracks in library: ${allTracks.length}`);
  return allTracks;
}

async function getAllPlaylistTracks(token) {
  console.log('🎵 Fetching tracks from all your playlists...');
  
  // Get user info
  const user = await fetchWebApi('v1/me', 'GET', null, token);
  
  // Get all playlists
  let allPlaylists = [];
  let offset = 0;
  const limit = 50;
  
  while (true) {
    const response = await fetchWebApi(`v1/me/playlists?limit=${limit}&offset=${offset}`, 'GET', null, token);
    
    if (!response.items || response.items.length === 0) {
      break;
    }
    
    allPlaylists = allPlaylists.concat(response.items);
    offset += limit;
    
    if (response.items.length < limit) {
      break;
    }
  }
  
  // Filter to only user's playlists
  const userPlaylists = allPlaylists.filter(p => p.owner.id === user.id);
  console.log(`   Found ${userPlaylists.length} of your playlists`);
  
  // Get tracks from all playlists
  let allPlaylistTracks = [];
  for (const playlist of userPlaylists) {
    console.log(`   📋 Getting tracks from "${playlist.name}"...`);
    
    let playlistTracks = [];
    let trackOffset = 0;
    
    while (true) {
      const response = await fetchWebApi(
        `v1/playlists/${playlist.id}/tracks?limit=50&offset=${trackOffset}`,
        'GET', null, token
      );
      
      if (!response.items || response.items.length === 0) {
        break;
      }
      
      playlistTracks = playlistTracks.concat(response.items);
      trackOffset += 50;
      
      if (response.items.length < 50) {
        break;
      }
    }
    
    allPlaylistTracks = allPlaylistTracks.concat(playlistTracks);
  }
  
  console.log(`✅ Total tracks from playlists: ${allPlaylistTracks.length}`);
  return allPlaylistTracks;
}

async function getArtistGenres(artistIds, token) {
  const chunks = [];
  for (let i = 0; i < artistIds.length; i += 50) {
    chunks.push(artistIds.slice(i, i + 50));
  }
  
  let allArtists = [];
  for (const chunk of chunks) {
    const response = await fetchWebApi(`v1/artists?ids=${chunk.join(',')}`, 'GET', null, token);
    if (response.artists) {
      allArtists = allArtists.concat(response.artists);
    }
  }
  
  return allArtists;
}

function categorizeTracksByGenre(tracks, artists) {
  const genreMap = {};
  const artistGenreMap = {};
  const seenTracks = new Set(); // Avoid duplicates
  
  // Create artist to genres mapping
  artists.forEach(artist => {
    if (artist && artist.genres && artist.genres.length > 0) {
      artistGenreMap[artist.id] = artist.genres;
    }
  });
  
  tracks.forEach(item => {
    const track = item.track;
    if (!track || !track.artists || !track.id) return;
    
    // Skip duplicates
    if (seenTracks.has(track.id)) return;
    seenTracks.add(track.id);
    
    let trackGenres = new Set();
    
    // Get genres from all artists of the track
    track.artists.forEach(artist => {
      if (artistGenreMap[artist.id]) {
        artistGenreMap[artist.id].forEach(genre => trackGenres.add(genre));
      }
    });
    
    // If no genres found, categorize as "Unknown"
    if (trackGenres.size === 0) {
      trackGenres.add('unknown');
    }
    
    // Add track to all its genres
    trackGenres.forEach(genre => {
      const normalizedGenre = normalizeGenre(genre);
      if (!genreMap[normalizedGenre]) {
        genreMap[normalizedGenre] = [];
      }
      genreMap[normalizedGenre].push(track);
    });
  });
  
  return genreMap;
}

function normalizeGenre(genre) {
  // Normalize genre names for better grouping
  const normalized = genre.toLowerCase();
  
  // Group similar genres
  if (normalized.includes('rock') || normalized.includes('metal')) return 'rock-metal';
  if (normalized.includes('pop')) return 'pop';
  if (normalized.includes('hip hop') || normalized.includes('rap')) return 'hip-hop-rap';
  if (normalized.includes('electronic') || normalized.includes('edm') || normalized.includes('house') || normalized.includes('techno')) return 'electronic';
  if (normalized.includes('jazz')) return 'jazz';
  if (normalized.includes('classical')) return 'classical';
  if (normalized.includes('country')) return 'country';
  if (normalized.includes('folk')) return 'folk';
  if (normalized.includes('blues')) return 'blues';
  if (normalized.includes('reggae')) return 'reggae';
  if (normalized.includes('latin') || normalized.includes('latino')) return 'latin';
  if (normalized.includes('indie')) return 'indie';
  if (normalized.includes('alternative')) return 'alternative';
  if (normalized.includes('funk') || normalized.includes('soul') || normalized.includes('r&b')) return 'funk-soul-rnb';
  
  return normalized;
}

async function createGenrePlaylist(genreName, tracks, token) {
  const { id: user_id } = await fetchWebApi('v1/me', 'GET', null, token);
  
  // Format genre name for playlist title
  const formattedGenre = genreName.charAt(0).toUpperCase() + genreName.slice(1).replace('-', ' & ');
  
  const playlist = await fetchWebApi(
    `v1/users/${user_id}/playlists`, 'POST', {
      name: formattedGenre,
      description: formattedGenre,
      public: false
    }, token);
  
  // Add tracks in chunks of 100 (Spotify's limit)
  const trackUris = tracks.map(track => track.uri);
  const chunks = [];
  for (let i = 0; i < trackUris.length; i += 100) {
    chunks.push(trackUris.slice(i, i + 100));
  }
  
  for (const chunk of chunks) {
    await fetchWebApi(
      `v1/playlists/${playlist.id}/tracks?uris=${chunk.join(',')}`,
      'POST',
      null,
      token
    );
  }
  
  return playlist;
}

async function main() {
  try {
    console.log('🎵 Complete Music Library Genre Organizer\n');
    console.log('Organizing ALL your music (library + playlists) by genre...\n');
    
    // Get access token
    const accessToken = await getAccessTokenWithLibraryScope();
    console.log('✅ Authorization successful!\n');
    
    // Get all saved tracks
    const savedTracks = await getAllSavedTracks(accessToken);
    
    // Get all tracks from playlists
    const playlistTracks = await getAllPlaylistTracks(accessToken);
    
    // Combine all tracks
    const allTracks = [...savedTracks, ...playlistTracks];
    console.log(`🔄 Combined total: ${allTracks.length} tracks (before deduplication)`);
    
    if (allTracks.length === 0) {
      console.log('❌ No tracks found in your library or playlists.');
      process.exit(1);
    }
    
    // Get unique artist IDs
    const artistIds = [...new Set(
      allTracks
        .flatMap(item => item.track?.artists || [])
        .map(artist => artist.id)
        .filter(Boolean)
    )];
    
    console.log(`🎤 Fetching genre information for ${artistIds.length} unique artists...`);
    
    // Get artist genres
    const artists = await getArtistGenres(artistIds, accessToken);
    
    // Categorize tracks by genre
    console.log('🏷️  Categorizing tracks by genre...');
    const genreMap = categorizeTracksByGenre(allTracks, artists);
    
    // Get total unique tracks after deduplication
    const totalUniqueTracks = Object.values(genreMap).reduce((sum, tracks) => sum + tracks.length, 0);
    console.log(`🔍 Found ${totalUniqueTracks} unique tracks after deduplication`);
    
    // Filter out genres with too few tracks
    const minTracksPerGenre = 3;
    const filteredGenres = Object.entries(genreMap)
      .filter(([genre, tracks]) => tracks.length >= minTracksPerGenre)
      .sort(([,a], [,b]) => b.length - a.length);
    
    console.log(`\n📊 Found ${filteredGenres.length} genres with at least ${minTracksPerGenre} tracks:`);
    filteredGenres.forEach(([genre, tracks]) => {
      console.log(`   🎵 ${genre}: ${tracks.length} tracks`);
    });
    
    console.log('\n🎯 Creating genre playlists...');
    
    const createdPlaylists = [];
    for (const [genreName, tracks] of filteredGenres) {
      console.log(`   Creating "${genreName}" playlist with ${tracks.length} tracks...`);
      const playlist = await createGenrePlaylist(genreName, tracks, accessToken);
      createdPlaylists.push({ 
        name: playlist.name, 
        id: playlist.id, 
        trackCount: tracks.length,
        genre: genreName
      });
    }
    
    console.log(`\n✅ Successfully created ${createdPlaylists.length} genre playlists!`);
    console.log('\n📋 Created playlists:');
    createdPlaylists.forEach(playlist => {
      console.log(`   🎵 ${playlist.name} (${playlist.trackCount} tracks)`);
      console.log(`      🔗 https://open.spotify.com/playlist/${playlist.id}`);
    });
    
    console.log(`\n🎉 Your complete music collection is now organized by genre!`);
    console.log(`📊 Total: ${totalUniqueTracks} unique tracks across ${createdPlaylists.length} genres`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();