(() => {
  const styleId = 'hotstar-subtitle-studio-style';
  // Repeat the stable ID to outrank site styles without touching inline attributes.
  const selector = '#video-container#video-container .shaka-text-container';
  let settings = SubtitleStudio.defaults;
  let style;
  let player;
  let video;
  let controls;
  const resize = new ResizeObserver(() => render());
  function bindPlayer() {
    const next = document.querySelector('#video-container');
    const media = next?.querySelector('video');
    if (next !== player || media !== video) {
      resize.disconnect();
      video?.removeEventListener('loadedmetadata', render);
      controls?.dispose(); controls = null;
      player = next; video = media;
      if (player) resize.observe(player);
      video?.addEventListener('loadedmetadata', render);
    }
    if (controls && (!settings.overlayControls || !controls.host.isConnected)) { controls.dispose(); controls = null; }
    if (!controls && player && video && settings.overlayControls) controls = SubtitleStudioControls.create(player, video);
  }
  function render() {
    bindPlayer();
    if (!style?.isConnected) {
      style = document.createElement('style');
      style.id = styleId;
      (document.head || document.documentElement).append(style);
    }
    const css = SubtitleStudio.compile(settings, selector, SubtitleStudio.videoViewport(player, video));
    if (style.textContent !== css) style.textContent = css;
    globalThis.SubtitleStudioPiP?.update(settings);
  }
  chrome.storage.local.get('subtitleStudio').then(data => {
    settings = SubtitleStudio.normalize(data.subtitleStudio);
    render();
  }).catch(() => render());
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.subtitleStudio) {
      settings = SubtitleStudio.normalize(changes.subtitleStudio.newValue);
      render();
    }
  });
  // CSS covers new cues; reconnect only when the player/video or our UI changes.
  new MutationObserver(() => {
    if (!style?.isConnected || player !== document.querySelector('#video-container') || video !== player?.querySelector('video') || (controls && !controls.host.isConnected)) render();
  })
    .observe(document.documentElement, { childList: true, subtree: true });
  chrome.runtime.onMessage.addListener((message, _sender, reply) => {
    if (message.type === 'subtitle-studio-status') {
      reply({ detected: !!document.querySelector('#video-container .shaka-text-container'), pip: globalThis.SubtitleStudioPiP?.state() });
    }
  });
})();
