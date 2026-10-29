(async () => {
  const html = await (await fetch('../popup.html')).text();
  const base = new URL('../', location.href).href;
  document.querySelector('iframe').srcdoc = html.replace('<head>', `<head><base href="${base}"><script src="tests/mock-chrome.js"></script>`);
})();
