(() => {
  const video = document.querySelector('video');
  const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 360;
  const context = canvas.getContext('2d'); let step = 0;
  function paint() {
    context.fillStyle = '#152d36'; context.fillRect(0, 0, 640, 360);
    context.fillStyle = '#c4f17a'; context.beginPath(); context.arc(320 + Math.sin(step / 30) * 150, 150, 36, 0, Math.PI * 2); context.fill();
    context.fillStyle = '#fff'; context.font = '18px Arial'; context.fillText('Local PiP test · ' + step++, 20, 36);
  }
  if (new URLSearchParams(location.search).has('finite')) {
    // Blob-backed fixture remains seekable even with Python's basic HTTP server,
    // which does not implement byte-range responses.
    fetch('generated/seek-test.mp4').then(async response => {
      if (!response.ok) throw new Error('Missing generated test video');
      const url = URL.createObjectURL(await response.blob());
      video.src = url; video.play().catch(() => {});
      window.addEventListener('pagehide', () => URL.revokeObjectURL(url), { once: true });
    }).catch(() => { output.textContent = 'Generate tests/generated/seek-test.mp4 using the README instructions first.'; });
    video.addEventListener('loadedmetadata', () => { video.currentTime = video.duration / 2; }, { once: true });
    video.addEventListener('error', () => { output.textContent = 'Generate tests/generated/seek-test.mp4 using the README instructions first.'; });
  } else {
    paint(); setInterval(paint, 1000 / 30);
    video.srcObject = canvas.captureStream(30);
  }
  video.play().catch(() => {});
  const output = document.querySelector('#result');
  video.addEventListener('loadeddata', () => { output.textContent = 'Ready. Click Toggle subtitle PiP.'; }, { once: true });
  document.querySelector('#open').onclick = async () => { output.textContent = JSON.stringify(await SubtitleStudioPiP.toggle()); };
  document.querySelector('#caption').onclick = () => { document.querySelector('.shaka-text-container span').textContent = 'Live captions stay in sync.'; };
  document.querySelector('#style').onclick = () => chrome.storage.local.set({ subtitleStudio: SubtitleStudio.presets.yellow });
  document.querySelector('#auto').onclick = () => chrome.storage.local.set({ subtitleStudio: { ...SubtitleStudio.presets.yellow, autoScale: true } });
  document.querySelector('#off').onclick = () => chrome.storage.local.set({ subtitleStudio: { ...SubtitleStudio.defaults, enabled: false } });
  document.querySelector('#replace').onclick = () => { const old = document.querySelector('.shaka-text-container'); const next = old.cloneNode(true); next.querySelector('span').textContent = 'Replaced subtitle container.'; old.replaceWith(next); };
})();
