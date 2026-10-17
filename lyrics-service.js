const fs = require('fs');
const path = require('path');
let electronApp = null;
try {
  electronApp = require('electron').app;
} catch (e) {}

const cache = new Map();
const coverArtCache = new Map();

function getLyricsCacheFilePath() {
  const baseDir = (electronApp && typeof electronApp.getPath === 'function')
    ? electronApp.getPath('userData')
    : path.join(process.env.APPDATA || process.env.TEMP, 'overLy');
  try {
    if (!fs.existsSync(baseDir)) {
      fs.mkdirSync(baseDir, { recursive: true });
    }
  } catch (_) {}
  return path.join(baseDir, 'lyrics_cache.json');
}

function loadPersistentLyricsCache() {
  try {
    const filePath = getLyricsCacheFilePath();
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (Array.isArray(data)) {
        for (const [key, value] of data) {
          cache.set(key, value);
        }
      } else if (data && typeof data === 'object') {
        for (const [key, value] of Object.entries(data)) {
          cache.set(key, value);
        }
      }
    }
  } catch (err) {
    console.warn('[LYRICS CACHE] Error loading persistent cache:', err);
  }
}

let saveCacheTimer = null;
function savePersistentLyricsCache() {
  if (saveCacheTimer) return;
  saveCacheTimer = setTimeout(() => {
    saveCacheTimer = null;
    try {
      const filePath = getLyricsCacheFilePath();
      const entries = Array.from(cache.entries()).slice(-400); // Persist up to 400 recent songs
      fs.writeFileSync(filePath, JSON.stringify(entries), 'utf8');
    } catch (err) {
      console.warn('[LYRICS CACHE] Error saving persistent cache:', err);
    }
  }, 1500);
}

// Load persisted lyrics cache immediately
loadPersistentLyricsCache();

function normalizeText(s) {
  if (!s) return '';
  return s.replace(/[–—－―]/g, '-').trim();
}

function parseTrackFeatures(title, artist) {
  const normTitle = normalizeText(title || '');
  const normArtist = normalizeText(artist || '');
  const combined = (normArtist + ' ' + normTitle).toLowerCase();

  // Extract base title: strip parentheses/brackets and trailing dash version
  const baseTitle = normTitle
    .replace(/\s*[（(【\[［「『《][^)\]】）］」』》]*[）)】\]］」』》]/g, '')
    .replace(/\s*-\s*.*$/g, '')
    .trim() || normTitle;

  // Extract featured artists from feat./ft./with/featuring
  const featMatches = [];
  const featRegex = /(?:feat\.|ft\.|featuring|with|合作演出[：:]|x|vs\.)\s*([^\(\)\[\]–—\-/,]+)/gi;
  let m;
  while ((m = featRegex.exec(combined)) !== null) {
    const name = m[1].trim().toLowerCase();
    if (name.length > 1 && !['a', 'the', 'an', 'official', 'lyrics', 'video', 'audio'].includes(name)) {
      featMatches.push(name);
    }
  }

  // Detect remix / alternative version indicators
  const isRemix = /(?:remix|mix\b|club|acoustic|live|slowed|speed|sped|vip|edit|rework|flip|dub\b|extended|instrumental|version|cover)/i.test(combined);

  // Extract specific remixer in parens/brackets e.g. (Boehm Remix), [Cahill Remix]
  let remixer = '';
  const remMatch = normTitle.match(/[\(\[\{]([^\)\]\}]+?)(?:\s+remix|\s+mix|\s+edit)[\)\]\}]/i);
  if (remMatch) {
    remixer = remMatch[1].replace(/(?:feat\.|ft\.).*$/i, '').trim().toLowerCase();
  }

  // Primary artist without featured collabs
  const primaryArtist = normArtist.split(/[;,/&]|feat\.|ft\./i)[0].trim();

  // Generate specialized queries for remixes & versions
  const remixQueries = [];
  if (isRemix || featMatches.length > 0) {
    if (featMatches.length > 0) {
      remixQueries.push(`${primaryArtist} ${baseTitle} ${featMatches.join(' ')} remix`.trim());
      remixQueries.push(`${primaryArtist} ${baseTitle} ${featMatches.join(' ')}`.trim());
    }
    if (remixer) {
      remixQueries.push(`${primaryArtist} ${baseTitle} ${remixer} remix`.trim());
      remixQueries.push(`${primaryArtist} ${baseTitle} ${remixer}`.trim());
    }
    const unbracketed = normTitle.replace(/[()[\]{}]/g, ' ').replace(/\s+/g, ' ').trim();
    if (unbracketed && unbracketed !== normTitle) {
      remixQueries.push(`${primaryArtist} ${unbracketed}`.trim());
    }
    if (isRemix) {
      remixQueries.push(`${primaryArtist} ${baseTitle} remix`.trim());
    }
  }

  return {
    normTitle,
    normArtist,
    baseTitle,
    primaryArtist,
    featMatches,
    isRemix,
    remixer,
    remixQueries: [...new Set(remixQueries)]
  };
}

function cleanTitle(title) {
  if (!title) return '';
  let cleaned = normalizeText(title)
    // Strip bracketed extras (both half-width () [] and full-width （） 【】 ［］ 「」 『』 《》)
    .replace(/\s*[（(【\[［「『《][^)\]】）］」』》]*(?:feat\.|ft\.|with\b|remaster|official|audio|video|lyric|visualizer|version|deluxe|edition|mix|remix|explicit|clean|extended|slowed|reverb|live|instrumental|piano|acoustic|cover|mv|伴奏|钢琴|纯音乐|超清|无损|原声|现场|独唱|重温)[^)\]】）］」』》]*[）)】\]］」』》]/gi, '')
    // Strip trailing video/MV tags: | Official Video, // MV
    .replace(/\s*[|/／]\s*(?:official|video|audio|mv|lyrics?).*$/gi, '')
    // Strip trailing dash suffixes
    .replace(/\s*-\s*(?:feat\.|ft\.|with\b|remaster|official|audio|video|lyric|visualizer|version|deluxe|edition|mix|remix|live|radio\s*edit|single|single\s*version|ep|extended|slowed|instrumental|piano).*$/gi, '')
    .replace(/\s*-\s*\d{4}\s*remaster.*$/gi, '')
    .replace(/\s*-\s*(?:single|ep)$/gi, '')
    .trim();
  return cleaned || title;
}

function cleanArtist(artist) {
  if (!artist) return '';
  let cleaned = normalizeText(artist)
    .replace(/\s*-\s*Topic$/i, '')
    .replace(/\s*[（(【\[［「『《].*?[）)】\]］」』》]/g, '')
    .split(/\s*(?:,|&|\/|feat\.|ft\.|with|x|vs\.)\s*/i)[0]
    .trim();
  return cleaned || artist;
}

const isCJK = s => /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f\uac00-\ud7af]/.test(s || '');

function normalizeCJKVariants(text) {
  if (!text) return '';
  return text
    .replace(/後/g, '后')
    .replace(/裡|裏/g, '里')
    .replace(/麼|麽/g, '么')
    .replace(/隻/g, '只')
    .replace(/愛/g, '爱')
    .replace(/說/g, '说')
    .replace(/聽/g, '听')
    .replace(/著/g, '着')
    .replace(/會/g, '会')
    .replace(/過/g, '过')
    .replace(/這/g, '这')
    .replace(/個/g, '个')
    .replace(/們/g, '们')
    .replace(/時/g, '时')
    .replace(/點/g, '点')
    .replace(/臺|檯/g, '台')
    .replace(/為/g, '为')
    .replace(/與/g, '与');
}

function extractTrackAndArtist(rawArtist, rawTitle) {
  let artist = normalizeText(rawArtist || '');
  let title = normalizeText(rawTitle || '');

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

  // Extract optional global LRC [offset:+/-ms] tag (standard LRC specification)
  let globalOffsetSec = 0;
  const offsetMatch = lrcString.match(/\[offset:\s*([+-]?\d+)\s*\]/i);
  if (offsetMatch) {
    const offsetMs = parseInt(offsetMatch[1], 10);
    if (!isNaN(offsetMs)) {
      globalOffsetSec = offsetMs / 1000;
    }
  }

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
      const rawTime = min * 60 + sec + ms + globalOffsetSec;
      timestamps.push(Math.max(0, Math.round(rawTime * 1000) / 1000));
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

function matchArtist(candArtist, targetArtist) {
  if (!targetArtist) return true;
  if (!candArtist) return false;
  const normCand = normalizeCJKVariants(candArtist).toLowerCase().trim();
  const normTarget = normalizeCJKVariants(targetArtist).toLowerCase().trim();
  if (normCand === normTarget) return true;
  if (normCand.includes(normTarget) || normTarget.includes(normCand)) return true;
  const targetTokens = normTarget.replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(w => w.length > 0);
  const candTokens = normCand.replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(w => w.length > 0);
  return targetTokens.some(t => candTokens.includes(t));
}

function matchTitle(candTitle, targetTitle) {
  if (!targetTitle) return true;
  if (!candTitle) return false;
  const normCand = normalizeCJKVariants(cleanTitle(candTitle)).toLowerCase().trim();
  const normTarget = normalizeCJKVariants(cleanTitle(targetTitle)).toLowerCase().trim();
  if (normCand === normTarget) return true;
  if (normCand.includes(normTarget) || normTarget.includes(normCand)) return true;
  return false;
}

function hasVersionMismatch(candTitle, targetTitle) {
  const versionRegex = /(?:remix|mix\b|club|acoustic|live|slowed|speed|sped|vip|edit|rework|flip|dub\b|extended|instrumental|version|cover|dj|demo|伴奏|翻唱|现场)/i;
  const targetHas = versionRegex.test(targetTitle || '');
  const candHas = versionRegex.test(candTitle || '');
  if (!targetHas && candHas) return true;
  if (!/\bdj\b/i.test(targetTitle || '') && /\bdj\b/i.test(candTitle || '')) return true;
  if (!/\bdemo\b/i.test(targetTitle || '') && /\bdemo\b/i.test(candTitle || '')) return true;
  return false;
}

async function fetchFromDeezer(query, targetTitle = '', targetArtist = '') {
  try {
    const res = await fetchWithTimeout('https://api.deezer.com/search?q=' + encodeURIComponent(query) + '&limit=6', {}, 3500);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.data) && data.data.length > 0) {
        let match = null;
        if (targetTitle || targetArtist) {
          match = data.data.find(d => {
            if (targetArtist && !matchArtist(d.artist?.name, targetArtist)) return false;
            if (targetTitle && !matchTitle(d.title, targetTitle) && !matchTitle(d.album?.title, targetTitle)) return false;
            if (hasVersionMismatch(d.title, targetTitle)) return false;
            return true;
          });
        }
        if (!match && !targetArtist) {
          match = data.data[0];
        }
        if (match?.album) {
          const alb = match.album;
          return alb.cover_xl || alb.cover_big || alb.cover_medium || alb.cover || null;
        }
      }
    }
  } catch (err) {}
  return null;
}

async function fetchFromITunes(query, country = '', targetTitle = '', targetArtist = '') {
  try {
    const countryParam = country ? `&country=${country}` : '';
    const res = await fetchWithTimeout(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=6${countryParam}`, {}, 3500);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.results) && data.results.length > 0) {
        let match = null;
        if (targetTitle || targetArtist) {
          match = data.results.find(r => {
            if (targetArtist && !matchArtist(r.artistName, targetArtist)) return false;
            if (targetTitle && !matchTitle(r.trackName, targetTitle) && !matchTitle(r.collectionName, targetTitle)) return false;
            if (hasVersionMismatch(r.trackName, targetTitle)) return false;
            return true;
          });
        }
        if (!match && !targetArtist) {
          match = data.results[0];
        }
        if (match && match.artworkUrl100) {
          return match.artworkUrl100.replace('100x100bb.jpg', '600x600bb.jpg');
        }
      }
    }
  } catch (err) {}
  return null;
}

async function fetchFromKugou(query, targetTitle = '', targetArtist = '') {
  try {
    const sRes = await fetchWithTimeout(`http://mobilecdn.kugou.com/api/v3/search/song?format=json&keyword=${encodeURIComponent(query)}&page=1&pagesize=6`, {}, 3500);
    if (!sRes.ok) return null;
    const sData = await sRes.json();
    const songs = sData?.data?.info;
    if (!Array.isArray(songs) || songs.length === 0) return null;

    let match = null;
    if (targetTitle || targetArtist) {
      match = songs.find(s => {
        if (targetArtist && !matchArtist(s.singername, targetArtist)) return false;
        if (targetTitle && !matchTitle(s.songname, targetTitle)) return false;
        if (hasVersionMismatch(s.songname, targetTitle)) return false;
        return true;
      });
    }
    if (!match && (!targetArtist || matchArtist(songs[0].singername, targetArtist))) {
      match = songs[0];
    }
    if (!match?.hash) return null;

    const infoRes = await fetchWithTimeout(`http://m.kugou.com/app/i/getSongInfo.php?cmd=playInfo&hash=${match.hash}`, {}, 3500);
    if (!infoRes.ok) return null;
    const info = await infoRes.json();
    const rawUrl = info.album_img || info.imgUrl;
    if (rawUrl) {
      return rawUrl.replace('{size}', '600');
    }
  } catch (err) {}
  return null;
}

async function fetchCoverArt(artist, title, album = '') {
  const cTitle = cleanTitle(title);
  const cArtist = cleanArtist(artist);
  const cacheKey = `${(cArtist || '').toLowerCase()}:::${(cTitle || title || '').toLowerCase()}`;

  if (coverArtCache.has(cacheKey)) {
    return coverArtCache.get(cacheKey);
  }

  const hasCJK = isCJK(`${artist} ${title}`);

  // Tier 1: Clean artist + Clean title across providers with strict artist verification
  const q1 = `${cArtist} ${cTitle}`.trim();
  if (q1) {
    let cover = null;
    if (hasCJK) {
      // For CJK tracks, Kugou has by far the most accurate artwork catalog
      cover = await fetchFromKugou(q1, cTitle, cArtist);
      if (!cover) cover = await fetchFromITunes(q1, 'CN', cTitle, cArtist);
      if (!cover) cover = await fetchFromITunes(q1, 'TW', cTitle, cArtist);
      if (!cover) cover = await fetchFromITunes(q1, 'HK', cTitle, cArtist);
      if (!cover) cover = await fetchFromDeezer(q1, cTitle, cArtist);
    } else {
      cover = await fetchFromDeezer(q1, cTitle, cArtist);
      if (!cover) cover = await fetchFromITunes(q1, '', cTitle, cArtist);
      if (!cover) cover = await fetchFromKugou(q1, cTitle, cArtist);
    }
    if (cover) {
      coverArtCache.set(cacheKey, cover);
      return cover;
    }
  }

  // Tier 2: Raw artist + Raw title if different from cleaned
  const qRaw = `${artist} ${title}`.trim();
  if (qRaw && qRaw !== q1) {
    let cover = null;
    if (hasCJK) {
      cover = await fetchFromKugou(qRaw, title, artist);
      if (!cover) cover = await fetchFromITunes(qRaw, 'CN', title, artist);
      if (!cover) cover = await fetchFromITunes(qRaw, 'TW', title, artist);
      if (!cover) cover = await fetchFromITunes(qRaw, 'HK', title, artist);
      if (!cover) cover = await fetchFromDeezer(qRaw, title, artist);
    } else {
      cover = await fetchFromDeezer(qRaw, title, artist);
      if (!cover) cover = await fetchFromITunes(qRaw, '', title, artist);
      if (!cover) cover = await fetchFromKugou(qRaw, title, artist);
    }
    if (cover) {
      coverArtCache.set(cacheKey, cover);
      return cover;
    }
  }

  // Tier 3: Clean artist + Album if album is provided
  if (album) {
    const qAlbum = `${cArtist} ${cleanTitle(album)}`.trim();
    if (qAlbum) {
      let cover = null;
      if (hasCJK) {
        cover = await fetchFromKugou(qAlbum, album, cArtist);
        if (!cover) cover = await fetchFromITunes(qAlbum, 'CN', album, cArtist);
        if (!cover) cover = await fetchFromITunes(qAlbum, 'TW', album, cArtist);
        if (!cover) cover = await fetchFromDeezer(qAlbum, album, cArtist);
      } else {
        cover = await fetchFromDeezer(qAlbum, album, cArtist);
        if (!cover) cover = await fetchFromITunes(qAlbum, '', album, cArtist);
      }
      if (cover) {
        coverArtCache.set(cacheKey, cover);
        return cover;
      }
    }
  }

  return null;
}

/**
 * Accurately scores a lyrics candidate against the expected track to prevent false positives,
 * with specialized awareness of remixes, featured artists, and duration alignment.
 */
function scoreCandidate(item, targetArtist, targetTitle, targetDuration) {
  if (!item || (!item.syncedLyrics && !item.plainLyrics)) return -1;

  const candArtist = normalizeText(item.artistName || '').toLowerCase().trim();
  const candTitle = normalizeText(item.trackName || '').toLowerCase().trim();
  const expArtist = normalizeText(targetArtist || '').toLowerCase().trim();
  const expTitle = normalizeText(targetTitle || '').toLowerCase().trim();
  const expCleanedTitle = cleanTitle(targetTitle).toLowerCase().trim();

  // Support all international Unicode letters and digits across Chinese, Japanese, Korean, Cyrillic, Latin
  const tokenize = s => s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(w => w.length > 0);
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
    // Strict guard: candidate MUST have artist overlap if artist was specified
    if (artistScore === 0 && expArtistTokens.length > 0) {
      return -1;
    }
  } else {
    artistScore = 20;
  }

  // 2. Title Verification with CJK Variant & Substring Awareness
  const normCandTitle = normalizeCJKVariants(candTitle);
  const normExpTitle = normalizeCJKVariants(expTitle);
  const normExpCleaned = normalizeCJKVariants(expCleanedTitle);

  let titleScore = 0;
  if (normCandTitle === normExpTitle || normCandTitle === normExpCleaned) {
    titleScore = 55;
  } else if (normCandTitle.includes(normExpCleaned) || normExpCleaned.includes(normCandTitle) || normCandTitle.includes(normExpTitle) || normExpTitle.includes(normCandTitle)) {
    titleScore = 45;
  } else {
    const matchingTitleTokens = expTitleTokens.filter(t => candTitleTokens.includes(t));
    if (matchingTitleTokens.length > 0) {
      titleScore = (matchingTitleTokens.length / Math.max(expTitleTokens.length, 1)) * 45;
    }
  }

  // Strict guard: If title has zero similarity, reject immediately (never match unrelated song from same artist!)
  if (titleScore === 0) {
    return -1;
  }

  // 3. Version / Remix & Featured Artist Compatibility Check
  const targetFeat = parseTrackFeatures(targetTitle, targetArtist);
  const candFeat = parseTrackFeatures(item.trackName, item.artistName);

  let versionScore = 0;

  // A. Check featured artists (e.g. Wale, DaBaby, Ice Spice)
  if (targetFeat.featMatches.length > 0) {
    const candAll = (candArtist + ' ' + candTitle).toLowerCase();
    const hasTargetFeat = targetFeat.featMatches.some(f => candAll.includes(f));
    if (hasTargetFeat) {
      versionScore += 50; // Decisive bonus for matching the guest/remix artist
    } else {
      versionScore -= 30; // Candidate lacks target's featured collaborator
    }
  }

  // B. Check specific remixer (e.g. Boehm, Cahill, Tiësto)
  if (targetFeat.remixer) {
    if (candFeat.remixer === targetFeat.remixer || candTitle.includes(targetFeat.remixer)) {
      versionScore += 40;
    } else if (candFeat.remixer && candFeat.remixer !== targetFeat.remixer) {
      return -1; // Wrong remixer altogether! Discard immediately
    }
  } else if (candFeat.remixer) {
    // Target had no specific remixer, candidate specifies one (e.g. Boehm when playing Wale or original)
    if (targetFeat.featMatches.length > 0 && !candFeat.remixer.includes(targetFeat.featMatches[0])) {
      versionScore -= 45;
    }
  }

  // C. Remix status consistency
  if (targetFeat.isRemix) {
    if (candFeat.isRemix) {
      versionScore += 25;
    } else {
      versionScore -= 35; // Target is remix, candidate is plain original -> heavy penalty
    }
  } else if (candFeat.isRemix) {
    versionScore -= 30; // Target is original, candidate is remix -> downrank
  }

  // D. Strictest guards for DJ, Demo, Cover, and Instrumental
  const isTargetDj = /\bdj\b/i.test(targetTitle);
  const isCandDj = /\bdj\b/i.test(item.trackName || '') || /\bdj\b/i.test(item.artistName || '');
  if (!isTargetDj && isCandDj) return -1;

  const isTargetDemo = /\bdemo\b/i.test(targetTitle);
  const isCandDemo = /\bdemo\b/i.test(item.trackName || '');
  if (!isTargetDemo && isCandDemo) return -1;

  const isTargetCover = /(?:cover|翻唱|伴奏|instrumental|piano\b|acoustic)/i.test(targetTitle);
  const isCandCover = /(?:cover|翻唱|伴奏|instrumental|piano\b|acoustic)/i.test(item.trackName || '');
  if (!isTargetCover && isCandCover) return -1;

  // 4. Lyrics Quality (Favor synced)
  let lyricsScore = item.syncedLyrics ? 30 : 5;

  // 5. Duration Check (Stricter for remixes where different mixes have distinct lengths)
  let durationScore = 0;
  if (targetDuration && targetDuration > 10 && item.duration && item.duration > 10) {
    const diff = Math.abs(item.duration - targetDuration);
    if (targetFeat.isRemix) {
      if (diff <= 2) durationScore = 35;
      else if (diff <= 4) durationScore = 18;
      else if (diff <= 7) durationScore = 5;
      else if (diff > 12) durationScore = -55;
      else durationScore = -35;
    } else {
      if (diff <= 3) durationScore = 25;
      else if (diff <= 8) durationScore = 12;
      else if (diff > 18) durationScore = -40;
    }
  }

  return artistScore + titleScore + versionScore + lyricsScore + durationScore;
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
  const targetFeat = parseTrackFeatures(title, artist);
  const cleaned = cleanTitle(title);
  const artistParam = encodeURIComponent(artist || '');
  const trackParam = encodeURIComponent(title || '');
  const cleanTrackParam = encodeURIComponent(cleaned || title || '');
  const primaryArtist = targetFeat.primaryArtist || (artist || '').split(/[;,/&]|feat\.|ft\./i)[0].trim();
  const primaryArtistParam = encodeURIComponent(primaryArtist);

  // Attempt 1: Exact query with duration on /api/get
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

  // Attempt 2: High-Priority Targeted Remix & Feature Search
  // If track is a remix or has featured artists, search specialized queries first
  if (targetFeat.isRemix || targetFeat.featMatches.length > 0) {
    for (const remQuery of targetFeat.remixQueries) {
      try {
        const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(remQuery)}`;
        const res = await fetchWithTimeout(searchUrl, {}, 3500);
        if (res.ok) {
          const list = await res.json();
          const best = findBestMatch(list, artist, title, duration);
          if (best && best.syncedLyrics && scoreCandidate(best, artist, title, duration) >= 65) {
            return best;
          }
        }
      } catch (e) {}
    }
  }

  // Attempt 3: Cleaned title query on /api/get
  if (cleaned && cleaned !== title && !targetFeat.isRemix) {
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

  // Attempt 4: Primary artist query on /api/get
  if (primaryArtist && primaryArtist !== artist && !targetFeat.isRemix) {
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

  // Attempt 5: Search endpoint with primary artist + title / cleaned
  try {
    const query = encodeURIComponent(`${primaryArtist || artist} ${cleaned || title}`.trim());
    const searchUrl = `https://lrclib.net/api/search?q=${query}`;
    const res = await fetchWithTimeout(searchUrl, {}, 3500);
    if (res.ok) {
      const list = await res.json();
      const best = findBestMatch(list, artist, title, duration);
      if (best) return best;
    }
  } catch (e) {}

  // Attempt 6: Search cleaned title only, with strict candidate scoring
  if (artist && cleaned) {
    try {
      const query = encodeURIComponent(cleaned);
      const searchUrl = `https://lrclib.net/api/search?q=${query}`;
      const res = await fetchWithTimeout(searchUrl, {}, 3500);
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
  const targetFeat = parseTrackFeatures(title, artist);
  const cleaned = cleanTitle(title);
  const primaryArtist = targetFeat.primaryArtist || (artist || '').split(/[;,/&]|feat\.|ft\./i)[0].trim();

  const searchQueries = [];
  if (targetFeat.isRemix || targetFeat.featMatches.length > 0) {
    searchQueries.push(...targetFeat.remixQueries);
  }
  if (artist && cleaned) searchQueries.push(`${artist} ${cleaned}`);
  if (primaryArtist && primaryArtist !== artist && cleaned) searchQueries.push(`${primaryArtist} ${cleaned}`);
  if (artist && title && title !== cleaned) searchQueries.push(`${artist} ${title}`);
  if (cleaned) searchQueries.push(cleaned);

  const uniqueQueries = [...new Set(searchQueries)];

  for (const query of uniqueQueries) {
    try {
      const searchUrl = `http://mobilecdn.kugou.com/api/v3/search/song?format=json&keyword=${encodeURIComponent(query)}&page=1&pagesize=8`;
      const sRes = await fetchWithTimeout(searchUrl, {}, 4000);
      if (!sRes.ok) continue;
      const sData = await sRes.json();
      const songs = sData?.data?.info;
      if (!Array.isArray(songs) || songs.length === 0) continue;

      // Filter out songs with artist mismatch or unwanted DJ/Demo/Remix
      const validSongs = songs.filter(s => {
        if (artist && !matchArtist(s.singername, artist)) return false;
        if (title && !matchTitle(s.songname, title)) return false;
        if (hasVersionMismatch(s.songname, title)) return false;
        return true;
      });
      const candidatesList = validSongs.length > 0 ? validSongs : (artist ? [] : songs);
      if (candidatesList.length === 0) continue;

      let selectedSong = candidatesList[0];
      if (duration && duration > 0) {
        const maxDelta = targetFeat.isRemix ? 4 : 6;
        const matched = candidatesList.find(s => typeof s.duration === 'number' && Math.abs(s.duration - duration) <= maxDelta);
        if (matched) {
          selectedSong = matched;
        } else if (targetFeat.isRemix) {
          continue;
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
  const targetFeat = parseTrackFeatures(title, artist);
  const cleaned = cleanTitle(title);

  const searchQueries = [];
  if (targetFeat.isRemix || targetFeat.featMatches.length > 0) {
    searchQueries.push(...targetFeat.remixQueries);
  }
  searchQueries.push(`${artist} ${cleaned || title}`.trim());

  const uniqueQueries = [...new Set(searchQueries)];

  for (const query of uniqueQueries) {
    try {
      const sUrl = `https://c.y.qq.com/soso/fcgi-bin/client_search_cp?w=${encodeURIComponent(query)}&format=json&n=6`;
      const sRes = await fetchWithTimeout(sUrl, {}, 3500);
      if (!sRes.ok) continue;
      const sData = await sRes.json();
      const songs = sData?.data?.song?.list;
      if (!Array.isArray(songs) || songs.length === 0) continue;

      // Filter out songs with artist mismatch or unwanted DJ/Demo/Remix
      const validSongs = songs.filter(s => {
        const singerNames = (s.singer || []).map(sg => sg.name).join(' ');
        if (artist && !matchArtist(singerNames, artist)) return false;
        if (title && !matchTitle(s.songname, title)) return false;
        if (hasVersionMismatch(s.songname, title)) return false;
        return true;
      });
      const candidatesList = validSongs.length > 0 ? validSongs : (artist ? [] : songs);
      if (candidatesList.length === 0) continue;

      let song = candidatesList[0];
      if (duration && duration > 0) {
        const maxDelta = targetFeat.isRemix ? 4 : 8;
        const matched = candidatesList.find(s => typeof s.interval === 'number' && Math.abs(s.interval - duration) <= maxDelta);
        if (matched) song = matched;
        else if (targetFeat.isRemix) continue;
      }

      if (!song?.songmid) continue;

      const lUrl = `https://c.y.qq.com/lyric/fcgi-bin/fcg_query_lyric_new.fcg?songmid=${song.songmid}&format=json&nobase64=1`;
      const lRes = await fetchWithTimeout(lUrl, { headers: { Referer: 'https://y.qq.com' } }, 3500);
      if (!lRes.ok) continue;
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
  }

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

async function getTrackData(rawArtist, rawTitle, album = '', duration = 0, forceRefresh = false, existingCoverUrl = null) {
  if (!rawTitle) return null;
  const { artist, title } = extractTrackAndArtist(rawArtist, rawTitle);
  const key = `${(artist || '').toLowerCase()}:::${title.toLowerCase()}`;
  const coverKey = `${cleanArtist(artist).toLowerCase()}:::${cleanTitle(title).toLowerCase()}`;

  if (existingCoverUrl && !forceRefresh) {
    coverArtCache.set(coverKey, existingCoverUrl);
  }

  if (forceRefresh) {
    cache.delete(key);
    coverArtCache.delete(coverKey);
  } else if (cache.has(key)) {
    const cached = cache.get(key);
    if (cached && ((cached.lyrics && cached.lyrics.length > 0) || cached.plainLyrics)) {
      if (!cached.coverUrl && (existingCoverUrl || coverArtCache.has(coverKey))) {
        cached.coverUrl = existingCoverUrl || coverArtCache.get(coverKey);
      }
      return cached;
    }
  }

  // Parallel fetch lyrics (concurrent across sources) and artwork
  const isLocalThumb = existingCoverUrl && existingCoverUrl.startsWith('data:image/');
  const artworkPromise = (isLocalThumb && !forceRefresh)
    ? Promise.resolve(existingCoverUrl)
    : (!forceRefresh && coverArtCache.has(coverKey)
        ? Promise.resolve(coverArtCache.get(coverKey))
        : fetchCoverArt(artist, title, album));

  const [lyricsData, coverUrl] = await Promise.all([
    fetchLyricsMultiSource(artist, title, album, duration),
    artworkPromise
  ]);

  if (coverUrl) {
    coverArtCache.set(coverKey, coverUrl);
  }

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
    coverUrl: coverUrl || null,
    hasSynced,
    lyrics: parsedLyrics,
    plainLyrics
  };

  // Only cache if we got actual lyrics or plain lyrics to avoid permanently caching transient failures
  if (hasSynced || plainLyrics) {
    cache.set(key, result);
    savePersistentLyricsCache();
    if (cache.size > 350) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
  }

  return result;
}

/**
 * Ultra-Fast Decoupled Lyrics Fetcher
 * Returns cached lyrics in 0ms, or fetches lyrics without waiting for cover art search!
 */
async function fetchLyricsOnly(rawArtist, rawTitle, album = '', duration = 0, forceRefresh = false) {
  if (!rawTitle) return null;
  const { artist, title } = extractTrackAndArtist(rawArtist, rawTitle);
  const key = `${(artist || '').toLowerCase()}:::${title.toLowerCase()}`;

  if (forceRefresh) {
    cache.delete(key);
  } else if (cache.has(key)) {
    const cached = cache.get(key);
    if (cached && ((cached.lyrics && cached.lyrics.length > 0) || cached.plainLyrics)) {
      return cached;
    }
  }

  const lyricsData = await fetchLyricsMultiSource(artist, title, album, duration);
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
    hasSynced,
    lyrics: parsedLyrics,
    plainLyrics
  };

  if (hasSynced || plainLyrics) {
    const existing = cache.get(key);
    if (existing?.coverUrl) {
      result.coverUrl = existing.coverUrl;
    }
    cache.set(key, result);
    savePersistentLyricsCache();
  }

  return result;
}

/**
 * Smart Media Classifier: Differentiates Ads, Videos, and Music
 */
function classifyMediaContent(mediaData) {
  if (!mediaData || !mediaData.title) {
    return { mediaType: 'none', isMusic: false };
  }

  const title = (mediaData.title || '').trim();
  const artist = (mediaData.artist || '').trim();
  const app = (mediaData.app || '').toLowerCase();
  const playbackType = (mediaData.playbackType || '').toLowerCase();

  // 1. Advertisements (Spotify, YouTube, browser ads)
  const isSpotifyAd = app.includes('spotify') && (
    /^advertisement$/i.test(title) ||
    /^spotify$/i.test(title) ||
    /^advertisement$/i.test(artist) ||
    (/^spotify$/i.test(artist) && title.length < 32)
  );

  const isGenericAd = (
    /^(?:Advertisement|Sponsored|Commercial)\b/i.test(title) ||
    /^(?:Ad\s*[\u2022\u00b7·\-|]|Skip\s*Ad)/i.test(title) ||
    /\b(?:Advertisement|Sponsored)\b/i.test(title) ||
    /^advertisement$/i.test(artist)
  );

  if (isSpotifyAd || isGenericAd) {
    return { mediaType: 'ad', isMusic: false };
  }

  // 2. Video Content (SMTC playbackType or video players)
  if (playbackType === 'video') {
    return { mediaType: 'video', isMusic: false };
  }

  const isDedicatedVideoApp = (
    app.includes('vlc') ||
    app.includes('potplayer') ||
    app.includes('mpv') ||
    app.includes('wmplayer') ||
    app.includes('zunevideo') ||
    app.includes('netflix') ||
    app.includes('bilibili') ||
    app.includes('disney') ||
    app.includes('primevideo')
  );

  if (isDedicatedVideoApp) {
    return { mediaType: 'video', isMusic: false };
  }

  const isBrowser = app.includes('chrome') || app.includes('msedge') || app.includes('firefox') || app.includes('brave') || app.includes('opera');
  if (isBrowser) {
    if (!artist && /(?:-\s*YouTube|\|\s*Twitch|\|\s*Netflix|Episode\s*\d+|Chapter\s*\d+)/i.test(title)) {
      return { mediaType: 'video', isMusic: false };
    }
  }

  // 3. Podcasts / Meetings
  const isMeetingApp = app.includes('teams') || app.includes('zoom') || app.includes('discord') || app.includes('webex');
  if (isMeetingApp) {
    return { mediaType: 'other', isMusic: false };
  }

  return { mediaType: 'music', isMusic: true };
}

const albumTracklistCache = new Map();

/**
 * Queries album tracklist from Deezer/iTunes to predict upcoming songs
 */
async function getAlbumTracklist(artist, album) {
  if (!artist || !album) return [];
  const key = `${cleanArtist(artist).toLowerCase()}:::${cleanTitle(album).toLowerCase()}`;
  if (albumTracklistCache.has(key)) {
    return albumTracklistCache.get(key);
  }

  try {
    const q = `album:"${cleanTitle(album)}"`;
    const res = await fetchWithTimeout(`https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=40`, {}, 3000);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.data) && data.data.length > 0) {
        const normArtist = cleanArtist(artist).toLowerCase();
        const matched = data.data.filter(d => {
          const aName = (d.artist?.name || '').toLowerCase();
          return aName.includes(normArtist) || normArtist.includes(aName);
        });
        const pool = matched.length > 0 ? matched : data.data;
        const tracks = pool.map(d => ({
          title: d.title || d.title_short,
          artist: d.artist?.name || artist,
          trackNumber: d.track_position || 0,
          duration: d.duration || 0
        })).sort((a, b) => a.trackNumber - b.trackNumber);

        if (tracks.length > 0) {
          albumTracklistCache.set(key, tracks);
          return tracks;
        }
      }
    }
  } catch (_) {}

  // Fallback to iTunes album lookup
  try {
    const q = `${cleanArtist(artist)} ${cleanTitle(album)}`;
    const res = await fetchWithTimeout(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=album&limit=1`, {}, 3000);
    if (res.ok) {
      const data = await res.json();
      const colId = data?.results?.[0]?.collectionId;
      if (colId) {
        const lookupRes = await fetchWithTimeout(`https://itunes.apple.com/lookup?id=${colId}&entity=song`, {}, 3000);
        if (lookupRes.ok) {
          const lData = await lookupRes.json();
          if (Array.isArray(lData?.results)) {
            const tracks = lData.results
              .filter(r => r.wrapperType === 'track')
              .map(r => ({
                title: r.trackName,
                artist: r.artistName || artist,
                trackNumber: r.trackNumber || 0,
                duration: r.trackTimeMillis ? Math.round(r.trackTimeMillis / 1000) : 0
              })).sort((a, b) => a.trackNumber - b.trackNumber);
            if (tracks.length > 0) {
              albumTracklistCache.set(key, tracks);
              return tracks;
            }
          }
        }
      }
    }
  } catch (_) {}

  return [];
}

/**
 * Predicts and pre-loads next song's lyrics from album tracklist in background
 */
async function predictAndPreloadNextTrack(rawArtist, rawTitle, rawAlbum, trackNumber = 0) {
  if (!rawTitle) return null;
  const { artist, title } = extractTrackAndArtist(rawArtist, rawTitle);
  const album = rawAlbum || '';
  if (!artist || !album) return null;

  try {
    const tracks = await getAlbumTracklist(artist, album);
    if (!tracks || tracks.length === 0) return null;

    const normTitle = cleanTitle(title).toLowerCase();
    let currentIndex = -1;

    if (trackNumber > 0) {
      currentIndex = tracks.findIndex(t => t.trackNumber === trackNumber);
    }
    if (currentIndex === -1) {
      currentIndex = tracks.findIndex(t => {
        const tName = cleanTitle(t.title).toLowerCase();
        return tName === normTitle || tName.includes(normTitle) || normTitle.includes(tName);
      });
    }

    if (currentIndex >= 0 && currentIndex + 1 < tracks.length) {
      const nextTrack = tracks[currentIndex + 1];
      const nextKey = `${(nextTrack.artist || artist).toLowerCase()}:::${nextTrack.title.toLowerCase()}`;
      if (!cache.has(nextKey)) {
        // Pre-fetch next track's lyrics in background without waiting
        fetchLyricsOnly(nextTrack.artist || artist, nextTrack.title, album, nextTrack.duration).catch(() => {});
        return nextTrack;
      }
    }
  } catch (_) {}
  return null;
}

module.exports = {
  getTrackData,
  fetchLyricsOnly,
  predictAndPreloadNextTrack,
  classifyMediaContent,
  fetchCoverArt,
  cleanTitle,
  cleanArtist,
  parseLrc
};
