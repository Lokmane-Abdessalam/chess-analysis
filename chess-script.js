// chess-script.js

async function fetchValidPGN() {
  const pathSegments = window.location.pathname.split('/').filter(Boolean);
  const gameId = pathSegments[pathSegments.length - 1];

  if (!gameId || isNaN(gameId)) return null;

  try {
    // Strategy 1: Fetch directly from Chess.com's live export endpoint
    const exportRes = await fetch(`https://www.chess.com/game/export/id/${gameId}`);
    if (exportRes.ok) {
      const pgnText = await exportRes.text();
      // Ensure it returned actual moves, not HTML or an error page
      if (pgnText.includes('1.') && pgnText.includes('[Event')) {
        return pgnText;
      }
    }

    // Strategy 2: Fetch game metadata to query the public archive endpoint
    const callbackRes = await fetch(`https://www.chess.com/callback/live/game/${gameId}`);
    if (callbackRes.ok) {
      const data = await callbackRes.json();
      
      // Grab White player username and game date
      const whitePlayer = data.game?.pgnHeaders?.White || data.game?.players?.white?.username;
      const dateStr = data.game?.pgnHeaders?.Date; // e.g., "2026.05.12"

      if (whitePlayer && dateStr) {
        const [year, month] = dateStr.split('.');
        const archiveRes = await fetch(`https://api.chess.com/pub/player/${whitePlayer.toLowerCase()}/games/${year}/${month}`);
        
        if (archiveRes.ok) {
          const archiveData = await archiveRes.json();
          const match = archiveData.games.find(g => g.url.endsWith(gameId));
          if (match && match.pgn) {
            return match.pgn;
          }
        }
      }
    }
  } catch (err) {
    console.error("PGN Fetching Error:", err);
  }

  return null;
}

function createFloatingButton() {
  if (document.getElementById('wintr-btn')) return;

  const btn = document.createElement('button');
  btn.id = 'wintr-btn';
  btn.innerText = '⚡ Analyze on Wintr';
  
  btn.style.cssText = `
    position: fixed;
    bottom: 25px;
    right: 25px;
    z-index: 9999999;
    padding: 14px 20px;
    background: #81b64c;
    color: #ffffff;
    font-weight: bold;
    font-size: 15px;
    border: 2px solid #ffffff;
    border-radius: 8px;
    cursor: pointer;
    box-shadow: 0px 5px 15px rgba(0,0,0,0.4);
  `;

  btn.addEventListener('click', async () => {
    btn.innerText = 'Fetching Clean PGN...';
    btn.disabled = true;

    const pgn = await fetchValidPGN();

    if (!pgn) {
      alert("Could not retrieve valid PGN. Please ensure the match is completed.");
      btn.innerText = '⚡ Analyze on Wintr';
      btn.disabled = false;
      return;
    }

    // Save standard PGN string and open Wintr
    chrome.storage.local.set({ targetPgn: pgn }, () => {
      window.open('https://wintrchess.com/analysis', '_blank');
      btn.innerText = '⚡ Analyze on Wintr';
      btn.disabled = false;
    });
  });

  document.body.appendChild(btn);
}

setInterval(createFloatingButton, 1000);