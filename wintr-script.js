// wintr-script.js

window.addEventListener('load', () => {
  chrome.storage.local.get(['targetPgn'], (result) => {
    if (!result.targetPgn) return;
    
    const pgnText = result.targetPgn;

    const checkInterval = setInterval(() => {
      const textarea = document.querySelector('textarea') || document.querySelector('input[type="text"]');
      
      if (textarea) {
        clearInterval(checkInterval);

        // Fill field
        textarea.value = pgnText;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.dispatchEvent(new Event('change', { bubbles: true }));

        // Auto-click Analyze button on Wintr
        setTimeout(() => {
          const analyzeBtn = document.querySelector('button[type="submit"]') || 
                             Array.from(document.querySelectorAll('button')).find(b => b.innerText.toLowerCase().includes('analyze'));
          if (analyzeBtn) analyzeBtn.click();
        }, 300);

        // Clear stored payload
        chrome.storage.local.remove('targetPgn');
      }
    }, 300);
  });
});