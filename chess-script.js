/**
 * Chess.com to WintrChess Exporter - Complete Script
 */

// ==========================================
// 1. TRANSLATION DES PROMOTIONS (FR -> EN)
// ==========================================

const FR_TO_EN_PROMO = {
  'D': 'Q', // Dame -> Queen
  'T': 'R', // Tour -> Rook
  'F': 'B', // Fou -> Bishop
  'C': 'N'  // Cavalier -> Knight
};

function translatePromotionOnly(moveStr) {
  if (!moveStr || !moveStr.includes('=')) return moveStr;

  // Remplace la lettre de promotion même si elle est suivie de #, +, !, etc.
  return moveStr.replace(/=([DTFCRdtfcr])([+#?!]*)/g, (match, piece, suffix) => {
    const upperPiece = piece.toUpperCase();
    const translatedPiece = FR_TO_EN_PROMO[upperPiece] || upperPiece;
    return `=` + translatedPiece + suffix;
  });
}

// ==========================================
// 2. HELPER: EXTRACT PLAYER COLORS
// ==========================================

function getPlayerColors() {
  const board = document.querySelector('wc-chess-board');
  const isFlipped = board ? board.classList.contains('flipped') : false;

  const topUserEl = document.querySelector('#board-layout-player-top [data-test-element="user-tagline-username"]');
  const bottomUserEl = document.querySelector('#board-layout-player-bottom [data-test-element="user-tagline-username"]');

  const topUser = topUserEl ? topUserEl.textContent.trim() : 'White';
  const bottomUser = bottomUserEl ? bottomUserEl.textContent.trim() : 'Black';

  return {
    white: isFlipped ? topUser : bottomUser,
    black: isFlipped ? bottomUser : topUser
  };
}

// ==========================================
// 3. MOVE PARSER & PGN BUILDER
// ==========================================

function parseMoveNode(node) {
  if (!node) return null;

  // 1. Extraire le symbole de la pièce de base si présent
  const baseFigurineEl = node.querySelector('[data-figurine]');
  const baseFigurine = baseFigurineEl ? baseFigurineEl.getAttribute('data-figurine') : '';

  // 2. Cloner le nœud pour extraire le texte proprement
  const highlightEl = node.querySelector('.node-highlight-content') || node;
  const clone = highlightEl.cloneNode(true);

  // 3. Détecter la pièce de promotion avant de supprimer les icônes du DOM
  let promotionPiece = '';
  const promoEl = clone.querySelector('.promotion-piece, [data-figurine-promoted], [class*="promotion"]');
  if (promoEl) {
    promotionPiece = promoEl.getAttribute('data-figurine') || promoEl.getAttribute('data-figurine-promoted') || promoEl.textContent.trim();
  }

  // Supprimer les icônes pour ne garder que les coordonnées/symboles
  clone.querySelectorAll('[data-figurine]').forEach(el => el.remove());

  let moveText = clone.innerText.trim();
  if (!moveText) return null;

  let fullMove = (baseFigurine + moveText).replace(/\s+/g, '').trim();

  // 4. Ajouter le suffixe de promotion si un pion atteint la rangée 1 ou 8 sans '='
  const isPawnMove = !baseFigurine;
  const landsOnLastRank = /[a-h][18]/.test(fullMove);

  if (isPawnMove && landsOnLastRank && !fullMove.includes('=')) {
    const promoChar = promotionPiece ? promotionPiece : 'D';
    fullMove += `=` + promoChar;
  }

  // 5. Traduire uniquement la lettre après le '=' (ex: g8=D# -> g8=Q#)
  return translatePromotionOnly(fullMove);
}

function extractPgnFromMoveList() {
  const moveListContainer = 
    document.querySelector('wc-simple-move-list') ||
    document.querySelector('wc-mode-swap-move-list') ||
    document.querySelector('wc-move-list') ||
    document.querySelector('.chessboard-pkg-move-list-component');

  if (!moveListContainer) return null;

  const rows = moveListContainer.querySelectorAll('.main-line-row');
  const moves = [];

  rows.forEach((row) => {
    const moveNumber = row.getAttribute('data-whole-move-number');
    if (!moveNumber) return;

    const whiteNode = row.querySelector('.white-move');
    const blackNode = row.querySelector('.black-move');

    const whiteMove = parseMoveNode(whiteNode);
    const blackMove = parseMoveNode(blackNode);

    if (whiteMove) {
      if (blackMove) {
        moves.push(`${moveNumber}. ${whiteMove} ${blackMove}`);
      } else {
        moves.push(`${moveNumber}. ${whiteMove}`);
      }
    }
  });

  const resultEl = moveListContainer.querySelector('.game-result');
  const result = resultEl ? resultEl.innerText.trim() : '*';

  if (moves.length === 0) return null;

  const currentDate = new Date().toISOString().split('T')[0].replace(/-/g, '.');
  const players = getPlayerColors();

  const headers = [
    `[Event "Live Chess"]`,
    `[Site "Chess.com"]`,
    `[Date "${currentDate}"]`,
    `[White "${players.white}"]`,
    `[Black "${players.black}"]`,
    `[Result "${result}"]`
  ].join('\n');

  return `${headers}\n\n${moves.join(' ')} ${result}`;
}

// ==========================================
// 4. ACTION & ROUTING
// ==========================================

function triggerAnalysis() {
  const pgn = extractPgnFromMoveList();

  if (!pgn) {
    alert('Could not extract PGN. Ensure the moves list is visible on screen.');
    return;
  }

  chrome.storage.local.set({ targetPgn: pgn }, () => {
    const wintrUrl = `https://wintrchess.com/analysis?pgn=${encodeURIComponent(pgn)}`;
    window.open(wintrUrl, '_blank');
  });
}

// ==========================================
// 5. UI BUTTON INJECTION & OBSERVER
// ==========================================

function createAnalyzeButton() {
  const btn = document.createElement('button');
  btn.id = 'wintrchess-analyze-btn';
  btn.innerText = '⚡ Analyze on WintrChess';
  btn.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    margin: 8px 0;
    padding: 10px 16px;
    background-color: #45a049;
    color: #ffffff;
    font-weight: bold;
    font-size: 14px;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    z-index: 9999;
    transition: background-color 0.2s ease;
  `;

  btn.addEventListener('mouseover', () => btn.style.backgroundColor = '#3e8e41');
  btn.addEventListener('mouseout', () => btn.style.backgroundColor = '#45a049');
  btn.addEventListener('click', triggerAnalysis);

  return btn;
}

function injectButton() {
  if (document.getElementById('wintrchess-analyze-btn')) return;

  const targetContainer = 
    document.querySelector('.sidebar-content') ||
    document.querySelector('.game-tab-scrollable') ||
    document.querySelector('#live-game-tab-scroll-container') ||
    document.querySelector('.board-layout-sidebar');

  if (targetContainer) {
    targetContainer.prepend(createAnalyzeButton());
  }
}

const observer = new MutationObserver(() => injectButton());
observer.observe(document.body, { childList: true, subtree: true });
injectButton();