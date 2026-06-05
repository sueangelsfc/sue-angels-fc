// ClaudeClient.jsx — polyfills `window.claude.complete` for production.
//
// Inside Claude's design preview, `window.claude.complete(prompt)` already
// exists and is provided by the host. In production (Vercel / Netlify) it
// doesn't — so we install a shim that POSTs to our serverless endpoint and
// returns the same shape (a string of the completion text).
//
// We only install the shim when it isn't already defined, so this is a no-op
// inside Claude's preview and a working bridge in production.

(function installClaudeShim() {
  if (typeof window === 'undefined') return;

  // If window.claude.complete already exists (Claude preview), don't touch it.
  if (window.claude && typeof window.claude.complete === 'function') return;

  window.claude = window.claude || {};
  window.claude.complete = async function (prompt, opts) {
    const endpoint = '/api/claude';
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          model: (opts && opts.model) || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.text().catch(() => 'unknown');
        throw new Error(`Claude proxy ${res.status}: ${err}`);
      }
      const json = await res.json();
      return json.completion || '';
    } catch (e) {
      // Surface a useful console error and rethrow so the caller can display it.
      console.error('[ClaudeClient] complete() failed:', e);
      throw e;
    }
  };
})();
