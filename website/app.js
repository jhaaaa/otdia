// v2 — limit=1, no auto-load
const MET_BASE = 'https://collectionapi.metmuseum.org/public/collection/v1';
const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December'];

// ── Date setup ──────────────────────────────────────────────────────────────
const now = new Date();
const todayMonth = now.getMonth();   // 0-indexed
const todayDay   = now.getDate();
const todayLabel = `${MONTH_NAMES[todayMonth]} ${todayDay}`;   // e.g. "June 2"
const monthLabel = MONTH_NAMES[todayMonth];                     // e.g. "June"

document.getElementById('date-day').textContent = todayDay;
document.getElementById('date-month-year').textContent =
  `${monthLabel} · ${now.getFullYear()}`;

// ── Met API helpers ──────────────────────────────────────────────────────────
async function searchMet(q) {
  const params = new URLSearchParams({ q, hasImages: 'true' });
  const res = await fetch(`${MET_BASE}/search?${params}`);
  if (!res.ok) throw new Error(`Met search failed: ${res.status}`);
  return res.json();
}

async function getArtwork(id) {
  const res = await fetch(`${MET_BASE}/objects/${id}`);
  if (!res.ok) throw new Error(`Met object fetch failed: ${res.status}`);
  return res.json();
}

function pickRandom(ids) {
  const pool = ids.slice(0, 100);
  return pool[Math.floor(Math.random() * pool.length)];
}

// ── Three-tier date fallback ─────────────────────────────────────────────────
async function findArtwork() {
  // Tier 1: full date e.g. "June 2"
  let result = await searchMet(todayLabel);
  if (result.total > 0 && result.objectIDs) {
    return { id: pickRandom(result.objectIDs), searchUsed: todayLabel };
  }

  // Tier 2: month only e.g. "June"
  result = await searchMet(monthLabel);
  if (result.total > 0 && result.objectIDs) {
    return { id: pickRandom(result.objectIDs), searchUsed: monthLabel };
  }

  // Tier 3: wildcard fallback
  result = await searchMet('*');
  if (result.total > 0 && result.objectIDs) {
    return { id: pickRandom(result.objectIDs), searchUsed: 'collection' };
  }

  throw new Error('No artworks found — the Met is having a quiet day.');
}

// ── Gemini summary via serverless function ───────────────────────────────────
async function fetchCunkSummary(artworkData, searchUsed) {
  const res = await fetch('/api/summary', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ artworkData, todayLabel, searchUsed })
  });
  if (!res.ok) throw new Error(`Summary API error: ${res.status}`);
  const data = await res.json();
  return data.summary;
}

// ── Render ───────────────────────────────────────────────────────────────────
function renderCard(artwork, searchUsed) {
  const card = document.createElement('div');
  card.className = 'art-card';

  const imageHtml = artwork.primaryImage
    ? `<div class="art-card-image-wrap"><img src="${artwork.primaryImage}" alt="${artwork.title}" loading="lazy" /></div>`
    : '';

  card.innerHTML = `
    ${imageHtml}
    <div class="art-card-body">
      <div class="art-card-dept">${artwork.department || 'The Met'}</div>
      <h2>${artwork.title || 'Untitled'}</h2>
      <div class="art-card-meta">${artwork.artistDisplayName || 'Artist unknown'}</div>
      <div class="art-card-date">${artwork.objectDate || ''}</div>
      <div class="punk-block">
        <div class="punk-label">✦ Chillomena Punk on Art</div>
        <div class="punk-text punk-loading" id="punk-${artwork.objectID}">Consulting the oracle…</div>
      </div>
      ${artwork.objectURL ? `<a class="art-card-link" href="${artwork.objectURL}" target="_blank" rel="noopener">View at The Met →</a>` : ''}
    </div>
  `;

  document.getElementById('gallery').appendChild(card);

  // Fetch summary asynchronously and update the card
  const artworkData = {
    title: artwork.title || 'Unknown Title',
    artist: artwork.artistDisplayName || 'Unknown Artist',
    date: artwork.objectDate || 'Unknown Date',
    medium: artwork.medium || 'Unknown Medium',
    dimensions: artwork.dimensions || '',
    department: artwork.department || '',
    culture: artwork.culture || '',
    creditLine: artwork.creditLine || '',
    objectURL: artwork.objectURL || '',
    primaryImage: artwork.primaryImage || ''
  };

  fetchSummary(artworkData, searchUsed)
    .then(summary => {
      const el = document.getElementById(`punk-${artwork.objectID}`);
      if (el) {
        el.textContent = summary;
        el.classList.remove('punk-loading');
      }
    })
    .catch(err => {
      const el = document.getElementById(`punk-${artwork.objectID}`);
      if (el) {
        el.textContent = 'Chillomena is unavailable for comment at this time.';
        el.classList.remove('punk-loading');
      }
    });
}

// ── Main load flow ───────────────────────────────────────────────────────────
function setStatus(html) {
  const el = document.getElementById('status');
  el.classList.remove('status-welcome');
  el.innerHTML = html;
}

function clearGallery() {
  document.getElementById('gallery').innerHTML = '';
}

async function loadArt(month, day, limit = 1, showMatchStatus = true) {
  clearGallery();
  const label = `${MONTH_NAMES[month]} ${day}`;
  setStatus(`<span class="spinner"></span> Searching the Met collection for <em>${label}</em>…`);

  try {
    const searchTodayLabel = `${MONTH_NAMES[month]} ${day}`;
    const searchMonthLabel = MONTH_NAMES[month];

    // Tier 1: exact date match e.g. "June 2"
    let result = await searchMet(searchTodayLabel);
    let searchUsed = 'exact-date';
    let matchedTerm = searchTodayLabel;

    if (!result.total || !result.objectIDs) {
      // Tier 2: month match e.g. "June"
      setStatus(`<span class="spinner"></span> No exact match — trying <em>${searchMonthLabel}</em>…`);
      result = await searchMet(searchMonthLabel);
      searchUsed = 'month';
      matchedTerm = searchMonthLabel;
    }

    if (!result.total || !result.objectIDs) {
      // Tier 3: full collection fallback
      setStatus(`<span class="spinner"></span> Falling back to full collection…`);
      result = await searchMet('*');
      searchUsed = 'collection';
      matchedTerm = 'the full collection';
    }

    if (!result.total || !result.objectIDs) {
      throw new Error('No artworks found.');
    }

    // Shuffle up to 100 IDs, then walk through until we have `limit` with images
    const pool = result.objectIDs.slice(0, 100);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    setStatus(`<span class="spinner"></span> Loading…`);

    // Fetch artworks one by one, skipping those without images, until we hit limit
    let rendered = 0;
    for (const id of pool) {
      if (rendered >= limit) break;
      try {
        const artwork = await getArtwork(id);
        if (artwork && artwork.primaryImage) {
          renderCard(artwork, searchUsed);
          rendered++;
        }
      } catch (e) {
        console.warn('Skipping artwork', id, e);
      }
    }

    if (rendered === 0) {
      throw new Error('None of the matched artworks had images.');
    }

    if (showMatchStatus) {
      setStatus(`Found ${result.total.toLocaleString()} artworks with metadata matching <strong>"${matchedTerm}"</strong>. Showing 1 randomly selected.`);
    } else {
      setStatus(`Showing 1 randomly selected artwork.`);
    }

  } catch (err) {
    setStatus('');
    document.getElementById('gallery').innerHTML =
      `<div class="error-msg">Something went wrong: ${err.message}</div>`;
  }
}

// ── Event listeners ──────────────────────────────────────────────────────────
document.getElementById('load-btn').addEventListener('click', () => {
  loadArt(todayMonth, todayDay, 1);
});

document.getElementById('random-btn').addEventListener('click', () => {
  const randMonth = Math.floor(Math.random() * 12);
  const randDay   = Math.floor(Math.random() * 28) + 1;
  loadArt(randMonth, randDay, 1, false);
});
