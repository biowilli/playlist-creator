import 'dotenv/config';
import { getAccessTokenWithLibraryScope } from './auth-library.js';
import { batchAnalyzeAlternativeSources } from './alternative-audio-sources.js';

// Camelot Wheel Mapping (Open Key Notation)
const CAMELOT_WHEEL = {
  // Major Keys (B = Major)
  0: '1B',   // C Major
  1: '8B',   // C#/Db Major  
  2: '3B',   // D Major
  3: '10B',  // D#/Eb Major
  4: '5B',   // E Major
  5: '12B',  // F Major
  6: '7B',   // F#/Gb Major
  7: '2B',   // G Major
  8: '9B',   // G#/Ab Major
  9: '4B',   // A Major
  10: '11B', // A#/Bb Major
  11: '6B'   // B Major
};

const CAMELOT_WHEEL_MINOR = {
  // Minor Keys (A = Minor)
  0: '8A',   // C Minor
  1: '3A',   // C#/Db Minor
  2: '10A',  // D Minor
  3: '5A',   // D#/Eb Minor
  4: '12A',  // E Minor
  5: '7A',   // F Minor
  6: '2A',   // F#/Gb Minor
  7: '9A',   // G Minor
  8: '4A',   // G#/Ab Minor
  9: '11A',  // A Minor
  10: '6A',  // A#/Bb Minor
  11: '1A'   // B Minor
};

const KEY_NAMES = {
  0: 'C', 1: 'C#/Db', 2: 'D', 3: 'D#/Eb', 4: 'E', 5: 'F',
  6: 'F#/Gb', 7: 'G', 8: 'G#/Ab', 9: 'A', 10: 'A#/Bb', 11: 'B'
};

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

async function getAlternativeAudioFeatures(tracks, token) {
  console.log(`   🔄 Using alternative audio analysis sources...`);
  console.log(`   📊 Sources: Beatport + Last.fm + AcousticBrainz`);
  
  try {
    const analysisResults = await batchAnalyzeAlternativeSources(tracks, (progress, status) => {
      process.stdout.write(`\r   ${status} (${Math.round(progress)}%)`);
    });
    
    console.log(`\n   ✅ Successfully analyzed ${analysisResults.length}/${tracks.length} tracks`);
    
    // Show source statistics
    const sourceStats = {};
    analysisResults.forEach(result => {
      result.sources?.forEach(source => {
        sourceStats[source] = (sourceStats[source] || 0) + 1;
      });
    });
    
    console.log(`   📊 Data sources used:`);
    Object.entries(sourceStats).forEach(([source, count]) => {
      console.log(`      ${source}: ${count} tracks`);
    });
    
    return analysisResults;
    
  } catch (error) {
    console.log(`   ❌ Alternative analysis failed: ${error.message}`);
    return [];
  }
}

function getCamelotKey(key, mode) {
  if (mode === 1) { // Major
    return CAMELOT_WHEEL[key] || 'Unknown';
  } else { // Minor
    return CAMELOT_WHEEL_MINOR[key] || 'Unknown';
  }
}

function getHarmonicCompatibility(camelotKey) {
  if (!camelotKey || camelotKey === 'Unknown') return [];
  
  const number = parseInt(camelotKey);
  const letter = camelotKey.slice(-1);
  
  const compatible = [];
  
  // Same key (perfect match)
  compatible.push(camelotKey);
  
  // Adjacent keys (+1, -1) - most common DJ transitions
  const nextNum = number === 12 ? 1 : number + 1;
  const prevNum = number === 1 ? 12 : number - 1;
  compatible.push(`${nextNum}${letter}`);
  compatible.push(`${prevNum}${letter}`);
  
  // Relative major/minor (3 o'clock rule)
  const oppositeLetter = letter === 'A' ? 'B' : 'A';
  compatible.push(`${number}${oppositeLetter}`);
  
  // Perfect 4th/5th (dominant relationships)
  const fourthUp = number + 7 > 12 ? number + 7 - 12 : number + 7;
  const fifthUp = number + 5 > 12 ? number + 5 - 12 : number + 5;
  compatible.push(`${fourthUp}${letter}`);
  compatible.push(`${fifthUp}${letter}`);
  
  // Energy boost/drop (+7/-7 semitones)
  const energyBoost = nextNum === 13 ? 1 : nextNum;
  const energyDrop = prevNum === 0 ? 12 : prevNum;
  compatible.push(`${energyBoost}${oppositeLetter}`);
  compatible.push(`${energyDrop}${oppositeLetter}`);
  
  return compatible;
}

function processAlternativeAnalysis(analysisResults) {
  const analyzedTracks = [];
  
  console.log(`   🔍 Processing ${analysisResults.length} analysis results`);
  
  analysisResults.forEach((result, index) => {
    const track = result.track;
    
    if (!track) {
      console.log(`   ⚠️  No track at index ${index}`);
      return;
    }
    
    if (result.key === null || result.key === undefined) {
      console.log(`   ⚠️  No key data for track: ${track.name}`);
      return;
    }
    
    const camelotKey = getCamelotKey(result.key, result.mode);
    const keyName = KEY_NAMES[result.key] || 'Unknown';
    const mode = result.mode === 1 ? 'Major' : 'Minor';
    
    analyzedTracks.push({
      track,
      bpm: result.bpm || 120,
      key: result.key,
      mode: result.mode,
      camelotKey,
      keyName: `${keyName} ${mode}`,
      energy: result.energy || 0.5,
      danceability: result.danceability || 0.5,
      confidence: result.confidence || 0,
      sources: result.sources || [],
      harmonicKeys: getHarmonicCompatibility(camelotKey)
    });
  });
  
  console.log(`   ✅ Successfully processed ${analyzedTracks.length} tracks`);
  return analyzedTracks;
}

function createDJPlaylists(analyzedTracks) {
  const playlists = {};
  
  // Group by Camelot key
  const keyGroups = {};
  analyzedTracks.forEach(track => {
    if (!keyGroups[track.camelotKey]) {
      keyGroups[track.camelotKey] = [];
    }
    keyGroups[track.camelotKey].push(track);
  });
  
  // Create playlists for keys with enough tracks
  Object.entries(keyGroups).forEach(([camelotKey, tracks]) => {
    if (tracks.length >= 3 && camelotKey !== 'Unknown') {
      // Sort by BPM for smooth transitions
      tracks.sort((a, b) => a.bpm - b.bpm);
      
      // Group by BPM ranges
      const bpmRanges = {
        slow: tracks.filter(t => t.bpm < 100),
        medium: tracks.filter(t => t.bpm >= 100 && t.bpm < 130),
        fast: tracks.filter(t => t.bpm >= 130)
      };
      
      Object.entries(bpmRanges).forEach(([speed, speedTracks]) => {
        if (speedTracks.length >= 2) {
          const playlistKey = `${camelotKey}-${speed}`;
          playlists[playlistKey] = {
            name: `🎛️ ${camelotKey} ${speed.toUpperCase()} (${speedTracks[0].keyName})`,
            description: `DJ Mix Ready • Key: ${camelotKey} (${speedTracks[0].keyName}) • BPM: ${speedTracks[0].bpm}-${speedTracks[speedTracks.length-1].bpm} • ${speedTracks.length} tracks`,
            tracks: speedTracks.sort((a, b) => a.bpm - b.bpm),
            camelotKey,
            bpmRange: speed
          };
        }
      });
    }
  });
  
  return playlists;
}

async function createPlaylist(playlistData, token) {
  const { id: user_id } = await fetchWebApi('v1/me', 'GET', null, token);
  
  const playlist = await fetchWebApi(
    `v1/users/${user_id}/playlists`, 'POST', {
      name: playlistData.name,
      description: playlistData.description,
      public: false
    }, token);
  
  // Add tracks in chunks of 100
  const trackUris = playlistData.tracks.map(t => t.track.uri);
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
    console.log('🎛️ DJ Harmonic Playlist Creator\n');
    console.log('Creating harmonic mix-ready playlists using the Camelot Wheel...\n');
    
    // Get access token
    const accessToken = await getAccessTokenWithLibraryScope();
    console.log('✅ Authorization successful!\n');
    
    // Get all saved tracks
    const savedTracks = await getAllSavedTracks(accessToken);
    
    if (savedTracks.length === 0) {
      console.log('❌ No saved tracks found in your library.');
      process.exit(1);
    }
    
    // Get track IDs and filter out invalid ones
    const trackIds = [];
    const validTracks = [];
    
    savedTracks.forEach(item => {
      if (item.track && item.track.id && item.track.type === 'track') {
        trackIds.push(item.track.id);
        validTracks.push(item);
      }
    });
    
    console.log(`🔍 Found ${validTracks.length}/${savedTracks.length} valid tracks with IDs`);
    
    console.log(`🎵 Analyzing audio features for ${validTracks.length} tracks...`);
    
    // Get alternative audio features (BPM, key, etc.)
    const tracks = validTracks.map(item => item.track);
    const analysisResults = await getAlternativeAudioFeatures(tracks, accessToken);
    
    console.log('🎹 Processing harmonic compatibility...');
    
    // Process alternative analysis for DJ mixing
    const analyzedTracks = processAlternativeAnalysis(analysisResults);
    
    // Create DJ playlists
    console.log('🎛️ Creating harmonic playlists...');
    
    // Debug: Show key distribution and source statistics
    const keyDistribution = {};
    const sourceStats = {};
    let tracksWithKeyData = 0;
    
    analyzedTracks.forEach(track => {
      if (track.key !== null && track.key !== undefined) {
        tracksWithKeyData++;
        
        // Camelot key distribution
        if (!keyDistribution[track.camelotKey]) {
          keyDistribution[track.camelotKey] = 0;
        }
        keyDistribution[track.camelotKey]++;
        
        // Source statistics
        track.sources.forEach(source => {
          sourceStats[source] = (sourceStats[source] || 0) + 1;
        });
      }
    });
    
    console.log(`\n🔍 Alternative analysis: ${tracksWithKeyData}/${analyzedTracks.length} tracks have key data`);
    console.log('\nData sources used:');
    Object.entries(sourceStats).forEach(([source, count]) => {
      console.log(`   ${source}: ${count} tracks`);
    });
    
    console.log('\nTop Camelot keys:');
    Object.entries(keyDistribution)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .forEach(([key, count]) => {
        console.log(`   ${key}: ${count} tracks`);
      });
    
    const djPlaylists = createDJPlaylists(analyzedTracks);
    
    console.log(`\n📊 Found ${Object.keys(djPlaylists).length} mix-ready playlists:`);
    
    const createdPlaylists = [];
    for (const [key, playlistData] of Object.entries(djPlaylists)) {
      console.log(`   Creating: ${playlistData.name}`);
      console.log(`      BPM Range: ${playlistData.tracks[0].bpm} - ${playlistData.tracks[playlistData.tracks.length-1].bpm}`);
      console.log(`      Harmonic Keys: ${playlistData.tracks[0].harmonicKeys.join(', ')}`);
      
      const playlist = await createPlaylist(playlistData, accessToken);
      createdPlaylists.push({
        name: playlist.name,
        id: playlist.id,
        trackCount: playlistData.tracks.length,
        camelotKey: playlistData.camelotKey,
        bpmRange: playlistData.bpmRange
      });
    }
    
    console.log(`\n✅ Successfully created ${createdPlaylists.length} DJ playlists!`);
    console.log('\n🎛️ Your harmonic mix playlists:');
    
    // Group by BPM range for display
    const bySpeed = { slow: [], medium: [], fast: [] };
    createdPlaylists.forEach(p => {
      bySpeed[p.bpmRange].push(p);
    });
    
    Object.entries(bySpeed).forEach(([speed, playlists]) => {
      if (playlists.length > 0) {
        console.log(`\n   ${speed.toUpperCase()} BPM:`);
        playlists.forEach(playlist => {
          console.log(`   🎵 ${playlist.name} (${playlist.trackCount} tracks)`);
          console.log(`      🔗 https://open.spotify.com/playlist/${playlist.id}`);
        });
      }
    });
    
    console.log(`\n🎉 Perfect for harmonic mixing! Use adjacent Camelot keys for smooth transitions.`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();