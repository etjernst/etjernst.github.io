/* Shared transport for the portal and submit pages.
 *
 * One implementation of the retry queue (exponential backoff with jitter,
 * capped attempts, client idempotency nonce) so the two pages can never
 * drift apart. POSTs go as text/plain JSON: Apps Script cannot answer a
 * CORS preflight, and text/plain sends none.
 *
 * Telemetry rides a separate, deliberately unreliable lane: events batch
 * on-device and flush as a sendBeacon Blob when the page goes hidden
 * (visibilitychange is the event that actually fires on a mid-lecture app
 * switch; pagehide is the backup). Batches carry an id and the server
 * dedups, since visibilitychange can fire several times per session.
 * No retry queue here by design: commits must never wait behind analytics.
 */

(function () {
  'use strict';

  var MAX_ATTEMPTS = 6;
  var BASE_DELAY_MS = 1000;
  var FLUSH_AT = 20; // events buffered before an opportunistic mid-session flush

  function post(endpoint, payload) {
    return fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow',
    }).then(function (r) {
      if (!r.ok) throw new Error('http_' + r.status);
      return r.json();
    });
  }

  function jitteredDelay(attempt) {
    var base = BASE_DELAY_MS * Math.pow(2, attempt);
    return base * (0.5 + Math.random());
  }

  function submitWithRetry(endpoint, payload, onState) {
    var attempt = 0;
    function go() {
      onState('sending', attempt);
      post(endpoint, payload).then(function (res) {
        if (res.ok) return onState('confirmed', attempt, res);
        // Server said no for a REASON (bad seed, closed round): do not retry.
        onState('rejected', attempt, res);
      }).catch(function () {
        attempt += 1;
        if (attempt >= MAX_ATTEMPTS) return onState('failed', attempt);
        setTimeout(go, jitteredDelay(attempt));
      });
    }
    go();
  }

  function makeNonce(seed, roundId) {
    return seed + '-' + roundId + '-' + Date.now().toString(36) +
           Math.random().toString(36).slice(2, 8);
  }

  // ---------- telemetry ----------

  function createTelemetry(endpoint, getSeed) {
    var buffer = [];

    function log(type, roundId, payload) {
      buffer.push({
        t: Date.now(),
        type: type,
        round: roundId || '',
        payload: payload === undefined ? null : payload,
      });
      if (buffer.length >= FLUSH_AT) flush();
    }

    function flush() {
      if (buffer.length === 0) return;
      var seed = getSeed() || '';
      var body = JSON.stringify({
        action: 'telemetry',
        batch_id: (seed || 'anon') + '-' + Date.now().toString(36) +
                  Math.random().toString(36).slice(2, 8),
        seed: seed,
        events: buffer.splice(0, buffer.length),
      });
      // text/plain Blob: no preflight; best-effort by design, never retried.
      var sent = false;
      if (navigator.sendBeacon) {
        sent = navigator.sendBeacon(
          endpoint, new Blob([body], { type: 'text/plain;charset=utf-8' }));
      }
      if (!sent) {
        fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: body,
          redirect: 'follow',
          keepalive: true,
        }).catch(function () {});
      }
    }

    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') flush();
    });
    window.addEventListener('pagehide', flush);

    return { log: log, flush: flush };
  }

  window.AGGT = {
    post: post,
    submitWithRetry: submitWithRetry,
    makeNonce: makeNonce,
    createTelemetry: createTelemetry,
  };
})();
