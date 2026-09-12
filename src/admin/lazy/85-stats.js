/* ==========================================================================
   CONTROL PANEL: WEBSITE STATS

   The club publishes 108 pages and had no way of knowing which of them
   anybody opens. This is that screen: what gets read, when, where in the
   world the readers are, what sent them, what they read it on, how long they
   stayed and how far down they got.

   IT COUNTS VIEWS, NOT VISITORS, AND SAYS SO
   There is no identifier anywhere in this feature - no cookie, no session, no
   address - so two views cannot be told apart and "unique visitors" is a
   number this cannot honestly produce. Every heading here says views. A
   screen quietly implying uniques would be the more flattering lie.

   WHERE IN THE WORLD IS A TIME ZONE
   `page_stats` stores what the browser already knew, "Europe/London", and the
   mapping to a country happens HERE rather than in the beacon: the map is a
   hundred-odd entries read by one screen, and putting it in sa.js would ship
   it to every visitor of every page to serve this one. That is the same rule
   that moved homeBands out of control-seed.js.

   The map is deliberately partial. An unknown zone falls back to its region -
   "Asia", "America" - because a reader in an unmapped zone is better reported
   as a continent than dropped, and better than guessed at.

   THE WORLD MAP IS DATA, NOT A PICTURE, AND CARRIES NO LIBRARY
   A stats screen is where somebody is most tempted to add a charting
   dependency. MAP_GRID is a 150x64 bitmap of where land is, rasterised once
   from Natural Earth's 110m land outline and stored as 1,600 characters of
   base64: one path element of round-capped dots draws it, and the bubbles are
   circles at the projected centroid of each country. Everything else on this
   screen - the trend, the heatmap, the profile - is inline SVG built from the
   figures for the same reason.

   IT NEVER MEASURES THE PAGE. No getBoundingClientRect, no getComputedStyle,
   no canvas: every chart here is sized in its own viewBox coordinates and
   scaled by CSS, so the whole screen renders correctly in the suite's DOM,
   which has neither layout nor a cascade and throws rather than inventing
   them.

   IT KNOWS WHAT THE SITE PUBLISHES, NOT ONLY WHAT WAS READ
   `/stats-pages.json` is written by the build: every route, its real title,
   what kind of page it is, and the day a match was played or an article went
   up. Traffic alone cannot answer two of the most useful questions - what a
   page is CALLED, and which pages nobody opened, because a page with no views
   leaves no row to count. It is fetched by this screen and by nothing else,
   and the screen draws every figure without it if the fetch fails.

   NOTHING HERE IS PUBLISHED. It is the club looking at its own website, which
   is why this section makes no `where:` claim and is named in the suite's
   PUBLISHES_NOTHING list.
   ========================================================================== */
(function () {
  'use strict';
  var CP = window.CP;
  var M = window.CPM;
  var U = window.CPU;
  var esc = U.esc;
  var sec = U.sec;
  var table = U.table;
  var toast = U.toast;

  /* ---- Time zone to country -------------------------------------------
     Covers the zones real traffic arrives on. Anything not here becomes its
     region, which is why the list can stay this size without lying. */
  var ZONES = {
    'Europe/London': 'United Kingdom', 'Europe/Belfast': 'United Kingdom',
    'Europe/Dublin': 'Ireland', 'Europe/Lisbon': 'Portugal',
    'Europe/Madrid': 'Spain', 'Atlantic/Canary': 'Spain',
    'Europe/Paris': 'France', 'Europe/Brussels': 'Belgium',
    'Europe/Amsterdam': 'Netherlands', 'Europe/Berlin': 'Germany',
    'Europe/Zurich': 'Switzerland', 'Europe/Vienna': 'Austria',
    'Europe/Rome': 'Italy', 'Europe/Malta': 'Malta',
    'Europe/Athens': 'Greece', 'Europe/Istanbul': 'Turkey',
    'Europe/Copenhagen': 'Denmark', 'Europe/Oslo': 'Norway',
    'Europe/Stockholm': 'Sweden', 'Europe/Helsinki': 'Finland',
    'Europe/Warsaw': 'Poland', 'Europe/Prague': 'Czechia',
    'Europe/Budapest': 'Hungary', 'Europe/Bucharest': 'Romania',
    'Europe/Sofia': 'Bulgaria', 'Europe/Kyiv': 'Ukraine',
    'Europe/Kiev': 'Ukraine', 'Europe/Moscow': 'Russia',
    'Europe/Zagreb': 'Croatia', 'Europe/Belgrade': 'Serbia',
    'Europe/Luxembourg': 'Luxembourg', 'Europe/Vilnius': 'Lithuania',
    'Europe/Riga': 'Latvia', 'Europe/Tallinn': 'Estonia',
    'Europe/Reykjavik': 'Iceland',
    'America/New_York': 'United States', 'America/Chicago': 'United States',
    'America/Denver': 'United States', 'America/Phoenix': 'United States',
    'America/Los_Angeles': 'United States', 'America/Anchorage': 'United States',
    'Pacific/Honolulu': 'United States', 'America/Detroit': 'United States',
    'America/Toronto': 'Canada', 'America/Vancouver': 'Canada',
    'America/Edmonton': 'Canada', 'America/Winnipeg': 'Canada',
    'America/Halifax': 'Canada', 'America/Mexico_City': 'Mexico',
    'America/Bogota': 'Colombia', 'America/Lima': 'Peru',
    'America/Santiago': 'Chile', 'America/Buenos_Aires': 'Argentina',
    'America/Argentina/Buenos_Aires': 'Argentina',
    'America/Sao_Paulo': 'Brazil', 'America/Jamaica': 'Jamaica',
    'America/Port_of_Spain': 'Trinidad and Tobago',
    'America/Havana': 'Cuba', 'America/Panama': 'Panama',
    'Africa/Lagos': 'Nigeria', 'Africa/Accra': 'Ghana',
    'Africa/Nairobi': 'Kenya', 'Africa/Kampala': 'Uganda',
    'Africa/Dar_es_Salaam': 'Tanzania', 'Africa/Addis_Ababa': 'Ethiopia',
    'Africa/Johannesburg': 'South Africa', 'Africa/Cairo': 'Egypt',
    'Africa/Casablanca': 'Morocco', 'Africa/Algiers': 'Algeria',
    'Africa/Tunis': 'Tunisia', 'Africa/Kinshasa': 'DR Congo',
    'Africa/Lubumbashi': 'DR Congo', 'Africa/Luanda': 'Angola',
    'Africa/Abidjan': "Côte d'Ivoire", 'Africa/Dakar': 'Senegal',
    'Africa/Harare': 'Zimbabwe', 'Africa/Lusaka': 'Zambia',
    'Asia/Dubai': 'United Arab Emirates', 'Asia/Qatar': 'Qatar',
    'Asia/Riyadh': 'Saudi Arabia', 'Asia/Kuwait': 'Kuwait',
    'Asia/Jerusalem': 'Israel', 'Asia/Tehran': 'Iran',
    'Asia/Karachi': 'Pakistan', 'Asia/Kolkata': 'India',
    'Asia/Calcutta': 'India', 'Asia/Colombo': 'Sri Lanka',
    'Asia/Dhaka': 'Bangladesh', 'Asia/Kathmandu': 'Nepal',
    'Asia/Bangkok': 'Thailand', 'Asia/Ho_Chi_Minh': 'Vietnam',
    'Asia/Singapore': 'Singapore', 'Asia/Kuala_Lumpur': 'Malaysia',
    'Asia/Jakarta': 'Indonesia', 'Asia/Manila': 'Philippines',
    'Asia/Hong_Kong': 'Hong Kong', 'Asia/Shanghai': 'China',
    'Asia/Taipei': 'Taiwan', 'Asia/Seoul': 'South Korea',
    'Asia/Tokyo': 'Japan',
    'Australia/Sydney': 'Australia', 'Australia/Melbourne': 'Australia',
    'Australia/Brisbane': 'Australia', 'Australia/Perth': 'Australia',
    'Australia/Adelaide': 'Australia',
    'Pacific/Auckland': 'New Zealand', 'Pacific/Fiji': 'Fiji',
  };

  /* An unmapped zone still carries a region, and reporting the region is
     both true and useful where guessing a country would be neither. Only a
     zone with no recognisable region at all becomes "Not known". */
  var REGIONS = {
    Europe: 'Europe', America: 'Americas', Asia: 'Asia', Africa: 'Africa',
    Australia: 'Australia', Pacific: 'Pacific', Indian: 'Indian Ocean',
    Atlantic: 'Atlantic', Antarctica: 'Antarctica', Arctic: 'Arctic',
  };

  function countryOf(zone) {
    if (!zone) return 'Not known';
    if (ZONES[zone]) return ZONES[zone];
    var region = REGIONS[String(zone).split('/')[0]];
    return region ? region + ', elsewhere' : 'Not known';
  }

  /* Where to draw the bubble. Whole degrees, because one cell of the map is
     2.4 degrees wide and a decimal place here would be precision the time
     zone it came from does not have. A region falls on the middle of the
     region, which is honest about being a region. */
  var PLACES = ('United Kingdom -2 54|Ireland -8 53|Portugal -8 40|Spain -4 40|'
    + 'France 2 47|Belgium 5 51|Netherlands 6 52|Germany 10 51|Switzerland 8 47|'
    + 'Austria 14 48|Italy 12 43|Malta 14 36|Greece 22 39|Turkey 35 39|'
    + 'Denmark 10 56|Norway 9 61|Sweden 15 62|Finland 26 64|Poland 19 52|'
    + 'Czechia 15 50|Hungary 19 47|Romania 25 46|Bulgaria 25 43|Ukraine 32 49|'
    + 'Russia 60 60|Croatia 16 45|Serbia 21 44|Luxembourg 6 50|Lithuania 24 55|'
    + 'Latvia 25 57|Estonia 26 59|Iceland -19 65|United States -98 39|'
    + 'Canada -106 56|Mexico -102 23|Colombia -74 4|Peru -76 -10|Chile -71 -33|'
    + 'Argentina -64 -34|Brazil -52 -11|Jamaica -77 18|Trinidad and Tobago -61 11|'
    + 'Cuba -79 22|Panama -80 9|Nigeria 8 10|Ghana -1 8|Kenya 38 0|Uganda 32 1|'
    + 'Tanzania 35 -6|Ethiopia 40 9|South Africa 25 -29|Egypt 30 27|Morocco -6 32|'
    + 'Algeria 3 28|Tunisia 9 34|DR Congo 22 -3|Angola 17 -12|'
    + "Côte d'Ivoire -5 8|Senegal -14 14|Zimbabwe 30 -19|Zambia 28 -13|"
    + 'United Arab Emirates 54 24|Qatar 51 25|Saudi Arabia 45 24|Kuwait 47 29|'
    + 'Israel 35 31|Iran 53 32|Pakistan 70 30|India 79 22|Sri Lanka 81 7|'
    + 'Bangladesh 90 24|Nepal 84 28|Thailand 101 15|Vietnam 106 16|Singapore 104 1|'
    + 'Malaysia 102 4|Indonesia 113 -2|Philippines 122 12|Hong Kong 114 22|'
    + 'China 104 35|Taiwan 121 24|South Korea 128 36|Japan 138 36|'
    + 'Australia 134 -25|New Zealand 174 -41|Fiji 178 -17|Europe 15 50|'
    + 'Americas -80 10|Asia 90 35|Africa 20 0|Pacific -160 0|Indian Ocean 75 -20|'
    + 'Atlantic -30 20|Arctic 0 80').split('|').reduce(function (o, s) {
    var p = s.split(' ');
    var lat = Number(p.pop());
    var lon = Number(p.pop());
    o[p.join(' ')] = [lon, lat];
    return o;
  }, {});

  function placeOf(name) {
    if (PLACES[name]) return PLACES[name];
    /* "Asia, elsewhere" is still Asia. */
    var base = String(name).split(',')[0];
    return PLACES[base] || null;
  }

  /* ---- The world, as 150x64 bits ---------------------------------------
     Rasterised once from Natural Earth 110m land, cropped to 84N..58S, which
     is the framing every web map uses: it drops Antarctica, which no reader
     has ever come from and which would otherwise take a fifth of the height.
     Antarctica still appears in the table below, because the table is the
     record and the map is the illustration. */
  var MAP_W = 150, MAP_H = 64, MAP_TOP = 84, MAP_BOT = -58;
  var MAP_GRID = 'AAAAAAB/AP/AAAAAAAAAAAAAAAAAAABv9///wAAADAAAwAAAAAAAAACa/3///gAOAAAAAGAAAAAAAAAlMhD///gAAAADgAPwAAAAAAABwBgAH//AAAAAIAH/gAAAAAAAB/nfwD/+AAAAAwZ///4fAAAf+Ov7meC/+AAB+ACb//////OP////////////4AKAEAAAAAAA3////////////wwwAAAAAAAAAA/////gHA4AAA+///////////A/v///AcAIAAB8/////////xwAGA///A/gAAARsf///////wGAAIAP//wfgAAAQs////////AOAAAAX//+/4AABIf////////AMAAAAD//+/8AABZ/////////4IAAAAD///+kAAAH/////////oAAAAAB////CAAAP/////////oAAAAAB///+gAAAP35+//////AAAAAAB///8AAAB8b4Of////+YAAAAAB///4AAAB4ln/P///+4QAAAAAA///wAAAB4Av+f///8YQAAAAAA///gAAAAngG/////+IwAAAAAAf//gAAAA/gA/////+FAAAAAAAP/+AAAAB/5h//////EAAAAAAAD/yAAAAB//9+/////AAAAAAAAF8BAAAAH//+/f///+AAAAAAAAC8BAAAAH//+/if//+AAAAAAAAAcDAAAAP///f8P//5AAAAAAAAAcYgAAAP///f4H5/AAAAAAAAAAOwGAAAP///v4Hw+gAAAAAAAAADwAAAAP///ngDgvBAAAAAAAAAAcAAAAP///2ADAPBAAAAAAAAAAEAAAAP///4ADALgAAAAAAAAAAGfgAAH////ABAAAAAAAAAAAAAB/4AAD////AAgIAQAAAAAAAAAAf+AAB5//+AAAUGAAAAAAAAAAAf/AAAAf/8AAAMMAAAAAAAAAAA//AAAAf/4AAAM9oAAAAAAAAAB//wAAAf/wAAAGdCAAAAAAAAAB//+AAAf/wAAACBD4gAAAAAAAB///AAAP/gAAAAAAdQAAAAAAAA///AAAP/gAAAAYA6EAAAAAAAA///AAAH/wAAAAAgBAAAAAAAAAf/+AAAH/xAAAAAHIAAAAAAAAAf/+AAAP/xAAAAAWIAAAAAAAAAH/+AAAP/nAAAAAfsABAAAAAAAD/8AAAP/GAAAAA/8AAAAAAAAAD/8AAAH/GAAAAH/+AAAAAAAAAD/wAAAH/GAAAAP//AAAAAAAAAD/gAAAH+AAAAAH//gAAAAAAAAH/gAAAD+AAAAAH//gAAAAAAAAH/AAAAD8AAAAAH//gAAAAAAAAH+AAAAB4AAAAAHh/gAAAAAAAAH8AAAAAAAAAAAEAfAAAAAAAAAH4AAAAAAAAAAAAAeAAAAAAAAAPgAAAAAAAAAAAAAAAGAAAAAAAPAAAAAAAAAAAAAAGAEAAAAAAAHAAAAAAAAAAAAAAAAIAAAAAAAOAAAAAAAAAAAAAAAAwAAAAAAAPAAAAAAAAAAAAAAAAAAAAAAAAMAAAAAAAAAAAAAAAAAAAAAAAAMAAAAAAAAAAAAAAAAAAAAAAAAHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

  /* One path of round-capped dots, not 2,856 circles. A zero-length subpath
     with a round cap paints a dot, so the whole landmass is a single element
     and the browser has one node to lay out rather than a few thousand. */
  var landPath = null;
  function land() {
    if (landPath !== null) return landPath;
    landPath = '';
    /* A DOM with no atob is not a browser, and a missing map is a far better
       failure than a screen that throws on the way in. */
    if (typeof atob !== 'function') return landPath;
    try {
      var raw = atob(MAP_GRID);
      var d = [];
      for (var i = 0; i < MAP_W * MAP_H; i++) {
        if (!(raw.charCodeAt(i >> 3) & (128 >> (i & 7)))) continue;
        d.push('M' + ((i % MAP_W) + 0.5) + ' ' + (Math.floor(i / MAP_W) + 0.5) + 'h.01');
      }
      landPath = d.join('');
    } catch (e) { landPath = ''; }
    return landPath;
  }

  function project(lon, lat) {
    return [
      ((Number(lon) + 180) / 360) * MAP_W,
      ((MAP_TOP - Number(lat)) / (MAP_TOP - MAP_BOT)) * MAP_H,
    ];
  }

  function worldMap(places, all) {
    var dots = land();
    if (!dots) return '';
    var top = places.slice(0, 12).map(function (p) {
      var at = placeOf(p.key);
      if (!at) return null;
      var xy = project(at[0], at[1]);
      if (xy[1] < 0 || xy[1] > MAP_H) return null;
      return { p: p, x: xy[0], y: xy[1] };
    }).filter(Boolean);

    var big = top.length ? top[0].p.views : 1;
    /* Area, not radius, carries the count: a radius scale makes a country
       with twice the views look four times the size. */
    var bubbles = top.map(function (b) {
      var r = 1.1 + Math.sqrt(b.p.views / big) * 5.2;
      return '<circle class="cpm__hit" cx="' + b.x.toFixed(1) + '" cy="' + b.y.toFixed(1)
        + '" r="' + r.toFixed(2) + '"><title>' + esc(b.p.key + ': ' + b.p.views
        + ' view' + (b.p.views === 1 ? '' : 's') + ', ' + pct(b.p.views, all) + '%')
        + '</title></circle>';
    }).join('');

    return '<div class="cpm">'
      + '<svg class="cpm__svg" viewBox="0 0 ' + MAP_W + ' ' + MAP_H + '" role="img" '
      + 'aria-label="' + esc('World map with a marker on each country readers came from. '
        + top.map(function (b) { return b.p.key + ', ' + b.p.views; }).join('. '))
      + '"><path class="cpm__land" d="' + dots + '"/>' + bubbles + '</svg></div>';
  }

  /* ---- State ----------------------------------------------------------- */
  var DAYS = 30;
  var rows = null;      /* null means migration 007 has not been run */
  var prev = null;      /* the period before this one, for the comparison */
  var hours = null;     /* null means the hourly table does not exist yet */
  var routes = null;    /* null means migration 009 has not been run */
  var tags = null;      /* null means migration 010 has not been run */
  var events = null;    /* the clicks, also 010 */
  var SITE = 'https://www.suesangelsfc.co.uk';
  var towns = null;     /* null means migration 011 has not been run */
  var trails = null;    /* whole journeys, also 011 */
  var FROM = '';        /* a chosen period, both ends included, or '' */
  var TO = '';
  var EXPLORE = '';     /* the page the journey explorer is looking at */
  var CAT = null;       /* the site's own page list, or null if unreachable */
  var FOCUS = '';       /* a page being looked at on its own */
  var SORT = 'views';
  /* Every figure on the screen answers the same four questions, so the filter
     is held here and applied ONCE, in view(). A filter each section applied
     for itself is how a total comes to disagree with the rows under it. */
  var FILT = { area: '', country: '', source: '', device: '' };

  function anyFilter() {
    return !!(FILT.area || FILT.country || FILT.source || FILT.device);
  }

  function iso(d) { return d.toISOString().slice(0, 10); }
  function daysAgo(n) {
    var d = new Date();
    d.setDate(d.getDate() - n);
    return iso(d);
  }

  var COLS = 'day,path,zone,source,device,views,seconds_total,depth_total';

  function get(q) {
    /* No table, no feature, no noise - the same contract band_views has. The
       try wraps the CALL as well as the promise: a helper that throws on the
       way in would otherwise reach the shell's error screen, which reads as a
       broken panel rather than as a feature nobody has switched on. */
    try {
      return CP.rest('GET', q).then(function (r) { return r || []; })
        .catch(function () { return null; });
    } catch (e) { return Promise.resolve(null); }
  }

  /* The build writes this and this screen is the only thing that reads it.
     Fetched once and kept, because it changes only when the site is rebuilt,
     and every use of it is optional: a page with no catalogue entry is shown
     by its address, which is what the whole screen did before. */
  function catalogue() {
    if (CAT) return Promise.resolve(CAT);
    try {
      return fetch('/stats-pages.json')
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (list) {
          CAT = Array.isArray(list) ? list : null;
          return CAT;
        })
        .catch(function () { return null; });
    } catch (e) { return Promise.resolve(null); }
  }

  function load() {
    if (!CP.state.isAdmin || !CP.rest) return Promise.resolve();
    var R = range();
    var since = R.n ? '&day=gte.' + R.from + '&day=lte.' + R.to : '';
    /* The period BEFORE this one, so every headline figure can say whether it
       is going up. All time has nothing before it, so it asks for nothing. */
    var before = R.n
      ? '&day=gte.' + shiftDay(R.from, -R.n) + '&day=lt.' + R.from
      : '';
    return Promise.all([
      get('page_stats?select=' + COLS + since + '&order=day.desc&limit=20000'),
      R.n ? get('page_stats?select=' + COLS + before + '&limit=20000')
        : Promise.resolve([]),
      get('page_stats_hourly?select=day,hour,path,views' + since + '&limit=20000'),
      catalogue(),
      get('page_routes?select=day,came_from,path,views' + since + '&limit=20000'),
      get('page_tags?select=day,tag,path,views' + since + '&limit=20000'),
      get('page_events?select=day,path,kind,target,count' + since + '&limit=20000'),
      get('page_places?select=day,country,region,city,lat,lon,views' + since + '&limit=20000'),
      get('page_trails?select=day,trail,views' + since + '&limit=20000'),
    ]).then(function (r) {
      rows = r[0];
      prev = r[1] || [];
      hours = r[2];
      routes = r[4];
      tags = r[5];
      events = r[6];
      towns = r[7];
      trails = r[8];
    });
  }

  /* ---- What the site publishes ------------------------------------------
     All of this degrades to nothing rather than to a guess: with no catalogue
     a page is its address, which is exactly what this screen showed before
     the catalogue existed. */
  var BY_PATH = null;
  function metaOf(p) {
    if (!CAT) return null;
    if (!BY_PATH) {
      BY_PATH = {};
      CAT.forEach(function (e) { BY_PATH[e.p] = e; });
    }
    return BY_PATH[p] || null;
  }
  function nameOf(p) {
    var m = metaOf(p);
    return m && m.t ? m.t : '';
  }

  var KIND_LABEL = {
    home: 'Home page', main: 'Main pages', player: 'Player profiles',
    match: 'Match reports', news: 'News articles', gallery: 'Photo albums',
    panel: 'Control panel',
  };

  /* The catalogue's answer where there is one, and the address where there is
     not. The fallback is not decoration: a page generated since the last
     build has traffic and no catalogue entry, and it belongs in a section
     rather than in a hole. */
  function areaOf(p) {
    var m = metaOf(p);
    if (m && KIND_LABEL[m.k]) return KIND_LABEL[m.k];
    if (/^\/players\//.test(p)) return 'Player profiles';
    if (/^\/matches\//.test(p)) return 'Match reports';
    if (/^\/news\//.test(p)) return 'News articles';
    if (/^\/gallery\//.test(p)) return 'Photo albums';
    if (/^\/control\.html$/.test(p)) return 'Control panel';
    if (/^\/(index\.html)?$/.test(p)) return 'Home page';
    return 'Main pages';
  }

  /* ---- Where a reader came from, grouped --------------------------------
     A list of hosts answers "which site", and the club's actual question is
     "is this search, is this social, or is it people who already know us".
     The hosts are still listed underneath; this is the shape above them. */
  function sourceGroup(host) {
    if (!host) return 'Direct or unknown';
    var h = String(host).toLowerCase();
    if (/(^|\.)(google|bing|duckduckgo|yahoo|ecosia|brave|yandex|baidu)\./.test('.' + h)
      || /(^|\.)search\./.test('.' + h)) return 'Search engines';
    if (/(^|\.)(facebook|fb|instagram|x|twitter|t|linkedin|lnkd|tiktok|whatsapp|reddit|youtube|threads|snapchat|pinterest)\./.test('.' + h)
      || h === 'l.facebook.com' || h === 'lm.facebook.com') return 'Social media';
    return 'Other websites';
  }

  /* ---- The rows this screen is looking at -------------------------------- */
  function keep(r) {
    if (FILT.area && areaOf(r.path) !== FILT.area) return false;
    if (FILT.country && countryOf(r.zone) !== FILT.country) return false;
    if (FILT.source && (r.source || 'Direct or unknown') !== FILT.source) return false;
    if (FILT.device && (r.device || 'Not known') !== FILT.device) return false;
    return true;
  }
  function view() { return anyFilter() ? (rows || []).filter(keep) : (rows || []); }
  function viewPrev() { return anyFilter() ? (prev || []).filter(keep) : (prev || []); }

  /* ---- Aggregation ------------------------------------------------------
     One pass, several buckets. Everything downstream reads these rather than
     re-walking the rows, so a figure cannot disagree with the one above it. */
  function roll(list, key) {
    var out = {};
    list.forEach(function (r) {
      var k = key(r);
      if (!out[k]) out[k] = { views: 0, seconds: 0, depth: 0 };
      out[k].views += Number(r.views || 0);
      out[k].seconds += Number(r.seconds_total || 0);
      out[k].depth += Number(r.depth_total || 0);
    });
    return Object.keys(out).map(function (k) {
      return { key: k, views: out[k].views, seconds: out[k].seconds, depth: out[k].depth };
    }).sort(function (a, b) { return b.views - a.views; });
  }

  function total(list) {
    return list.reduce(function (n, r) { return n + Number(r.views || 0); }, 0);
  }
  function sum(list, f) {
    return list.reduce(function (n, r) { return n + Number(f(r) || 0); }, 0);
  }
  function pct(n, of) { return of ? Math.round((n / of) * 100) : 0; }

  /* Seconds read as a duration once they stop being a handful of them. "2m
     14s" is a length of time; "134s" is a measurement. */
  function dur(s) {
    s = Math.round(s || 0);
    if (s < 90) return s + 's';
    return Math.floor(s / 60) + 'm ' + (s % 60) + 's';
  }

  function dayName(d) {
    var names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday',
      'Saturday'];
    var t = new Date(d + 'T12:00:00');
    return isNaN(t.getTime()) ? '' : names[t.getDay()];
  }
  function shortDate(d) {
    var mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct',
      'Nov', 'Dec'];
    var t = new Date(d + 'T12:00:00');
    return isNaN(t.getTime()) ? d : t.getDate() + ' ' + mon[t.getMonth()];
  }
  function daysBetween(a, b) {
    var x = new Date(a + 'T12:00:00'), y = new Date(b + 'T12:00:00');
    if (isNaN(x.getTime()) || isNaN(y.getTime())) return null;
    return Math.round((y - x) / 864e5);
  }

  /* ---- Small drawing helpers -------------------------------------------
     The panel's own bar and tile wherever one will do. The share is the
     point, and a number in a column is read one row at a time; the bar is
     what makes the shape of the answer visible. */
  function bar(n, of) {
    return '<span class="pipebar" aria-hidden="true"><span class="pipebar__fill" '
      + 'style="width:' + pct(n, of) + '%"></span></span>';
  }

  function tile(big, label, sub, delta) {
    /* A word, not a number - a town, a page - is set smaller, or "Kingston
       upon Thames" takes three lines of a figure-sized face. */
    return '<div class="cpt' + (String(big).length > 9 ? ' cpt--word' : '') + '"><span class="cpt__v">'
      + esc(big) + '</span>'
      + '<span class="cpt__l">' + esc(label) + '</span>'
      + (delta || '')
      + '<span class="cpt__s">' + esc(sub) + '</span></div>';
  }

  /* Up, down or level against the period before, in words as well as a mark,
     because an arrow alone is a colour-and-shape claim and this panel has one
     accent hue. "No figures before this" is said out loud rather than shown
     as 0%, which would read as a collapse rather than as a start. */
  function delta(now, was) {
    if (!prev || !prev.length || !range().n) return '';
    if (!was) {
      return '<span class="cpd">Nothing in the ' + esc(String(range().n))
        + ' days before</span>';
    }
    var d = Math.round(((now - was) / was) * 100);
    var word = d > 0 ? 'up' : (d < 0 ? 'down' : 'level with');
    var mark = d > 0 ? '▲' : (d < 0 ? '▼' : '–');
    return '<span class="cpd cpd--' + (d > 0 ? 'up' : (d < 0 ? 'down' : 'flat')) + '">'
      + '<i aria-hidden="true">' + mark + '</i> ' + esc(word + ' ' + Math.abs(d)
        + '% on the ' + range().n + ' days before') + '</span>';
  }

  function rankTable(head, list, all, label, opts) {
    if (!list.length) {
      return '<p class="cp-note">Nothing recorded yet for ' + esc(label) + '.</p>';
    }
    var f = (opts && opts.filter) || '';
    return table([head, 'Views', 'Share', 'Average time', 'Average scroll', '',
      f ? 'Narrow to' : ''],
    list.slice(0, 40).map(function (r) {
      return '<tr><td>' + esc(r.key) + '</td>'
        + '<td><b>' + esc(String(r.views)) + '</b></td>'
        + '<td>' + esc(String(pct(r.views, all))) + '%</td>'
        + '<td>' + esc(dur(r.seconds / r.views)) + '</td>'
        + '<td>' + esc(String(Math.round(r.depth / r.views))) + '%</td>'
        + '<td style="width:24%">' + bar(r.views, all) + '</td>'
        + (f
          ? '<td><button class="btn btn--sm btn--ghost" data-filt="' + esc(f)
            + '" data-val="' + esc(r.key) + '">Only this</button></td>'
          : '<td></td>')
        + '</tr>';
    }).join(''));
  }

  /* ---- A page's own shape, twelve pixels tall ---------------------------
     A table of totals cannot tell a page that is read every day from one that
     had a single good afternoon, and those are different pages. */
  function sparkline(series, max) {
    if (!series || series.length < 2) return '';
    var W = 60, H = 14;
    var step = W / (series.length - 1);
    var pts = series.map(function (v, i) {
      return (i * step).toFixed(1) + ' ' + (H - 1 - (v / (max || 1)) * (H - 2)).toFixed(1);
    });
    return '<svg class="cpk" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true" '
      + 'focusable="false"><polyline class="cpk__l" points="' + pts.join(' ') + '"/></svg>';
  }

  /* ---- The daily trend --------------------------------------------------
     An area, a line and a dot per day, in viewBox units so nothing here ever
     needs to measure the page. Every dot carries a <title>, so the figures
     are reachable by hovering and by a screen reader without a tooltip
     engine, and the table underneath carries all of them anyway.

     THE MARKS ARE THE POINT. A traffic chart with no idea what the club did
     is a line going up and down for no stated reason; a tick on the day a
     match was played or a report went up turns it into a question somebody
     can answer. They come from the catalogue, so they are the club's real
     dates rather than anything inferred from the traffic itself. */
  function trend(days, opts) {
    if (days.length < 2) return '';
    opts = opts || {};
    var W = 640, H = 190, L = 34, R = 8, T = 10, B = 46;
    var ghost = opts.ghost && opts.ghost.length === days.length ? opts.ghost : null;
    var max = Math.max.apply(null, days.map(function (d) { return d.views; })
      .concat(ghost ? ghost.map(function (d) { return d.views; }) : [])) || 1;
    var step = (W - L - R) / Math.max(1, days.length - 1);
    var x = function (i) { return L + i * step; };
    var y = function (v) { return T + (1 - (v / max)) * (H - T - B); };

    var pts = days.map(function (d, i) { return x(i).toFixed(1) + ' ' + y(d.views).toFixed(1); });
    var line = 'M' + pts.join('L');
    var area = line + 'L' + x(days.length - 1).toFixed(1) + ' ' + (H - B)
      + 'L' + x(0).toFixed(1) + ' ' + (H - B) + 'Z';

    var ghostPath = ghost
      ? '<path class="cpc__ghost" d="M' + ghost.map(function (d, i) {
        return x(i).toFixed(1) + ' ' + y(d.views).toFixed(1);
      }).join('L') + '"/>'
      : '';

    var grid = [0, 0.5, 1].map(function (f) {
      var v = Math.round(max * f);
      return '<line class="cpc__grid" x1="' + L + '" x2="' + (W - R) + '" y1="'
        + y(v).toFixed(1) + '" y2="' + y(v).toFixed(1) + '"/>'
        + '<text class="cpc__ax" x="' + (L - 6) + '" y="' + (y(v) + 3).toFixed(1)
        + '" text-anchor="end">' + esc(String(v)) + '</text>';
    }).join('');

    /* Never more than about eight date labels however long the period is: a
       ninety-day axis with ninety labels is a grey smear. */
    var every = Math.ceil(days.length / 8);
    var axis = days.map(function (d, i) {
      var lastI = days.length - 1;
      if (i !== lastI && (i % every || lastI - i < every)) return '';
      /* The last date sits flush with the right edge rather than centred on
         it, or it is cut off by the edge of the chart. */
      return '<text class="cpc__ax" x="' + x(i).toFixed(1) + '" y="' + (H - 26)
        + '" text-anchor="' + (i === lastI ? 'end' : 'middle') + '">' + esc(shortDate(d.key))
        + '</text>';
    }).join('');

    var dots = days.map(function (d, i) {
      return '<circle class="cpc__dot" cx="' + x(i).toFixed(1) + '" cy="'
        + y(d.views).toFixed(1) + '" r="2.5"><title>'
        + esc(dayName(d.key) + ' ' + shortDate(d.key) + ': ' + d.views + ' view'
          + (d.views === 1 ? '' : 's')) + '</title></circle>';
    }).join('');

    var marks = '';
    if (opts.marks) {
      marks = days.map(function (d, i) {
        var m = opts.marks[d.key];
        if (!m || !m.length) return '';
        return '<line class="cpc__mark" x1="' + x(i).toFixed(1) + '" x2="' + x(i).toFixed(1)
          + '" y1="' + T + '" y2="' + (H - B) + '"/>'
          + '<circle class="cpc__markdot" cx="' + x(i).toFixed(1) + '" cy="' + (H - B + 8)
          + '" r="3"><title>' + esc(shortDate(d.key) + ': ' + m.join(' · ')) + '</title></circle>';
      }).join('');
    }

    /* The seven-day average, trailing. A Sunday league site is weekly by
       nature, and a raw daily line is mostly the week's own rhythm; the
       average is what shows whether the whole thing is growing. */
    var avg = '';
    if (days.length >= 7) {
      avg = '<path class="cpc__avg" d="M' + days.map(function (d, i) {
        var s7 = 0, n7 = 0;
        for (var j = Math.max(0, i - 6); j <= i; j++) { s7 += days[j].views; n7++; }
        return x(i).toFixed(1) + ' ' + y(s7 / n7).toFixed(1);
      }).join('L') + '"/>';
    }

    return '<div class="cpc"><svg class="cpc__svg" viewBox="0 0 ' + W + ' ' + H + '" '
      + 'role="img" aria-label="' + esc('Views per day from ' + shortDate(days[0].key)
        + ' to ' + shortDate(days[days.length - 1].key) + ', highest ' + max) + '">'
      + grid + marks + ghostPath + '<path class="cpc__area" d="' + area + '"/>'
      + '<path class="cpc__line" pathLength="1" d="' + line + '"/>' + avg + dots + axis + '</svg></div>';
  }

  /* Which days the club did something. Only days INSIDE the period, so the
     legend never promises a mark that is off the left of the chart. */
  function marksFor(days) {
    if (!CAT) return null;
    var within = {};
    days.forEach(function (d) { within[d.key] = 1; });
    var out = {}, any = false;
    CAT.forEach(function (e) {
      if (!e.d || !within[e.d]) return;
      if (e.k !== 'match' && e.k !== 'news') return;
      if (!out[e.d]) out[e.d] = [];
      out[e.d].push((e.k === 'match' ? 'Match: ' : 'Article: ') + e.t);
      any = true;
    });
    return any ? out : null;
  }

  /* ---- When people read it ---------------------------------------------- */
  function heatmap(list) {
    var cell = {}, max = 0;
    list.forEach(function (r) {
      var t = new Date(r.day + 'T12:00:00');
      if (isNaN(t.getTime())) return;
      /* An hour that is not one is skipped, not bucketed under NaN. Rows
         written before migration 008 carry no hour at all, and a key of
         "2:NaN" is a cell no column will ever match: the grid would draw 168
         empty squares and read as a week nobody visited, rather than as a
         column that is not being recorded. Found by a mutation probe. */
      var h = Number(r.hour);
      if (!(h >= 0 && h < 24)) return;
      var k = t.getDay() + ':' + h;
      cell[k] = (cell[k] || 0) + Number(r.views || 0);
      if (cell[k] > max) max = cell[k];
    });
    if (!max) return '';

    /* Monday first: a football week ends on a Sunday and reads wrongly when
       Sunday opens it. */
    var order = [1, 2, 3, 4, 5, 6, 0];
    var names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    var full = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday',
      'Saturday'];

    var head = '<tr><td class="cph__c"></td>' + [0, 6, 12, 18].map(function (h) {
      return '<td class="cph__t" colspan="6">' + esc(h === 0 ? 'Midnight'
        : (h === 12 ? 'Midday' : (h < 12 ? h + 'am' : (h - 12) + 'pm'))) + '</td>';
    }).join('') + '</tr>';

    var body = order.map(function (d) {
      var cells = '';
      for (var h = 0; h < 24; h++) {
        var v = cell[d + ':' + h] || 0;
        var label = full[d] + ' ' + (h < 10 ? '0' + h : h) + ':00, '
          + v + ' view' + (v === 1 ? '' : 's');
        cells += '<td class="cph__v"><span class="cph__x" style="opacity:'
          + (v ? (0.18 + (v / max) * 0.82).toFixed(2) : 0)
          + '" title="' + esc(label) + '"><span class="sr-only">' + esc(label)
          + '</span></span></td>';
      }
      return '<tr><th scope="row" class="cph__c">' + esc(names[d]) + '</th>' + cells + '</tr>';
    }).join('');

    /* thead and tbody written out rather than left to the browser. A browser
       inserts an implicit tbody here and the suite's DOM refuses to, which is
       the right refusal: the two would disagree about what this markup is. */
    return '<div class="scroll-x"><table class="cph"><thead>' + head
      + '</thead><tbody>' + body + '</tbody></table></div>';
  }

  function hourProfile(list) {
    var by = [], max = 0, i;
    for (i = 0; i < 24; i++) by.push(0);
    list.forEach(function (r) {
      var h = Number(r.hour);
      if (h >= 0 && h < 24) by[h] += Number(r.views || 0);
    });
    for (i = 0; i < 24; i++) if (by[i] > max) max = by[i];
    if (!max) return '';
    var best = by.indexOf(max);
    return '<div class="cp-spark cp-spark--hours">' + by.map(function (v, h) {
      return '<span class="cp-spark__bar" style="height:' + Math.max(2, pct(v, max))
        + '%" title="' + esc((h < 10 ? '0' + h : h) + ':00 to ' + (h < 10 ? '0' + h : h)
          + ':59, ' + v + ' view' + (v === 1 ? '' : 's')) + '"></span>';
    }).join('') + '</div>'
      + '<div class="cph__scale"><span>Midnight</span><span>Midday</span>'
      + '<span>11pm</span></div>'
      + '<p class="cp-note">Busiest hour is <b>' + esc((best < 10 ? '0' + best : best)
        + ':00 to ' + (best < 10 ? '0' + best : best) + ':59') + '</b> with '
      + esc(String(max)) + ' view' + (max === 1 ? '' : 's') + '. This is the '
      + '<b>reader’s own</b> clock, not the club’s, so it says when somebody sat '
      + 'down to read rather than what time it was here.</p>';
  }

  /* ---- How far they got -------------------------------------------------
     An average scroll of 54% can be everybody reaching halfway or half the
     readers bouncing and half reading it all, and those are opposite facts
     about the same page. The buckets are per VIEW, weighted by how many views
     each row carries. */
  function spread(list, pick, bands, label) {
    var buckets = bands.map(function (b) { return { label: b[0], views: 0 }; });
    var n = 0;
    list.forEach(function (r) {
      var v = Number(r.views || 0);
      if (!v) return;
      var avg = pick(r) / v;
      n += v;
      for (var i = 0; i < bands.length; i++) {
        if (avg <= bands[i][1] || i === bands.length - 1) { buckets[i].views += v; break; }
      }
    });
    if (!n) return '';
    return table([label, 'Views', 'Share', ''], buckets.map(function (b) {
      return '<tr><td>' + esc(b.label) + '</td><td><b>' + esc(String(b.views))
        + '</b></td><td>' + esc(String(pct(b.views, n))) + '%</td>'
        + '<td style="width:40%">' + bar(b.views, n) + '</td></tr>';
    }).join(''));
  }

  /* ---- What moved --------------------------------------------------------
     A ranked list says what is big and never says what CHANGED, and the change
     is the thing worth acting on: a page that has quietly doubled is news, a
     page that has halved is a question. Only against a real previous period,
     so All time - which has nothing before it - does not draw this at all. */
  function movers(nowList, wasList, allNow) {
    var was = {};
    wasList.forEach(function (r) { was[r.key] = r.views; });
    var seen = {};
    var out = nowList.map(function (r) {
      seen[r.key] = 1;
      return { key: r.key, now: r.views, was: was[r.key] || 0 };
    });
    /* Something that vanished is a mover too, and it is invisible if the list
       is built from what is here now. */
    Object.keys(was).forEach(function (k) {
      if (!seen[k]) out.push({ key: k, now: 0, was: was[k] });
    });
    out.forEach(function (r) { r.by = r.now - r.was; });
    /* Ranked on the SIZE of the change, not the percentage: one view becoming
       three is a 200% rise and is not news on a club website. */
    var up = out.filter(function (r) { return r.by > 0; })
      .sort(function (a, b) { return b.by - a.by; }).slice(0, 8);
    var down = out.filter(function (r) { return r.by < 0; })
      .sort(function (a, b) { return a.by - b.by; }).slice(0, 8);
    if (!up.length && !down.length) return '';

    var rowsFor = function (list) {
      return table(['Page', 'Now', 'Before', 'Change'], list.map(function (r) {
        var name = nameOf(r.key);
        return '<tr><td>' + (name ? '<b>' + esc(name) + '</b><br><span class="cpp">'
          + esc(r.key) + '</span>' : esc(r.key)) + '</td>'
          + '<td>' + esc(String(r.now)) + '</td>'
          + '<td>' + esc(String(r.was)) + '</td>'
          + '<td class="cpd--' + (r.by > 0 ? 'up' : 'down') + '"><b>'
          + esc((r.by > 0 ? '+' : '') + r.by) + '</b></td></tr>';
      }).join(''));
    };
    return '<div class="cp2">'
      + '<div><h4 class="cp-sub">Read more than before</h4>'
      + (up.length ? rowsFor(up) : '<p class="cp-note">Nothing rose.</p>') + '</div>'
      + '<div><h4 class="cp-sub">Read less than before</h4>'
      + (down.length ? rowsFor(down) : '<p class="cp-note">Nothing fell.</p>') + '</div>'
      + '</div>'
      + '<p class="cp-note">Against the ' + esc(String(range().n)) + ' days before this period, '
      + 'ranked by the size of the change rather than the percentage: one view becoming '
      + 'three is a 200% rise and is not news. ' + esc(String(allNow))
      + ' views in this period.</p>';
  }

  /* ---- The screen ------------------------------------------------------- */

  function notRunYet() {
    return sec({
      title: 'Website stats',
      sub: 'Nothing is being recorded yet.',
      body: '<p class="cp-note">The website starts counting page views once '
        + '<b>migrations/007_page_stats.sql</b> has been run on the database, and records '
        + 'the hour of the day and the route through the site as well once '
        + '<b>migrations/009_page_routes.sql</b> has been. Until then this screen has nothing to show and the site behaves '
        + 'exactly as it does now.</p>'
        + '<p class="cp-note">Nothing identifying is stored when it is switched on: no cookie, '
        + 'no address and no visitor identifier of any kind. A row is a running count for one '
        + 'day, one page, one time zone, one traffic source and one kind of device, so an '
        + 'individual visit cannot be reconstructed from it even by somebody with the '
        + 'database open.</p>',
    });
  }

  function empty() {
    return sec({
      title: 'Website stats',
      sub: 'Switched on, and nothing has come in yet.',
      body: '<p class="cp-note">Counting is live and no page views have been recorded '
        + esc(periodText()) + '. Views are written when a reader leaves a page, '
        + 'so the first figures appear shortly after the next visitor. If the site has had '
        + 'traffic and this stays empty, the most likely cause is that the last publish '
        + 'predates this feature.</p>',
    });
  }

  M.stats = function (host) {
    return load().then(function () { draw(host); });
  };

  /* ---- The period ---------------------------------------------------------
     A rolling window (today, 7, 30, 90 days), a named one (yesterday, this
     month, last month) or any two dates. Everything on the screen, the period
     before it included, is asked of range() and nothing else. */
  function shiftDay(d, n) {
    var t = new Date(d + 'T12:00:00');
    t.setDate(t.getDate() + n);
    return ymd(t);
  }
  function range() {
    if (FROM && TO) return { from: FROM, to: TO, n: Math.max(1, (daysBetween(FROM, TO) || 0) + 1) };
    if (DAYS) return { from: daysAgo(DAYS - 1), to: iso(new Date()), n: DAYS };
    return { from: '', to: '', n: 0 };
  }
  function periodText() {
    var R = range();
    if (!R.n) return 'all time';
    if (!FROM) return DAYS === 1 ? 'today' : 'in the last ' + R.n + ' days';
    if (R.from === R.to) return 'on ' + dayName(R.from) + ' ' + shortDate(R.from);
    return 'between ' + shortDate(R.from) + ' and ' + shortDate(R.to) + ' ' + R.to.slice(0, 4);
  }
  function presetOf(key) {
    var today = iso(new Date());
    if (key === 'yesterday') return { from: shiftDay(today, -1), to: shiftDay(today, -1) };
    if (key === 'month') return { from: today.slice(0, 8) + '01', to: today };
    var end = shiftDay(today.slice(0, 8) + '01', -1);
    return { from: end.slice(0, 8) + '01', to: end };
  }

  function periodBar() {
    var R = range();
    var today = iso(new Date());
    var cls = function (on) { return 'btn btn--sm ' + (on ? 'btn--primary' : 'btn--ghost'); };
    var roll1 = function (n, label) {
      return '<button type="button" class="' + cls(!FROM && DAYS === n) + '" data-days="' + n + '">'
        + esc(label) + '</button>';
    };
    var named = function (key, label) {
      var p = presetOf(key);
      return '<button type="button" class="' + cls(FROM === p.from && TO === p.to) + '" data-preset="'
        + key + '">' + esc(label) + '</button>';
    };
    return '<div class="cpst__period">'
      + roll1(1, 'Today') + named('yesterday', 'Yesterday') + roll1(7, '7 days') + roll1(30, '30 days')
      + roll1(90, '90 days') + named('month', 'This month') + named('lastmonth', 'Last month')
      + roll1(0, 'All time')
      + '<span class="cpst__custom"><label class="cpst__date"><span>From</span>'
      + '<input type="date" class="input input--sm" data-from max="' + today + '" value="'
      + esc(R.from) + '"></label><label class="cpst__date"><span>To</span>'
      + '<input type="date" class="input input--sm" data-to max="' + today + '" value="'
      + esc(R.to) + '"></label><button type="button" class="' + cls(!!FROM && !(
        [presetOf('yesterday'), presetOf('month'), presetOf('lastmonth')].some(function (p) {
          return p.from === FROM && p.to === TO;
        }))) + '" data-apply>Show these dates</button></span>'
      + '<button type="button" class="btn btn--sm btn--ghost" data-csv="1">Download as CSV</button>'
      + '</div>';
  }

  function periodWrap(inner) {
    return '<div class="cp-head__actions" style="margin-bottom:12px">' + periodBar()
      + '</div>' + inner;
  }

  /* One control per question, and it narrows EVERY figure below it rather
     than one table. The alternative - a filter per section - is how a total
     comes to disagree with the rows underneath it. */
  function picker(name, label, list) {
    return '<label class="cpf__one"><span class="cpf__l">' + esc(label) + '</span>'
      + '<select class="select input--sm" data-filt="' + esc(name) + '">'
      + '<option value="">Everything</option>'
      + list.map(function (o) {
        return '<option value="' + esc(o) + '"' + (FILT[name] === o ? ' selected' : '')
          + '>' + esc(o) + '</option>';
      }).join('') + '</select></label>';
  }

  function filterBar() {
    /* The options come from the UNFILTERED period, so choosing a country does
       not empty the source list and strand somebody with no way back. */
    var all = rows || [];
    var uniq = function (f) {
      var seen = {};
      all.forEach(function (r) { seen[f(r)] = 1; });
      return Object.keys(seen).sort();
    };
    return '<div class="cpf">'
      + picker('area', 'Part of the site', uniq(function (r) { return areaOf(r.path); }))
      + picker('country', 'Country', uniq(function (r) { return countryOf(r.zone); }))
      + picker('source', 'Came from', uniq(function (r) { return r.source || 'Direct or unknown'; }))
      + picker('device', 'Device', uniq(function (r) { return r.device || 'Not known'; }))
      + (anyFilter()
        ? '<button class="btn btn--sm btn--ghost cpf__clear" data-clear="1">Show everything</button>'
        : '')
      + '</div>';
  }

  function draw(host) {
    if (rows === null) { host.innerHTML = notRunYet(); return; }

    var everything = total(rows);
    if (!everything) { host.innerHTML = periodWrap(empty()); wire(host); return; }

    var v = view();
    var all = total(v);
    var pv = viewPrev();

    var pages = roll(v, function (r) { return r.path; });
    var places = roll(v, function (r) { return countryOf(r.zone); });
    var sources = roll(v, function (r) { return r.source || 'Direct or unknown'; });
    var groups = roll(v, function (r) { return sourceGroup(r.source); });
    var devices = roll(v, function (r) { return r.device || 'Not known'; });
    var areas = roll(v, function (r) { return areaOf(r.path); });
    var days = roll(v, function (r) { return r.day; })
      .sort(function (a, b) { return a.key < b.key ? -1 : 1; });

    var secs = sum(v, function (r) { return r.seconds_total; });
    var deep = sum(v, function (r) { return r.depth_total; });
    var busiest = days.slice().sort(function (a, b) { return b.views - a.views; })[0];

    var wasAll = total(pv);
    var wasSecs = sum(pv, function (r) { return r.seconds_total; });
    var wasPlaces = pv.length
      ? roll(pv, function (r) { return countryOf(r.zone); }).length : 0;

    /* Seven chapters, in the order a report is read: the headline and today,
       the trend, who the readers are, how they arrive and move, what they
       read, what they do, and what the figures cannot say. The rail at the
       top jumps between them, and the report button turns the same figures
       into a page a sponsor can be handed. */
    host.innerHTML = '<div class="cpst">' + chapterNav()
      + chapter(0, headline(all, everything, pages, places, days, secs, deep, busiest,
        wasAll, wasSecs, wasPlaces)
        + (FOCUS ? focusPanel(FOCUS, all) : '')
        + todaySection())
      + chapter(1, sec({
        title: 'Day by day',
        sub: 'Every day in the period, and what came in on it.',
        body: trend(days, { marks: marksFor(days), ghost: ghostFor(days, pv) })
          + trendKey(days, pv)
          + dayTable(days, busiest, v),
      })
        + trendsSection(v, days)
        + (range().n && pv.length
          ? sec({
            title: 'What moved',
            sub: 'The pages that rose and fell most against the period before.',
            body: movers(pages, roll(pv, function (r) { return r.path; }), all),
          })
          : ''))
      + chapter(2, placesSection() + sec({
        title: 'Where in the world',
        sub: 'Worked out from the reader’s device time zone.',
        body: worldMap(places, all)
          + rankTable('Country', places, all, 'anywhere', { filter: 'country' })
          + '<p class="cp-note">This is the time zone the device is set to, not its address: '
          + 'no location lookup happens and no address is ever read. It is wrong for anybody '
          + 'using a VPN or reading while abroad, so treat it as the shape of the audience '
          + 'rather than a count of countries. A zone the panel does not recognise is '
          + 'reported as its region rather than guessed at or dropped.</p>',
      })
        + sec({
          title: 'What they read it on',
          body: '<div class="cp2"><div>' + donut(devices, all, 'Devices') + '</div><div>'
            + rankTable('Device', devices, all, 'any device', { filter: 'device' })
            + '</div></div>'
            + '<p class="cp-note">From the width of the screen, which is what the layout responds '
            + 'to, rather than from the browser’s identifying user agent string. A phone held '
            + 'sideways can count as a tablet, which is the honest limit of measuring it this '
            + 'way.</p>',
        }))
      + chapter(3, sec({
        title: 'How they arrive',
        sub: 'The kind of place first, then the sites themselves.',
        body: '<div class="cp2"><div>' + donut(groups, all, 'How views arrived')
          + '</div><div><h4 class="cp-sub">By kind</h4>'
          + rankTable('Kind', groups, all, 'any source') + '</div></div>'
          + '<h4 class="cp-sub">Site by site</h4>'
          + rankTable('Source', sources, all, 'any source', { filter: 'source' })
          + '<p class="cp-note">Only the sending site is recorded, never the full address it '
          + 'came from, because a full referring link can carry somebody’s search terms. '
          + '<b>Direct or unknown</b> is somebody typing the address, a bookmark, a link from '
          + 'an app or an email, or a browser set not to say. Moving between pages of this '
          + 'site is not counted as a source.</p>',
      })
        + routeSection()
        + journeySection()
        + tagSection())
      + chapter(4, sec({
        title: 'What gets read',
        sub: 'Every page anybody opened, with how long they stayed and how far down they '
          + 'got. Pick a page to see it on its own.',
        actions: sortBar(),
        body: areaTable(areas, all) + pageTable(pages, all, v),
      })
        + publishSection(pages, all)
        + unopenedSection())
      + chapter(5, whenSection()
        + sec({
          title: 'How much of a page they read',
          sub: 'The spread, not the average.',
          body: '<div class="cp2">'
            + '<div>' + spread(v, function (r) { return r.depth_total; },
              [['Left near the top, under 25%', 25], ['A quarter to halfway', 50],
                ['Halfway to three quarters', 75], ['Read to the bottom, over 75%', 100]],
              'How far down') + '</div>'
            + '<div>' + spread(v, function (r) { return r.seconds_total; },
              [['A glance, under 10 seconds', 10], ['10 to 30 seconds', 30],
                ['Half a minute to two minutes', 120], ['Over two minutes', 1e9]],
              'How long') + '</div></div>'
            + '<p class="cp-note">An average scroll of half the page can be everybody stopping '
            + 'in the middle or half the readers leaving at the top while the rest read it all, '
            + 'and those are opposite facts. A page that is shorter than the window counts as '
            + 'read to the bottom, because there was nothing to scroll.</p>',
        })
        + clickSection())
      + chapter(6, notHere())
      + '</div>';

    wire(host);
  }

  /* The previous period laid over this one, day for day. Only when the two are
     the same length, which is the only case where the comparison is honest. */
  function ghostFor(days, pv) {
    if (!range().n || !pv.length || days.length < 2) return null;
    var byDay = roll(pv, function (r) { return r.day; })
      .sort(function (a, b) { return a.key < b.key ? -1 : 1; });
    if (byDay.length !== days.length) return null;
    return byDay;
  }

  function trendKey(days, pv) {
    var bits = [];
    if (marksFor(days)) {
      bits.push('<span class="cpg"><i class="cpg__mark" aria-hidden="true"></i> a match was '
        + 'played or an article went up</span>');
    }
    if (days.length >= 7) {
      bits.push('<span class="cpg"><i class="cpg__avg" aria-hidden="true"></i> the seven-day '
        + 'average</span>');
    }
    if (ghostFor(days, pv)) {
      bits.push('<span class="cpg"><i class="cpg__ghost" aria-hidden="true"></i> the same '
        + 'number of days before this period</span>');
    }
    return bits.length ? '<p class="cp-note cpg__row">' + bits.join(' ') + '</p>' : '';
  }

  function headline(all, everything, pages, places, days, secs, deep, busiest, wasAll,
    wasSecs, wasPlaces) {
    var span = range().n
      ? periodText()
      : (days.length ? 'between ' + shortDate(days[0].key) + ' and '
        + shortDate(days[days.length - 1].key) : 'all time');
    return sec({
      title: 'Website stats',
      sub: '<b>' + esc(String(all)) + '</b> page view' + (all === 1 ? '' : 's')
        + ' across <b>' + esc(String(pages.length)) + '</b> page'
        + (pages.length === 1 ? '' : 's') + ' from <b>' + esc(String(places.length))
        + '</b> place' + (places.length === 1 ? '' : 's') + ' ' + esc(span) + '.'
        + (anyFilter()
          ? ' <b>Narrowed</b> from ' + esc(String(everything)) + ' views ('
            + esc(String(pct(all, everything))) + '%).'
          : ''),
      actions: periodBar(),
      body: filterBar()
        + '<div class="cpt-grid">'
        + tile(String(all), 'Page views', pages.length + ' pages opened',
          delta(all, wasAll) + bigSpark(days.map(function (d) { return d.views; })))
        + tile(dur(secs / all), 'Average on a page', 'across every view',
          delta(secs / all, wasAll ? wasSecs / wasAll : 0)
            + bigSpark(days.map(function (d) { return d.seconds / (d.views || 1); })))
        + tile(Math.round(deep / all) + '%', 'Average scrolled',
          'how far down people got',
          bigSpark(days.map(function (d) { return d.depth / (d.views || 1); })))
        + tile(String(places.length), 'Places', 'countries and regions',
          delta(places.length, wasPlaces))
        + tile(busiest ? String(busiest.views) : '0', 'Busiest day',
          busiest ? dayName(busiest.key) + ' ' + shortDate(busiest.key) : 'nothing yet')
        + tile(days.length ? Math.round(all / days.length) + '' : '0', 'Views a day',
          'averaged over ' + days.length + ' day' + (days.length === 1 ? '' : 's'))
        + '</div>'
        + '<p class="cp-note">These are <b>views, not visitors</b>. Nothing identifying is '
        + 'recorded, so two views cannot be told apart and this screen will never claim a '
        + 'number of unique people. It also counts only readers whose browser runs '
        + 'JavaScript, which leaves out most search engine crawlers. What is deliberately '
        + 'not recorded is listed at the bottom of this screen.</p>',
    });
  }

  function dayTable(days, busiest, v) {
    var byDay = {};
    v.forEach(function (r) {
      if (!byDay[r.day]) byDay[r.day] = { pages: {}, places: {}, top: {} };
      byDay[r.day].pages[r.path] = 1;
      byDay[r.day].places[countryOf(r.zone)] = 1;
      byDay[r.day].top[r.path] = (byDay[r.day].top[r.path] || 0) + Number(r.views || 0);
    });
    var marks = marksFor(days) || {};
    return table(['Date', 'Day', 'Views', 'Pages', 'Places', 'Average time',
      'Average scroll', 'Most read', 'What happened'],
    days.slice().reverse().map(function (d) {
      var m = byDay[d.key] || { pages: {}, places: {}, top: {} };
      var top = Object.keys(m.top).sort(function (a, b) { return m.top[b] - m.top[a]; })[0];
      var did = marks[d.key] || [];
      return '<tr' + (busiest && d.key === busiest.key ? ' class="is-top"' : '') + '>'
        + '<td>' + esc(shortDate(d.key)) + '</td>'
        + '<td>' + esc(dayName(d.key)) + '</td>'
        + '<td><b>' + esc(String(d.views)) + '</b></td>'
        + '<td>' + esc(String(Object.keys(m.pages).length)) + '</td>'
        + '<td>' + esc(String(Object.keys(m.places).length)) + '</td>'
        + '<td>' + esc(dur(d.seconds / d.views)) + '</td>'
        + '<td>' + esc(String(Math.round(d.depth / d.views))) + '%</td>'
        + '<td class="cell-club">' + esc(top ? (nameOf(top) || top) : '') + '</td>'
        + '<td class="cell-club">' + esc(did.join(' · ')) + '</td></tr>';
    }).join(''));
  }

  function whenSection() {
    /* No hourly table is not the same as a quiet one, and the screen has to
       tell those apart: one is a file somebody has to execute, the other is a
       Tuesday nobody read the site. */
    if (hours === null) {
      return sec({
        title: 'When people read it',
        sub: 'Not switched on yet.',
        body: '<p class="cp-note">The hour of the day is recorded once '
          + '<b>migrations/009_page_routes.sql</b> has been run on the database. '
          + 'Everything else on this screen works without it, and running it changes nothing '
          + 'that is already being counted.</p>'
          + '<p class="cp-note">The hour is kept in a table of its own carrying no time zone, '
          + 'no traffic source and no device, so knowing when a page was read can never '
          + 'narrow down who read it.</p>',
      });
    }
    if (!hours.length) {
      return sec({
        title: 'When people read it',
        sub: 'Switched on, and nothing has come in yet.',
        body: '<p class="cp-note">The hour is being recorded and no views have carried one in '
          + 'this period. Views from before the site was last published do not have an hour, '
          + 'so this fills in from the next visitor onwards.</p>',
      });
    }
    /* The hourly table carries no zone, source or device by design, so three
       of the four filters cannot reach it. Saying so is better than quietly
       showing the whole site's hours under a country filter. */
    var mine = FILT.area
      ? hours.filter(function (r) { return areaOf(r.path) === FILT.area; })
      : hours;
    var narrowed = (FILT.country || FILT.source || FILT.device);
    return sec({
      title: 'When people read it',
      sub: 'Day of the week against hour of the day, and the whole period by hour.',
      body: heatmap(mine) + hourProfile(mine)
        + (narrowed
          ? '<p class="cp-note">The filters for country, source and device do not apply here. '
            + 'The hour is stored in its own table carrying none of those, which is what stops '
            + 'knowing when a page was read from narrowing down who read it. A filter by part '
            + 'of the site does apply, because the page is recorded.</p>'
          : ''),
    });
  }

  /* ---- The route through the site ----------------------------------------
     page_routes counts one step: where a view came from and the page it
     landed on. Where it came from is a page of this site ('/squad.html'), a
     sending site ('instagram.com') or nothing. A step is not a journey: with
     no identifier, two steps that share a page cannot be joined into one
     reader, and the section says so rather than drawing a path it cannot
     know. Country and device cannot reach it; part of the site can, and a
     source filter keeps the arrivals from that source. */
  function isPage(f) { return String(f || '').charAt(0) === '/'; }
  function pageLabel(p) { return nameOf(p) || p; }

  function steps(list) {
    var by = {};
    list.forEach(function (r) {
      var k = (r.came_from || '') + '\u0001' + r.path;
      by[k] = (by[k] || 0) + (Number(r.views) || 0);
    });
    return Object.keys(by).map(function (k) {
      var p = k.split('\u0001');
      return { from: p[0], to: p[1], views: by[k] };
    }).sort(function (a, b) { return b.views - a.views; });
  }

  function stepTable(heads, list, none) {
    var of = total(list);
    if (!of) return '<p class="cp-note">' + esc(none) + '</p>';
    return table(heads.concat(['Views', 'Share', '']), list.slice(0, 30).map(function (r) {
      return '<tr><td>' + esc(!r.from ? 'Direct or unknown'
          : (isPage(r.from) ? pageLabel(r.from) : r.from)) + '</td>'
        + '<td>' + esc(pageLabel(r.to)) + '</td>'
        + '<td><b>' + esc(String(r.views)) + '</b></td>'
        + '<td>' + esc(String(pct(r.views, of))) + '%</td>'
        + '<td style="width:22%">' + bar(r.views, of) + '</td></tr>';
    }).join(''));
  }

  function routeSection() {
    var title = 'The route through the site';
    if (routes === null) {
      return sec({
        title: title,
        sub: 'Not switched on yet.',
        body: '<p class="cp-note">Where each view came from and the page it landed on is '
          + 'recorded once <b>migrations/009_page_routes.sql</b> has been run on the '
          + 'database. It switches on <b>When people read it</b> at the same time.</p>',
      });
    }
    /* Part of the site narrows everything here. A source filter keeps the
       arrivals from that source and cannot reach a move between pages, which
       has no source; where people left is counted without it, because a
       page's exits are not a property of how its readers arrived. */
    var base = routes.filter(function (r) { return !FILT.area || areaOf(r.path) === FILT.area; });
    var mine = base.filter(function (r) {
      return !FILT.source
        || (!isPage(r.came_from) && (r.came_from || 'Direct or unknown') === FILT.source);
    });
    var list = steps(mine);
    if (!total(list)) {
      return sec({
        title: title,
        sub: 'Switched on, and nothing has come in yet.',
        body: '<p class="cp-note">Routes fill in from the next visitor onwards.</p>',
      });
    }
    var landed = mine.filter(function (r) { return !isPage(r.came_from); });
    return sec({
      title: title,
      sub: 'Where people arrived from and the page they landed on, how they moved from page '
        + 'to page, and where they left.',
      body: '<div class="cp2"><div><h4 class="cp-sub">Arrived from, and landed on</h4>'
        + stepTable(['Came from', 'Landed on'],
          list.filter(function (r) { return !isPage(r.from); }),
          'Nobody arrived from outside the site in this period.')
        + '</div><div><h4 class="cp-sub">Where people first landed</h4>'
        + countTable('Landing page', roll(landed, function (r) { return pageLabel(r.path); }),
          'Nobody arrived from outside the site in this period.')
        + '</div></div>'
        + '<h4 class="cp-sub">Day by day, by kind of arrival</h4>' + dayKind(mine)
        + '<h4 class="cp-sub">Page to page</h4>'
        + stepTable(['From', 'To'], list.filter(function (r) { return isPage(r.from); }),
          FILT.source ? 'A move between pages has no source, so a source filter leaves none.'
            : 'Nobody moved from one page to another in this period.')
        + '<h4 class="cp-sub">Where people left</h4>' + exitTable(base)
        + '<p class="cp-note"><b>Left here</b> is the views of a page that no later view came '
        + 'from, so it is the last page somebody read. Treat it as a good estimate: a link '
        + 'opened in a new tab counts as going on, and going back to a page already read can '
        + 'count as a second view of it.</p>'
        + '<p class="cp-note">Each row counts one step, never a person. Somebody who landed '
        + 'on the programme from Instagram and then opened the squad is two rows that share '
        + 'a page, and nothing can join them into one visit. Country and device filters do '
        + 'not apply: the route is kept in its own table without either.</p>',
    });
  }

  function countTable(head, list, none, unit) {
    var of = total(list);
    if (!of) return none ? '<p class="cp-note">' + esc(none) + '</p>' : '';
    return table([head, unit || 'Views', 'Share', ''], list.slice(0, 30).map(function (r) {
      return '<tr><td>' + esc(r.key) + '</td><td><b>' + esc(String(r.views)) + '</b></td>'
        + '<td>' + esc(String(pct(r.views, of))) + '%</td>'
        + '<td style="width:26%">' + bar(r.views, of) + '</td></tr>';
    }).join(''));
  }

  /* Arrivals by kind for each day, with the moves between pages beside them,
     so a spike can be read as what caused it: a Sunday of social media is a
     post, a Monday of search is a result somebody went looking for. */
  var KINDS = ['Search engines', 'Social media', 'Other websites', 'Direct or unknown'];
  function dayKind(list) {
    var by = {};
    list.forEach(function (r) {
      var d = by[r.day] || (by[r.day] = [0, 0, 0, 0, 0]);
      d[isPage(r.came_from) ? 4 : KINDS.indexOf(sourceGroup(r.came_from))] += Number(r.views || 0);
    });
    var keys = Object.keys(by).sort().reverse();
    if (!keys.length) return '';
    var tot = function (d) { return d.reduce(function (n, x) { return n + x; }, 0); };
    var max = Math.max.apply(null, keys.map(function (k) { return tot(by[k]); })) || 1;
    return table(['Day'].concat(KINDS, ['Page to page', 'Total', '']), keys.map(function (k) {
      return '<tr><td>' + esc(dayName(k) + ' ' + shortDate(k)) + '</td>'
        + by[k].map(function (n) { return '<td>' + esc(String(n)) + '</td>'; }).join('')
        + '<td><b>' + esc(String(tot(by[k]))) + '</b></td>'
        + '<td style="width:14%">' + bar(tot(by[k]), max) + '</td></tr>';
    }).join(''));
  }

  function exitTable(list) {
    var into = {}, on = {};
    list.forEach(function (r) {
      var n = Number(r.views || 0);
      into[r.path] = (into[r.path] || 0) + n;
      if (isPage(r.came_from) && r.came_from !== r.path) on[r.came_from] = (on[r.came_from] || 0) + n;
    });
    var out = Object.keys(into).map(function (p) {
      var went = Math.min(on[p] || 0, into[p]);
      return { p: p, views: into[p], went: went, left: into[p] - went };
    }).sort(function (a, b) { return b.left - a.left; });
    var of = out.reduce(function (n, r) { return n + r.left; }, 0);
    if (!out.length) return '';
    return table(['Page', 'Views', 'Went on', 'Left here', 'Left', ''],
      out.slice(0, 25).map(function (r) {
        return '<tr><td>' + esc(pageLabel(r.p)) + '</td><td><b>' + esc(String(r.views))
          + '</b></td><td>' + esc(String(r.went)) + '</td><td><b>' + esc(String(r.left))
          + '</b></td><td>' + esc(String(pct(r.left, r.views))) + '%</td>'
          + '<td style="width:18%">' + bar(r.left, of) + '</td></tr>';
      }).join(''));
  }

  /* ---- Chapters ----------------------------------------------------------- */
  var CHAPTERS = [['now', 'Headline and today'], ['trend', 'Trends'], ['who', 'Audience'],
    ['route', 'Arrivals and routes'], ['read', 'Content'], ['act', 'Engagement'],
    ['about', 'About the figures']];

  function chapter(i, body) {
    return '<div class="cpst__ch" id="st-' + CHAPTERS[i][0] + '">'
      + '<p class="cpst__eyebrow"><span>0' + (i + 1) + '</span>' + esc(CHAPTERS[i][1]) + '</p>'
      + body + '</div>';
  }

  function chapterNav() {
    return '<nav class="cpst__nav" aria-label="Sections of Website stats">'
      + CHAPTERS.map(function (c, i) {
        return '<button type="button" class="cpst__jump" data-jump="st-' + c[0] + '"><span>0'
          + (i + 1) + '</span>' + esc(c[1]) + '</button>';
      }).join('')
      + '<button type="button" class="btn btn--sm btn--primary cpst__present" data-report>'
      + 'Internal report</button></nav>';
  }

  /* ---- Today ---------------------------------------------------------------
     The period tables answer "how is it going"; this answers "is anybody on it
     now". The day is the database's, midnight to midnight UTC. */
  function todaySection() {
    var T = iso(new Date());
    var isToday = function (r) { return r.day === T; };
    var mine = view().filter(isToday);
    var n = total(mine);
    if (!n) {
      return sec({
        title: 'Today at a glance',
        sub: 'Nothing recorded yet today.',
        body: '<p class="cp-note">The day runs midnight to midnight UTC, which is 1am to 1am in '
          + 'summer, and a view is written when the reader leaves the page, so the first '
          + 'figures appear a few minutes after somebody visits.</p>',
      });
    }
    var rt = (routes || []).filter(isToday);
    var tg = (tags || []).filter(isToday);
    var clicks = sum((events || []).filter(isToday), function (r) { return r.count; });
    var pagesToday = roll(mine, function (r) { return pageLabel(r.path); });
    var placesToday = roll(mine, function (r) { return countryOf(r.zone); }).length;
    return sec({
      title: 'Today at a glance',
      sub: '<i class="cpst__live" aria-hidden="true"></i><b>' + esc(String(n)) + '</b> page view'
        + (n === 1 ? '' : 's') + ' so far today, from '
        + '<b>' + esc(String(placesToday)) + '</b> place' + (placesToday === 1 ? '' : 's') + '.',
      body: '<div class="cpt-grid cpst__today">'
        + tile(String(n), 'Views today', pagesToday.length + ' pages opened')
        + tile(String(total(rt.filter(function (r) { return !isPage(r.came_from); }))),
          'Arrivals', 'from outside the site')
        + tile(String(total(tg)), 'Tagged links opened', 'from links you shared')
        + tile(String(clicks), 'Clicks', 'downloads, donations, links')
        + '</div><div class="cp2"><div><h4 class="cp-sub">Most read today</h4>'
        + countTable('Page', pagesToday, 'Nothing yet.')
        + '</div><div><h4 class="cp-sub">Where today’s views came from</h4>'
        + countTable('Source', roll(mine, function (r) { return r.source || 'Direct or unknown'; }),
          'Nothing yet.')
        + '</div></div>'
        + (rt.length ? '<h4 class="cp-sub">Today’s routes</h4>'
          + stepTable(['From', 'To'], steps(rt), 'No routes yet today.') : ''),
    });
  }

  /* ---- The shape of it ------------------------------------------------------ */
  function ymd(t) {
    var m = t.getMonth() + 1, d = t.getDate();
    return t.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (d < 10 ? '0' : '') + d;
  }
  /* Every calendar day in the period, including the ones nobody visited: an
     average Sunday is the Sundays' views over the number of Sundays, and a
     quiet Sunday that wrote no rows is still a Sunday. */
  function calendar(days) {
    var R = range();
    var from = R.n ? R.from : (days[0] && days[0].key);
    var to = R.n ? R.to : (days.length && days[days.length - 1].key);
    var out = [];
    if (!from || !to) return out;
    var t = new Date(from + 'T12:00:00');
    while (out.length < 800) {
      var k = ymd(t);
      if (!(k <= to)) break;
      out.push(k);
      t.setDate(t.getDate() + 1);
    }
    return out;
  }
  function weekOf(day) {
    var t = new Date(day + 'T12:00:00');
    t.setDate(t.getDate() - ((t.getDay() + 6) % 7));
    return ymd(t);
  }

  function columns(list, label) {
    if (!list.length) return '';
    var W = 640, H = 180, T = 20, B = 26, L = 4;
    var max = Math.max.apply(null, list.map(function (c) { return c.views; })) || 1;
    var bw = (W - L * 2) / list.length;
    var every = Math.ceil(list.length / 12);
    return '<div class="cpc cpcol"><svg class="cpc__svg" viewBox="0 0 ' + W + ' ' + H
      + '" role="img" aria-label="' + esc(label + ': ' + list.map(function (c) {
        return c.label + ' ' + c.views;
      }).join(', ')) + '">'
      + list.map(function (c, i) {
        var h = (c.views / max) * (H - T - B);
        var x = L + i * bw + bw * 0.14;
        var mid = (x + bw * 0.36).toFixed(1);
        return '<rect class="cpcol__b' + (c.views === max ? ' is-top' : '') + '" style="--i:' + i
          + '" data-tip="' + esc(c.title || (c.label + ': ' + c.views)) + '" x="' + x.toFixed(1)
          + '" y="' + (H - B - Math.max(1, h)).toFixed(1) + '" width="' + (bw * 0.72).toFixed(1)
          + '" height="' + Math.max(1, h).toFixed(1) + '" rx="3"><title>'
          + esc(c.title || (c.label + ': ' + c.views)) + '</title></rect>'
          + (list.length <= 16 ? '<text class="cpcol__n" x="' + mid + '" y="'
            + (H - B - h - 6).toFixed(1) + '" text-anchor="middle">' + esc(String(c.views)) + '</text>' : '')
          + (i % every ? '' : '<text class="cpcol__x" x="' + mid + '" y="' + (H - 8)
            + '" text-anchor="middle">' + esc(c.label) + '</text>');
      }).join('') + '</svg></div>';
  }

  /* What a match day is worth, which is the figure a sponsor asks about. The
     club's own match dates, from the catalogue, against every other day. */
  function matchdayEffect(span, byDay) {
    if (!CAT) return '';
    var match = {};
    CAT.forEach(function (e) { if (e.k === 'match' && e.d) match[e.d] = 1; });
    var md = { n: 0, v: 0 }, od = { n: 0, v: 0 };
    span.forEach(function (k) {
      var t = match[k] ? md : od;
      t.n += 1;
      t.v += byDay[k] || 0;
    });
    if (!md.n || !od.n) return '';
    var a = Math.round((md.v / md.n) * 10) / 10;
    var b = Math.round((od.v / od.n) * 10) / 10;
    var said = !b ? 'Match days bring views on days that otherwise have none.'
      : (a >= b ? 'A match day brings ' + Math.round((a / b) * 10) / 10
        + ' times the views of any other day.'
        : 'A match day brought fewer views than an ordinary day in this period.');
    return '<div class="cpst__vs"><div class="cpst__vsi"><b>' + esc(String(a)) + '</b>'
      + '<span>views on an average match day</span><small>' + esc(md.n + ' match day'
        + (md.n === 1 ? '' : 's')) + '</small></div>'
      + '<div class="cpst__vsx" aria-hidden="true">v</div>'
      + '<div class="cpst__vsi"><b>' + esc(String(b)) + '</b><span>on any other day</span>'
      + '<small>' + esc(od.n + ' other day' + (od.n === 1 ? '' : 's')) + '</small></div></div>'
      + '<p class="cp-note">' + esc(said) + ' A match day is the date of the club’s own match '
      + 'report.</p>';
  }

  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
    'September', 'October', 'November', 'December'];
  function monthTable(v) {
    var ms = roll(v, function (r) { return String(r.day).slice(0, 7); })
      .sort(function (a, b) { return a.key < b.key ? 1 : -1; });
    if (!ms.length) return '';
    var opened = {};
    v.forEach(function (r) {
      var k = String(r.day).slice(0, 7);
      (opened[k] || (opened[k] = {}))[r.path] = 1;
    });
    var max = Math.max.apply(null, ms.map(function (m) { return m.views; })) || 1;
    return table(['Month', 'Views', 'Pages opened', 'Average time', 'Against the month before', ''],
      ms.map(function (m, i) {
        var was = ms[i + 1];
        var ch = was && was.views ? Math.round(((m.views - was.views) / was.views) * 100) : null;
        return '<tr><td>' + esc(MONTHS[Number(m.key.slice(5, 7)) - 1] + ' ' + m.key.slice(0, 4))
          + '</td><td><b>' + esc(String(m.views)) + '</b></td><td>'
          + esc(String(Object.keys(opened[m.key]).length)) + '</td><td>'
          + esc(dur(m.seconds / m.views)) + '</td>'
          + (ch === null ? '<td>The first month here</td>'
            : '<td class="cpd--' + (ch > 0 ? 'up' : (ch < 0 ? 'down' : 'flat')) + '">'
              + esc((ch > 0 ? '+' : '') + ch + '%') + '</td>')
          + '<td style="width:18%">' + bar(m.views, max) + '</td></tr>';
      }).join(''));
  }

  function trendsSection(v, days) {
    var span = calendar(days);
    if (span.length < 2 || !days.length) return '';
    var byDay = {};
    days.forEach(function (d) { byDay[d.key] = d.views; });
    var names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    var sumW = [0, 0, 0, 0, 0, 0, 0], nW = [0, 0, 0, 0, 0, 0, 0];
    span.forEach(function (k) {
      var i = (new Date(k + 'T12:00:00').getDay() + 6) % 7;
      sumW[i] += byDay[k] || 0;
      nW[i] += 1;
    });
    var week = names.map(function (n, i) {
      var avg = nW[i] ? Math.round((sumW[i] / nW[i]) * 10) / 10 : 0;
      return { label: n.slice(0, 3), views: avg,
        title: 'An average ' + n + ': ' + avg + ' views, over ' + nW[i] + ' ' + n + 's' };
    });
    var weeks = roll(v, function (r) { return weekOf(r.day); })
      .sort(function (a, b) { return a.key < b.key ? -1 : 1; })
      .map(function (w) {
        return { label: shortDate(w.key), views: w.views,
          title: 'The week starting ' + dayName(w.key) + ' ' + shortDate(w.key) + ': '
            + w.views + ' views' };
      });
    return sec({
      title: 'The shape of it',
      sub: 'What a match day is worth, the average day of the week, and the same views week '
        + 'by week and month by month.',
      body: matchdayEffect(span, byDay)
        + '<div class="cp2"><div><h4 class="cp-sub">An average day of the week</h4>'
        + columns(week, 'Average views by day of the week')
        + '</div><div><h4 class="cp-sub">Week by week</h4>'
        + (weeks.length > 1 ? columns(weeks, 'Views a week, by the Monday it starts')
          : '<p class="cp-note">One week so far.</p>')
        + '</div></div><h4 class="cp-sub">Month by month</h4>' + monthTable(v),
    });
  }

  /* A ring, one accent at falling strengths, because orange is the only hue
     this panel has and a second one would be a category pretending to be a
     scale. The legend says every share in words. */
  function donut(list, all, label) {
    if (!all || !list.length) return '';
    var C = 2 * Math.PI * 42, off = 0;
    var shade = [1, 0.62, 0.38, 0.22, 0.12];
    var top = list.slice(0, 5);
    return '<div class="cpdn"><svg class="cpdn__svg" viewBox="0 0 120 120" role="img" aria-label="'
      + esc(label + ': ' + top.map(function (r) { return r.key + ' ' + pct(r.views, all) + '%'; })
        .join(', ')) + '"><g transform="rotate(-90 60 60)"><circle class="cpdn__well" cx="60" '
      + 'cy="60" r="42"/>'
      + top.map(function (r, i) {
        var len = (C * r.views) / all;
        var seg = '<circle class="cpdn__seg" cx="60" cy="60" r="42" style="stroke-opacity:'
          + shade[i] + '" stroke-dasharray="' + len.toFixed(2) + ' ' + (C - len).toFixed(2)
          + '" stroke-dashoffset="' + (-off).toFixed(2) + '"><title>'
          + esc(r.key + ': ' + r.views + ' (' + pct(r.views, all) + '%)') + '</title></circle>';
        off += len;
        return seg;
      }).join('')
      + '</g><text class="cpdn__n" x="60" y="62">' + esc(pct(top[0].views, all) + '%') + '</text>'
      + '<text class="cpdn__l" x="60" y="77">' + esc(String(top[0].key).length > 14 ? String(top[0].key).split(' ')[0] : String(top[0].key)) + '</text></svg>'
      + '<ul class="cpdn__key">' + top.map(function (r, i) {
        return '<li><i class="cpdn__sw" style="opacity:' + shade[i] + '"></i><span>' + esc(r.key)
          + '</span><b>' + esc(pct(r.views, all) + '%') + '</b></li>';
      }).join('') + '</ul></div>';
  }

  /* ---- Links the club shares ------------------------------------------------ */
  function tagBuilder() {
    var pagesList = (CAT || []).filter(function (e) { return e.k !== 'panel'; })
      .map(function (e) { return e.p; });
    if (!pagesList.length) {
      pagesList = ['/index.html', '/programme.html', '/squad.html', '/sponsors.html', '/donate.html'];
    }
    return '<div class="cpst__tagger">'
      + '<label class="cpf__one"><span class="cpf__l">Page to link to</span>'
      + '<select class="select input--sm" data-tag-page>' + pagesList.slice(0, 250).map(function (p) {
        return '<option value="' + esc(p) + '">' + esc(pageLabel(p)) + '</option>';
      }).join('') + '</select></label>'
      + '<label class="cpf__one"><span class="cpf__l">Tag, for example insta-story</span>'
      + '<input class="input input--sm" data-tag-name value="insta-story" maxlength="40"></label>'
      + '<label class="cpf__one cpst__tagout"><span class="cpf__l">Link to post</span>'
      + '<input class="input input--sm" data-tag-out readonly value="'
      + esc(SITE + pagesList[0] + '?from=insta-story') + '"></label>'
      + '<button type="button" class="btn btn--sm btn--primary" data-tag-copy>Copy link</button></div>';
  }

  function tagSection() {
    var title = 'Links you shared';
    var how = '<p class="cp-note">Apps like Instagram and WhatsApp do not say where a click came '
      + 'from, so those visits read as <b>Direct or unknown</b>. Build a link here, post it, and '
      + 'every visit through it is counted under its tag. The tag is taken out of the address '
      + 'bar when the page opens, so it is not passed on when somebody shares the page again.</p>';
    if (tags === null) {
      return sec({
        title: title,
        sub: 'Not switched on yet.',
        body: '<p class="cp-note">Tagged links are counted once '
          + '<b>migrations/010_page_events.sql</b> has been run on the database. It switches on '
          + '<b>What people clicked</b> at the same time.</p>' + tagBuilder() + how,
      });
    }
    var mine = tags.filter(function (r) {
      return r.tag && (!FILT.area || areaOf(r.path) === FILT.area);
    });
    return sec({
      title: title,
      sub: 'Which of the links the club posted sent people, and to which page.',
      body: tagBuilder() + how
        + (total(mine)
          ? '<div class="cp2"><div><h4 class="cp-sub">By tag</h4>'
            + countTable('Tag', roll(mine, function (r) { return r.tag; }), '')
            + '</div><div><h4 class="cp-sub">Tag and the page it opened</h4>'
            + stepTable(['Tag', 'Landed on'], steps(mine.map(function (r) {
              return { came_from: r.tag, path: r.path, views: r.views };
            })), '') + '</div></div>'
          : '<p class="cp-note">No tagged links have been opened in this period.</p>'),
    });
  }

  /* ---- What people clicked --------------------------------------------------- */
  var EVK = { download: 'Downloads', donate: 'Donate button', social: 'Social media links',
    outbound: 'Links to other websites', contact: 'Email and phone links',
    video: 'Videos played', form: 'Forms sent' };

  function clickSection() {
    var title = 'What people clicked';
    if (events === null) {
      return sec({
        title: title,
        sub: 'Not switched on yet.',
        body: '<p class="cp-note">Downloads, donation clicks, links to sponsors and social media, '
          + 'videos played and forms sent are counted once <b>migrations/010_page_events.sql</b> '
          + 'has been run on the database.</p>',
      });
    }
    var mine = events.filter(function (r) {
      return r.kind && (!FILT.area || areaOf(r.path) === FILT.area);
    });
    var n = sum(mine, function (r) { return r.count; });
    if (!n) {
      return sec({
        title: title,
        sub: 'Switched on, and nothing clicked yet in this period.',
        body: '<p class="cp-note">Clicks fill in from the next visitor onwards.</p>',
      });
    }
    var kinds = roll(mine.map(function (r) { return { k: EVK[r.kind] || r.kind, views: r.count }; }),
      function (r) { return r.k; });
    var by = {};
    mine.forEach(function (r) {
      var k = JSON.stringify([r.kind, r.target || '', r.path]);
      by[k] = (by[k] || 0) + Number(r.count || 0);
    });
    var each = Object.keys(by).map(function (k) {
      var p = JSON.parse(k);
      return { kind: p[0], target: p[1], path: p[2], n: by[k] };
    }).sort(function (a, b) { return b.n - a.n; });
    return sec({
      title: title,
      sub: '<b>' + esc(String(n)) + '</b> click' + (n === 1 ? '' : 's')
        + ' on the things that matter: downloads, donations, links out, videos and forms.',
      body: '<div class="cp2"><div>' + donut(kinds, n, 'Clicks by kind') + '</div><div>'
        + countTable('What', kinds, '', 'Clicks') + '</div></div>'
        + '<h4 class="cp-sub">Click by click</h4>'
        + table(['What', 'Where to', 'On page', 'Clicks'], each.slice(0, 40).map(function (r) {
          return '<tr><td>' + esc(EVK[r.kind] || r.kind) + '</td><td>'
            + esc(isPage(r.target) ? pageLabel(r.target) : (r.target || 'Not known')) + '</td><td>'
            + esc(pageLabel(r.path)) + '</td><td><b>' + esc(String(r.n)) + '</b></td></tr>';
        }).join(''))
        + '<p class="cp-note">Counted the moment somebody clicks, by page, kind and target for the '
        + 'day. A link to a sponsor shows as its website under <b>Links to other websites</b>, '
        + 'which is the figure to quote to them.</p>',
    });
  }

  function notHere() {
    return sec({
      title: 'What is not here, and why',
      body: '<p class="cp-note"><b>Visitors.</b> There is no identifier of any kind, so two '
        + 'views cannot be told apart and a count of people is a number this cannot '
        + 'honestly produce. Every figure above is <b>views, not visitors</b>.</p>'
        + '<p class="cp-note"><b>A journey.</b> Moves between pages are counted one step at '
        + 'a time, so this can say how many views of the squad came from the programme but '
        + 'can never follow one reader from page to page - by anybody, including somebody '
        + 'with the database open.</p>'
        + '<p class="cp-note"><b>Who clicked.</b> A click is counted by page, kind and target '
        + 'for the day, never against a view or a person, and nothing typed into a form is '
        + 'ever read.</p>'
        + '<p class="cp-note"><b>Readers without JavaScript</b>, which is most search engine '
        + 'crawlers. The real number of page requests is higher than the figures here.</p>'
        + '<p class="cp-note"><b>Anything finer than the hour</b>, and the hour is kept in '
        + 'its own table carrying no zone, source or device, so knowing when a page was '
        + 'read never narrows down who read it.</p>',
    });
  }

  /* ---- The sponsor report ------------------------------------------------------
     The same figures, as a page somebody can be handed: warm paper, the big
     numbers first, the charts a sponsor asks about, and the honest footnote.
     It is drawn from whatever the screen is showing, filters and period
     included, and printed with the rest of the panel hidden. */
  function kpi(v, l) {
    return '<div class="cprep__kpi"><b>' + esc(String(v)) + '</b><span>' + esc(l) + '</span></div>';
  }
  function rlist(list, of) {
    return '<ol class="cprep__list">' + list.map(function (r) {
      return '<li><span>' + esc(r.key) + '</span><b>' + esc(pct(r.views, of) + '%') + '</b></li>';
    }).join('') + '</ol>';
  }

  function report() {
    var v = view();
    var all = total(v);
    if (!all) return '';
    var days = roll(v, function (r) { return r.day; })
      .sort(function (a, b) { return a.key < b.key ? -1 : 1; });
    var places = roll(v, function (r) { return countryOf(r.zone); });
    var pagesRead = roll(v, function (r) { return pageLabel(r.path); });
    var span = calendar(days);
    var byDay = {};
    days.forEach(function (d) { byDay[d.key] = d.views; });
    var first = days[0].key, last = days[days.length - 1].key;
    var clicks = events ? roll(events.filter(function (r) { return r.kind; }).map(function (r) {
      return { k: EVK[r.kind] || r.kind, views: r.count };
    }), function (r) { return r.k; }) : [];
    var byHour = {};
    (hours || []).forEach(function (r) { byHour[r.hour] = (byHour[r.hour] || 0) + Number(r.views || 0); });
    var peak = Object.keys(byHour).sort(function (a, b) { return byHour[b] - byHour[a]; })[0];
    var narrowed = Object.keys(FILT).map(function (k) { return FILT[k]; }).filter(Boolean);
    var townRows = (towns || []).filter(function (r) { return r.country; });
    var townsN = total(townRows);
    var trips = trails ? journeyData().filter(function (t) { return t.views > 0; })
      .sort(function (a, b) { return b.views - a.views; }) : [];
    var tripN = total(trips);
    return '<div class="cprep" role="dialog" aria-modal="true" aria-labelledby="cprep-h">'
      + '<div class="cprep__bar"><button type="button" class="btn btn--sm btn--primary" '
      + 'data-report-print>Print or save as PDF</button><button type="button" '
      + 'class="btn btn--sm btn--ghost" data-report-close>Close</button></div>'
      + '<article class="cprep__doc"><header class="cprep__head">'
      + '<p class="cprep__kicker">Website audience report</p>'
      + '<p class="cprep__notice">For the club’s own use. These figures come from anonymous '
      + 'statistics the law lets the website keep only to improve itself, so they are not for '
      + 'sharing outside the club. Figures for sponsors come from visitors who have agreed to be '
      + 'counted for that.</p>'
      + '<h2 id="cprep-h" class="cprep__title">Sue’s Angels FC</h2>'
      + '<p class="cprep__period">' + esc(shortDate(first) + ' to ' + shortDate(last) + ' '
        + last.slice(0, 4) + ' · suesangelsfc.co.uk'
        + (narrowed.length ? ' · narrowed to ' + narrowed.join(', ') : '')) + '</p></header>'
      + '<div class="cprep__kpis">'
      + kpi(all, 'page views')
      + kpi(Math.round((all / Math.max(1, span.length || days.length)) * 10) / 10, 'views a day')
      + kpi(places.length, 'countries and regions')
      + kpi(dur(sum(v, function (r) { return r.seconds_total; }) / all), 'average time on a page')
      + kpi(Math.round(sum(v, function (r) { return r.depth_total; }) / all) + '%',
        'of each page read on average')
      + kpi(pagesRead.length, 'different pages read')
      + '</div><h3 class="cprep__h">Views, day by day</h3>'
      + trend(days, { marks: marksFor(days) }) + matchdayEffect(span, byDay)
      + '<div class="cprep__two"><div><h3 class="cprep__h">How people find the site</h3>'
      + donut(roll(v, function (r) { return sourceGroup(r.source); }), all, 'How views arrived')
      + '</div><div><h3 class="cprep__h">What they read it on</h3>'
      + donut(roll(v, function (r) { return r.device || 'Not known'; }), all, 'Devices')
      + '</div></div><h3 class="cprep__h">Where in the world</h3>' + worldMap(places, all)
      + '<div class="cprep__two"><div><h3 class="cprep__h">Top countries and regions</h3>'
      + rlist(places.slice(0, 6), all) + '</div><div><h3 class="cprep__h">Most read</h3>'
      + rlist(pagesRead.slice(0, 6), all) + '</div></div>'
      + (townsN ? '<div class="cprep__two"><div><h3 class="cprep__h">Across the UK and Ireland</h3>'
        + ukMap(townRows.filter(isUK), townsN) + '</div><div><h3 class="cprep__h">Top towns and cities</h3>'
        + rlist(roll(townRows, townName).slice(0, 10), townsN) + '</div></div>' : '')
      + (tripN ? '<h3 class="cprep__h">How readers move through the site</h3><div class="cprep__kpis">'
        + kpi(tripN, 'journeys through the site')
        + kpi(Math.round((trips.reduce(function (n, t) { return n + t.views * t.pages.length; }, 0) / tripN) * 10) / 10,
          'pages read in a journey')
        + kpi(pct(total(trips.filter(function (t) { return t.pages.length > 1; })), tripN) + '%',
          'went on to a second page')
        + '</div>' + journeyList(trips.slice(0, 5), tripN) : '')
      + (clicks.length ? '<h3 class="cprep__h">What readers did</h3><div class="cprep__kpis">'
        + clicks.slice(0, 6).map(function (c) { return kpi(c.views, c.key.toLowerCase()); }).join('')
        + '</div>' : '')
      + '<footer class="cprep__foot">' + esc((peak !== undefined
        ? 'The busiest hour of the day is ' + (peak < 10 ? '0' : '') + peak + ':00. ' : '')
        + 'Every figure is a page view counted on the club’s own website, not a count of people: '
        + 'nothing identifying is recorded, so one person reading three pages is three views, and '
        + 'readers whose browsers block scripts are not counted. Where in the world comes from '
        + 'the time zone the reader’s device is set to. Prepared ' + shortDate(iso(new Date()))
        + ' ' + iso(new Date()).slice(0, 4) + '.') + '</footer></article></div>';
  }

  function openReport(from) {
    var old = document.querySelector('.cprep');
    if (old && old.parentNode) old.parentNode.removeChild(old);
    var wrap = document.createElement('div');
    wrap.innerHTML = report();
    var el = wrap.firstChild;
    if (!el) return;
    document.body.appendChild(el);
    var close = function () {
      if (el.parentNode) el.parentNode.removeChild(el);
      if (from && from.focus) from.focus();
    };
    var shut = el.querySelector('[data-report-close]');
    shut.addEventListener('click', close);
    el.querySelector('[data-report-print]').addEventListener('click', function () { window.print(); });
    el.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    if (shut.focus) shut.focus();
  }

  /* ---- A figure's own shape, under the figure ---------------------------- */
  function bigSpark(series) {
    if (!series || series.length < 3) return '';
    var W = 120, H = 30;
    var max = Math.max.apply(null, series) || 1;
    var step = W / (series.length - 1);
    var pts = series.map(function (v, i) {
      return (i * step).toFixed(1) + ' ' + (H - 2 - ((v || 0) / max) * (H - 5)).toFixed(1);
    });
    return '<svg class="cpt__spark" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" '
      + 'aria-hidden="true" focusable="false"><path class="cpt__sparka" d="M0 ' + H + 'L'
      + pts.join('L') + 'L' + W + ' ' + H + 'Z"/><path class="cpt__sparkl" d="M' + pts.join('L')
      + '"/></svg>';
  }

  /* ==========================================================================
     WHERE THEY ARE, TO THE TOWN (migrations/011)

     Vercel works out an approximate place from the connection and /api/view
     passes it to the database; nothing that could identify the reader is
     kept. A town's position is rounded to a tenth of a degree, which is the
     scale of a town, and the UK close-up is its own dot grid: 100 by 149
     cells rasterised from Natural Earth's 1:50m land outline, because the
     world grid gives Great Britain about six dots.
     ========================================================================== */
  var UK = {"cols":100,"rows":149,"W0":-11,"N0":61,"dLon":0.132414,"dLat":0.075,"grid":"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAKAAAAAAAAAAAAAAABgAAAAAAAAAAAAAAADAAAAAAAAAAAAAAAAGAAAAAAAAAAAAAAAB4AAAAAAAAAAAAAAADgAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAAAAAAAAAAAAAAAAwAAAAAAAAAAAAAAABQAAAAAAAAAAAAAAAIAAAAAAAAAAAAAAAAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAAAAAAAAAAAAABg/wAAAAAAAAAAAAAH//AAAAAAAAAAAAMAf/8AAAAAAAAAAABwB//gAAAAAAAAAAAPAH/8AAAAAAAAAAAD4B//gAAAAAAAAAAAPAP/4AAAAAAAAAAAA+A//AAAAAAAAAAAADwB/4AAAAAAAAAAAAEAH/gAAAAAAAAAAAAgD//AAAAAAAAAAAAAAP/4AAAAAAAAAAAAgQ//D/8AAAAAAAAAGDD/9//4AAAAAAAAAAeP////wAAAAAAAAAD5////+AAAAAAAAAEHj////4AAAAAAAAAQGH////AAAAAAAAABAff///8AAAAAAAAAEAJ////gAAAAAAAAAAAH///+AAAAAAAAACAQ////4AAAAAAAAAAAH////AAAAAAAAAAAAP///8AAAAAAAAAAAH////gAAAAAAAAAAAP///8AAAAAAAAAAAT9///wAAAAAAAAAAAMH//+AAAAAAAAAAAAc///gAAAAAAAAAAADj//7AAAAAAAAAAAAcf//+AAAAAAAAAAAAB///4AAAAAAAAAAAAHf/8AAAAAAAAAAAABbf/gAAAAAAAAAAAAJd/wcAAAAAAAAAAAAlH//8AAAAAAAAAAAcQ///4AAAAAAAAAADhD///wAAAAAAAAAACFP///gAAAAAAAAAAI8f///AAAAAAAAAAADY///+AAAAAAAAAAAJj///4AAAAAAAAAAAgf///gAAAAAAAACACB///+AAAAAAAAA8AAP///8AAAAAAAA/z4A////wAAAAAAAP2/wH////AAAAAAAA///Af///8AAAAAAAD//8D/+P/4AAAAAAAP//4P/j//gAAAAAAB///wXcf/+AAAAAAAf///BAB//8AAAAAAB///+AAP//wAAAAAAAf//4AA///wAAAAAAB///QAD///wAAAAAAf//8AAP///gAAAAAD///4BAf//+AAAAB4P///gMB///8AAAAf////4AwD///4AAAA/////gGAE///wAAAB////0AAAH///AAAA3///+AAAAf//8AAAB////4AAAD///wAAAAf///wAAAP///AAAAH////AAAA///+AAAA////8AAAB///oAAAB////wAAAP///AAAAf////gAAA///+AAAB////+AAAD///8AAAB////4AGAX///4AAAB////gAcPv///gAAAEf//+AB3////+AAAAB///4AD/////8AAAAf///gAP/////gAAAD///+AA/////8AAAAP///8AH/////x8AAA////gAj/////P8AAH///+AAP//////4AA+///wAAf//////wAH3///AAD///////AAH///8AAP//////8AA////wAAf//////wAP///+AAD///////AAf///wAAP//////8AN////gAB///////gB////AAAP//////+AA///gAAD///////4AH//8AAA////////AA///AAAP///////wAH//YAAB////////gAd/8AAAD///////8AAP/wAAAPP/////+AABn8AAAAYP/v///8AAA/gAAAABv9////wAAGgAAAAAAfP///4AAAAAAAAAAA4////wAAAAAAAAAAAH////3AAAAAAAAAAA/////8AAAAAAAAAHn/////wAAAAAAAAB//////+AAAAAAAAAH//////gAAAAAAAAB//////+BwAAAAAAAH//////gPAAAAAAAAf///n/4B8AAAAAAAD///9AAAHwAAAAAAAf/h8eAAAfAAAAAAAB/4CQQAAB8AAAAAAAP/gAAAAAHwAAAAAAB/+AAAAAAfAAAAAAAP7wAAAAAB8AAAAAAA8HAAAAAAHwAAAAAAPAIAAAAAAfAAAAAAB4AAAAAAAD8AAAAAAJgAAAAAAAPwAAAAAAAAAAAAAAB/AAAAAAAAAAAAAAAf8AAAAAAAAAAAAAAP/w"};
  var UKR = { ENG: 'England', SCT: 'Scotland', WLS: 'Wales', NIR: 'Northern Ireland' };
  var DN = null;
  function countryName(code) {
    try {
      DN = DN || new Intl.DisplayNames(['en-GB'], { type: 'region' });
      return DN.of(String(code)) || String(code);
    } catch (e) { return String(code); }
  }
  function regionName(r) {
    if (r.country === 'GB' && UKR[r.region]) return UKR[r.region];
    return (r.region ? r.region + ', ' : '') + countryName(r.country);
  }
  function townName(r) {
    return (r.city || 'Somewhere') + (r.country === 'GB' ? '' : ', ' + countryName(r.country));
  }
  function isUK(r) { return /^(GB|IE|IM|JE|GG)$/.test(r.country); }

  function townPoints(list) {
    var by = {};
    list.forEach(function (r) {
      if (r.lat == null || r.lon == null || r.lat === '' || r.lon === '') return;
      var k = townName(r);
      var t = by[k] || (by[k] = { key: k, lat: Number(r.lat), lon: Number(r.lon), views: 0 });
      t.views += Number(r.views || 0);
    });
    return Object.keys(by).map(function (k) { return by[k]; })
      .filter(function (t) { return isFinite(t.lat) && isFinite(t.lon); })
      .sort(function (a, b) { return b.views - a.views; });
  }

  var ukPath = null;
  function ukLand() {
    if (ukPath !== null) return ukPath;
    ukPath = '';
    if (typeof atob !== 'function') return ukPath;
    try {
      var raw = atob(UK.grid);
      var d = [];
      for (var i = 0; i < UK.cols * UK.rows; i++) {
        if (!(raw.charCodeAt(i >> 3) & (128 >> (i & 7)))) continue;
        d.push('M' + ((i % UK.cols) + 0.5) + ' ' + (Math.floor(i / UK.cols) + 0.5) + 'h.01');
      }
      ukPath = d.join('');
    } catch (e) { ukPath = ''; }
    return ukPath;
  }

  function bubbles(pts, all, at, size, labels) {
    var big = pts.length ? pts[0].views : 1;
    /* Labels go to the biggest towns first and are skipped where they would
       land on one already placed: the towns around London are a few map
       cells apart, and five names on top of each other is no names at all.
       On the eastern side a label sits to the left of its marker so it stays
       on the map. */
    var placed = [];
    var label = function (p, xy, r) {
      var name = p.key.split(',')[0];
      var w = name.length * 1.95, h = 4.4;
      var left = xy[0] > UK.cols * 0.62;
      var x = left ? xy[0] - r - 1.2 - w : xy[0] + r + 1.2;
      var y = xy[1] - h / 2;
      if (placed.some(function (b) {
        return x < b[0] + b[2] && x + w > b[0] && y < b[1] + b[3] && y + h > b[1];
      })) return '';
      placed.push([x, y, w, h]);
      return '<text class="cpuk__lb" x="' + (left ? xy[0] - r - 1.2 : xy[0] + r + 1.2).toFixed(1)
        + '" y="' + (xy[1] + 1.3).toFixed(1) + '" text-anchor="' + (left ? 'end' : 'start') + '">'
        + esc(name) + '</text>';
    };
    return pts.map(function (p, i) {
      var xy = at(p);
      var r = size[0] + Math.sqrt(p.views / big) * size[1];
      var tip = p.key + ': ' + p.views + ' view' + (p.views === 1 ? '' : 's') + ', ' + pct(p.views, all) + '%';
      return (i < 3 ? '<circle class="cpuk__pulse" cx="' + xy[0].toFixed(1) + '" cy="' + xy[1].toFixed(1)
        + '" r="' + r.toFixed(2) + '"/>' : '')
        + '<circle class="cpuk__hit" style="--i:' + i + '" cx="' + xy[0].toFixed(1) + '" cy="'
        + xy[1].toFixed(1) + '" r="' + r.toFixed(2) + '" data-tip="' + esc(tip) + '"/>'
        + (i < labels ? label(p, xy, r) : '');
    }).join('');
  }

  function ukMap(list, all) {
    var dots = ukLand();
    if (!dots) return '';
    var pts = townPoints(list).filter(function (p) {
      var x = (p.lon - UK.W0) / UK.dLon, y = (UK.N0 - p.lat) / UK.dLat;
      return x >= 0 && x <= UK.cols && y >= 0 && y <= UK.rows;
    }).slice(0, 40);
    return '<figure class="cpuk"><figcaption class="cpuk__t">The UK and Ireland</figcaption>'
      + '<svg class="cpuk__svg" viewBox="0 0 ' + UK.cols + ' ' + UK.rows + '" role="img" aria-label="'
      + esc('Map of the UK and Ireland with a marker on each town readers came from. '
        + pts.slice(0, 8).map(function (p) { return p.key + ', ' + p.views; }).join('. '))
      + '"><path class="cpuk__land" d="' + dots + '"/>'
      + bubbles(pts, all, function (p) {
        return [(p.lon - UK.W0) / UK.dLon, (UK.N0 - p.lat) / UK.dLat];
      }, [1.4, 5.6], 6) + '</svg></figure>';
  }

  function townWorld(list, all) {
    var dots = land();
    if (!dots) return '';
    var pts = townPoints(list).slice(0, 60);
    return '<figure class="cpuk cpuk--world"><figcaption class="cpuk__t">Everywhere</figcaption>'
      + '<svg class="cpuk__svg" viewBox="0 0 ' + MAP_W + ' ' + MAP_H + '" role="img" aria-label="'
      + esc('World map with a marker on each town readers came from. '
        + pts.slice(0, 8).map(function (p) { return p.key + ', ' + p.views; }).join('. '))
      + '"><path class="cpm__land" d="' + dots + '"/>'
      + bubbles(pts, all, function (p) { return project(p.lon, p.lat); }, [0.7, 3.4], 0)
      + '</svg></figure>';
  }

  function placesSection() {
    var title = 'Where they are';
    if (towns === null) {
      return sec({
        title: title,
        sub: 'Not switched on yet.',
        body: '<p class="cp-note">Towns and cities are recorded once '
          + '<b>migrations/011_page_places_trails.sql</b> has been run on the database. Until then '
          + '<b>Where in the world</b> below works it out from the device’s time zone.</p>',
      });
    }
    var mine = towns.filter(function (r) {
      return r.country && (!FILT.country || countryName(r.country) === FILT.country);
    });
    var n = total(mine);
    if (!n) {
      return sec({
        title: title,
        sub: 'Switched on, and nothing has come in yet.',
        body: '<p class="cp-note">Places fill in from the next visitor onwards.</p>',
      });
    }
    var byTown = roll(mine, townName);
    var byRegion = roll(mine, regionName);
    var byCountry = roll(mine, function (r) { return countryName(r.country); });
    var home = total(mine.filter(isUK));
    return sec({
      title: title,
      sub: '<b>' + esc(String(n)) + '</b> views from <b>' + esc(String(byTown.length))
        + '</b> town' + (byTown.length === 1 ? '' : 's') + ' and cities in <b>'
        + esc(String(byCountry.length)) + '</b> countr' + (byCountry.length === 1 ? 'y' : 'ies') + '.',
      body: '<div class="cpt-grid">'
        + tile(byTown[0].key, 'Top town or city', pct(byTown[0].views, n) + '% of views')
        + tile(String(byTown.length), 'Towns and cities', 'readers came from')
        + tile(pct(home, n) + '%', 'From the UK and Ireland', home + ' views')
        + tile(String(byCountry.length), 'Countries', byCountry[0].key + ' first')
        + '</div><div class="cpst__maps">' + ukMap(mine.filter(isUK), n) + townWorld(mine, n) + '</div>'
        + '<div class="cp3"><div><h4 class="cp-sub">Towns and cities</h4>'
        + countTable('Town or city', byTown, '') + '</div><div><h4 class="cp-sub">Regions</h4>'
        + countTable('Region', byRegion, '') + '</div><div><h4 class="cp-sub">Countries</h4>'
        + countTable('Country', byCountry, '') + '</div></div>'
        + '<p class="cp-note">Worked out by the website’s host from the connection, the way every '
        + 'website can, and passed on as a town. The connection’s address is never stored or even '
        + 'seen by the database. A phone on mobile data is often placed in the nearest big city, '
        + 'and a VPN places somebody wherever it is, so read a small town as roughly there.</p>',
    });
  }

  /* ==========================================================================
     JOURNEYS (migrations/011)

     Every view sends the journey so far, so a stored row is "this many views
     were reached by exactly this route". A journey ENDED on a route when it
     did not go a step further: its count less the counts of the routes one
     page longer. A route of eight pages is where the beacon stops, so it
     reads as eight or more.
     ========================================================================== */
  var LEFT = 'Left the site';
  function sourceLabel(f) { return !f ? 'Direct or unknown' : (f === 'new-tab' ? 'A new tab' : f); }

  function journeyData() {
    var count = {};
    (trails || []).forEach(function (r) {
      if (r.trail) count[r.trail] = (count[r.trail] || 0) + Number(r.views || 0);
    });
    var kids = {};
    Object.keys(count).forEach(function (k) {
      var parent = k.slice(0, k.lastIndexOf('>'));
      if (parent.indexOf('>') !== -1) kids[parent] = (kids[parent] || 0) + count[k];
    });
    return Object.keys(count).map(function (k) {
      var seg = k.split('>');
      return { key: k, from: seg[0], pages: seg.slice(1), reached: count[k],
        views: Math.max(0, count[k] - (kids[k] || 0)) };
    });
  }

  function chips(t) {
    return '<span class="cpj__path"><span class="cpj__chip cpj__chip--from">' + esc(sourceLabel(t.from))
      + '</span>' + t.pages.map(function (p) {
        return '<i class="cpj__arrow" aria-hidden="true">→</i><span class="cpj__chip">'
          + esc(pageLabel(p)) + '</span>';
      }).join('') + '</span>';
  }

  function journeyList(list, of) {
    var top = list.length ? list[0].views : 1;
    return '<ol class="cpj">' + list.map(function (t) {
      return '<li class="cpj__row">' + chips(t) + '<span class="cpj__n"><b>' + esc(String(t.views))
        + '</b> journey' + (t.views === 1 ? '' : 's') + ' · ' + esc(String(pct(t.views, of))) + '%</span>'
        + '<span class="cpj__bar">' + bar(t.views, top) + '</span></li>';
    }).join('') + '</ol>';
  }

  /* How people move: where they came from, their first, second and third
     page, and at every step the ones who left. A flow diagram in its own
     coordinates, ribbons as filled curves; the six biggest in each column are
     named and the rest are one ribbon, because forty thin ones read as grass. */
  function flow(items) {
    var W = 980, H = 460, NW = 12, GAP = 10, TOP = 30;
    var raw = [];
    items.forEach(function (t) {
      var n = t.pages.length;
      if (n === 1) {
        raw.push([0, sourceLabel(t.from), pageLabel(t.pages[0]), t.reached]);
        if (t.views) raw.push([1, pageLabel(t.pages[0]), LEFT, t.views]);
      } else if (n === 2) {
        raw.push([1, pageLabel(t.pages[0]), pageLabel(t.pages[1]), t.reached]);
        if (t.views) raw.push([2, pageLabel(t.pages[1]), LEFT, t.views]);
      } else if (n === 3) {
        raw.push([2, pageLabel(t.pages[1]), pageLabel(t.pages[2]), t.reached]);
      }
    });
    if (!raw.length) return '';
    var size = [{}, {}, {}, {}];
    raw.forEach(function (l) {
      size[l[0]][l[1]] = (size[l[0]][l[1]] || 0) + l[3];
      size[l[0] + 1][l[2]] = (size[l[0] + 1][l[2]] || 0) + l[3];
    });
    var keep = size.map(function (col) {
      var set = {};
      Object.keys(col).filter(function (k) { return k !== LEFT; })
        .sort(function (a, b) { return col[b] - col[a]; }).slice(0, 6)
        .forEach(function (k) { set[k] = 1; });
      set[LEFT] = 1;
      return set;
    });
    var named = function (c, k) { return keep[c][k] ? k : (c ? 'Other pages' : 'Other places'); };
    var agg = {};
    raw.forEach(function (l) {
      var k = JSON.stringify([l[0], named(l[0], l[1]), named(l[0] + 1, l[2])]);
      agg[k] = (agg[k] || 0) + l[3];
    });
    var links = Object.keys(agg).map(function (k) {
      var p = JSON.parse(k);
      return { c: p[0], a: p[1], b: p[2], v: agg[k] };
    });
    var cols = [[], [], [], []], at = [{}, {}, {}, {}];
    var node = function (c, name) {
      if (!at[c][name]) { at[c][name] = { name: name, i: 0, o: 0 }; cols[c].push(at[c][name]); }
      return at[c][name];
    };
    links.forEach(function (l) { node(l.c, l.a).o += l.v; node(l.c + 1, l.b).i += l.v; });
    var scale = Infinity;
    cols.forEach(function (col) {
      col.forEach(function (nd) { nd.v = Math.max(nd.i, nd.o); });
      col.sort(function (a, b) { return ((a.name === LEFT) - (b.name === LEFT)) || (b.v - a.v); });
      var sumV = col.reduce(function (n, nd) { return n + nd.v; }, 0);
      if (sumV) scale = Math.min(scale, (H - TOP - GAP * (col.length - 1)) / sumV);
    });
    var X = [0, (W - NW) / 3, ((W - NW) * 2) / 3, W - NW];
    cols.forEach(function (col, c) {
      var y = TOP;
      col.forEach(function (nd) { nd.y = y; nd.h = Math.max(1.5, nd.v * scale); nd.oy = y; nd.iy = y; y += nd.h + GAP; nd.x = X[c]; });
    });
    links.sort(function (p, q) {
      return p.c - q.c || at[p.c][p.a].y - at[q.c][q.a].y || at[p.c + 1][p.b].y - at[q.c + 1][q.b].y;
    });
    var ribbons = links.map(function (l, i) {
      var s0 = at[l.c][l.a], t0 = at[l.c + 1][l.b];
      var h = l.v * scale;
      var x1 = s0.x + NW, x2 = t0.x, y1 = s0.oy, y2 = t0.iy, mx = (x1 + x2) / 2;
      s0.oy += h;
      t0.iy += h;
      var f = function (n) { return n.toFixed(1); };
      return '<path class="cpfl__link' + (l.b === LEFT ? ' is-left' : '') + '" style="--i:' + i + '" d="M'
        + f(x1) + ' ' + f(y1) + 'C' + f(mx) + ' ' + f(y1) + ' ' + f(mx) + ' ' + f(y2) + ' ' + f(x2) + ' ' + f(y2)
        + 'L' + f(x2) + ' ' + f(y2 + h) + 'C' + f(mx) + ' ' + f(y2 + h) + ' ' + f(mx) + ' ' + f(y1 + h) + ' '
        + f(x1) + ' ' + f(y1 + h) + 'Z" data-tip="' + esc(l.a + ' → ' + l.b + ': ' + l.v + ' view'
          + (l.v === 1 ? '' : 's')) + '"/>';
    }).join('');
    var heads = ['Arrived from', 'First page', 'Second page', 'Third page'];
    var boxes = cols.map(function (col, c) {
      return '<text class="cpfl__h" x="' + (c === 3 ? W : X[c]) + '" y="14" text-anchor="'
        + (c === 3 ? 'end' : 'start') + '">' + esc(heads[c]) + '</text>'
        + col.map(function (nd) {
          return '<rect class="cpfl__node' + (nd.name === LEFT ? ' is-left' : '') + '" x="' + nd.x.toFixed(1)
            + '" y="' + nd.y.toFixed(1) + '" width="' + NW + '" height="' + nd.h.toFixed(1) + '" rx="2" data-tip="'
            + esc(nd.name + ': ' + nd.v) + '"/>'
            + (nd.h >= 13 ? '<text class="cpfl__lb" x="' + (c === 3 ? nd.x - 6 : nd.x + NW + 6).toFixed(1)
              + '" y="' + (nd.y + nd.h / 2 + 4).toFixed(1) + '" text-anchor="' + (c === 3 ? 'end' : 'start') + '">'
              + esc(nd.name + ' · ' + nd.v) + '</text>' : '');
        }).join('');
    }).join('');
    return '<div class="cpfl"><svg class="cpfl__svg" viewBox="0 0 ' + W + ' ' + H + '" role="img" '
      + 'aria-label="' + esc('How readers move through the site: '
        + links.slice(0, 8).map(function (l) { return l.a + ' to ' + l.b + ', ' + l.v; }).join('. '))
      + '">' + ribbons + boxes + '</svg></div>';
  }

  function explorer(items) {
    var reach = {};
    items.forEach(function (t) {
      var last = t.pages[t.pages.length - 1];
      reach[last] = (reach[last] || 0) + t.reached;
    });
    var opts = Object.keys(reach).sort(function (a, b) { return reach[b] - reach[a]; });
    if (!opts.length) return '';
    var page = reach[EXPLORE] ? EXPLORE : opts[0];
    var before = {}, after = {}, left = 0;
    items.forEach(function (t) {
      var n = t.pages.length;
      if (t.pages[n - 1] === page) {
        var came = n > 1 ? pageLabel(t.pages[n - 2]) : sourceLabel(t.from);
        before[came] = (before[came] || 0) + t.reached;
        left += t.views;
      }
      if (n > 1 && t.pages[n - 2] === page) {
        var next = pageLabel(t.pages[n - 1]);
        after[next] = (after[next] || 0) + t.reached;
      }
    });
    if (left) after[LEFT] = left;
    var listOf = function (o) {
      return Object.keys(o).map(function (k) { return { key: k, views: o[k] }; })
        .sort(function (a, b) { return b.views - a.views; });
    };
    var through = items.filter(function (t) { return t.views && t.pages.indexOf(page) !== -1; })
      .sort(function (a, b) { return b.views - a.views; });
    return '<label class="cpf__one cpst__explore"><span class="cpf__l">Pick any page</span>'
      + '<select class="select input--sm" data-explore>' + opts.slice(0, 250).map(function (p) {
        return '<option value="' + esc(p) + '"' + (p === page ? ' selected' : '') + '>'
          + esc(pageLabel(p) + ' (' + reach[p] + ')') + '</option>';
      }).join('') + '</select></label>'
      + '<div class="cp2"><div><h4 class="cp-sub">Just before ' + esc(pageLabel(page)) + '</h4>'
      + countTable('Came from', listOf(before), 'Nothing recorded.') + '</div>'
      + '<div><h4 class="cp-sub">Just after</h4>'
      + countTable('Went to', listOf(after), 'Nothing recorded.') + '</div></div>'
      + (through.length ? '<h4 class="cp-sub">Complete journeys through ' + esc(pageLabel(page)) + '</h4>'
        + journeyList(through.slice(0, 10), total(through)) : '');
  }

  function journeySection() {
    var title = 'Journeys through the site';
    if (trails === null) {
      return sec({
        title: title,
        sub: 'Not switched on yet.',
        body: '<p class="cp-note">Whole journeys, page after page, are recorded once '
          + '<b>migrations/011_page_places_trails.sql</b> has been run on the database.</p>',
      });
    }
    var items = journeyData().filter(function (t) {
      if (FILT.source && sourceLabel(t.from) !== FILT.source) return false;
      return !FILT.area || t.pages.some(function (p) { return areaOf(p) === FILT.area; });
    });
    var ended = items.filter(function (t) { return t.views > 0; })
      .sort(function (a, b) { return b.views - a.views; });
    var journeys = total(ended);
    if (!journeys) {
      return sec({
        title: title,
        sub: 'Switched on, and nothing has come in yet.',
        body: '<p class="cp-note">Journeys fill in from the next visitor onwards.</p>',
      });
    }
    var pagesRead = ended.reduce(function (n, t) { return n + t.views * t.pages.length; }, 0);
    var bounced = total(ended.filter(function (t) { return t.pages.length === 1; }));
    var longest = ended.reduce(function (n, t) { return Math.max(n, t.pages.length); }, 0);
    var firsts = roll(ended.map(function (t) { return { k: pageLabel(t.pages[0]), views: t.views }; }),
      function (r) { return r.k; });
    var lengths = [1, 2, 3, 4, 5, 6, 7, 8].map(function (k) {
      var v = total(ended.filter(function (t) { return k === 8 ? t.pages.length >= 8 : t.pages.length === k; }));
      return { label: k === 8 ? '8+' : String(k), views: v,
        title: (k === 8 ? '8 or more pages' : k + ' page' + (k === 1 ? '' : 's')) + ': ' + v + ' journeys' };
    });
    return sec({
      title: title,
      sub: '<b>' + esc(String(journeys)) + '</b> journeys, reading <b>'
        + esc(String(Math.round((pagesRead / journeys) * 10) / 10)) + '</b> pages each on average.',
      body: '<div class="cpt-grid">'
        + tile(String(journeys), 'Journeys', 'visits, page after page')
        + tile(String(Math.round((pagesRead / journeys) * 10) / 10), 'Pages a journey', 'on average')
        + tile(pct(bounced, journeys) + '%', 'Read one page and left', bounced + ' journeys')
        + tile(firsts[0].key, 'The commonest first page', pct(firsts[0].views, journeys) + '% start here')
        + '</div><h4 class="cp-sub">How people move through the site</h4>' + flow(items)
        + '<p class="cp-note">Each ribbon is views moving from one step to the next, as wide as the '
        + 'number of them; the grey ribbons are readers leaving. Hover over any of it for the figure.</p>'
        + '<h4 class="cp-sub">The commonest complete journeys</h4>'
        + journeyList(ended.slice(0, 25), journeys)
        + '<div class="cp2"><div><h4 class="cp-sub">Pages in a journey</h4>'
        + columns(lengths, 'Journeys by the number of pages read') + '<p class="cp-note">The longest '
        + 'was ' + esc(longest >= 8 ? 'eight pages or more' : longest + ' page' + (longest === 1 ? '' : 's'))
        + '.</p></div><div><h4 class="cp-sub">Where journeys end</h4>'
        + countTable('Last page', roll(ended.map(function (t) {
          return { k: pageLabel(t.pages[t.pages.length - 1]), views: t.views };
        }), function (r) { return r.k; }), '') + '</div></div>'
        + '<h4 class="cp-sub">Any page, before and after</h4>' + explorer(items)
        + '<p class="cp-note">A journey is the pages read in one browser tab, in order, until the '
        + 'reader leaves or is idle for half an hour. It is counted as a pattern and never against a '
        + 'person: two people who read the same three pages are one row with a count of two.</p>',
    });
  }

  function sortBar() {
    return [['views', 'Most read'], ['seconds', 'Longest read'],
      ['depth', 'Read furthest']].map(function (s) {
      return '<button class="btn btn--sm ' + (SORT === s[0] ? 'btn--primary' : 'btn--ghost')
        + '" data-sort="' + s[0] + '">' + esc(s[1]) + '</button>';
    }).join(' ');
  }

  function areaTable(areas, all) {
    return '<h4 class="cp-sub">By part of the site</h4>'
      + table(['Section', 'Views', 'Share', 'Average time', '', 'Narrow to'],
        areas.map(function (a) {
          return '<tr><td>' + esc(a.key) + '</td><td><b>' + esc(String(a.views)) + '</b></td>'
            + '<td>' + esc(String(pct(a.views, all))) + '%</td>'
            + '<td>' + esc(dur(a.seconds / a.views)) + '</td>'
            + '<td style="width:26%">' + bar(a.views, all) + '</td>'
            + '<td><button class="btn btn--sm btn--ghost" data-filt="area" data-val="'
            + esc(a.key) + '">Only this</button></td></tr>';
        }).join(''))
      + '<h4 class="cp-sub">Page by page</h4>';
  }

  /* One row per page, carrying the page's real NAME where the catalogue knows
     it. "/players/charlie-dunkley.html" is an address; "Charlie Dunkley" is
     what somebody came to read. */
  function pageTable(pages, all, v) {
    var series = seriesByPath(v);
    var peak = 1;
    Object.keys(series).forEach(function (k) {
      series[k].forEach(function (n) { if (n > peak) peak = n; });
    });
    var sorted = pages.slice().sort(function (a, b) {
      if (SORT === 'seconds') return (b.seconds / b.views) - (a.seconds / a.views);
      if (SORT === 'depth') return (b.depth / b.views) - (a.depth / a.views);
      return b.views - a.views;
    });
    return table(['Page', 'Section', 'Views', 'Shape', 'Average time', 'Average scroll',
      '', ''],
    sorted.map(function (r) {
      var name = nameOf(r.key);
      return '<tr><td>'
        + (name ? '<b>' + esc(name) + '</b><br>' : '')
        + '<a class="cpp" href="' + esc(r.key) + '" target="_blank" rel="noopener">'
        + esc(r.key) + '</a></td>'
        + '<td>' + esc(areaOf(r.key)) + '</td>'
        + '<td><b>' + esc(String(r.views)) + '</b></td>'
        + '<td>' + sparkline(series[r.key], peak) + '</td>'
        + '<td>' + esc(dur(r.seconds / r.views)) + '</td>'
        + '<td>' + esc(String(Math.round(r.depth / r.views))) + '%</td>'
        + '<td style="width:16%">' + bar(r.views, all) + '</td>'
        + '<td><button class="btn btn--sm btn--ghost" data-page="' + esc(r.key)
        + '">Look at this page</button></td></tr>';
    }).join(''));
  }

  /* Views per day per page, on the same axis for every page, so two
     sparklines in the same column can be compared with each other. */
  function seriesByPath(v) {
    var days = {}, order = [];
    v.forEach(function (r) { if (!days[r.day]) { days[r.day] = 1; order.push(r.day); } });
    order.sort();
    var at = {};
    order.forEach(function (d, i) { at[d] = i; });
    var out = {};
    v.forEach(function (r) {
      if (!out[r.path]) {
        out[r.path] = [];
        for (var i = 0; i < order.length; i++) out[r.path].push(0);
      }
      out[r.path][at[r.day]] += Number(r.views || 0);
    });
    return out;
  }

  /* ---- What the club publishes -------------------------------------------
     A match report and a news article are the two things the club MAKES, and
     the only honest way to ask whether the work is landing is to line them up
     against their own publication dates. Needs the catalogue: without it
     there is no date and this section does not draw. */
  function publishSection(pages, all) {
    if (!CAT) {
      return sec({
        title: 'How the club’s own pages are doing',
        sub: 'Needs the site’s page list, which could not be read.',
        body: '<p class="cp-note">This section lines match reports and news articles up '
          + 'against the day they were published, which needs <b>/stats-pages.json</b> - a '
          + 'file the build writes. It could not be fetched, so every other figure on this '
          + 'screen is unaffected and this one is not shown. Publishing the site again '
          + 'usually fixes it.</p>',
      });
    }
    var got = {};
    pages.forEach(function (p) { got[p.key] = p; });
    var since = range().from;
    var today = iso(new Date());

    var build = function (kind) {
      return CAT.filter(function (e) { return e.k === kind && e.d; })
        .map(function (e) {
          var p = got[e.p];
          var age = daysBetween(e.d, today);
          return {
            e: e, views: p ? p.views : 0, secs: p ? p.seconds : 0,
            age: age, fresh: !since || e.d >= since,
          };
        })
        .sort(function (a, b) { return b.views - a.views || (a.e.d < b.e.d ? 1 : -1); });
    };

    var draw1 = function (list, label) {
      if (!list.length) return '<p class="cp-note">Nothing published in this category yet.</p>';
      return table([label, 'Published', 'Days old', 'Views', 'Average time', 'Share', ''],
        list.slice(0, 25).map(function (r) {
          return '<tr' + (r.fresh ? ' class="is-new"' : '') + '><td>'
            + '<b>' + esc(r.e.t) + '</b><br><a class="cpp" href="' + esc(r.e.p)
            + '" target="_blank" rel="noopener">' + esc(r.e.p) + '</a></td>'
            + '<td>' + esc(shortDate(r.e.d)) + '</td>'
            + '<td>' + esc(r.age === null ? '' : String(r.age)) + '</td>'
            + '<td><b>' + esc(String(r.views)) + '</b></td>'
            + '<td>' + esc(r.views ? dur(r.secs / r.views) : '') + '</td>'
            + '<td>' + esc(String(pct(r.views, all))) + '%</td>'
            + '<td style="width:24%">' + bar(r.views, all) + '</td></tr>';
        }).join(''));
    };

    var reports = build('match');
    var articles = build('news');
    var unread = reports.concat(articles).filter(function (r) { return !r.views; }).length;

    return sec({
      title: 'How the club’s own pages are doing',
      sub: 'Match reports and news articles against the day each one was published.',
      body: '<h4 class="cp-sub">Match reports</h4>' + draw1(reports, 'Report')
        + '<h4 class="cp-sub">News articles</h4>' + draw1(articles, 'Article')
        + '<p class="cp-note">A row marked as new was published inside this period, so its '
        + 'figure covers its whole life so far; an older one shows only what it drew in these '
        + 'days, which is why an old report can read as quiet without having been ignored. '
        + (unread
          ? '<b>' + esc(String(unread)) + '</b> of them had no views at all in this period.'
          : 'Every one of them was opened at least once in this period.')
        + '</p>',
    });
  }

  /* ---- The pages nobody opened -------------------------------------------
     THE ONE QUESTION TRAFFIC CANNOT ANSWER ON ITS OWN. A page with no views
     writes no row, so it is invisible to everything above: the only way to
     find it is to compare what was read against what EXISTS, which is what
     the catalogue is for. */
  function unopenedSection() {
    if (!CAT) return '';
    var seen = {};
    (rows || []).forEach(function (r) { seen[r.path] = 1; });
    var missing = CAT.filter(function (e) {
      return e.k !== 'panel' && e.p !== '/404.html' && !seen[e.p];
    });
    var byKind = {};
    missing.forEach(function (e) {
      var k = KIND_LABEL[e.k] || 'Main pages';
      (byKind[k] = byKind[k] || []).push(e);
    });
    var kinds = Object.keys(byKind).sort(function (a, b) {
      return byKind[b].length - byKind[a].length;
    });
    var pub = CAT.filter(function (e) { return e.k !== 'panel' && e.p !== '/404.html'; }).length;

    if (!missing.length) {
      return sec({
        title: 'Pages nobody opened',
        sub: 'None. Every page the site publishes was opened at least once.',
        body: '<p class="cp-note">All ' + esc(String(pub)) + ' published pages had at least '
          + 'one view in this period.</p>',
      });
    }
    return sec({
      title: 'Pages nobody opened',
      sub: '<b>' + esc(String(missing.length)) + '</b> of the site’s '
        + esc(String(pub)) + ' published pages had no views at all in this period.',
      body: kinds.map(function (k) {
        return '<h4 class="cp-sub">' + esc(k) + ' <span class="cpp">'
          + esc(String(byKind[k].length)) + '</span></h4>'
          + '<ul class="cpu">' + byKind[k].slice(0, 40).map(function (e) {
            return '<li><a href="' + esc(e.p) + '" target="_blank" rel="noopener">'
              + esc(e.t || e.p) + '</a>' + (e.d ? ' <span class="cpp">'
              + esc(shortDate(e.d)) + '</span>' : '') + '</li>';
          }).join('') + '</ul>'
          + (byKind[k].length > 40
            ? '<p class="cp-note">and ' + esc(String(byKind[k].length - 40)) + ' more.</p>'
            : '');
      }).join('')
        + '<p class="cp-note">This is the one question the figures above cannot answer on '
        + 'their own: a page nobody opened records nothing, so it can only be found by '
        + 'comparing what was read against what the site publishes. Counted against the '
        + '<b>whole period</b> and not narrowed by the filters, because a page absent from '
        + 'one country’s traffic has not gone unread. The control panel and the not-found '
        + 'page are left out.</p>',
    });
  }

  /* ---- One page on its own ----------------------------------------------
     The tables answer "which page", and the question straight after it is
     always "and who was reading THAT one". Same rows, filtered, so nothing
     here can disagree with the totals above it. */
  function focusPanel(path, all) {
    var mine = view().filter(function (r) { return r.path === path; });
    var n = total(mine);
    var name = nameOf(path);
    if (!n) {
      return sec({
        title: 'This page on its own',
        sub: esc(path),
        actions: '<button class="btn btn--sm btn--ghost" data-page="">Close</button>',
        body: '<p class="cp-note">Nothing recorded for this page in the period.</p>',
      });
    }
    var days = roll(mine, function (r) { return r.day; })
      .sort(function (a, b) { return a.key < b.key ? -1 : 1; });
    var mySecs = sum(mine, function (r) { return r.seconds_total; });
    var myDeep = sum(mine, function (r) { return r.depth_total; });
    var myHours = (hours || []).filter(function (r) { return r.path === path; });
    var m = metaOf(path);

    return sec({
      title: 'This page on its own',
      sub: (name ? '<b>' + esc(name) + '</b> · ' : '')
        + '<a href="' + esc(path) + '" target="_blank" rel="noopener">' + esc(path)
        + '</a> · ' + esc(areaOf(path))
        + (m && m.d ? ' · published ' + esc(shortDate(m.d)) : '')
        + ' · <b>' + esc(String(n))
        + '</b> of the period’s ' + esc(String(all)) + ' views ('
        + esc(String(pct(n, all))) + '%).',
      actions: '<button class="btn btn--sm btn--ghost" data-page="">Close</button>',
      body: '<div class="cpt-grid">'
        + tile(String(n), 'Views of this page', pct(n, all) + '% of everything')
        + tile(dur(mySecs / n), 'Average on it', 'across every view')
        + tile(Math.round(myDeep / n) + '%', 'Average scrolled', 'how far down')
        + tile(String(days.length), 'Days it was opened', 'in this period')
        + '</div>'
        + trend(days, { marks: marksFor(days) })
        + '<div class="cp2"><div><h4 class="cp-sub">Where from</h4>'
        + rankTable('Country', roll(mine, function (r) { return countryOf(r.zone); }), n,
          'this page')
        + '</div><div><h4 class="cp-sub">How they arrived</h4>'
        + rankTable('Source', roll(mine, function (r) {
          return r.source || 'Direct or unknown';
        }), n, 'this page')
        + '</div></div>'
        + '<h4 class="cp-sub">What they read it on</h4>'
        + rankTable('Device', roll(mine, function (r) { return r.device || 'Not known'; }),
          n, 'this page')
        + (myHours.length
          ? '<h4 class="cp-sub">When this page is read</h4>' + heatmap(myHours)
          : '')
        + (routes && routes.length
          ? '<div class="cp2"><div><h4 class="cp-sub">Came here from</h4>'
            + stepTable(['Came from', 'Landed on'], steps(routes.filter(function (r) {
              return r.path === path;
            })), 'No route recorded into this page.')
            + '</div><div><h4 class="cp-sub">Went on to</h4>'
            + stepTable(['From', 'To'], steps(routes.filter(function (r) {
              return r.came_from === path;
            })), 'Nobody went on to another page from here.')
            + '</div></div>'
          : '')
        + (events && events.length
          ? '<h4 class="cp-sub">Clicked on this page</h4>'
            + countTable('What', roll(events.filter(function (r) { return r.path === path; })
              .map(function (r) { return { k: EVK[r.kind] || r.kind, views: r.count }; }),
            function (r) { return r.k; }), 'Nothing was clicked on this page.', 'Clicks')
          : ''),
    });
  }

  /* ---- Taking it away ---------------------------------------------------
     The club owns these figures and a screen is a bad place to keep them. One
     row per stored bucket, not per aggregate drawn above, so the file is the
     record rather than a picture of it. The page's NAME rides along, because
     a spreadsheet of addresses is the same problem this screen just fixed. */
  function csv() {
    var head = 'day,weekday,path,page,section,country,zone,source,source_kind,device,'
      + 'views,seconds_total,depth_total\n';
    var q = function (s) { return '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"'; };
    var body = view().map(function (r) {
      return [r.day, dayName(r.day), r.path, nameOf(r.path), areaOf(r.path),
        countryOf(r.zone), r.zone, r.source || 'Direct or unknown', sourceGroup(r.source),
        r.device || 'Not known', r.views, r.seconds_total, r.depth_total].map(q).join(',');
    }).join('\n');
    try {
      var url = URL.createObjectURL(new Blob([head + body], { type: 'text/csv' }));
      var a = document.createElement('a');
      a.href = url;
      a.download = 'suesangelsfc-page-stats-' + iso(new Date()) + '.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    } catch (e) {
      toast('Could not build the file', 'error');
    }
  }

  function wire(host) {
    function refresh() {
      host.setAttribute('aria-busy', 'true');
      load().then(function () {
        host.removeAttribute('aria-busy');
        draw(host);
      }).catch(function () {
        host.removeAttribute('aria-busy');
        toast('Could not read the figures', 'error');
      });
    }
    var each = function (sel, fn) {
      Array.prototype.slice.call(host.querySelectorAll(sel)).forEach(fn);
    };
    each('[data-days]', function (b) {
      b.addEventListener('click', function () {
        DAYS = Number(b.getAttribute('data-days'));
        FROM = '';
        TO = '';
        FOCUS = '';
        refresh();
      });
    });
    each('[data-sort]', function (b) {
      b.addEventListener('click', function () {
        SORT = b.getAttribute('data-sort');
        draw(host);
      });
    });
    each('[data-page]', function (b) {
      b.addEventListener('click', function () {
        FOCUS = b.getAttribute('data-page') || '';
        draw(host);
      });
    });
    /* The same attribute on a select and on a button: the select carries its
       own value, the "Only this" button carries one. Both narrow the whole
       screen, which is why neither of them redraws only its own table. */
    each('select[data-filt]', function (s) {
      s.addEventListener('change', function () {
        FILT[s.getAttribute('data-filt')] = s.value || '';
        FOCUS = '';
        draw(host);
      });
    });
    each('button[data-filt]', function (b) {
      b.addEventListener('click', function () {
        FILT[b.getAttribute('data-filt')] = b.getAttribute('data-val') || '';
        FOCUS = '';
        draw(host);
      });
    });
    each('[data-clear]', function (b) {
      b.addEventListener('click', function () {
        FILT = { area: '', country: '', source: '', device: '' };
        FOCUS = '';
        draw(host);
      });
    });
    each('[data-csv]', function (b) { b.addEventListener('click', csv); });
    each('[data-preset]', function (b) {
      b.addEventListener('click', function () {
        var chosen = presetOf(b.getAttribute('data-preset'));
        FROM = chosen.from;
        TO = chosen.to;
        FOCUS = '';
        refresh();
      });
    });
    each('[data-apply]', function (b) {
      b.addEventListener('click', function () {
        var startIn = host.querySelector('[data-from]');
        var endIn = host.querySelector('[data-to]');
        var startDay = startIn ? String(startIn.value || '') : '';
        var endDay = endIn ? String(endIn.value || '') : '';
        if (!/^\d{4}-\d{2}-\d{2}$/.test(startDay) || !/^\d{4}-\d{2}-\d{2}$/.test(endDay)) {
          toast('Pick a first and a last day');
          return;
        }
        FROM = startDay < endDay ? startDay : endDay;
        TO = startDay < endDay ? endDay : startDay;
        FOCUS = '';
        refresh();
      });
    });
    each('[data-explore]', function (sel) {
      sel.addEventListener('change', function () {
        EXPLORE = sel.value || '';
        draw(host);
      });
    });
    var desk = host.querySelector('.cpst');
    if (desk) {
      var tipEl = document.querySelector('.cptip');
      if (!tipEl) {
        tipEl = document.createElement('div');
        tipEl.className = 'cptip';
        tipEl.setAttribute('aria-hidden', 'true');
        document.body.appendChild(tipEl);
      }
      desk.addEventListener('mousemove', function (e) {
        var over = e.target && e.target.closest ? e.target.closest('[data-tip]') : null;
        if (!over) { tipEl.className = 'cptip'; return; }
        tipEl.textContent = over.getAttribute('data-tip');
        tipEl.style.left = (e.clientX + 16) + 'px';
        tipEl.style.top = (e.clientY + 16) + 'px';
        tipEl.className = 'cptip is-on';
      });
      desk.addEventListener('mouseleave', function () { tipEl.className = 'cptip'; });
    }
    each('[data-jump]', function (b) {
      b.addEventListener('click', function () {
        var goTo = host.querySelector('#' + b.getAttribute('data-jump'));
        if (goTo && goTo.scrollIntoView) goTo.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
    each('[data-report]', function (b) {
      b.addEventListener('click', function () { openReport(b); });
    });
    var tp = host.querySelector('[data-tag-page]');
    var tn = host.querySelector('[data-tag-name]');
    var to = host.querySelector('[data-tag-out]');
    if (tp && tn && to) {
      var relink = function () {
        var clean = String(tn.value || '').toLowerCase().replace(/[^a-z0-9-]+/g, '-')
          .replace(/^-+|-+$/g, '').slice(0, 40);
        to.value = SITE + tp.value + (clean ? '?from=' + clean : '');
      };
      tp.addEventListener('change', relink);
      tn.addEventListener('input', relink);
    }
    each('[data-tag-copy]', function (b) {
      b.addEventListener('click', function () {
        if (!to) return;
        var manual = function () {
          if (to.select) to.select();
          toast('Select the link and copy it');
        };
        try {
          navigator.clipboard.writeText(to.value).then(function () {
            toast('Link copied. Paste it wherever you post.');
          }, manual);
        } catch (e) { manual(); }
      });
    });
  }
}());
