/**
 * Lyrics & Metadata Service
 * Fetches synced LRC lyrics from LRCLIB and album artwork from Deezer/iTunes
 * Enhanced with intelligent matching & scoring to prevent wrong song detection
 */

const cache = new Map();

function cleanTitle(title) {
  if (!title) return '';
  let cleaned = title
    // Remove features: (feat. ...), [ft. ...], (with ...)
    .replace(/\s*\([^)]*(?:feat\.|ft\.|with\b|remaster|official|audio|video|lyric|visualizer|version|deluxe|edition|mix|explicit|clean|extended|slowed|reverb)[^)]*\)/gi, '')
    .replace(/\s*\[[^\]]*(?:feat\.|ft\.|with\b|remaster|official|audio|video|lyric|visualizer|version|deluxe|edition|mix|explicit|clean|extended|slowed|reverb)[^\]]*\]/gi, '')
    // Remove trailing dash info: - Remastered, - Official Audio, - Radio Edit, - Live
    .replace(/\s*-\s*(?:feat\.|ft\.|with\b|remaster|official|audio|video|lyric|visualizer|version|deluxe|edition|mix|live|radio\s*edit|single\s*version|extended|slowed).*$/gi, '')
    .replace(/\s*-\s*\d{4}\s*remaster.*$/gi, '')
    .trim();
  return cleaned || title;
}

function extractTrackAndArtist(rawArtist, rawTitle) {
  let artist = (rawArtist || '').trim();
  let title = (rawTitle || '').trim();

  // Strip YouTube Topic suffix
  if (artist.endsWith(' - Topic')) {
    artist = artist.replace(/\s*-\s*Topic$/i, '').trim();
  }

  // Handle "Artist - Track" formatted inside title
  if (title.includes(' - ')) {
    const parts = title.split(/\s*-\s*/);
    if (parts.length === 2) {
      if (!artist || /^(youtube|spotify|apple|browser|chrome|edge)$/i.test(artist)) {
        artist = parts[0].trim();
        title = parts[1].trim();
      } else if (parts[0].toLowerCase() === artist.toLowerCase()) {
        title = parts[1].trim();
      }
    }
  }

  return { artist, title };
}

function parseLrc(lrcString) {
  if (!lrcString || typeof lrcString !== 'string') return [];
  const lines = lrcString.split(/\r?\n/);
  const result = [];
  const timeRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/g;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let match;
    const timestamps = [];
    timeRegex.lastIndex = 0;
    while ((match = timeRegex.exec(trimmed)) !== null) {
      const min = parseInt(match[1], 10);
      const sec = parseInt(match[2], 10);
      const ms = match[3] ? parseFloat('0.' + match[3]) : 0;
      timestamps.push(min * 60 + sec + ms);
    }

    const text = trimmed.replace(timeRegex, '').trim();
    if (timestamps.length > 0 && text) {
      for (const time of timestamps) {
        result.push({ time, text });
      }
    }
  }

  result.sort((a, b) => a.time - b.time);
  return result;
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 4500) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

async function fetchCoverArt(artist, title) {
  const cleaned = cleanTitle(title);
  const query = encodeURIComponent(`${artist} ${cleaned || title}`);

  // 1. Try Deezer API (super fast, high-res)
  try {
    const res = await fetchWithTimeout(`https://api.deezer.com/search?q=${query}&limit=1`);
    if (res.ok) {
      const data = await res.json();
      if (data?.data?.[0]?.album) {
        const alb = data.data[0].album;
        return alb.cover_xl || alb.cover_big || alb.cover_medium || alb.cover;
      }
    }
  } catch (err) {}

  // 2. Try iTunes API
  try {
    const res = await fetchWithTimeout(`https://itunes.apple.com/search?term=${query}&entity=song&limit=1`);
    if (res.ok) {
      const data = await res.json();
      if (data?.results?.[0]?.artworkUrl100) {
        return data.results[0].artworkUrl100.replace('100x100bb.jpg', '600x600bb.jpg');
      }
    }
  } catch (err) {}

  return null;
}

/**
 * Accurately scores an LRCLIB candidate against the expected track to prevent false positives.
 */
function scoreCandidate(item, targetArtist, targetTitle, targetDuration) {
  if (!item || (!item.syncedLyrics && !item.plainLyrics)) return -1;

  const candArtist = (item.artistName || '').toLowerCase().trim();
  const candTitle = (item.trackName || '').toLowerCase().trim();
  const expArtist = (targetArtist || '').toLowerCase().trim();
  const expTitle = (targetTitle || '').toLowerCase().trim();
  const expCleanedTitle = cleanTitle(targetTitle).toLowerCase().trim();

  const tokenize = s => s.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(w => w.length > 1);
  const candArtistTokens = tokenize(candArtist);
  const expArtistTokens = tokenize(expArtist);
  const candTitleTokens = tokenize(candTitle);
  const expTitleTokens = tokenize(expTitle);

  // 1. Artist Verification
  let artistScore = 0;
  if (expArtist) {
    if (candArtist === expArtist) {
      artistScore = 55;
    } else {
      const matchingArtistTokens = expArtistTokens.filter(t => candArtistTokens.includes(t));
      if (matchingArtistTokens.length > 0) {
        artistScore = (matchingArtistTokens.length / Math.max(expArtistTokens.length, 1)) * 45;
      } else if (candArtist.includes(expArtist) || expArtist.includes(candArtist)) {
        artistScore = 35;
      }
    }
    // Strict guard: if artist was specified, candidate MUST have artist overlap!
    if (artistScore === 0 && expArtistTokens.length > 0) {
      return -1; // Completely different artist -> reject
    }
  } else {
    artistScore = 20;
  }

  // 2. Title Verification
  let titleScore = 0;
  if (candTitle === expTitle || candTitle === expCleanedTitle) {
    titleScore = 55;
  } else {
    const matchingTitleTokens = expTitleTokens.filter(t => candTitleTokens.includes(t));
    if (matchingTitleTokens.length > 0) {
      titleScore = (matchingTitleTokens.length / Math.max(expTitleTokens.length, 1)) * 45;
    } else if (candTitle.includes(expCleanedTitle) || expCleanedTitle.includes(candTitle)) {
      titleScore = 35;
    }
  }

  if (titleScore === 0) {
    return -1; // Different title -> reject
  }

  // 3. Lyrics Quality (Favor synced)
  let lyricsScore = item.syncedLyrics ? 25 : 5;

  // 4. Duration Check (Prevent covers / live versions / wrong tracks)
  let durationScore = 0;
  if (targetDuration && targetDuration > 10 && item.duration && item.duration > 10) {
    const diff = Math.abs(item.duration - targetDuration);
    if (diff <= 3) durationScore = 25;
    else if (diff <= 8) durationScore = 12;
    else if (diff > 18) durationScore = -40; // Heavy penalty if track durations deviate greatly
  }

  return artistScore + titleScore + lyricsScore + durationScore;
}

function findBestMatch(list, artist, title, duration) {
  if (!Array.isArray(list) || list.length === 0) return null;
  let bestItem = null;
  let bestScore = 55; // Strict minimum score threshold to reject spurious songs

  for (const item of list) {
    const score = scoreCandidate(item, artist, title, duration);
    if (score > bestScore) {
      bestScore = score;
      bestItem = item;
    }
  }
  return bestItem;
}

async function getLyricsFromLrclib(rawArtist, rawTitle, album, duration) {
  const { artist, title } = extractTrackAndArtist(rawArtist, rawTitle);
  const cleaned = cleanTitle(title);
  const artistParam = encodeURIComponent(artist || '');
  const trackParam = encodeURIComponent(title || '');
  const cleanTrackParam = encodeURIComponent(cleaned || title || '');
  const primaryArtist = (artist || '').split(/[;,/&]|feat\.|ft\./i)[0].trim();
  const primaryArtistParam = encodeURIComponent(primaryArtist);

  // Attempt 1: Exact query with duration
  try {
    let url = `https://lrclib.net/api/get?artist_name=${artistParam}&track_name=${trackParam}`;
    if (duration && duration > 0) {
      url += `&duration=${Math.round(duration)}`;
    }
    const res = await fetchWithTimeout(url);
    if (res.ok) {
      const data = await res.json();
      if (data && (data.syncedLyrics || data.plainLyrics)) return data;
    }
  } catch (e) {}

  // Attempt 2: Cleaned title query
  if (cleaned && cleaned !== title) {
    try {
      let url = `https://lrclib.net/api/get?artist_name=${artistParam}&track_name=${cleanTrackParam}`;
      if (duration && duration > 0) {
        url += `&duration=${Math.round(duration)}`;
      }
      const res = await fetchWithTimeout(url);
      if (res.ok) {
        const data = await res.json();
        if (data && (data.syncedLyrics || data.plainLyrics)) return data;
      }
    } catch (e) {}
  }

  // Attempt 3: Primary artist query (if multi-artist collaboration)
  if (primaryArtist && primaryArtist !== artist) {
    try {
      let url = `https://lrclib.net/api/get?artist_name=${primaryArtistParam}&track_name=${cleanTrackParam}`;
      if (duration && duration > 0) {
        url += `&duration=${Math.round(duration)}`;
      }
      const res = await fetchWithTimeout(url);
      if (res.ok) {
        const data = await res.json();
        if (data && (data.syncedLyrics || data.plainLyrics)) return data;
      }
    } catch (e) {}
  }

  // Attempt 4: Search endpoint with strict scoring
  try {
    const query = encodeURIComponent(`${primaryArtist || artist} ${cleaned || title}`.trim());
    const searchUrl = `https://lrclib.net/api/search?q=${query}`;
    const res = await fetchWithTimeout(searchUrl);
    if (res.ok) {
      const list = await res.json();
      const best = findBestMatch(list, artist, title, duration);
      if (best) return best;
    }
  } catch (e) {}

  // Attempt 5: Search cleaned title only, but strictly enforce artist match in scorer
  if (artist && cleaned) {
    try {
      const query = encodeURIComponent(cleaned);
      const searchUrl = `https://lrclib.net/api/search?q=${query}`;
      const res = await fetchWithTimeout(searchUrl);
      if (res.ok) {
        const list = await res.json();
        const best = findBestMatch(list, artist, title, duration);
        if (best) return best;
      }
    } catch (e) {}
  }

  return null;
}

/**
 * Secondary Lyrics Library: Kugou Music
 * Massive Asian & international catalog with high-quality synced LRC coverage
 */
async function getLyricsFromKugou(rawArtist, rawTitle, album, duration) {
  const { artist, title } = extractTrackAndArtist(rawArtist, rawTitle);
  const cleaned = cleanTitle(title);
  const primaryArtist = (artist || '').split(/[;,/&]|feat\.|ft\./i)[0].trim();

  const searchQueries = [];
  if (artist && cleaned) searchQueries.push(`${artist} ${cleaned}`);
  if (primaryArtist && primaryArtist !== artist && cleaned) searchQueries.push(`${primaryArtist} ${cleaned}`);
  if (artist && title && title !== cleaned) searchQueries.push(`${artist} ${title}`);
  if (cleaned) searchQueries.push(cleaned);

  for (const query of searchQueries) {
    try {
      const searchUrl = `http://mobilecdn.kugou.com/api/v3/search/song?format=json&keyword=${encodeURIComponent(query)}&page=1&pagesize=6`;
      const sRes = await fetchWithTimeout(searchUrl, {}, 4000);
      if (!sRes.ok) continue;
      const sData = await sRes.json();
      const songs = sData?.data?.info;
      if (!Array.isArray(songs) || songs.length === 0) continue;

      // Pick best matching song based on duration if duration is available
      let selectedSong = songs[0];
      if (duration && duration > 0) {
        const matched = songs.find(s => typeof s.duration === 'number' && Math.abs(s.duration - duration) <= 6);
        if (matched) {
          selectedSong = matched;
        }
      }

      if (!selectedSong?.hash) continue;

      const durMs = (selectedSong.duration || Math.round(duration || 0)) * 1000;
      const candUrl = `http://krcs.kugou.com/search?ver=1&man=yes&client=mobi&keyword=&duration=${durMs}&hash=${selectedSong.hash}`;
      const cRes = await fetchWithTimeout(candUrl, {}, 4000);
      if (!cRes.ok) continue;
      const cData = await cRes.json();
      const candidates = cData?.candidates;
      if (!Array.isArray(candidates) || candidates.length === 0) continue;

      const cand = candidates[0];
      if (!cand?.id || !cand?.accesskey) continue;

      const dlUrl = `http://krcs.kugou.com/download?ver=1&client=mobi&id=${cand.id}&accesskey=${cand.accesskey}&fmt=lrc&charset=utf8`;
      const dRes = await fetchWithTimeout(dlUrl, {}, 4000);
      if (!dRes.ok) continue;
      const dData = await dRes.json();
      if (!dData?.content) continue;

      const lrcContent = Buffer.from(dData.content, 'base64').toString('utf-8');
      if (lrcContent && lrcContent.includes('[')) {
        return {
          syncedLyrics: lrcContent,
          plainLyrics: ''
        };
      }
    } catch (err) {
      // Continue to next search query
    }
  }

  return null;
}

/**
 * Tertiary Lyrics Library: QQ Music
 * Global official catalog covering millions of international, K-Pop, J-Pop, Latin & Asian tracks
 */
async function getLyricsFromQQ(rawArtist, rawTitle, album, duration) {
  const { artist, title } = extractTrackAndArtist(rawArtist, rawTitle);
  const cleaned = cleanTitle(title);
  const query = `${artist} ${cleaned || title}`.trim();

  try {
    const sUrl = `https://c.y.qq.com/soso/fcgi-bin/client_search_cp?w=${encodeURIComponent(query)}&format=json&n=3`;
    const sRes = await fetchWithTimeout(sUrl, {}, 3500);
    if (!sRes.ok) return null;
    const sData = await sRes.json();
    const song = sData?.data?.song?.list?.[0];
    if (!song?.songmid) return null;

    const lUrl = `https://c.y.qq.com/lyric/fcgi-bin/fcg_query_lyric_new.fcg?songmid=${song.songmid}&format=json&nobase64=1`;
    const lRes = await fetchWithTimeout(lUrl, { headers: { Referer: 'https://y.qq.com' } }, 3500);
    if (!lRes.ok) return null;
    const lText = await lRes.text();
    const cleanText = lText.replace(/^MusicJsonCallback\(/, '').replace(/\)$/, '');
    const lData = JSON.parse(cleanText);
    const lrc = lData?.lyric;
    if (lrc && lrc.includes('[')) {
      return {
        syncedLyrics: lrc,
        plainLyrics: ''
      };
    }
  } catch (err) {}

  return null;
}

/**
 * High-Speed Multi-Source Concurrent Fetcher
 * Queries primary libraries (LRCLIB & Kugou) in parallel so multiple sources NEVER slow down searches!
 * If both miss, falls back to QQ Music.
 */
async function fetchLyricsMultiSource(artist, title, album, duration) {
  const [lrclibRes, kugouRes] = await Promise.allSettled([
    getLyricsFromLrclib(artist, title, album, duration),
    getLyricsFromKugou(artist, title, album, duration)
  ]);

  const lData = lrclibRes.status === 'fulfilled' ? lrclibRes.value : null;
  const kData = kugouRes.status === 'fulfilled' ? kugouRes.value : null;

  if (lData?.syncedLyrics) return lData;
  if (kData?.syncedLyrics) return kData;
  if (lData?.plainLyrics) return lData;
  if (kData?.plainLyrics) return kData;

  try {
    const qqData = await getLyricsFromQQ(artist, title, album, duration);
    if (qqData?.syncedLyrics || qqData?.plainLyrics) return qqData;
  } catch (e) {}

  return null;
}

async function getTrackData(rawArtist, rawTitle, album = '', duration = 0, forceRefresh = false) {
  if (!rawTitle) return null;
  const { artist, title } = extractTrackAndArtist(rawArtist, rawTitle);
  const key = `${(artist || '').toLowerCase()}:::${title.toLowerCase()}`;

  if (forceRefresh) {
    cache.delete(key);
  } else if (cache.has(key)) {
    const cached = cache.get(key);
    // Only return cached if it actually found lyrics or plain lyrics.
    // If it was empty, allow subsequent attempts to re-fetch!
    if (cached && ((cached.lyrics && cached.lyrics.length > 0) || cached.plainLyrics)) {
      return cached;
    }
  }

  // Parallel fetch lyrics (concurrent across sources) and artwork
  const [lyricsData, coverUrl] = await Promise.all([
    fetchLyricsMultiSource(artist, title, album, duration),
    fetchCoverArt(artist, title)
  ]);

  let parsedLyrics = [];
  let hasSynced = false;
  let plainLyrics = '';

  if (lyricsData) {
    if (lyricsData.syncedLyrics) {
      parsedLyrics = parseLrc(lyricsData.syncedLyrics);
      hasSynced = parsedLyrics.length > 0;
    }
    plainLyrics = lyricsData.plainLyrics || '';
  }

  const result = {
    title,
    artist: artist || 'Unknown Artist',
    album: album || '',
    coverUrl,
    hasSynced,
    lyrics: parsedLyrics,
    plainLyrics
  };

  // Only cache if we got actual lyrics or plain lyrics to avoid permanently caching transient failures
  if (hasSynced || plainLyrics) {
    cache.set(key, result);
    if (cache.size > 200) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
  }

  return result;
}

module.exports = {
  getTrackData,
  cleanTitle,
  parseLrc
};
