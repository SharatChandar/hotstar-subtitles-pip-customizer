/* Shared, dependency-free settings and CSS compiler. */
(() => {
  const defaults = {
    enabled: true, autoScale: false, overlayControls: true, fontSize: 32, fontFamily: 'Arial, sans-serif', fontWeight: '500',
    color: '#ffffff', opacity: 100, italic: false, letterSpacing: 0,
    wordSpacing: 0, lineHeight: 1.3, textAlign: 'center',
    backgroundColor: '#000000', backgroundOpacity: 0, paddingX: 8, paddingY: 3,
    radius: 4, outlineWidth: 1, outlineColor: '#000000',
    shadowBlur: 4, shadowY: 2, shadowColor: '#000000',
    offsetX: 0, offsetY: 0, maxWidth: 90, customCSS: ''
  };
  const ranges = {
    fontSize: [10, 120], opacity: [0, 100], letterSpacing: [-3, 15],
    wordSpacing: [-5, 30], lineHeight: [0.8, 3], backgroundOpacity: [0, 100],
    paddingX: [0, 60], paddingY: [0, 30], radius: [0, 40], outlineWidth: [0, 5],
    shadowBlur: [0, 30], shadowY: [-15, 15], offsetX: [-500, 500],
    offsetY: [-200, 500], maxWidth: [20, 100]
  };
  const presets = {
    balanced: { ...defaults },
    cinema: { ...defaults, fontSize: 30, fontFamily: 'Georgia, serif', outlineWidth: 0, shadowBlur: 6, shadowY: 2 },
    readable: { ...defaults, fontSize: 40, fontWeight: '700', backgroundOpacity: 80, paddingX: 16, paddingY: 8, outlineWidth: 0, lineHeight: 1.5 },
    yellow: { ...defaults, color: '#ffe36e', fontWeight: '700', outlineWidth: 1.5, shadowBlur: 3 }
  };
  function normalize(raw = {}) {
    if (!raw || typeof raw !== 'object') raw = {};
    const result = { ...defaults };
    for (const key of Object.keys(defaults)) {
      const value = raw[key];
      if (key in ranges && Number.isFinite(Number(value)) && value !== null && value !== '') {
        result[key] = Math.min(ranges[key][1], Math.max(ranges[key][0], Number(value)));
      } else if (typeof defaults[key] === 'boolean' && typeof value === 'boolean') result[key] = value;
      else if (typeof defaults[key] === 'string' && typeof value === 'string') result[key] = value;
    }
    for (const key of ['color', 'backgroundColor', 'outlineColor', 'shadowColor']) {
      if (!/^#[\da-f]{6}$/i.test(result[key])) result[key] = defaults[key];
    }
    if (!['left', 'center', 'right'].includes(result.textAlign)) result.textAlign = 'center';
    if (!/^[1-9]00$/.test(result.fontWeight)) result.fontWeight = defaults.fontWeight;
    result.customCSS = result.customCSS.slice(0, 12000);
    return result;
  }
  function rgba(hex, alpha) {
    return `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${alpha / 100})`;
  }
  function customDeclarations(source) {
    // Parse declarations, never interpolate user input into a stylesheet rule.
    if (/[{}<>]|url\s*\(|@import|expression\s*\(/i.test(source)) return { css: '', error: 'Use CSS declarations only; selectors, URLs and imports are not supported.' };
    const style = document.createElement('span').style;
    style.cssText = source;
    const declarations = Array.from(style).map(key => `${key}: ${style.getPropertyValue(key)} !important;`).join('\n');
    return { css: declarations, error: source.trim() && !declarations ? 'No valid CSS declarations found.' : '' };
  }
  function videoViewport(container, video) {
    const rect = container?.getBoundingClientRect();
    return { width: rect?.width || 1280, height: rect?.height || 720, aspectRatio: video?.videoWidth && video?.videoHeight ? video.videoWidth / video.videoHeight : 16 / 9 };
  }
  function scaled(raw, viewport) {
    const s = normalize(raw);
    if (!s.autoScale || !viewport) return s;
    // Use the fitted video width, so letterboxing and short windows also count.
    const width = Math.min(viewport.width, viewport.height * (viewport.aspectRatio || 16 / 9));
    if (!Number.isFinite(width) || width <= 0) return s;
    const size = Math.min(120, Math.max(12, s.fontSize * width / 1280));
    const ratio = size / s.fontSize;
    s.fontSize = size;
    for (const key of ['letterSpacing', 'wordSpacing', 'paddingX', 'paddingY', 'radius', 'outlineWidth', 'shadowBlur', 'shadowY', 'offsetX', 'offsetY']) s[key] *= ratio;
    return s;
  }
  function compile(raw, selector, viewport) {
    const s = scaled(raw, viewport);
    if (!s.enabled) return '';
    const family = document.createElement('span').style;
    family.fontFamily = s.fontFamily;
    const font = family.fontFamily || defaults.fontFamily;
    const text = `font-size:${s.fontSize}px!important;font-family:${font}!important;font-weight:${s.fontWeight}!important;font-style:${s.italic ? 'italic' : 'normal'}!important;color:${s.color}!important;letter-spacing:${s.letterSpacing}px!important;word-spacing:${s.wordSpacing}px!important;line-height:${s.lineHeight}!important;text-align:${s.textAlign}!important;text-shadow:0 ${s.shadowY}px ${s.shadowBlur}px ${s.shadowColor}!important;-webkit-text-stroke:${s.outlineWidth}px ${s.outlineColor}!important;`;
    return `${selector}{${text}opacity:${s.opacity / 100}!important;position:relative!important;width:100%!important;max-width:${s.maxWidth}%!important;transform:translate(${s.offsetX}px,calc(${-s.offsetY}px - var(--subtitle-studio-controls-inset,0px)))!important;pointer-events:none!important;}
      ${selector} *{${text}}
      ${selector}>div{background-color:${rgba(s.backgroundColor, s.backgroundOpacity)}!important;padding:${s.paddingY}px ${s.paddingX}px!important;border-radius:${s.radius}px!important;box-sizing:border-box!important;width:max-content!important;max-width:100%!important;white-space:pre-wrap!important;align-items:${s.textAlign === 'left' ? 'flex-start' : s.textAlign === 'right' ? 'flex-end' : 'center'}!important;}
      ${selector} span{background-color:transparent!important;max-width:100%!important;white-space:pre-wrap!important;overflow-wrap:break-word!important;}
      ${selector}>div,${selector} span{${customDeclarations(s.customCSS).css}}`;
  }
  globalThis.SubtitleStudio = { defaults, ranges, presets, normalize, compile, customDeclarations, videoViewport, scaled };
})();
