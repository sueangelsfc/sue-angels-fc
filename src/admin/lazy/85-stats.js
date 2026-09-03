/* ==========================================================================
   CONTROL PANEL: WEBSITE STATS

   The club publishes 108 pages and had no way of knowing which of them
   anybody opens. This is that screen: what gets read, where in the world the
   readers are, what sent them, what they read it on, and how far down they
   got.

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

  /* ---- State ----------------------------------------------------------- */
  var DAYS = 30;
  var rows = null;      /* null means the migration has not been run */

  function sinceIso(days) {
    var d = new Date();
    d.setDate(d.getDate() - (days - 1));
    return d.toISOString().slice(0, 10);
  }

  function load() {
    if (!CP.state.isAdmin || !CP.rest) return Promise.resolve(null);
    var q = 'page_stats?select=day,path,zone,source,device,views,seconds_total,depth_total'
      + (DAYS ? '&day=gte.' + sinceIso(DAYS) : '')
      + '&order=day.desc&limit=10000';
    /* No table, no feature, no noise - the same contract band_views has. The
       try wraps the CALL as well as the promise: a helper that throws on the
       way in would otherwise reach the shell's error screen, which reads as a
       broken panel rather than as a feature nobody has switched on. */
    try {
      return CP.rest('GET', q)
        .then(function (r) { return r || []; })
        .catch(function () { return null; });
    } catch (e) { return Promise.resolve(null); }
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

  function pct(n, of) { return of ? Math.round((n / of) * 100) : 0; }

  /* The panel's own bar and tile, not new ones. The share is the point, and a
     number in a column is read one row at a time; the bar is what makes the
     shape of the answer visible without adding a component to the sheet. */
  function bar(n, of) {
    return '<span class="pipebar" aria-hidden="true"><span class="pipebar__fill" '
      + 'style="width:' + pct(n, of) + '%"></span></span>';
  }

  function rankTable(head, list, all, label) {
    if (!list.length) {
      return '<p class="cp-note">Nothing recorded yet for ' + esc(label) + '.</p>';
    }
    return table([head, 'Views', 'Share', ''], list.slice(0, 25).map(function (r) {
      return '<tr><td>' + esc(r.key) + '</td>'
        + '<td><b>' + esc(String(r.views)) + '</b></td>'
        + '<td>' + esc(String(pct(r.views, all))) + '%</td>'
        + '<td style="width:35%">' + bar(r.views, all) + '</td></tr>';
    }).join(''));
  }

  /* ---- The screen ------------------------------------------------------- */

  function notRunYet() {
    return sec({
      title: 'Website stats',
      sub: 'Nothing is being recorded yet.',
      body: '<p class="cp-note">The website starts counting page views once '
        + '<b>migrations/007_page_stats.sql</b> has been run on the database. Until then '
        + 'this screen has nothing to show and the site behaves exactly as it does now.</p>'
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
    return load().then(function (r) {
      rows = r;
      draw(host);
    });
  };

  function periodBar() {
    return [[7, 'Last 7 days'], [30, 'Last 30 days'], [90, 'Last 90 days'], [0, 'All time']]
      .map(function (p) {
        return '<button class="btn btn--sm ' + (DAYS === p[0] ? 'btn--primary' : 'btn--ghost')
          + '" data-days="' + p[0] + '">' + esc(p[1]) + '</button>';
      }).join(' ');
  }

  function draw(host) {
    if (rows === null) { host.innerHTML = notRunYet(); return; }

    var all = total(rows);
    if (!all) { host.innerHTML = periodWrap(empty()); wire(host); return; }

    var pages = roll(rows, function (r) { return r.path; });
    var places = roll(rows, function (r) { return countryOf(r.zone); });
    var sources = roll(rows, function (r) { return r.source || 'Direct or unknown'; });
    var devices = roll(rows, function (r) { return r.device || 'Not known'; });
    var days = roll(rows, function (r) { return r.day; })
      .sort(function (a, b) { return a.key < b.key ? -1 : 1; });

    var secs = rows.reduce(function (n, r) { return n + Number(r.seconds_total || 0); }, 0);
    var deep = rows.reduce(function (n, r) { return n + Number(r.depth_total || 0); }, 0);
    var busiest = days.slice().sort(function (a, b) { return b.views - a.views; })[0];

    var head = sec({
      title: 'Website stats',
      sub: '<b>' + esc(String(all)) + '</b> page view' + (all === 1 ? '' : 's') + ' across <b>'
        + esc(String(pages.length)) + '</b> page' + (pages.length === 1 ? '' : 's')
        + (DAYS ? ' in the last ' + esc(String(DAYS)) + ' days' : ', all time') + '.',
      actions: periodBar(),
      body: '<div class="cpt-grid">'
        + tile(String(all), 'Page views', pages.length + ' pages opened')
        + tile(Math.round(secs / all) + 's', 'Average on a page', 'across every view')
        + tile(Math.round(deep / all) + '%', 'Average scrolled', 'how far down people got')
        + tile(busiest ? String(busiest.views) : '0', 'Busiest day',
          busiest ? busiest.key : 'nothing yet')
        + '</div>'
        + '<p class="cp-note">These are <b>views, not visitors</b>. Nothing identifying is '
        + 'recorded, so two views cannot be told apart and this screen will never claim a '
        + 'number of unique people. It also counts only readers whose browser runs '
        + 'JavaScript, which leaves out most search engine crawlers.</p>',
    });

    var pageRows = pages.map(function (r) {
      return '<tr><td><a href="' + esc(r.key) + '" target="_blank" rel="noopener">'
        + esc(r.key) + '</a></td>'
        + '<td><b>' + esc(String(r.views)) + '</b></td>'
        + '<td>' + esc(String(Math.round(r.seconds / r.views))) + 's</td>'
        + '<td>' + esc(String(Math.round(r.depth / r.views))) + '%</td>'
        + '<td style="width:25%">' + bar(r.views, all) + '</td></tr>';
    }).join('');

    host.innerHTML = head
      + sec({
        title: 'What gets read',
        sub: 'Every page anybody opened, most read first, with how long they stayed and how '
          + 'far down they got.',
        body: table(['Page', 'Views', 'Average time', 'Average scroll', ''], pageRows),
      })
      + sec({
        title: 'Where in the world',
        sub: 'Worked out from the reader\'s device time zone.',
        body: rankTable('Country', places, all, 'anywhere')
          + '<p class="cp-note">This is the time zone the device is set to, not its address: '
          + 'no location lookup happens and no address is ever read. It is wrong for anybody '
          + 'using a VPN or reading while abroad, so treat it as the shape of the audience '
          + 'rather than a count of countries.</p>',
      })
      + sec({
        title: 'How they arrive',
        sub: 'The site that sent them.',
        body: rankTable('Source', sources, all, 'any source')
          + '<p class="cp-note">Only the sending site is recorded, never the full address it '
          + 'came from, because a full referring link can carry somebody\'s search terms. '
          + '<b>Direct or unknown</b> is somebody typing the address, a bookmark, a link from '
          + 'an app or an email, or a browser set not to say. Moving between pages of this '
          + 'site is not counted as a source.</p>',
      })
      + sec({
        title: 'What they read it on',
        body: rankTable('Device', devices, all, 'any device')
          + '<p class="cp-note">From the width of the screen, which is what the layout responds '
          + 'to, rather than from the browser\'s identifying user agent string.</p>',
      })
      + sec({
        title: 'Day by day',
        sub: 'Views per day over the period.',
        body: days.length > 1
          ? '<div class="cp-spark">' + days.map(function (d) {
            var h = Math.max(2, Math.round((d.views / (busiest.views || 1)) * 100));
            return '<span class="cp-spark__bar" style="height:' + h + '%" title="'
              + esc(d.key + ': ' + d.views + ' views') + '"></span>';
          }).join('') + '</div>'
            + '<p class="cp-note">' + esc(days[0].key) + ' to '
            + esc(days[days.length - 1].key) + '. Busiest was <b>' + esc(busiest.key)
            + '</b> with ' + esc(String(busiest.views)) + '.</p>'
          : '<p class="cp-note">One day of figures so far, so there is nothing to compare it '
            + 'with yet.</p>',
      });

    wire(host);
  }

  function periodWrap(inner) {
    return '<div class="cp-head__actions" style="margin-bottom:12px">' + periodBar()
      + '</div>' + inner;
  }

  function tile(big, label, sub) {
    return '<div class="cpt"><span class="cpt__v">' + esc(big) + '</span>'
      + '<span class="cpt__l">' + esc(label) + '</span>'
      + '<span class="cpt__s">' + esc(sub) + '</span></div>';
  }

  function wire(host) {
    Array.prototype.slice.call(host.querySelectorAll('[data-days]')).forEach(function (b) {
      b.addEventListener('click', function () {
        DAYS = Number(b.getAttribute('data-days'));
        host.setAttribute('aria-busy', 'true');
        load().then(function (r) {
          rows = r;
          host.removeAttribute('aria-busy');
          draw(host);
        }).catch(function () {
          host.removeAttribute('aria-busy');
          toast('Could not read the figures', 'error');
        });
      });
    });
  }
}());
