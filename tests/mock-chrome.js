(() => {
  const listeners = [];
  let stored = {};
  window.chrome = {
    storage: {
      local: {
        get: async () => ({ subtitleStudio: stored.subtitleStudio }),
        set: async data => {
          const old = stored.subtitleStudio; stored = { ...stored, ...data };
          for (const listener of listeners) listener({ subtitleStudio: { oldValue: old, newValue: data.subtitleStudio } }, 'local');
        }
      },
      onChanged: { addListener: listener => listeners.push(listener) }
    },
    runtime: { onMessage: { addListener: listener => { window.statusListener = listener; } } },
    tabs: { query: async () => [{ id: 1, url: 'https://www.hotstar.com/test' }], sendMessage: async () => ({ detected: true, pip: { supported: true, open: false } }) },
    scripting: { executeScript: async () => [{ result: { ok: false, error: 'UI preview only. Test real PiP on tests/pip.html.' } }] }
  };
})();
