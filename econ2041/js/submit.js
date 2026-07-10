/* Student submit page logic.
 *
 * Endpoint URL comes from window.AGG_ENDPOINT (set in the HTML).
 * Seed arrives via ?seed=XYZ (per-student iLearn link) and persists in
 * localStorage; manual entry is the fallback.
 *
 * The retry queue (backoff with jitter, capped attempts, idempotency nonce)
 * lives in transport.js (window.AGGT), shared with the portal page.
 */

(function () {
  'use strict';

  var ENDPOINT = window.AGG_ENDPOINT;

  var el = function (id) { return document.getElementById(id); };

  // ---------- seed handling ----------

  function getSeed() {
    var fromUrl = new URLSearchParams(window.location.search).get('seed');
    if (fromUrl) {
      localStorage.setItem('agg_seed', fromUrl.trim().toUpperCase());
      // strip the query so a projected screenshot of a student phone shows no seed
      history.replaceState(null, '', window.location.pathname);
    }
    return localStorage.getItem('agg_seed') || '';
  }

  function saveSeedFromInput() {
    var v = el('seed-input').value.trim().toUpperCase();
    if (!v) return;
    localStorage.setItem('agg_seed', v);
    boot();
  }

  // ---------- UI ----------

  var ERRORS = {
    bad_seed: 'That code isn’t on the class list. Check your code and try again.',
    round_closed: 'This round has closed. Wait for the next one.',
    no_such_round: 'This round no longer exists. Refresh the page.',
    not_a_number: 'Please enter a number.',
    missing_field: 'Something was empty. Enter a value and try again.',
  };

  var currentRound = null;

  function show(section) {
    ['seed-section', 'wait-section', 'round-section', 'done-section'].forEach(function (id) {
      el(id).style.display = id === section ? 'block' : 'none';
    });
  }

  function setStatus(msg, cls) {
    var s = el('status');
    s.textContent = msg;
    s.className = cls || '';
  }

  function fetchState() {
    return fetch(ENDPOINT + '?q=state', { redirect: 'follow' })
      .then(function (r) { return r.json(); });
  }

  function boot() {
    var seed = getSeed();
    if (!ENDPOINT) { setStatus('Page not configured: missing endpoint URL.', 'err'); return; }
    if (!seed) { show('seed-section'); return; }
    el('seed-badge').textContent = seed;
    show('wait-section');
    fetchState().then(function (res) {
      if (res.open) {
        currentRound = res.open;
        el('prompt').textContent = currentRound.prompt || currentRound.label;
        show('round-section');
      } else {
        show('wait-section');
      }
    }).catch(function () {
      setStatus('Could not reach the class server. Pull to refresh.', 'err');
    });
  }

  function submit() {
    var seed = getSeed();
    var raw = el('answer-input').value.trim();
    if (!raw || !currentRound) return;
    var payload = {
      action: 'submit',
      seed: seed,
      round: currentRound.round_id,
      value: raw,
      nonce: AGGT.makeNonce(seed, currentRound.round_id),
    };
    el('submit-btn').disabled = true;
    AGGT.submitWithRetry(ENDPOINT, payload, function (state, attempt, res) {
      if (state === 'sending') {
        setStatus(attempt ? 'Sending… (retry ' + attempt + ')' : 'Sending…', 'busy');
      } else if (state === 'confirmed') {
        setStatus('', '');
        el('done-msg').textContent = (res && res.locked)
          ? 'Your first answer was already locked in.'
          : 'Answer received.';
        show('done-section');
      } else if (state === 'rejected') {
        el('submit-btn').disabled = false;
        setStatus(ERRORS[res.error] || ('Not accepted: ' + res.error), 'err');
        if (res.error === 'bad_seed') { localStorage.removeItem('agg_seed'); show('seed-section'); }
      } else if (state === 'failed') {
        el('submit-btn').disabled = false;
        setStatus('Still couldn’t reach the server after several tries. ' +
                  'Check your connection (cellular often works when wifi is jammed) and tap Submit again.', 'err');
      }
    });
  }

  function another() {
    el('answer-input').value = '';
    el('submit-btn').disabled = false;
    boot();
  }

  window.AGG_SUBMIT = { boot: boot, submit: submit, saveSeedFromInput: saveSeedFromInput, another: another };
  document.addEventListener('DOMContentLoaded', boot);
})();
