(() => {
  const S = SubtitleStudio;
  let settings = { ...S.defaults };
  let queue = Promise.resolve();
  let presetName = '';
  let activeTabId;
  const $ = id => document.getElementById(id);
  const specs = {
    type: [
      ['autoScale', 'Auto-size subtitles to video', 'checkbox'],
      ['fontSize', 'Font size', 'range', 'px', 1],
      ['fontFamily', 'Font family', 'font'],
      ['fontWeight', 'Weight', 'select', [['400', 'Regular'], ['500', 'Medium'], ['600', 'Semibold'], ['700', 'Bold'], ['900', 'Black']]],
      ['color', 'Text color', 'color'], ['opacity', 'Text opacity', 'range', '%', 1],
      ['letterSpacing', 'Letter spacing', 'range', 'px', .1],
      ['wordSpacing', 'Word spacing', 'range', 'px', .5],
      ['lineHeight', 'Line height', 'range', '×', .05], ['italic', 'Italic', 'checkbox']
    ],
    effects: [
      ['backgroundColor', 'Background color', 'color'],
      ['backgroundOpacity', 'Background opacity', 'range', '%', 1],
      ['paddingX', 'Horizontal padding', 'range', 'px', 1],
      ['paddingY', 'Vertical padding', 'range', 'px', 1],
      ['radius', 'Corner radius', 'range', 'px', 1],
      ['outlineWidth', 'Text outline', 'range', 'px', .25], ['outlineColor', 'Outline color', 'color'],
      ['shadowBlur', 'Shadow blur', 'range', 'px', 1], ['shadowY', 'Shadow offset', 'range', 'px', 1], ['shadowColor', 'Shadow color', 'color']
    ],
    layout: [
      ['overlayControls', 'Playback overlay controls', 'checkbox'],
      ['offsetY', 'Vertical offset · up', 'range', 'px', 1], ['offsetX', 'Horizontal offset · right', 'range', 'px', 1],
      ['maxWidth', 'Maximum subtitle width', 'range', '%', 1],
      ['textAlign', 'Text alignment', 'select', [['left', 'Left'], ['center', 'Center'], ['right', 'Right']]]
    ]
  };
  function element(tag, props = {}) { return Object.assign(document.createElement(tag), props); }
  function buildControls() {
    for (const [tab, fields] of Object.entries(specs)) {
      for (const [key, title, kind, unit, step] of fields) {
        const label = element('label', { className: 'field', htmlFor: key });
        if (kind === 'range') {
          const header = element('span', { className: 'field-header' });
          header.append(element('span', { textContent: title }));
          const box = element('span', { className: 'number-wrap' });
          const number = element('input', { type: 'number', id: key + '-number', min: S.ranges[key][0], max: S.ranges[key][1], step, ariaLabel: title + ' value' });
          box.append(number, element('span', { textContent: unit })); header.append(box);
          const range = element('input', { type: 'range', id: key, min: number.min, max: number.max, step });
          label.append(header, range);
          for (const input of [number, range]) input.addEventListener('input', () => {
            if (input.value === '') return;
            update(key, Number(input.value));
            number.value = range.value = settings[key];
          });
        } else if (kind === 'color') {
          label.className += ' color-field';
          label.append(element('span', { textContent: title }));
          const box = element('div');
          const color = element('input', { type: 'color', id: key, ariaLabel: title });
          const hex = element('input', { type: 'text', id: key + '-hex', maxLength: 7, ariaLabel: title + ' hex', pattern: '#[a-fA-F0-9]{6}' });
          color.addEventListener('input', () => { update(key, color.value); hex.value = color.value; });
          hex.addEventListener('input', () => {
            hex.setCustomValidity(/^#[a-f\d]{6}$/i.test(hex.value) ? '' : 'Enter a six-digit hex color, such as #ffffff.');
            if (hex.checkValidity()) { update(key, hex.value); color.value = settings[key]; }
          });
          box.append(hex, color); label.append(box);
        } else {
          label.append(element('span', { textContent: title }));
          let input;
          if (kind === 'select') {
            input = element('select', { id: key });
            for (const [value, text] of unit) input.append(element('option', { value, textContent: text }));
          } else if (kind === 'checkbox') {
            label.className = 'toggle-field';
            input = element('input', { id: key, type: 'checkbox' });
          } else {
            input = element('input', { id: key, type: 'text' });
            input.setAttribute('list', 'fonts');
            const list = element('datalist', { id: 'fonts' });
            for (const font of ['Arial, sans-serif', 'Verdana, sans-serif', 'Georgia, serif', 'Tahoma, sans-serif', 'Trebuchet MS, sans-serif', 'Helvetica, sans-serif', 'monospace']) list.append(element('option', { value: font }));
            label.append(list);
          }
          input.addEventListener('input', () => update(key, kind === 'checkbox' ? input.checked : input.value));
          label.append(input);
        }
        $(tab + '-controls').append(label);
      }
    }
  }
  function draw() {
    for (const [key, value] of Object.entries(settings)) {
      const input = $(key);
      if (!input) continue;
      if (input.type === 'checkbox') input.checked = value;
      else input.value = value;
      if ($(key + '-number')) $(key + '-number').value = value;
      if ($(key + '-hex')) { $(key + '-hex').value = value; $(key + '-hex').setCustomValidity(''); }
    }
    preview();
  }
  function preview() {
    let style = $('preview-style');
    if (!style) { style = element('style', { id: 'preview-style' }); document.head.append(style); }
    // Keep the preview readable inside a popup; placement is shown on the video.
    style.textContent = S.compile({ ...settings, offsetX: 0, offsetY: 0 }, '#preview-root#preview-root');
    $('size-hint').textContent = settings.autoScale ? 'Auto size is on. Font size is measured at 1280px video width; text and effects adapt to the page or PiP video, with a 12px minimum.' : 'Fixed pixel size. Enable auto size to adapt subtitles when the page or PiP window resizes.';
    $('css-error').textContent = S.customDeclarations(settings.customCSS).error;
    document.body.classList.toggle('disabled', !settings.enabled);
    document.querySelectorAll('[data-preset]').forEach(b => b.classList.toggle('active', b.dataset.preset === presetName));
  }
  function persist() {
    $('save-status').textContent = 'Saving…';
    const snapshot = { ...settings };
    // Serialize writes so a slower earlier change never overwrites a newer one.
    queue = queue.catch(() => {}).then(() => chrome.storage.local.set({ subtitleStudio: snapshot }));
    const current = queue;
    current.then(() => { if (queue === current) $('save-status').textContent = 'Saved on this device'; })
      .catch(() => { $('save-status').textContent = 'Could not save. Try again.'; });
  }
  function update(key, value) {
    settings = S.normalize({ ...settings, [key]: value }); presetName = ''; preview(); persist();
  }
  async function status() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!/^https:\/\/([^/]+\.)?hotstar\.com\//.test(tab?.url || '')) {
        $('status').textContent = 'Open a video on hotstar.com to apply your style.'; return;
      }
      const response = await chrome.tabs.sendMessage(tab.id, { type: 'subtitle-studio-status' });
      $('status').textContent = response?.detected ? '● Subtitle player detected · changes apply live' : 'Hotstar connected · turn on captions in the player.';
      activeTabId = tab.id;
      $('pip').disabled = !response?.pip?.supported;
      if (response?.pip?.open) $('pip-label').textContent = 'Return video from picture-in-picture';
      if (!response?.pip?.supported) $('pip-status').textContent = 'Subtitle PiP needs desktop Chrome. After updating the extension, refresh Hotstar.';
    } catch {
      $('status').textContent = 'Refresh the Hotstar tab once after installing, then turn on captions.';
    }
  }
  async function init() {
    buildControls();
    try { settings = S.normalize((await chrome.storage.local.get('subtitleStudio')).subtitleStudio); }
    catch { $('save-status').textContent = 'Could not load saved style.'; }
    draw(); status();
    $('pip').addEventListener('click', async () => {
      if (!activeTabId) return;
      $('pip').disabled = true;
      $('pip-status').textContent = 'Opening picture-in-picture…';
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: activeTabId },
          func: async () => globalThis.SubtitleStudioPiP
            ? globalThis.SubtitleStudioPiP.toggle()
            : { ok: false, error: 'Refresh Hotstar after reloading the extension, then try again.' }
        });
        const result = results[0]?.result;
        if (!result?.ok) throw new Error(result?.error || 'Could not open subtitle PiP.');
        $('pip-label').textContent = result.open ? 'Return video from picture-in-picture' : 'Picture-in-picture with subtitles';
        $('pip-status').textContent = result.open ? 'PiP is open. Close it to return the video to Hotstar.' : 'Video returned to Hotstar.';
      } catch (error) { $('pip-status').textContent = error.message || 'Could not open subtitle PiP. Refresh Hotstar and try again.'; }
      finally { $('pip').disabled = false; }
    });
    $('enabled').addEventListener('change', e => update('enabled', e.target.checked));
    $('customCSS').addEventListener('input', e => update('customCSS', e.target.value));
    $('sampleText').addEventListener('input', e => { $('preview-text').textContent = e.target.value || 'What do you need?'; });
    document.querySelectorAll('[data-tab]').forEach(button => button.addEventListener('click', () => {
      document.querySelectorAll('[data-tab]').forEach(b => b.setAttribute('aria-selected', String(b === button)));
      document.querySelectorAll('.panel').forEach(p => { p.hidden = p.id !== button.dataset.tab; });
    }));
    document.querySelectorAll('[data-preset]').forEach(button => button.addEventListener('click', () => {
      settings = { ...S.presets[button.dataset.preset], enabled: settings.enabled, autoScale: settings.autoScale, overlayControls: settings.overlayControls };
      presetName = button.dataset.preset; draw(); persist();
    }));
    $('reset').addEventListener('click', () => { settings = { ...S.defaults }; presetName = 'balanced'; draw(); persist(); });
    $('export').addEventListener('click', () => {
      const url = URL.createObjectURL(new Blob([JSON.stringify({ version: 1, settings }, null, 2)], { type: 'application/json' }));
      const a = element('a', { href: url, download: 'hotstar-subtitle-style.json' }); a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
    $('import').addEventListener('click', () => $('import-file').click());
    $('import-file').addEventListener('change', async e => {
      try {
        const file = e.target.files[0]; if (!file) return;
        if (file.size > 64000) throw new Error('File too large');
        const data = JSON.parse(await file.text());
        if (data.version !== 1 || !data.settings || typeof data.settings !== 'object' || Array.isArray(data.settings)) throw new Error('Invalid style');
        settings = S.normalize(data.settings); presetName = ''; draw(); persist();
      } catch { $('save-status').textContent = 'Import failed. Choose a Subtitle Studio JSON export.'; }
      e.target.value = '';
    });
  }
  init();
})();
