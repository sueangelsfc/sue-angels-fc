// Statement.jsx — oversized brand statement with tweakable variants.
function Statement() {
  const [variant, setVariant] = React.useState(() => document.body.dataset.statement || 'echoes');
  React.useEffect(() => {
    const obs = new MutationObserver(() => setVariant(document.body.dataset.statement || 'echoes'));
    obs.observe(document.body, { attributes: true, attributeFilter: ['data-statement'] });
    return () => obs.disconnect();
  }, []);

  const content = {
    echoes: {
      eyebrow: '',
      lines: ['WHAT WE DO', 'IN LIFE', '__ECHOES__ IN', 'ETERNITY.'],
      sig: 'SUE’S ANGELS FC · EST. 2025',
    },
    matchday: {
      eyebrow: 'MATCHDAY',
      lines: ['EVERY SUNDAY,', 'EVERY SHIRT,', 'EVERY __MINUTE__', 'COUNTS.'],
      sig: 'SUNDAYS · 11:00 KO · THE REEVES SPORTS CLUB',
    },
    badge: {
      eyebrow: 'THE BADGE',
      lines: ['ONE BADGE.', 'ONE __CITY__.', 'ONE STANDARD.'],
      sig: 'BUILT IN HACKNEY · WORN WITH PRIDE',
    },
  }[variant] || {
    eyebrow: 'THE CLUB', lines: ['MORE THAN A', 'FOOTBALL __CLUB__.'], sig: 'SUE’S ANGELS FC',
  };

  return (
    <section id="about" className="section statement">
      <div className="container">
        {content.eyebrow ? <div className="t-eyebrow">{content.eyebrow}</div> : null}
        <p className="statement__quote">
          {content.lines.map((line, i) => {
            const parts = line.split(/__(.+?)__/);
            return (
              <React.Fragment key={i}>
                {parts.map((p, j) => j % 2 === 1 ? <em key={j}>{p}</em> : <React.Fragment key={j}>{p}</React.Fragment>)}
                {i < content.lines.length - 1 && <br />}
              </React.Fragment>
            );
          })}
        </p>
        <div className="statement__sig">
          <span className="statement__rule" />
          <span className="t-meta">{content.sig}</span>
        </div>
      </div>
    </section>
  );
}

window.Statement = Statement;
