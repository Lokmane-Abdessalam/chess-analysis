/**
 * WintrChess Auto-Analyser Script for React State Update
 */

function setReactTextareaValue(textarea, value) {
  // Obtain native setter to bypass React's input interception
  const nativeTextareaValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype,
    'value'
  ).set;

  nativeTextareaValueSetter.call(textarea, value);

  // Dispatch events so React state updates
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
  textarea.dispatchEvent(new Event('change', { bubbles: true }));
}

function processAutoAnalyse() {
  const textarea = document.querySelector('textarea.F4_zJ5lO9K5VVnbRoZC1') || document.querySelector('textarea');
  if (!textarea) return false;

  // Retrieve PGN from URL parameter if present
  const urlParams = new URLSearchParams(window.location.search);
  const pgnParam = urlParams.get('pgn');

  if (pgnParam) {
    setReactTextareaValue(textarea, pgnParam);
  }

  // Find and trigger the Analyse button
  const buttons = Array.from(document.querySelectorAll('button'));
  const analyseBtn = buttons.find(btn => btn.textContent.trim().includes('Analyse'));

  if (analyseBtn && textarea.value.trim().length > 0) {
    console.log('[WintrChess Exporter] PGN populated & clicking Analyse...');
    
    // Brief delay to let React process state change before clicking
    setTimeout(() => {
      analyseBtn.click();
    }, 150);

    return true;
  }

  return false;
}

function initAutoAnalyse() {
  if (processAutoAnalyse()) return;

  const observer = new MutationObserver((mutations, obs) => {
    if (processAutoAnalyse()) {
      obs.disconnect();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  setTimeout(() => observer.disconnect(), 10000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAutoAnalyse);
} else {
  initAutoAnalyse();
}