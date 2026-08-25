/* ==========================================================================
   SUBSTITUTIONS

   The team sheet recorded that a starter went off (`subbedOff`) and that a
   substitute came on (`on`, `onAt`), and nothing joined the two. So the
   record could say three men went off and three came on without saying who
   replaced whom, and the match page said so out loud: "Sunday-league match
   returns do not record minutes or substitutions, so neither is shown rather
   than estimated."

   For 26/27 the club records the pair. A substitution is one event:

     { minute, off, on }

   AND A MAN CAN COME BACK ON. Sunday league runs rolling substitutions - a
   player goes off for twenty minutes and returns - which the old shape could
   not express at all, because `subbedOff` and `on` are one boolean each and a
   player is either one thing or the other for the whole match. A list of
   events has no such limit: he appears in `off` at 55 and in `on` at 75, and
   both are true.

   READING BACKWARD. Everything already saved keeps working. With no `subs`
   list the flags are read as they always were, unpaired: whoever is marked
   `on` came on, whoever is marked `subbedOff` went off, and nothing claims to
   know which replaced which - because nothing recorded it.
   ========================================================================== */

const numOf = (x) => (x && x.num != null ? Number(x.num) : Number(x));
const minOf = (v) => {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/* Every substitution in the match, in the order they happened. A pair with
   neither side named is not an event and is dropped. */
export function substitutions(d) {
  if (!d) return [];
  if (Array.isArray(d.subs)) {
    return d.subs
      .map((s) => ({
        minute: minOf(s.minute),
        off: s.off == null || s.off === '' ? null : Number(s.off),
        on: s.on == null || s.on === '' ? null : Number(s.on),
      }))
      .filter((s) => s.off != null || s.on != null)
      /* Ordered by minute, with unminuted events kept at the end in the order
         they were entered rather than sorted to the front as minute zero. */
      .sort((a, b) => (a.minute == null) - (b.minute == null)
        || (a.minute || 0) - (b.minute || 0));
  }
  /* The archive: flags with nothing joining them. */
  const out = [];
  for (const b of d.bench || []) {
    if (b && b.on) out.push({ minute: minOf(b.onAt), off: null, on: numOf(b) });
  }
  for (const s of d.starters || []) {
    if (s && s.subbedOff) out.push({ minute: null, off: numOf(s), on: null });
  }
  return out.sort((a, b) => (a.minute == null) - (b.minute == null)
    || (a.minute || 0) - (b.minute || 0));
}

/* Who was on the pitch at some point without starting there. A player named
   in `on` played, however the bench's own flag reads. */
export function cameOn(d) {
  const set = new Set();
  for (const s of substitutions(d)) if (s.on != null) set.add(s.on);
  for (const b of d?.bench || []) if (b && b.on) set.add(numOf(b));
  return set;
}

export function wentOff(d) {
  const set = new Set();
  for (const s of substitutions(d)) if (s.off != null) set.add(s.off);
  for (const s of d?.starters || []) if (s && s.subbedOff) set.add(numOf(s));
  /* Somebody taken off and later brought back on finished the match on the
     pitch, so he is not "the man who came off" in the sense the page means. */
  const back = new Set();
  const events = substitutions(d);
  for (let i = 0; i < events.length; i++) {
    if (events[i].on != null && set.has(events[i].on)) back.add(events[i].on);
  }
  for (const n of back) {
    /* Only if his LAST event was coming on. */
    const last = events.filter((e) => e.on === n || e.off === n).pop();
    if (last && last.on === n) set.delete(n);
  }
  return set;
}

/* WHO IS ON THE PITCH after `upTo` events, given the eleven. Used by the
   panel so a substitution can only take off somebody who is on and can only
   bring on somebody who is not. */
export function onPitchAfter(starters, events, upTo) {
  const on = new Set((starters || []).map(numOf).filter((n) => Number.isFinite(n)));
  const list = events.slice(0, upTo == null ? events.length : upTo);
  for (const e of list) {
    if (e.off != null) on.delete(Number(e.off));
    if (e.on != null) on.add(Number(e.on));
  }
  return on;
}

/* The flags the old shape carried, derived from the list, so a record written
   by the new form still reads correctly to anything that has not been taught
   about `subs`. A man who came off and went back on is NOT marked subbedOff. */
export function flagsFrom(starters, bench, events) {
  const off = wentOff({ subs: events, starters: [], bench: [] });
  const onNow = new Set();
  const at = {};
  for (const e of events) {
    if (e.on != null) { onNow.add(e.on); if (at[e.on] == null) at[e.on] = e.minute; }
  }
  return {
    starters: (starters || []).map((s) => ({ ...s, subbedOff: off.has(numOf(s)) })),
    bench: (bench || []).map((b) => {
      const n = numOf(b);
      const out = { ...b, on: onNow.has(n) || !!b.on };
      if (out.on && at[n] != null) out.onAt = at[n];
      return out;
    }),
  };
}
