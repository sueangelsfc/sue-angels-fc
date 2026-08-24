/* ==========================================================================
   CONTROL PANEL: SPONSORSHIP PIPELINE

   The one section of the retired editor that had no equivalent here at all.

   It is not a website feature and nothing it holds is published. It is the
   club's own working list of who might sponsor them: who has been contacted,
   who is in talks, who has committed, and how much of the season's target
   that adds up to. The old one lived in browser storage on one laptop, which
   means it was one cleared cache away from gone and invisible to anyone else
   at the club. This one is a row in the database like everything else, so
   two people can work the same list.

   Kept deliberately plain. A prospect is a company, a way to reach them, what
   you are asking them for, roughly what it is worth and where the conversation
   has got to. Anything more elaborate is a CRM, and a Sunday-league club
   chasing a dozen local businesses does not need one.
   ========================================================================== */
(function () {
  'use strict';
  var CP = window.CP;
  var M = window.CPM;
  var U = window.CPU;
  var $ = U.$;
  var esc = U.esc;
  var toast = U.toast;
  var guard = U.guard;
  var refresh = U.refresh;
  var confirmAction = U.confirmAction;
  var sec = U.sec;
  var table = U.table;
  var empty = U.empty;
  var download = U.download;
  var csv = U.csv;

  var STATUSES = ['To contact', 'Contacted', 'In talks', 'Committed', 'Declined'];
  /* Committed money is money. In talks and Contacted are hope, and are counted
     separately so the two are never added together by accident. */
  var WARM = { Contacted: true, 'In talks': true };

  var ASKS = ['Front of shirt', 'Back of shirt', 'Sleeve', 'Shorts', 'Training top',
    'Match ball', 'Match report', 'A player’s season', 'Pitch board', 'Website'];

  function money(n) {
    var v = Math.round(Number(n) || 0);
    return '£' + v.toLocaleString('en-GB');
  }

  M.pipeline = function (host) {
    return CP.readAll('player_photos').then(function (rows) {
      var row = rows.filter(function (r) { return r.key === 'sponsor:pipeline'; })[0];
      var data = (row && row.data) || {};
      var leads = (data.leads || []).filter(function (l) { return l && l.company; });
      var target = Number(data.target) || 4000;

      var committed = leads.filter(function (l) { return l.status === 'Committed'; });
      var committedSum = committed.reduce(function (s, l) { return s + (Number(l.amount) || 0); }, 0);
      var warmSum = leads.filter(function (l) { return WARM[l.status]; })
        .reduce(function (s, l) { return s + (Number(l.amount) || 0); }, 0);
      var pct = target ? Math.min(100, Math.round((committedSum / target) * 100)) : 0;

      function save(next, msg) {
        return CP.upsert('player_photos', 'sponsor:pipeline',
          Object.assign({}, data, { leads: next, target: target }))
          .then(function () { toast(msg || 'Saved', 'success'); refresh('pipeline'); })
          .catch(function (e) { toast(e.message, 'error'); });
      }

      host.innerHTML =
        sec({
          title: 'Sponsorship pipeline',
          sub: 'Every prospect and where the conversation has got to. Nothing here is published: it '
            + 'is the club’s own working list, kept in the database rather than on one laptop so more '
            + 'than one person can work it.',
          actions: '<button class="btn btn--primary" data-add>Add a prospect</button>'
            + '<button class="btn btn--ghost btn--sm" data-target>Change the target</button>'
            + (leads.length ? '<button class="btn btn--ghost btn--sm" data-csv>Export CSV</button>' : ''),
          body:
            '<div class="grid grid--4" style="margin-bottom:var(--space-4)">' +
              U.tile(money(committedSum), 'Committed', 'of ' + money(target)) +
              U.tile(money(warmSum), 'Still in play', 'contacted or in talks') +
              U.tile(committed.length + ' of ' + leads.length, 'Committed', 'prospects') +
              U.tile(pct + '%', 'Of the target') +
            '</div>' +
            '<div class="pipebar" role="img" aria-label="' + esc(pct) + ' per cent of the target committed">' +
              '<span class="pipebar__fill" style="width:' + pct + '%"></span>' +
            '</div>',
        }) +

        sec({
          title: 'Prospects',
          body: (leads.length
            ? table(['Company', 'How to reach them', 'What you are asking for', 'Worth', 'Where it stands', ''],
              leads.map(function (l, i) {
                return '<tr data-i="' + i + '">' +
                  '<td><b>' + esc(l.company) + '</b>' +
                    (l.category ? '<br><span style="color:var(--text-subtle)">' + esc(l.category) + '</span>' : '') +
                  '</td>' +
                  '<td>' + (/@/.test(l.contact || '')
                    ? '<a href="mailto:' + esc(l.contact) + '">' + esc(l.contact) + '</a>'
                    : esc(l.contact || '')) + '</td>' +
                  '<td>' + esc(l.ask || '') + '</td>' +
                  '<td>' + (l.amount ? esc(money(l.amount)) : '') + '</td>' +
                  '<td><select class="select" data-status aria-label="Status for ' + esc(l.company) + '">' +
                    STATUSES.map(function (s) {
                      return '<option' + (s === l.status ? ' selected' : '') + '>' + esc(s) + '</option>';
                    }).join('') + '</select></td>' +
                  '<td><button class="btn btn--ghost btn--sm" data-edit>Edit</button> ' +
                    '<button class="btn btn--danger btn--sm" data-del>Remove</button></td>' +
                '</tr>';
              }).join(''))
            : empty('No prospects yet',
              'Add the local businesses worth asking. The club’s own sponsorship page explains what is on offer.')),
          where: [['Sponsorship packages', '/sponsors.html']],
          whereNote: 'what a prospect sees when you send them the link',
        });

      function form(i) {
        var l = i == null
          ? { company: '', contact: '', category: '', ask: '', amount: '', status: 'To contact', notes: '' }
          : leads[i];
        var back = document.createElement('div');
        back.className = 'modal-backdrop';
        back.setAttribute('role', 'dialog');
        back.setAttribute('aria-modal', 'true');
        back.innerHTML =
          '<div class="modal glass glass--lg mform" style="width:min(96vw,660px)">' +
            '<div class="mform__head" style="padding-bottom:var(--space-4)">' +
              '<h2 class="mform__title">' + (i == null ? 'Add a prospect' : esc(l.company)) + '</h2></div>' +
            '<div class="mform__body">' +
              '<div class="grid grid--2">' +
                '<div class="field"><label class="field__label" for="p-co">Company</label>' +
                  '<input class="input" id="p-co" value="' + esc(l.company) + '"></div>' +
                '<div class="field"><label class="field__label" for="p-cat">What they do</label>' +
                  '<input class="input" id="p-cat" value="' + esc(l.category || '') + '" ' +
                    'placeholder="Builder, pub, estate agent"></div>' +
                '<div class="field"><label class="field__label" for="p-contact">Email or website</label>' +
                  '<input class="input" id="p-contact" value="' + esc(l.contact || '') + '"></div>' +
                '<div class="field"><label class="field__label" for="p-ask">What you are asking for</label>' +
                  '<input class="input" id="p-ask" list="p-asks" value="' + esc(l.ask || '') + '">' +
                  '<datalist id="p-asks">' + ASKS.map(function (a) {
                    return '<option value="' + esc(a) + '"></option>';
                  }).join('') + '</datalist></div>' +
                '<div class="field"><label class="field__label" for="p-amount">Roughly what it is worth</label>' +
                  '<input class="input" id="p-amount" type="number" min="0" step="25" value="' +
                    esc(l.amount || '') + '" placeholder="250"></div>' +
                '<div class="field"><label class="field__label" for="p-status">Where it stands</label>' +
                  '<select class="select" id="p-status">' + STATUSES.map(function (s) {
                    return '<option' + (s === l.status ? ' selected' : '') + '>' + esc(s) + '</option>';
                  }).join('') + '</select></div>' +
              '</div>' +
              '<div class="field" style="margin-top:var(--space-4)">' +
                '<label class="field__label" for="p-notes">Notes</label>' +
                '<textarea class="textarea" id="p-notes" rows="4" ' +
                  'placeholder="Who you spoke to, what they said, when to chase.">' +
                  esc(l.notes || '') + '</textarea></div>' +
            '</div>' +
            '<div class="mform__foot">' +
              '<button class="btn btn--ghost" data-cancel>Cancel</button>' +
              '<span class="mform__status" data-err></span>' +
              '<button class="btn btn--primary" data-save>Save</button>' +
            '</div>' +
          '</div>';
        document.body.appendChild(back);
        back.addEventListener('click', function (e) {
          if (e.target === back || e.target.matches('[data-cancel]')) back.remove();
        });
        $('#p-co', back).focus();

        $('[data-save]', back).addEventListener('click', function () {
          var company = $('#p-co', back).value.trim();
          if (!company) {
            var err = $('[data-err]', back);
            err.textContent = 'Name the company.';
            err.style.color = 'var(--error)';
            return;
          }
          var rec = {
            company: company,
            category: $('#p-cat', back).value.trim(),
            contact: $('#p-contact', back).value.trim(),
            ask: $('#p-ask', back).value.trim(),
            amount: $('#p-amount', back).value.trim(),
            status: $('#p-status', back).value,
            notes: $('#p-notes', back).value.trim(),
          };
          var next = leads.slice();
          if (i == null) next.unshift(rec); else next[i] = Object.assign({}, leads[i], rec);
          back.remove();
          save(next, i == null ? 'Prospect added' : 'Saved');
        });
      }

      host.addEventListener('change', function (e) {
        if (!e.target.matches('[data-status]')) return;
        if (!guard()) { refresh('pipeline'); return; }
        var i = Number(e.target.closest('tr[data-i]').getAttribute('data-i'));
        var next = leads.slice();
        next[i] = Object.assign({}, next[i], { status: e.target.value });
        save(next, leads[i].company + ': ' + e.target.value);
      });

      host.addEventListener('click', function (e) {
        if (e.target.matches('[data-add]')) { if (guard()) form(null); return; }

        if (e.target.matches('[data-csv]')) {
          download('sponsorship-pipeline-' + new Date().toISOString().slice(0, 10) + '.csv',
            csv(leads, ['company', 'category', 'contact', 'ask', 'amount', 'status', 'notes']));
          return;
        }

        if (e.target.matches('[data-target]')) {
          if (!guard()) return;
          var said = window.prompt('What is the season’s sponsorship target, in pounds?', String(target));
          if (said === null) return;
          var n = Math.round(Number(said));
          if (!n || n < 0) { toast('That is not a number of pounds.', 'error'); return; }
          data.target = n;
          target = n;
          save(leads, 'Target set to ' + money(n));
          return;
        }

        var tr = e.target.closest('tr[data-i]');
        if (!tr) return;
        var i = Number(tr.getAttribute('data-i'));
        if (e.target.matches('[data-edit]')) { if (guard()) form(i); return; }
        if (e.target.matches('[data-del]')) {
          if (!guard()) return;
          confirmAction({
            title: 'Remove ' + leads[i].company + '?',
            body: 'They come off the prospect list. Nothing on the website changes either way.',
            detail: 'If they simply said no, set them to Declined instead: that keeps the record of '
              + 'having asked, which is worth having next season.',
            confirmLabel: 'Remove',
          }).then(function (yes) {
            if (!yes) return;
            var next = leads.slice();
            next.splice(i, 1);
            save(next, 'Removed');
          });
        }
      });
    });
  };
})();
