/* Shared playback actions and isolated overlays for the page and PiP. */
(() => {
  function seekTo(video, target) {
    const ranges = video.seekable;
    if (!ranges.length) throw new Error('Seeking is not available for this stream yet.');
    // Snap into a valid seekable range, including discontinuous/live timelines.
    const candidates = [];
    for (let i = 0; i < ranges.length; i++) candidates.push(Math.min(ranges.end(i), Math.max(ranges.start(i), target)));
    video.currentTime = candidates.reduce((best, value) => Math.abs(value - target) < Math.abs(best - target) ? value : best);
  }
  function seek(video, seconds) { seekTo(video, video.currentTime + seconds); }
  function formatTime(seconds) {
    if (!Number.isFinite(seconds)) return '0:00';
    const total = Math.max(0, Math.floor(seconds));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor(total / 60) % 60;
    return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}` : `${minutes}:${String(total % 60).padStart(2, '0')}`;
  }
  function create(container, video) {
    const doc = container.ownerDocument;
    const win = doc.defaultView;
    const host = doc.createElement('div');
    host.dataset.subtitleStudioOverlay = '';
    host.style.cssText = 'position:absolute!important;inset:0!important;z-index:2147483646!important;pointer-events:none!important;';
    const shadow = host.attachShadow({ mode: 'open' });
    const icon = kind => {
      const ns = 'http://www.w3.org/2000/svg';
      const svg = doc.createElementNS(ns, 'svg');
      svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('width', '28'); svg.setAttribute('height', '28'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false');
      const path = doc.createElementNS(ns, 'path');
      if (kind === 'play' || kind === 'pause') {
        path.setAttribute('d', kind === 'play' ? 'M8 5.5a.8.8 0 0 1 1.2-.7l10 6.5a.8.8 0 0 1 0 1.4l-10 6.5a.8.8 0 0 1-1.2-.7Z' : 'M6 5h4v14H6zM14 5h4v14h-4z');
        path.setAttribute('fill', 'currentColor');
      } else {
        path.setAttribute('d', kind === 'rewind' ? 'M4 7.5A8.5 8.5 0 1 1 3.5 15M4 2.5v5h5' : 'M20 7.5A8.5 8.5 0 1 0 20.5 15M20 2.5v5h-5');
        path.setAttribute('fill', 'none'); path.setAttribute('stroke', 'currentColor'); path.setAttribute('stroke-width', '1.8'); path.setAttribute('stroke-linecap', 'round'); path.setAttribute('stroke-linejoin', 'round');
      }
      svg.append(path);
      if (kind === 'rewind' || kind === 'forward') {
        const text = doc.createElementNS(ns, 'text'); text.setAttribute('x', '12'); text.setAttribute('y', '16'); text.setAttribute('text-anchor', 'middle'); text.setAttribute('fill', 'currentColor'); text.setAttribute('font-family', 'Arial, sans-serif'); text.setAttribute('font-weight', '700'); text.setAttribute('font-size', '8'); text.textContent = '10'; svg.append(text);
      }
      return svg;
    };
    const css = doc.createElement('style');
    css.textContent = `
      :host{all:initial}*{box-sizing:border-box}
      nav{position:absolute;left:0;right:0;bottom:0;padding:24px 18px 12px;background:linear-gradient(transparent,#000b);opacity:0;transition:opacity .18s;pointer-events:none;color:#fff;font:12px Arial,sans-serif}
      nav[data-visible]{opacity:1}
      .timeline{display:flex;align-items:center;gap:12px}.time{min-width:42px;text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap;text-shadow:0 1px 3px black}
      input{all:initial;box-sizing:border-box;appearance:none;-webkit-appearance:none;flex:1;min-width:0;height:22px;background:transparent;cursor:pointer;pointer-events:none;--progress:0%}
      input::-webkit-slider-runnable-track{height:4px;border-radius:2px;background:linear-gradient(to right,#159cff var(--progress),#ffffff40 var(--progress))}
      input::-webkit-slider-thumb{appearance:none;-webkit-appearance:none;width:13px;height:13px;margin-top:-4.5px;border-radius:50%;background:#fff;box-shadow:0 0 3px #0005}
      input:disabled{cursor:default;opacity:.5}input:disabled::-webkit-slider-thumb{opacity:0}
      .buttons{display:flex;align-items:center;gap:12px;margin-top:4px}
      button{all:initial;box-sizing:border-box;display:flex;align-items:center;justify-content:center;width:40px;height:38px;border-radius:6px;color:#e4e9f0;cursor:pointer;pointer-events:none;user-select:none}
      nav[data-visible] button,nav[data-visible] input:not(:disabled){pointer-events:auto}
      button:hover{background:#ffffff18;color:white}button:focus-visible,input:focus-visible{outline:2px solid #159cff;outline-offset:3px}
      button.play svg{width:32px;height:32px}svg{display:block;pointer-events:none}
      p{position:absolute;bottom:100px;left:10%;width:80%;text-align:center;color:#fff;font:12px Arial,sans-serif;text-shadow:0 1px 4px black;pointer-events:none}
      p:empty,nav:not([data-visible])+p{display:none}@media(prefers-reduced-motion:reduce){nav{transition:none}}
    `;
    const nav = doc.createElement('nav'); nav.ariaLabel = 'Subtitle Studio playback controls';
    const timeline = doc.createElement('div'); timeline.className = 'timeline';
    const progress = doc.createElement('input'); progress.type = 'range'; progress.min = '0'; progress.max = '1'; progress.step = '0.1'; progress.value = '0'; progress.disabled = true; progress.ariaLabel = 'Seek video';
    const time = doc.createElement('span'); time.className = 'time'; time.textContent = '0:00'; time.title = 'Time remaining';
    const row = doc.createElement('div'); row.className = 'buttons';
    timeline.append(progress, time); nav.append(timeline, row);
    const notice = doc.createElement('p'); notice.setAttribute('role', 'status');
    let timer;
    let disposed = false;
    let panelHeight = 100;
    const insetName = '--subtitle-studio-controls-inset';
    const previousInset = container.style.getPropertyValue(insetName);
    const previousPriority = container.style.getPropertyPriority(insetName);
    const inset = value => { if (container.style.getPropertyValue(insetName) !== value) container.style.setProperty(insetName, value); };
    let pointerInside = container.matches(':hover') && doc.hasFocus();
    const hide = () => { win.clearTimeout(timer); nav.removeAttribute('data-visible'); notice.textContent = ''; inset('0px'); };
    const leave = () => { pointerInside = false; hide(); };
    const reveal = () => {
      if (disposed) return;
      if (!pointerInside) { hide(); return; }
      nav.dataset.visible = '';
      inset(`${panelHeight}px`);
      win.clearTimeout(timer);
      if (!video.paused && !shadow.activeElement) timer = win.setTimeout(hide, 1800);
    };
    const enter = () => { pointerInside = true; reveal(); };
    const visibility = () => { if (doc.hidden) leave(); };
    const add = (kind, label, action, className = '') => {
      const button = doc.createElement('button'); button.type = 'button'; button.append(icon(kind)); button.ariaLabel = label; button.title = label; button.className = className;
      button.addEventListener('click', event => { event.stopPropagation(); notice.textContent = ''; action(); reveal(); });
      row.append(button); return button;
    };
    const jump = seconds => { try { seek(video, seconds); } catch (error) { notice.textContent = error.message; } };
    add('rewind', 'Rewind 10 seconds', () => jump(-10));
    const play = add('pause', 'Pause video', () => {
      if (video.paused) video.play().catch(() => { notice.textContent = 'Playback could not resume. Use the player to continue.'; });
      else video.pause();
    }, 'play');
    add('forward', 'Forward 10 seconds', () => jump(10));
    let scrubbing = false;
    const syncTimeline = () => {
      const ranges = video.seekable;
      const start = ranges.length ? ranges.start(0) : 0;
      const end = ranges.length ? ranges.end(ranges.length - 1) : 0;
      progress.disabled = !ranges.length || end <= start;
      if (!scrubbing) {
        progress.min = String(start); progress.max = String(Math.max(start + .1, end));
        progress.value = String(Math.min(end, Math.max(start, video.currentTime || 0)));
      }
      const current = Number(progress.value);
      const percent = end > start ? Math.min(100, Math.max(0, (current - start) / (end - start) * 100)) : 0;
      progress.style.setProperty('--progress', `${percent}%`);
      const duration = Number.isFinite(video.duration) ? video.duration : end;
      time.textContent = formatTime(Math.max(0, duration - current));
      progress.setAttribute('aria-valuetext', `${formatTime(current)} of ${formatTime(duration)}`);
    };
    const finishScrub = () => { scrubbing = false; syncTimeline(); };
    progress.addEventListener('pointerdown', () => { scrubbing = true; });
    progress.addEventListener('input', () => {
      try { seekTo(video, Number(progress.value)); notice.textContent = ''; }
      catch (error) { notice.textContent = error.message; }
      syncTimeline(); reveal();
    });
    progress.addEventListener('change', finishScrub);
    progress.addEventListener('pointercancel', finishScrub);
    win.addEventListener('pointerup', finishScrub);
    const sync = () => { play.replaceChildren(icon(video.paused ? 'play' : 'pause')); play.ariaLabel = video.paused ? 'Play video' : 'Pause video'; play.title = play.ariaLabel; reveal(); };
    // Keep interactions with our buttons from toggling Hotstar's click-to-pause.
    for (const event of ['click', 'pointerdown', 'pointerup', 'dblclick', 'keydown', 'keyup']) nav.addEventListener(event, e => e.stopPropagation());
    nav.addEventListener('focusin', reveal); nav.addEventListener('focusout', () => win.setTimeout(reveal, 0));
    container.addEventListener('pointerenter', enter);
    container.addEventListener('pointermove', enter);
    container.addEventListener('pointerdown', enter);
    container.addEventListener('pointerleave', leave);
    win.addEventListener('blur', leave);
    doc.addEventListener('visibilitychange', visibility);
    for (const event of ['play', 'pause', 'ended']) video.addEventListener(event, sync);
    const timelineEvents = ['timeupdate', 'durationchange', 'loadedmetadata', 'progress', 'emptied', 'seeking', 'seeked'];
    for (const event of timelineEvents) video.addEventListener(event, syncTimeline);
    const panelResize = new win.ResizeObserver(entries => {
      panelHeight = Math.ceil(entries[0].target.getBoundingClientRect().height);
      if (nav.hasAttribute('data-visible')) inset(`${panelHeight}px`);
    });
    shadow.append(css, nav, notice); container.append(host); sync(); syncTimeline();
    panelResize.observe(nav);
    return { host, dispose() {
      disposed = true; win.clearTimeout(timer);
      panelResize.disconnect();
      if (previousInset) container.style.setProperty(insetName, previousInset, previousPriority); else container.style.removeProperty(insetName);
      container.removeEventListener('pointerenter', enter); container.removeEventListener('pointermove', enter); container.removeEventListener('pointerdown', enter); container.removeEventListener('pointerleave', leave);
      win.removeEventListener('blur', leave); doc.removeEventListener('visibilitychange', visibility);
      win.removeEventListener('pointerup', finishScrub);
      for (const event of ['play', 'pause', 'ended']) video.removeEventListener(event, sync);
      for (const event of timelineEvents) video.removeEventListener(event, syncTimeline);
      host.remove();
    } };
  }
  globalThis.SubtitleStudioControls = { create, seek, seekTo };
})();
