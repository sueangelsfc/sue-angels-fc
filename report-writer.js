/*
 * report-writer.js — turns the match data you enter into a written report.
 *
 * WHAT WAS BROKEN
 * The club already had this feature, on paper. `PolishReportControl` in
 * MatchEntry.jsx builds a careful prompt from the lineup, scorers, minutes,
 * cards and the coach's own notes, then calls `window.claude.complete(...)`.
 * The serverless proxy it needs (`/api/claude`) exists too, with its API key
 * held server-side and cost caps in place.
 *
 * Nothing ever connected the two. `window.claude` is not defined anywhere in
 * the repo, so `canPolish` has always evaluated false and the button has been
 * permanently greyed out. The feature was fully designed, half wired, and has
 * never once run. This file is the missing wire.
 *
 * WHAT IT ADDS
 * The original prompt described a match with no idea WHERE it sat in the
 * season. Now that matches carry a matchday or a cup round, a report can open
 * with "a quarter final" or "matchday 12 of the title run" instead of a
 * generic Sunday. Same facts, far better copy.
 *
 * Load order: match-context.js, then this.
 */
(function (root) {
  'use strict';

  var ENDPOINT = '/api/claude';
  var MAX_INPUT_CHARS = 8000;   /* mirrors the server-side cap in api/claude.js */

  /* ─── The wire ──────────────────────────────────────────────────────────
   * Kept deliberately compatible with the call MatchEntry.jsx already makes,
   * so the existing admin button starts working the moment this is loaded,
   * with no change to that file.
   */
  function complete(prompt) {
    var body = typeof prompt === 'string' ? { prompt: prompt } : prompt;

    if (body && body.prompt && body.prompt.length > MAX_INPUT_CHARS) {
      /* Trim here rather than let the server reject it, so a long set of notes
       * degrades to a shorter report instead of an error the coach can't act
       * on. Keep the tail: the closing instructions matter more than the top. */
      body = {
        prompt: body.prompt.slice(0, 2000) + '\n\n[...notes trimmed...]\n\n'
          + body.prompt.slice(-(MAX_INPUT_CHARS - 2100))
      };
    }

    return fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function (res) {
      if (!res.ok) {
        return res.text().then(function (t) {
          throw new Error('Report service returned ' + res.status + (t ? ': ' + t.slice(0, 200) : ''));
        });
      }
      return res.json();
    }).then(function (json) {
      var out = json && (json.completion || json.text || json.content);
      if (!out) throw new Error('Report service returned no text.');
      return String(out).trim();
    });
  }

  /* ─── Facts from the match ──────────────────────────────────────────────
   * Everything the coach has already typed, flattened into lines a language
   * model can use. Nothing here is invented; if a field is empty it is simply
   * left out, which is what keeps the report honest.
   */
  function factsFor(match, entry, squad) {
    var SQ = squad || root.SQUAD || [];
    var find = function (n) { return SQ.filter(function (p) { return p.num === n; })[0]; };
    var name = function (n) { var p = find(n); return p ? p.first + ' ' + p.last : null; };
    var d = entry || {};

    var min = function (m) { return m ? ' ' + m + "'" : ''; };

    var goals = (d.goals || []).map(function (g) {
      var n = name(g.num); if (!n) return null;
      var t = g.type === 'pen' ? ' (penalty)'
        : g.type === 'set' ? (g.setType === 'corner' ? ' (from a corner)'
          : g.setType === 'freekick' ? ' (from a free kick)'
          : g.setType === 'throwin' ? ' (from a throw-in)' : ' (set piece)') : '';
      return n + min(g.minute) + t;
    }).filter(Boolean);

    var assists = (d.assists || []).map(function (a) {
      var n = name(a.num); if (!n) return null;
      var s = a.source === 'corner' ? ' (corner)' : a.source === 'freekick' ? ' (free kick)'
        : a.source === 'throwin' ? ' (throw-in)' : '';
      return n + min(a.minute) + s;
    }).filter(Boolean);

    var oppGoals = (d.opponentGoals || []).map(function (g) {
      return (g.name || 'Unknown') + min(g.minute) + (g.type === 'pen' ? ' (penalty)' : '');
    });

    var cards = {
      yellow: (d.yellowCards || []).map(function (c) { var p = find(c.num); return p ? p.last + min(c.minute) : null; }).filter(Boolean),
      red: (d.redCards || []).map(function (c) { var p = find(c.num); return p ? p.last + min(c.minute) : null; }).filter(Boolean),
      oppRed: (d.opponentRedCards || []).map(function (c) { return (c.name || '').trim() ? c.name + min(c.minute) : null; }).filter(Boolean)
    };

    var starters = (d.starters || []).map(function (s) {
      var n = name(s.num); if (!n) return null;
      return n + (s.positions && s.positions.length ? ' (' + s.positions.join('/') + ')' : '')
        + (s.subbedOff ? ' [subbed off]' : '');
    }).filter(Boolean);

    var bench = (d.bench || []).map(function (b) {
      var n = name(b.num); if (!n) return null;
      return n + (b.positions && b.positions.length ? ' (came on as ' + b.positions.join('/') + ')' : ' [unused]');
    }).filter(Boolean);

    var ctx = root.SA_MATCH ? root.SA_MATCH.contextOf(match) : null;
    var score = ctx && ctx.score;

    return {
      opponent: /angels/i.test(match.home || '') ? match.away : match.home,
      venue: /angels/i.test(match.home || '') ? 'home' : 'away',
      date: match.date || '',
      competition: match.competition || match.comp || '',
      /* The new part: where this match sat in the season. */
      stage: ctx ? ctx.label : null,
      decidedBy: ctx ? ctx.decidedBy : null,
      result: ctx ? ctx.result : null,
      scoreLine: score ? (score.us + '-' + score.them) : null,
      goals: goals, assists: assists, oppGoals: oppGoals, cards: cards,
      starters: starters, bench: bench,
      formation: d.formation || d.formationOverride || null,
      motm: d.motm ? name(d.motm) : null,
      captain: d.captain ? name(d.captain) : null,
      notes: (d.commentary || '').trim()
    };
  }

  /* ─── The prompt ────────────────────────────────────────────────────────
   * The primary rule is carried over verbatim in spirit from the original
   * admin tool: the coach's notes are eyewitness testimony and the report is
   * built around them. Anything not in the notes or the facts below does not
   * go in the article. That single constraint is what stops it inventing
   * quotes and dramatic moments that never happened.
   */
  function buildPrompt(match, entry, squad, opts) {
    var f = factsFor(match, entry, squad);
    var o = opts || {};
    var words = o.words || '600-800';
    var L = [];

    L.push('You are the club reporter for Sue\'s Angels FC, a men\'s Sunday league football club in south-west London, founded in 2025 in memory of Susan Anne Martin, who died of sepsis.');
    L.push('');
    L.push('Write a ' + words + ' word match report from the coach\'s notes and the facts below.');
    L.push('');
    L.push('*** PRIMARY RULE ***');
    L.push('The coach\'s notes are the foundation. Treat them as source-of-truth eyewitness testimony. Build the report AROUND them. You may rephrase and expand only enough to make the prose flow. Do NOT invent moments, quotes, narratives or storylines the coach did not provide. If a detail is not in the notes or the facts below, it does not appear in the article.');
    L.push('');
    L.push('STYLE: confident, warm, British spelling. Match-day newspaper voice, not marketing copy. Never use the words "clash", "showdown" or "battle". No emoji. Do not invent attendance figures or crowd reaction; this is Sunday league.');
    L.push('');
    L.push('FACTS');
    L.push('Opponent: ' + f.opponent + ' (' + f.venue + ')');
    if (f.date) L.push('Date: ' + f.date);
    if (f.competition) L.push('Competition: ' + f.competition);
    if (f.stage) L.push('Stage: ' + f.stage + '   <- lead with this, it is the context that makes the match matter');
    if (f.scoreLine) L.push('Result: ' + f.scoreLine + ' (' + f.result + ')');
    if (f.decidedBy) L.push('Decided by: ' + f.decidedBy);
    if (f.formation) L.push('Formation: ' + f.formation);
    if (f.captain) L.push('Captain: ' + f.captain);
    if (f.starters.length) L.push('Starting XI: ' + f.starters.join(', '));
    if (f.bench.length) L.push('Bench: ' + f.bench.join(', '));
    if (f.goals.length) L.push('Our goals: ' + f.goals.join(', '));
    if (f.assists.length) L.push('Our assists: ' + f.assists.join(', '));
    if (f.oppGoals.length) L.push('Their goals: ' + f.oppGoals.join(', '));
    if (f.cards.yellow.length) L.push('Our yellow cards: ' + f.cards.yellow.join(', '));
    if (f.cards.red.length) L.push('Our red cards: ' + f.cards.red.join(', '));
    if (f.cards.oppRed.length) L.push('Their red cards: ' + f.cards.oppRed.join(', '));
    if (f.motm) L.push('Man of the match: ' + f.motm);
    L.push('');
    L.push("COACH'S NOTES");
    L.push(f.notes || '(none provided)');
    L.push('');
    L.push('Write the match report now. Output the prose only, no preamble, no headline, no labels.');

    return L.join('\n');
  }

  /* Are there enough facts to be worth writing? Reports built from a scoreline
   * alone read like filler, so the bar is the coach's notes or a goal. */
  function canWrite(entry) {
    var d = entry || {};
    var hasNotes = (d.commentary || '').trim().length > 5;
    var hasGoals = (d.goals || []).length > 0 || (d.opponentGoals || []).length > 0;
    return !!(hasNotes || hasGoals);
  }

  function write(match, entry, squad, opts) {
    if (!canWrite(entry)) {
      return Promise.reject(new Error('Add the coach\'s notes or the goalscorers first, otherwise the report is guesswork.'));
    }
    return complete(buildPrompt(match, entry, squad, opts));
  }

  var API = {
    complete: complete,
    factsFor: factsFor,
    buildPrompt: buildPrompt,
    canWrite: canWrite,
    write: write,
    endpoint: ENDPOINT
  };

  root.SA_REPORT = API;

  /* The wire itself. MatchEntry.jsx checks `window.claude && window.claude.complete`
   * and has been failing that check since the day it was written. Defining it
   * here switches the existing admin button on without touching that file.
   * Never overwrite a real one if some other script got there first. */
  if (!root.claude) root.claude = {};
  if (!root.claude.complete) root.claude.complete = complete;

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
}(typeof window !== 'undefined' ? window : globalThis));
