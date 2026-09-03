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
  var hours = null;     /* null means migration 008 has not been run */
  var FOCUS = '';       /* a page being looked at on its own */
  var SORT = 'views';

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

  function load() {
    if (!CP.state.isAdmin || !CP.rest) return Promise.resolve();
    var since = DAYS ? '&day=gte.' + daysAgo(DAYS - 1) : '';
    /* The period BEFORE this one, so every headline figure can say whether it
       is going up. All time has nothing before it, so it asks for nothing. */
    var before = DAYS
      ? '&day=gte.' + daysAgo((DAYS * 2) - 1) + '&day=lt.' + daysAgo(DAYS - 1)
      : '';
    return Promise.all([
      get('page_stats?select=' + COLS + since + '&order=day.desc&limit=20000'),
      DAYS ? get('page_stats?select=' + COLS + before + '&limit=20000')
        : Promise.resolve([]),
      get('page_stats_hourly?select=day,hour,path,views' + since + '&limit=20000'),
    ]).then(function (r) {
      rows = r[0];
      prev = r[1] || [];
      hours = r[2];
    });
  }

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

  /* Which part of the site a page belongs to. The club thinks in sections -
     "are people reading the match reports?" - and 108 rows of paths does not
     answer that however carefully it is sorted. */
  function areaOf(p) {
    if (/^\/players\//.test(p)) return 'Player profiles';
    if (/^\/matches\//.test(p)) return 'Match reports';
    if (/^\/news\//.test(p)) return 'News articles';
    if (/^\/gallery\//.test(p)) return 'Photo albums';
    if (/^\/(index\.html)?$/.test(p)) return 'Home page';
    return 'Main pages';
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
    return '<div class="cpt"><span class="cpt__v">' + esc(big) + '</span>'
      + '<span class="cpt__l">' + esc(label) + '</span>'
      + (delta || '')
      + '<span class="cpt__s">' + esc(sub) + '</span></div>';
  }

  /* Up, down or level against the period before, in words as well as a mark,
     because an arrow alone is a colour-and-shape claim and this panel has one
     accent hue. "No figures before this" is said out loud rather than shown
     as 0%, which would read as a collapse rather than as a start. */
  function delta(now, was) {
    if (!prev || !prev.length || !DAYS) return '';
    if (!was) {
      return '<span class="cpd">Nothing in the ' + esc(String(DAYS))
        + ' days before</span>';
    }
    var d = Math.round(((now - was) / was) * 100);
    var word = d > 0 ? 'up' : (d < 0 ? 'down' : 'level with');
    var mark = d > 0 ? '▲' : (d < 0 ? '▼' : '–');
    return '<span class="cpd cpd--' + (d > 0 ? 'up' : (d < 0 ? 'down' : 'flat')) + '">'
      + '<i aria-hidden="true">' + mark + '</i> ' + esc(word + ' ' + Math.abs(d)
        + '% on the ' + DAYS + ' days before') + '</span>';
  }

  function rankTable(head, list, all, label, note) {
    if (!list.length) {
      return '<p class="cp-note">Nothing recorded yet for ' + esc(label) + '.</p>';
    }
    return table([head, 'Views', 'Share', 'Average time', 'Average scroll', ''],
      list.slice(0, 40).map(function (r) {
        return '<tr><td>' + esc(r.key) + '</td>'
          + '<td><b>' + esc(String(r.views)) + '</b></td>'
          + '<td>' + esc(String(pct(r.views, all))) + '%</td>'
          + '<td>' + esc(dur(r.seconds / r.views)) + '</td>'
          + '<td>' + esc(String(Math.round(r.depth / r.views))) + '%</td>'
          + '<td style="width:28%">' + bar(r.views, all) + '</td></tr>';
      }).join('')) + (note || '');
  }

  /* ---- The daily trend --------------------------------------------------
     An area, a line and a dot per day, in viewBox units so nothing here ever
     needs to measure the page. Every dot carries a <title>, so the figures
     are reachable by hovering and by a screen reader without a tooltip
     engine, and the table underneath carries all of them anyway. */
  function trend(days) {
    if (days.length < 2) return '';
    var W = 640, H = 170, L = 34, R = 8, T = 10, B = 26;
    var max = Math.max.apply(null, days.map(function (d) { return d.views; })) || 1;
    var step = (W - L - R) / Math.max(1, days.length - 1);
    var x = function (i) { return L + i * step; };
    var y = function (v) { return T + (1 - (v / max)) * (H - T - B); };

    var pts = days.map(function (d, i) { return x(i).toFixed(1) + ' ' + y(d.views).toFixed(1); });
    var line = 'M' + pts.join('L');
    var area = line + 'L' + x(days.length - 1).toFixed(1) + ' ' + (H - B)
      + 'L' + x(0).toFixed(1) + ' ' + (H - B) + 'Z';

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
      if (i % every && i !== days.length - 1) return '';
      return '<text class="cpc__ax" x="' + x(i).toFixed(1) + '" y="' + (H - 8)
        + '" text-anchor="middle">' + esc(shortDate(d.key)) + '</text>';
    }).join('');

    var dots = days.map(function (d, i) {
      return '<circle class="cpc__dot" cx="' + x(i).toFixed(1) + '" cy="'
        + y(d.views).toFixed(1) + '" r="2.5"><title>'
        + esc(dayName(d.key) + ' ' + shortDate(d.key) + ': ' + d.views + ' view'
          + (d.views === 1 ? '' : 's')) + '</title></circle>';
    }).join('');

    return '<div class="cpc"><svg class="cpc__svg" viewBox="0 0 ' + W + ' ' + H + '" '
      + 'role="img" aria-label="' + esc('Views per day from ' + shortDate(days[0].key)
        + ' to ' + shortDate(days[days.length - 1].key) + ', highest ' + max) + '">'
      + grid + '<path class="cpc__area" d="' + area + '"/>'
      + '<path class="cpc__line" d="' + line + '"/>' + dots + axis + '</svg></div>';
  }

  /* ---- When people read -------------------------------------------------
     Seven rows and twenty-four columns. This is the whole reason for
     migration 008, and it is the one question a club can act on: if the
     match report is read at nine on a Sunday evening, that is when to post
     the link. */
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

  /* ---- The screen ------------------------------------------------------- */

  function notRunYet() {
    return sec({
      title: 'Website stats',
      sub: 'Nothing is being recorded yet.',
      body: '<p class="cp-note">The website starts counting page views once '
        + '<b>migrations/007_page_stats.sql</b> has been run on the database, and records '
        + 'the hour of the day as well once <b>migrations/008_page_stats_detail.sql</b> '
        + 'has been. Until then this screen has nothing to show and the site behaves '
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
      body: '<p class="cp-note">Counting is live and no page views have been recorded in the '
        + 'last ' + esc(String(DAYS)) + ' days. Views are written when a reader leaves a page, '
        + 'so the first figures appear shortly after the next visitor. If the site has had '
        + 'traffic and this stays empty, the most likely cause is that the last publish '
        + 'predates this feature.</p>',
    });
  }

  M.stats = function (host) {
    return load().then(function () { draw(host); });
  };

  function periodBar() {
    return [[7, '7 days'], [30, '30 days'], [90, '90 days'], [0, 'All time']]
      .map(function (p) {
        return '<button class="btn btn--sm ' + (DAYS === p[0] ? 'btn--primary' : 'btn--ghost')
          + '" data-days="' + p[0] + '">' + esc(p[1]) + '</button>';
      }).join(' ')
      + ' <button class="btn btn--sm btn--ghost" data-csv="1">Download as CSV</button>';
  }

  function periodWrap(inner) {
    return '<div class="cp-head__actions" style="margin-bottom:12px">' + periodBar()
      + '</div>' + inner;
  }

  function draw(host) {
    if (rows === null) { host.innerHTML = notRunYet(); return; }

    var all = total(rows);
    if (!all) { host.innerHTML = periodWrap(empty()); wire(host); return; }

    var pages = roll(rows, function (r) { return r.path; });
    var places = roll(rows, function (r) { return countryOf(r.zone); });
    var sources = roll(rows, function (r) { return r.source || 'Direct or unknown'; });
    var devices = roll(rows, function (r) { return r.device || 'Not known'; });
    var areas = roll(rows, function (r) { return areaOf(r.path); });
    var days = roll(rows, function (r) { return r.day; })
      .sort(function (a, b) { return a.key < b.key ? -1 : 1; });

    var secs = sum(rows, function (r) { return r.seconds_total; });
    var deep = sum(rows, function (r) { return r.depth_total; });
    var busiest = days.slice().sort(function (a, b) { return b.views - a.views; })[0];

    var wasAll = total(prev || []);
    var wasSecs = sum(prev || [], function (r) { return r.seconds_total; });
    var wasPlaces = (prev || []).length
      ? roll(prev, function (r) { return countryOf(r.zone); }).length : 0;

    host.innerHTML = headline(all, pages, places, days, secs, deep, busiest, wasAll,
        wasSecs, wasPlaces)
      + (FOCUS ? focusPanel(FOCUS, all) : '')
      + sec({
        title: 'Day by day',
        sub: 'Every day in the period, and what came in on it.',
        body: trend(days) + dayTable(days, busiest),
      })
      + sec({
        title: 'Where in the world',
        sub: 'Worked out from the reader’s device time zone.',
        body: worldMap(places, all)
          + rankTable('Country', places, all, 'anywhere')
          + '<p class="cp-note">This is the time zone the device is set to, not its address: '
          + 'no location lookup happens and no address is ever read. It is wrong for anybody '
          + 'using a VPN or reading while abroad, so treat it as the shape of the audience '
          + 'rather than a count of countries. A zone the panel does not recognise is '
          + 'reported as its region rather than guessed at or dropped.</p>',
      })
      + whenSection()
      + sec({
        title: 'What gets read',
        sub: 'Every page anybody opened, with how long they stayed and how far down they '
          + 'got. Pick a page to see it on its own.',
        actions: sortBar(),
        body: areaTable(areas, all) + pageTable(pages, all),
      })
      + sec({
        title: 'How they arrive',
        sub: 'The site that sent them.',
        body: rankTable('Source', sources, all, 'any source')
          + '<p class="cp-note">Only the sending site is recorded, never the full address it '
          + 'came from, because a full referring link can carry somebody’s search terms. '
          + '<b>Direct or unknown</b> is somebody typing the address, a bookmark, a link from '
          + 'an app or an email, or a browser set not to say. Moving between pages of this '
          + 'site is not counted as a source.</p>',
      })
      + sec({
        title: 'What they read it on',
        body: rankTable('Device', devices, all, 'any device')
          + '<p class="cp-note">From the width of the screen, which is what the layout responds '
          + 'to, rather than from the browser’s identifying user agent string. A phone held '
          + 'sideways can count as a tablet, which is the honest limit of measuring it this '
          + 'way.</p>',
      })
      + sec({
        title: 'How much of a page they read',
        sub: 'The spread, not the average.',
        body: '<div class="cp2">'
          + '<div>' + spread(rows, function (r) { return r.depth_total; },
            [['Left near the top, under 25%', 25], ['A quarter to halfway', 50],
              ['Halfway to three quarters', 75], ['Read to the bottom, over 75%', 100]],
            'How far down') + '</div>'
          + '<div>' + spread(rows, function (r) { return r.seconds_total; },
            [['A glance, under 10 seconds', 10], ['10 to 30 seconds', 30],
              ['Half a minute to two minutes', 120], ['Over two minutes', 1e9]],
            'How long') + '</div></div>'
          + '<p class="cp-note">An average scroll of half the page can be everybody stopping '
          + 'in the middle or half the readers leaving at the top while the rest read it all, '
          + 'and those are opposite facts. A page that is shorter than the window counts as '
          + 'read to the bottom, because there was nothing to scroll.</p>',
      })
      + sec({
        title: 'What is not here, and why',
        body: '<p class="cp-note"><b>Visitors.</b> There is no identifier of any kind, so two '
          + 'views cannot be told apart and a count of people is a number this cannot '
          + 'honestly produce. Every figure above is <b>views, not visitors</b>.</p>'
          + '<p class="cp-note"><b>What somebody did next.</b> A row is a running count for a '
          + 'day, a page, a zone, a source and a device, not an event, so there is no '
          + 'sequence to follow and no journey to reconstruct - by anybody, including '
          + 'somebody with the database open.</p>'
          + '<p class="cp-note"><b>Readers without JavaScript</b>, which is most search engine '
          + 'crawlers. The real number of page requests is higher than the figures here.</p>'
          + '<p class="cp-note"><b>Anything finer than the hour</b>, and the hour is kept in '
          + 'its own table carrying no zone, source or device, so knowing when a page was '
          + 'read never narrows down who read it.</p>',
      });

    wire(host);
  }

  function headline(all, pages, places, days, secs, deep, busiest, wasAll, wasSecs,
    wasPlaces) {
    var span = DAYS
      ? 'in the last ' + DAYS + ' days'
      : (days.length ? 'between ' + shortDate(days[0].key) + ' and '
        + shortDate(days[days.length - 1].key) : 'all time');
    return sec({
      title: 'Website stats',
      sub: '<b>' + esc(String(all)) + '</b> page view' + (all === 1 ? '' : 's')
        + ' across <b>' + esc(String(pages.length)) + '</b> page'
        + (pages.length === 1 ? '' : 's') + ' from <b>' + esc(String(places.length))
        + '</b> place' + (places.length === 1 ? '' : 's') + ' ' + esc(span) + '.',
      actions: periodBar(),
      body: '<div class="cpt-grid">'
        + tile(String(all), 'Page views', pages.length + ' pages opened',
          delta(all, wasAll))
        + tile(dur(secs / all), 'Average on a page', 'across every view',
          delta(secs / all, wasAll ? wasSecs / wasAll : 0))
        + tile(Math.round(deep / all) + '%', 'Average scrolled',
          'how far down people got')
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

  function dayTable(days, busiest) {
    var byDay = {};
    rows.forEach(function (r) {
      if (!byDay[r.day]) byDay[r.day] = { pages: {}, places: {}, top: {}, };
      byDay[r.day].pages[r.path] = 1;
      byDay[r.day].places[countryOf(r.zone)] = 1;
      byDay[r.day].top[r.path] = (byDay[r.day].top[r.path] || 0) + Number(r.views || 0);
    });
    return table(['Date', 'Day', 'Views', 'Pages', 'Places', 'Average time',
      'Average scroll', 'Most read'],
    days.slice().reverse().map(function (d) {
      var m = byDay[d.key] || { pages: {}, places: {}, top: {} };
      var top = Object.keys(m.top).sort(function (a, b) { return m.top[b] - m.top[a]; })[0];
      return '<tr' + (busiest && d.key === busiest.key ? ' class="is-top"' : '') + '>'
        + '<td>' + esc(shortDate(d.key)) + '</td>'
        + '<td>' + esc(dayName(d.key)) + '</td>'
        + '<td><b>' + esc(String(d.views)) + '</b></td>'
        + '<td>' + esc(String(Object.keys(m.pages).length)) + '</td>'
        + '<td>' + esc(String(Object.keys(m.places).length)) + '</td>'
        + '<td>' + esc(dur(d.seconds / d.views)) + '</td>'
        + '<td>' + esc(String(Math.round(d.depth / d.views))) + '%</td>'
        + '<td class="cell-club">' + esc(top || '') + '</td></tr>';
    }).join(''));
  }

  function whenSection() {
    /* 008 not run is not the same as 008 run and quiet, and the screen has to
       tell those apart: one is a file somebody has to execute, the other is a
       Tuesday nobody read the site. */
    if (hours === null) {
      return sec({
        title: 'When people read it',
        sub: 'Not switched on yet.',
        body: '<p class="cp-note">The hour of the day is recorded once '
          + '<b>migrations/008_page_stats_detail.sql</b> has been run on the database. '
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
    return sec({
      title: 'When people read it',
      sub: 'Day of the week against hour of the day, and the whole period by hour.',
      body: heatmap(hours) + hourProfile(hours),
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
      + table(['Section', 'Views', 'Share', 'Average time', ''], areas.map(function (a) {
        return '<tr><td>' + esc(a.key) + '</td><td><b>' + esc(String(a.views)) + '</b></td>'
          + '<td>' + esc(String(pct(a.views, all))) + '%</td>'
          + '<td>' + esc(dur(a.seconds / a.views)) + '</td>'
          + '<td style="width:30%">' + bar(a.views, all) + '</td></tr>';
      }).join(''))
      + '<h4 class="cp-sub">Page by page</h4>';
  }

  function pageTable(pages, all) {
    var sorted = pages.slice().sort(function (a, b) {
      if (SORT === 'seconds') return (b.seconds / b.views) - (a.seconds / a.views);
      if (SORT === 'depth') return (b.depth / b.views) - (a.depth / a.views);
      return b.views - a.views;
    });
    return table(['Page', 'Section', 'Views', 'Average time', 'Average scroll', '', ''],
      sorted.map(function (r) {
        return '<tr><td><a href="' + esc(r.key) + '" target="_blank" rel="noopener">'
          + esc(r.key) + '</a></td>'
          + '<td>' + esc(areaOf(r.key)) + '</td>'
          + '<td><b>' + esc(String(r.views)) + '</b></td>'
          + '<td>' + esc(dur(r.seconds / r.views)) + '</td>'
          + '<td>' + esc(String(Math.round(r.depth / r.views))) + '%</td>'
          + '<td style="width:20%">' + bar(r.views, all) + '</td>'
          + '<td><button class="btn btn--sm btn--ghost" data-page="' + esc(r.key)
          + '">Look at this page</button></td></tr>';
      }).join(''));
  }

  /* ---- One page on its own ----------------------------------------------
     The tables answer "which page", and the question straight after it is
     always "and who was reading THAT one". Same rows, filtered, so nothing
     here can disagree with the totals above it. */
  function focusPanel(path, all) {
    var mine = rows.filter(function (r) { return r.path === path; });
    var n = total(mine);
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

    return sec({
      title: 'This page on its own',
      sub: '<a href="' + esc(path) + '" target="_blank" rel="noopener">' + esc(path)
        + '</a> · ' + esc(areaOf(path)) + ' · <b>' + esc(String(n))
        + '</b> of the period’s ' + esc(String(all)) + ' views ('
        + esc(String(pct(n, all))) + '%).',
      actions: '<button class="btn btn--sm btn--ghost" data-page="">Close</button>',
      body: '<div class="cpt-grid">'
        + tile(String(n), 'Views of this page', pct(n, all) + '% of everything')
        + tile(dur(mySecs / n), 'Average on it', 'across every view')
        + tile(Math.round(myDeep / n) + '%', 'Average scrolled', 'how far down')
        + tile(String(days.length), 'Days it was opened', 'in this period')
        + '</div>'
        + trend(days)
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
          : ''),
    });
  }

  /* ---- Taking it away ---------------------------------------------------
     The club owns these figures and a screen is a bad place to keep them. One
     row per stored bucket, not per aggregate drawn above, so the file is the
     record rather than a picture of it. */
  function csv() {
    var head = 'day,weekday,path,section,country,zone,source,device,views,'
      + 'seconds_total,depth_total\n';
    var q = function (s) { return '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"'; };
    var body = (rows || []).map(function (r) {
      return [r.day, dayName(r.day), r.path, areaOf(r.path), countryOf(r.zone), r.zone,
        r.source || 'Direct or unknown', r.device || 'Not known', r.views,
        r.seconds_total, r.depth_total].map(q).join(',');
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
    Array.prototype.slice.call(host.querySelectorAll('[data-days]')).forEach(function (b) {
      b.addEventListener('click', function () {
        DAYS = Number(b.getAttribute('data-days'));
        FOCUS = '';
        refresh();
      });
    });
    Array.prototype.slice.call(host.querySelectorAll('[data-sort]')).forEach(function (b) {
      b.addEventListener('click', function () {
        SORT = b.getAttribute('data-sort');
        draw(host);
      });
    });
    Array.prototype.slice.call(host.querySelectorAll('[data-page]')).forEach(function (b) {
      b.addEventListener('click', function () {
        FOCUS = b.getAttribute('data-page') || '';
        draw(host);
      });
    });
    Array.prototype.slice.call(host.querySelectorAll('[data-csv]')).forEach(function (b) {
      b.addEventListener('click', csv);
    });
  }
}());
