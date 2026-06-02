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
async function searchMet(q, deptId) {
  const params = new URLSearchParams({ q, hasImages: 'true' });
  if (deptId) params.set('departmentId', deptId);
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
async function findArtwork(deptId) {
  // Tier 1: full date e.g. "June 2"
  let result = await searchMet(todayLabel, deptId);
  if (result.total > 0 && result.objectIDs) {
    return { id: pickRandom(result.objectIDs), searchUsed: todayLabel };
  }

  // Tier 2: month only e.g. "June"
  result = await searchMet(monthLabel, deptId);
  if (result.total > 0 && result.objectIDs) {
    return { id: pickRandom(result.objectIDs), searchUsed: monthLabel };
  }

  // Tier 3: department/wildcard fallback
  result = await searchMet('*', deptId || '');
  if (result.total > 0 && result.objectIDs) {
    return { id: pickRandom(result.objectIDs), searchUsed: 'department-only' };
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
    <div class="art-card-dept">${artwork.department || 'The Met'}</div>
    <h2>${artwork.title || 'Untitled'}</h2>
    <div class="art-card-meta">${artwork.artistDisplayName || 'Artist unknown'}</div>
    <div class="art-card-date">${artwork.objectDate || ''}</div>
    <div class="cunk-block">
      <div class="cunk-label">✦ Cunk on Art</div>
      <div class="cunk-text cunk-loading" id="cunk-${artwork.objectID}">Consulting the oracle…</div>
    </div>
    ${artwork.objectURL ? `<a class="art-card-link" href="${artwork.objectURL}" target="_blank" rel="noopener">View at The Met →</a>` : ''}
  `;

  document.getElementById('gallery').appendChild(card);

  // Fetch Cunk summary asynchronously and update the card
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

  fetchCunkSummary(artworkData, searchUsed)
    .then(summary => {
      const el = document.getElementById(`cunk-${artwork.objectID}`);
      if (el) {
        el.textContent = summary;
        el.classList.remove('cunk-loading');
      }
    })
    .catch(err => {
      const el = document.getElementById(`cunk-${artwork.objectID}`);
      if (el) {
        el.textContent = 'Philomena is unavailable for comment at this time.';
        el.classList.remove('cunk-loading');
      }
    });
}

// ── Main load flow ───────────────────────────────────────────────────────────
function setStatus(html) {
  document.getElementById('status').innerHTML = html;
}

function clearGallery() {
  document.getElementById('gallery').innerHTML = '';
}

async function loadArt(month, day, deptId) {
  clearGallery();
  const label = `${MONTH_NAMES[month]} ${day}`;
  setStatus(`<span class="spinner"></span> Searching the Met collection for <em>${label}</em>…`);

  try {
    // Override todayLabel/monthLabel if loading a different date (Surprise Me)
    const searchTodayLabel = `${MONTH_NAMES[month]} ${day}`;
    const searchMonthLabel = MONTH_NAMES[month];

    // Tier 1
    let result = await searchMet(searchTodayLabel, deptId);
    let searchUsed = searchTodayLabel;

    if (!result.total || !result.objectIDs) {
      // Tier 2
      setStatus(`<span class="spinner"></span> No exact match — trying <em>${searchMonthLabel}</em>…`);
      result = await searchMet(searchMonthLabel, deptId);
      searchUsed = searchMonthLabel;
    }

    if (!result.total || !result.objectIDs) {
      // Tier 3
      setStatus(`<span class="spinner"></span> Falling back to department collection…`);
      result = await searchMet('*', deptId || '');
      searchUsed = 'department-only';
    }

    if (!result.total || !result.objectIDs) {
      throw new Error('No artworks found.');
    }

    // Pick up to 3 random artworks to show
    const ids = result.objectIDs.slice(0, 100);
    const picked = [];
    const used = new Set();
    while (picked.length < Math.min(3, ids.length)) {
      const idx = Math.floor(Math.random() * ids.length);
      if (!used.has(idx)) { used.add(idx); picked.push(ids[idx]); }
    }

    const tierLabel = searchUsed === 'department-only'
      ? 'department collection'
      : `"${searchUsed}"`;
    setStatus(`Found ${result.total.toLocaleString()} artworks matching ${tierLabel}. Showing ${picked.length}.`);

    // Fetch and render each artwork
    for (const id of picked) {
      try {
        const artwork = await getArtwork(id);
        if (artwork && artwork.primaryImage) {
          renderCard(artwork, searchUsed);
        }
      } catch (e) {
        console.warn('Skipping artwork', id, e);
      }
    }

  } catch (err) {
    setStatus('');
    document.getElementById('gallery').innerHTML =
      `<div class="error-msg">Something went wrong: ${err.message}</div>`;
  }
}

// ── Event listeners ──────────────────────────────────────────────────────────
document.getElementById('load-btn').addEventListener('click', () => {
  const deptId = document.getElementById('dept-select').value;
  loadArt(todayMonth, todayDay, deptId);
});

document.getElementById('random-btn').addEventListener('click', () => {
  const deptId = document.getElementById('dept-select').value;
  const randMonth = Math.floor(Math.random() * 12);
  const randDay   = Math.floor(Math.random() * 28) + 1;
  loadArt(randMonth, randDay, deptId);
});

// ── Auto-load on page open ───────────────────────────────────────────────────
loadArt(todayMonth, todayDay, document.getElementById('dept-select').value);
