// Nav.jsx — sticky top navigation with language shifter (Google Translate).
// The shifter auto-detects the visitor's browser language on first load and
// drives a hidden Google Translate widget under the hood.

function LangShifter() {
  const LANGUAGES = [{
    code: 'en',
    label: 'English',
    short: 'EN',
    region: 'GB'
  }, {
    code: 'es',
    label: 'Español',
    short: 'ES',
    region: 'ES'
  }, {
    code: 'fr',
    label: 'Français',
    short: 'FR',
    region: 'FR'
  }, {
    code: 'de',
    label: 'Deutsch',
    short: 'DE',
    region: 'DE'
  }, {
    code: 'it',
    label: 'Italiano',
    short: 'IT',
    region: 'IT'
  }, {
    code: 'pt',
    label: 'Português',
    short: 'PT',
    region: 'PT'
  }, {
    code: 'nl',
    label: 'Nederlands',
    short: 'NL',
    region: 'NL'
  }, {
    code: 'pl',
    label: 'Polski',
    short: 'PL',
    region: 'PL'
  }, {
    code: 'ru',
    label: 'Русский',
    short: 'RU',
    region: 'RU'
  }, {
    code: 'zh-CN',
    label: '中文',
    short: 'ZH',
    region: 'CN'
  }, {
    code: 'ja',
    label: '日本語',
    short: 'JA',
    region: 'JP'
  }, {
    code: 'ko',
    label: '한국어',
    short: 'KO',
    region: 'KR'
  }, {
    code: 'ar',
    label: 'العربية',
    short: 'AR',
    region: 'SA'
  }, {
    code: 'hi',
    label: 'हिन्दी',
    short: 'HI',
    region: 'IN'
  }, {
    code: 'tr',
    label: 'Türkçe',
    short: 'TR',
    region: 'TR'
  }, {
    code: 'sv',
    label: 'Svenska',
    short: 'SV',
    region: 'SE'
  }];

  // Auto-detect on first render from saved pref → cookie → navigator.language.
  const detectInitial = () => {
    try {
      const saved = localStorage.getItem('sa-lang');
      if (saved && LANGUAGES.find(l => l.code === saved)) return saved;
    } catch (e) {}
    const nav = typeof navigator !== 'undefined' && (navigator.language || navigator.userLanguage) || 'en';
    const base = nav.toLowerCase();
    const match = LANGUAGES.find(l => base === l.code.toLowerCase() || base.startsWith(l.code.toLowerCase() + '-') || base.split('-')[0] === l.code.toLowerCase().split('-')[0]);
    return match ? match.code : 'en';
  };
  const [lang, setLang] = React.useState(detectInitial);
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);

  // Inject Google Translate widget once.
  React.useEffect(() => {
    if (document.getElementById('sa-gt-script')) return;
    window.googleTranslateElementInit = function () {
      try {
        new window.google.translate.TranslateElement({
          pageLanguage: 'en',
          includedLanguages: LANGUAGES.map(l => l.code).join(','),
          autoDisplay: false,
          layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE
        }, 'google_translate_element');
      } catch (e) {}
    };
    const s = document.createElement('script');
    s.id = 'sa-gt-script';
    s.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    s.async = true;
    document.body.appendChild(s);
  }, []);

  // Apply the chosen language to the GT widget (with retry until it's ready).
  React.useEffect(() => {
    try {
      localStorage.setItem('sa-lang', lang);
    } catch (e) {}
    let attempts = 0;
    const apply = () => {
      const sel = document.querySelector('.goog-te-combo');
      if (sel) {
        if (sel.value !== (lang === 'en' ? '' : lang)) {
          sel.value = lang === 'en' ? '' : lang;
          sel.dispatchEvent(new Event('change'));
        }
        return;
      }
      if (attempts++ < 30) setTimeout(apply, 200);
    };
    apply();
  }, [lang]);

  // Close the menu on outside click.
  React.useEffect(() => {
    if (!open) return;
    const onClick = e => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);
  const current = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0];
  return /*#__PURE__*/React.createElement("div", {
    className: "lang-shifter",
    ref: ref
  }, /*#__PURE__*/React.createElement("div", {
    id: "google_translate_element",
    style: {
      position: 'absolute',
      left: -9999,
      top: -9999,
      height: 0,
      overflow: 'hidden'
    }
  }), /*#__PURE__*/React.createElement("button", {
    className: "lang-shifter__btn",
    "aria-label": "Change language",
    "aria-expanded": open,
    onClick: () => setOpen(!open),
    translate: "no"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M3 12h18"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 3a13 13 0 0 1 0 18"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 3a13 13 0 0 0 0 18"
  })), /*#__PURE__*/React.createElement("span", null, current.short), /*#__PURE__*/React.createElement("svg", {
    width: "10",
    height: "10",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.5",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("path", {
    d: "m6 9 6 6 6-6"
  }))), open && /*#__PURE__*/React.createElement("div", {
    className: "lang-shifter__menu",
    translate: "no"
  }, LANGUAGES.map(l => /*#__PURE__*/React.createElement("button", {
    key: l.code,
    className: `lang-shifter__opt ${l.code === lang ? 'is-active' : ''}`,
    onClick: () => {
      setLang(l.code);
      setOpen(false);
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "lang-shifter__short"
  }, l.short), /*#__PURE__*/React.createElement("span", {
    className: "lang-shifter__label"
  }, l.label)))));
}
function Nav() {
  const [open, setOpen] = React.useState(false);
  const links = [{
    l: 'Home',
    href: 'index.html'
  }, {
    l: 'About',
    href: 'about.html'
  }, {
    l: 'Champions',
    href: 'champions.html'
  }, {
    l: 'Team',
    href: 'teams.html'
  }, {
    l: 'Schedule',
    href: 'schedule.html'
  }, {
    l: 'Media',
    href: 'media.html'
  }, {
    l: 'Sponsors',
    href: 'sponsors.html'
  }, {
    l: 'Contact',
    href: 'contact.html'
  }];
  // Also light up grouped tabs when on legacy direct-link pages.
  const aliasMatch = h => {
    if (h === 'schedule.html' && (current === 'fixtures.html' || current === 'results.html' || current === 'table.html')) return true;
    if (h === 'media.html' && (current === 'news.html' || current === 'gallery.html')) return true;
    return false;
  };
  const current = (typeof window !== 'undefined' ? window.location.pathname.split('/').pop() : 'index.html') || 'index.html';
  const isActive = h => h === current || current === '' && h === 'index.html' || aliasMatch(h);
  return /*#__PURE__*/React.createElement("header", {
    className: "nav",
    translate: "no"
  }, /*#__PURE__*/React.createElement("div", {
    className: "nav__inner"
  }, /*#__PURE__*/React.createElement("a", {
    href: "index.html",
    className: "nav__brand"
  }, /*#__PURE__*/React.createElement("img", {
    src: "assets/badge/sue-angels-shield.png",
    alt: "Sue's Angels FC",
    style: {
      width: 'auto',
      height: 44
    }
  }), /*#__PURE__*/React.createElement("span", {
    className: "nav__wordmark"
  }, "SUE\u2019S ANGELS", /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--volt)'
    }
  }, "\xB7"), "FC")), /*#__PURE__*/React.createElement("nav", {
    className: "nav__links"
  }, links.map(it => /*#__PURE__*/React.createElement("a", {
    key: it.l,
    href: it.href,
    className: `nav__link ${isActive(it.href) ? 'is-active' : ''}`
  }, it.l))), /*#__PURE__*/React.createElement("div", {
    className: "nav__actions"
  }, /*#__PURE__*/React.createElement(LangShifter, null), /*#__PURE__*/React.createElement("a", {
    href: "join.html",
    className: "btn btn--volt btn--sm"
  }, "Join the club"), /*#__PURE__*/React.createElement("button", {
    className: "nav__burger",
    "aria-label": "Menu",
    onClick: () => setOpen(!open)
  }, /*#__PURE__*/React.createElement("span", null), /*#__PURE__*/React.createElement("span", null), /*#__PURE__*/React.createElement("span", null)))), open && /*#__PURE__*/React.createElement("div", {
    className: "nav__drawer"
  }, links.map(it => /*#__PURE__*/React.createElement("a", {
    key: it.l,
    href: it.href,
    onClick: () => setOpen(false),
    className: isActive(it.href) ? 'is-active' : ''
  }, it.l)), /*#__PURE__*/React.createElement("a", {
    href: "join.html",
    className: "btn btn--volt",
    style: {
      marginTop: 14,
      justifyContent: 'center'
    },
    onClick: () => setOpen(false)
  }, "Join the club \u2192")));
}
window.Nav = Nav;
window.LangShifter = LangShifter;
