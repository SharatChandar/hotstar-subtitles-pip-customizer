/* Document PiP keeps the original media element, with a safe mirror of live cues.
 * No canvas/captureStream: protected video is never captured or re-encoded. */
(() => {
  let session = null;
  let opening = false;
  let settings = SubtitleStudio.defaults;
  const baseCSS = `
    :root{color-scheme:dark;font:13px Arial,sans-serif;background:#080a0e;color:#fff}
    *{box-sizing:border-box}html,body{width:100%;height:100%;margin:0;overflow:hidden}
    body{display:flex;flex-direction:column}#stage{position:relative;flex:1;min-height:0;background:#000;overflow:hidden}
    #caption-layer{position:absolute;inset:0 0 8px;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;pointer-events:none}
    #studio-pip-captions{display:flex;flex-direction:column;align-items:center;justify-content:flex-end;text-align:center;font:28px/1.3 Arial,sans-serif;color:white;text-shadow:0 2px 4px black;width:90%;position:relative}
    #studio-pip-captions>div{max-width:100%;white-space:pre-wrap;text-align:center}
    #studio-pip-captions span{white-space:pre-wrap;overflow-wrap:break-word}
    #notice{position:absolute;bottom:12px;left:10%;width:80%;margin:0;padding:6px 10px;border-radius:6px;background:#3a211ce8;color:#ffd9cf;font-size:11px;pointer-events:none}
  `;
  function state() {
    return { supported: !!window.documentPictureInPicture?.requestWindow && window === window.top, open: !!session && !session.win.closed };
  }
  function update(next) {
    settings = SubtitleStudio.normalize(next);
    if (session) {
      session.style.textContent = SubtitleStudio.compile(settings, '#studio-pip-captions#studio-pip-captions', SubtitleStudio.videoViewport(session.stage, session.video));
      if (session.controls && !settings.overlayControls) { session.controls.dispose(); session.controls = null; }
      if (!session.controls && settings.overlayControls) session.controls = SubtitleStudioControls.create(session.stage, session.video);
    }
  }
  // Copy only text and caption structure, never host scripts, links or handlers.
  function copyCue(node, doc) {
    if (node.nodeType === Node.TEXT_NODE) return doc.createTextNode(node.textContent);
    if (node.nodeType !== Node.ELEMENT_NODE) return doc.createTextNode('');
    if (!['DIV', 'SPAN', 'BR', 'B', 'I', 'U', 'RUBY', 'RT'].includes(node.tagName)) return doc.createTextNode(node.textContent || '');
    const clone = doc.createElement(node.tagName.toLowerCase());
    for (const child of node.childNodes) clone.append(copyCue(child, doc));
    return clone;
  }
  async function toggle() {
    if (session) { session.win.close(); return { ok: true, open: false }; }
    if (opening) return { ok: false, error: 'Picture-in-picture is already opening.' };
    if (!state().supported) return { ok: false, error: 'Subtitle PiP needs desktop Chrome with Document Picture-in-Picture support.' };
    const player = document.querySelector('#video-container');
    const video = player?.querySelector('video');
    if (!video) return { ok: false, error: 'Open a Hotstar video first, then try again.' };
    if (!video.readyState) return { ok: false, error: 'Wait for the video to load, then try again.' };
    opening = true;
    let win;
    let cleanup;
    try {
      // This must be the first async operation: executeScript carries the popup click.
      const aspectRatio = video.videoWidth && video.videoHeight ? video.videoWidth / video.videoHeight : 16 / 9;
      win = await window.documentPictureInPicture.requestWindow({ width: 640, height: Math.round(640 / aspectRatio), preferInitialWindowPlacement: true });
      if (!video.isConnected || !player.isConnected) throw new Error('The player changed while opening PiP. Try again.');
      const doc = win.document;
      doc.title = 'Hotstar · Subtitle Studio';
      const base = doc.createElement('style'); base.textContent = baseCSS;
      const style = doc.createElement('style'); doc.head.append(base, style);
      const stage = doc.createElement('main'); stage.id = 'stage';
      const layer = doc.createElement('div'); layer.id = 'caption-layer';
      const captions = doc.createElement('div'); captions.id = 'studio-pip-captions'; captions.setAttribute('aria-label', 'Subtitles');
      layer.append(captions);
      const notice = doc.createElement('p'); notice.id = 'notice'; notice.hidden = true; notice.setAttribute('role', 'status');
      const showError = text => { notice.textContent = text; notice.hidden = false; };
      const marker = document.createComment('subtitle-studio-video-home');
      const parent = video.parentNode;
      const inline = video.getAttribute('style');
      const wasPlaying = !video.paused;
      parent.insertBefore(marker, video);
      let root;
      let pending = false;
      const syncCaptions = () => {
        const next = player.querySelector('.shaka-text-container');
        if (next !== root) {
          cueObserver.disconnect(); root = next;
          if (root) cueObserver.observe(root, { childList: true, characterData: true, attributes: true, subtree: true });
        }
        captions.replaceChildren();
        if (!root || getComputedStyle(root).display === 'none' || getComputedStyle(root).visibility === 'hidden') return;
        for (const child of root.childNodes) captions.append(copyCue(child, doc));
      };
      const schedule = () => {
        if (pending || win.closed) return;
        pending = true;
        win.requestAnimationFrame(() => { pending = false; if (!win.closed) syncCaptions(); });
      };
      const cueObserver = new MutationObserver(schedule);
      const playerObserver = new MutationObserver(() => {
        // Do not carry an old episode across a player replacement.
        if (!marker.isConnected || !player.isConnected || player.querySelector('video')) { win.close(); return; }
        if (player.querySelector('.shaka-text-container') !== root) schedule();
      });
      const resize = new win.ResizeObserver(() => update(settings));
      let cleaned = false;
      cleanup = () => {
        if (cleaned) return;
        cleaned = true; cueObserver.disconnect(); playerObserver.disconnect(); resize.disconnect();
        session?.controls?.dispose();
        const resume = !video.paused;
        if (inline === null) video.removeAttribute('style'); else video.setAttribute('style', inline);
        if (marker.parentNode) marker.replaceWith(video); else parent.append(video);
        session = null;
        window.removeEventListener('pagehide', close);
        if (resume && video.isConnected) video.play().catch(() => {});
      };
      const close = () => win.close();
      win.addEventListener('pagehide', cleanup, { once: true });
      window.addEventListener('pagehide', close, { once: true });
      session = { win, style, stage, video, controls: null };
      for (const [key, value] of Object.entries({ position: 'absolute', inset: '0', width: '100%', height: '100%', 'object-fit': 'contain', margin: '0', 'max-width': 'none', 'max-height': 'none' })) video.style.setProperty(key, value, 'important');
      stage.append(video, layer, notice); doc.body.append(stage);
      resize.observe(stage);
      playerObserver.observe(document.documentElement, { childList: true, subtree: true });
      syncCaptions(); update(settings);
      if (wasPlaying) video.play().catch(() => showError('Click Play to continue playback.'));
      return { ok: true, open: true };
    } catch (error) {
      cleanup?.(); win?.close();
      const activation = error.name === 'NotAllowedError';
      return { ok: false, error: activation ? 'Chrome blocked PiP. Return to the Hotstar tab and click the PiP button again.' : error.message || 'Could not open subtitle PiP.' };
    } finally { opening = false; }
  }
  globalThis.SubtitleStudioPiP = { state, update, toggle };
})();
