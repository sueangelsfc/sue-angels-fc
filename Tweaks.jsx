// Tweaks.jsx — exposes a curated set of brand tweaks for Sue's Angels FC.
// Reads TWEAK_DEFAULTS from window (set in the host HTML's EDITMODE block).
function SueTweaks() {
  const defaults = window.TWEAK_DEFAULTS || {
    accent: '#D6F23A',
    surface: '#03121C',
    densityComfy: false,
    showCountdown: true,
    statementVariant: 'echoes',
    heroGlow: true,
  };
  const [t, setTweak] = window.useTweaks(defaults);

  // Apply CSS variable overrides live.
  React.useEffect(() => {
    const r = document.documentElement.style;
    r.setProperty('--volt', t.accent);
    // Derive related accent variants from accent.
    r.setProperty('--volt-glow', t.accent);
    r.setProperty('--hairline-volt', hexA(t.accent, 0.32));
    r.setProperty('--bg', t.surface);
    r.setProperty('--surface-1', mix(t.surface, '#FFFFFF', 0.04));
    r.setProperty('--surface-2', mix(t.surface, '#FFFFFF', 0.07));
    r.setProperty('--surface-3', mix(t.surface, '#FFFFFF', 0.10));
    document.body.classList.toggle('is-comfy', !!t.densityComfy);
    document.body.classList.toggle('no-glow', !t.heroGlow);
    document.body.dataset.countdown = t.showCountdown ? 'on' : 'off';
    document.body.dataset.statement = t.statementVariant;
  }, [t]);

  return (
    <window.TweaksPanel>
      <window.TweakSection label="Brand" />
      <window.TweakColor
        label="Accent"
        value={t.accent}
        options={['#D6F23A', '#C8FF00', '#FFB300', '#FF4D7E', '#22D3EE']}
        onChange={(v) => setTweak('accent', v)}
      />
      <window.TweakColor
        label="Stage surface"
        value={t.surface}
        options={['#03121C', '#0A0F1C', '#0E1B12', '#16121F', '#000000']}
        onChange={(v) => setTweak('surface', v)}
      />

      <window.TweakSection label="Hero" />
      <window.TweakToggle
        label="Live countdown"
        value={t.showCountdown}
        onChange={(v) => setTweak('showCountdown', v)}
      />
      <window.TweakToggle
        label="Volt glow + scanlines"
        value={t.heroGlow}
        onChange={(v) => setTweak('heroGlow', v)}
      />

      <window.TweakSection label="Statement" />
      <window.TweakRadio
        label="Variant"
        value={t.statementVariant}
        options={['echoes', 'matchday', 'badge']}
        onChange={(v) => setTweak('statementVariant', v)}
      />

      <window.TweakSection label="Density" />
      <window.TweakToggle
        label="Comfy spacing"
        value={t.densityComfy}
        onChange={(v) => setTweak('densityComfy', v)}
      />
    </window.TweaksPanel>
  );

  // Small helpers
  function hexA(hex, a) {
    const m = hex.replace('#', '');
    const r = parseInt(m.slice(0,2),16), g = parseInt(m.slice(2,4),16), b = parseInt(m.slice(4,6),16);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
  function mix(a, b, w) {
    const A = a.replace('#',''), B = b.replace('#','');
    const ar = parseInt(A.slice(0,2),16), ag = parseInt(A.slice(2,4),16), ab = parseInt(A.slice(4,6),16);
    const br = parseInt(B.slice(0,2),16), bg = parseInt(B.slice(2,4),16), bb = parseInt(B.slice(4,6),16);
    const r = Math.round(ar + (br-ar)*w), g = Math.round(ag + (bg-ag)*w), bl = Math.round(ab + (bb-ab)*w);
    return '#' + [r,g,bl].map(n => n.toString(16).padStart(2,'0')).join('');
  }
}

window.SueTweaks = SueTweaks;
