/* Projector page logic: live histogram, round controls, simulate fallback.
 *
 * Polls ?q=data every 2s for the selected round. Instructor token is typed
 * once into the control strip and kept in localStorage; it never appears in
 * the URL (URLs end up on the big screen).
 *
 * Simulate mode (keypress "s" or the Fallback button) feeds pre-generated
 * draws through the same renderer, for the lecture where the wifi dies:
 * the pedagogical reveal still happens.
 */

(function () {
  'use strict';

  var ENDPOINT = window.AGG_ENDPOINT;
  var POLL_MS = 2000;

  var el = function (id) { return document.getElementById(id); };
  var state = {
    round: null,       // selected round_id
    data: null,        // last payload from ?q=data
    timer: null,
    simulating: false,
    simTimer: null,
    simValues: [],
    coldOpen: false,   // held-over reveal: one fetch, finished distribution, no polling
    graceTimer: null,
  };

  // ---------- transport ----------

  function get(q) {
    return fetch(ENDPOINT + q, { redirect: 'follow' }).then(function (r) { return r.json(); });
  }

  function post(payload) {
    payload.token = localStorage.getItem('agg_token') || '';
    return fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow',
    }).then(function (r) { return r.json(); });
  }

  // ---------- histogram (hand-rolled canvas; same renderer for live and simulate) ----------

  function drawHistogram(values, truth) {
    var canvas = el('hist');
    var ctx = canvas.getContext('2d');
    var W = canvas.width = canvas.clientWidth * 2;   // 2x for crispness
    var H = canvas.height = canvas.clientHeight * 2;
    ctx.clearRect(0, 0, W, H);
    ctx.font = '28px system-ui, sans-serif';
    ctx.fillStyle = '#8a8175';
    if (!values.length) {
      ctx.fillText('Waiting for the first submission…', 40, H / 2);
      return;
    }

    var lo = Math.min.apply(null, values);
    var hi = Math.max.apply(null, values);
    if (truth !== undefined && truth !== null) {
      lo = Math.min(lo, truth); hi = Math.max(hi, truth);
    }
    if (lo === hi) { lo -= 1; hi += 1; }
    var span = hi - lo;
    lo -= span * 0.05; hi += span * 0.05;

    // adaptive bins: Sturges with sane floors/ceilings for a filling room
    var k = Math.max(8, Math.min(40, Math.ceil(Math.log2(values.length) + 1) * 2));
    var counts = new Array(k).fill(0);
    values.forEach(function (v) {
      var b = Math.min(k - 1, Math.floor(((v - lo) / (hi - lo)) * k));
      counts[b] += 1;
    });
    var maxC = Math.max.apply(null, counts);

    var padL = 60, padB = 70, padT = 30;
    var plotW = W - padL - 20, plotH = H - padT - padB;

    // bars
    ctx.fillStyle = '#c9a24b';
    for (var i = 0; i < k; i++) {
      if (!counts[i]) continue;
      var x = padL + (i / k) * plotW;
      var h = (counts[i] / maxC) * plotH;
      ctx.fillRect(x + 1, padT + plotH - h, plotW / k - 2, h);
    }

    // x axis and labels
    ctx.strokeStyle = '#8a8175'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padL, padT + plotH); ctx.lineTo(padL + plotW, padT + plotH);
    ctx.stroke();
    ctx.fillStyle = '#241f1a';
    for (var t = 0; t <= 4; t++) {
      var vx = lo + (t / 4) * (hi - lo);
      var px = padL + (t / 4) * plotW;
      var label = Math.abs(vx) >= 1000 ? vx.toFixed(0) : vx.toPrecision(3);
      ctx.fillText(label, px - 20, padT + plotH + 40);
    }

    // truth overlay
    if (truth !== undefined && truth !== null) {
      var tx = padL + ((truth - lo) / (hi - lo)) * plotW;
      ctx.strokeStyle = '#0f7a63'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(tx, padT); ctx.lineTo(tx, padT + plotH); ctx.stroke();
      ctx.fillStyle = '#0f7a63';
      ctx.fillText('truth', tx + 12, padT + 34);
    }
  }

  // Categorical rounds render as horizontal count bars, same canvas.
  function drawCounts(counts, options, truth) {
    var canvas = el('hist');
    var ctx = canvas.getContext('2d');
    var W = canvas.width = canvas.clientWidth * 2;
    var H = canvas.height = canvas.clientHeight * 2;
    ctx.clearRect(0, 0, W, H);
    ctx.font = '32px system-ui, sans-serif';
    var maxC = Math.max.apply(null, counts.concat([1]));
    var padL = 40, padT = 30;
    var rowH = Math.min(110, (H - 2 * padT) / counts.length);
    var labelW = W * 0.30, barMax = W - padL - labelW - 160;
    counts.forEach(function (n, i) {
      var y = padT + i * rowH;
      var isTruth = truth !== undefined && truth !== null && Number(truth) === i;
      ctx.fillStyle = '#241f1a';
      ctx.fillText((options[i] || ('option ' + i)) + (isTruth ? ' ✓' : ''),
                   padL, y + rowH * 0.55, labelW - 20);
      ctx.fillStyle = isTruth ? '#0f7a63' : '#c9a24b';
      var w = (n / maxC) * barMax;
      ctx.fillRect(padL + labelW, y + rowH * 0.18, Math.max(w, 3), rowH * 0.55);
      ctx.fillStyle = '#241f1a';
      ctx.fillText(String(n), padL + labelW + w + 16, y + rowH * 0.55);
    });
  }

  // Form rounds tile the one canvas with per-field marginal panels: a mini
  // histogram per numeric field, count bars per categorical field. No joint
  // cuts on the projector; those are prepared figures built from the export.

  function formPanelSpecs(config) {
    var out = [];
    var fields = (config && config.fields) || [];
    fields.forEach(function (f) {
      if (f.type !== 'note' && f.type !== 'break') {
        out.push({ id: f.id, label: f.label, spec: f });
      }
    });
    var vig = config && config.vignettes;
    if (vig) {
      for (var v = 1; v <= vig.count; v++) {
        vig.questions.forEach(function (q) {
          out.push({ id: 'v' + v + '_' + q.id, label: 'S' + v + ': ' + q.label, spec: q });
        });
      }
    }
    return out;
  }

  function drawFormPanels(fields, config) {
    var canvas = el('hist');
    var ctx = canvas.getContext('2d');
    var W = canvas.width = canvas.clientWidth * 2;
    var H = canvas.height = canvas.clientHeight * 2;
    ctx.clearRect(0, 0, W, H);
    var specs = formPanelSpecs(config);
    if (!specs.length) return;
    var cols = specs.length <= 4 ? 2 : (specs.length <= 9 ? 3 : 4);
    var rows = Math.ceil(specs.length / cols);
    var tileW = W / cols, tileH = H / rows;
    var pad = 18;
    specs.forEach(function (s, i) {
      var x0 = (i % cols) * tileW + pad;
      var y0 = Math.floor(i / cols) * tileH + pad;
      var w = tileW - 2 * pad, h = tileH - 2 * pad;
      var agg = (fields || {})[s.id] || {};
      ctx.font = '22px system-ui, sans-serif';
      ctx.fillStyle = '#241f1a';
      ctx.fillText(s.label, x0, y0 + 18, w);
      var chartY = y0 + 34, chartH = h - 40;
      if (s.spec.type === 'numeric') {
        drawMiniHist(ctx, agg.values || [], x0, chartY, w, chartH, s.spec);
      } else {
        drawMiniCounts(ctx, agg.counts || [], s.spec.options || [],
          x0, chartY, w, chartH);
      }
    });
  }

  function drawMiniHist(ctx, values, x0, y0, w, h, spec) {
    ctx.font = '18px system-ui, sans-serif';
    if (!values.length) {
      ctx.fillStyle = '#8a8175';
      ctx.fillText('no answers yet', x0, y0 + h / 2);
      return;
    }
    var lo = spec.min !== undefined ? Number(spec.min) : Math.min.apply(null, values);
    var hi = spec.max !== undefined ? Number(spec.max) : Math.max.apply(null, values);
    if (lo === hi) { lo -= 1; hi += 1; }
    var k = 10;
    var counts = new Array(k).fill(0);
    values.forEach(function (v) {
      var b = Math.min(k - 1, Math.max(0, Math.floor(((v - lo) / (hi - lo)) * k)));
      counts[b] += 1;
    });
    var maxC = Math.max.apply(null, counts);
    ctx.fillStyle = '#c9a24b';
    for (var i = 0; i < k; i++) {
      if (!counts[i]) continue;
      var bh = (counts[i] / maxC) * (h - 24);
      ctx.fillRect(x0 + (i / k) * w + 1, y0 + (h - 24) - bh, w / k - 2, bh);
    }
    ctx.fillStyle = '#8a8175';
    ctx.fillText(String(lo), x0, y0 + h - 2);
    var hiLabel = String(hi);
    ctx.fillText(hiLabel, x0 + w - ctx.measureText(hiLabel).width, y0 + h - 2);
  }

  function drawMiniCounts(ctx, counts, options, x0, y0, w, h) {
    ctx.font = '18px system-ui, sans-serif';
    if (!counts.length) {
      ctx.fillStyle = '#8a8175';
      ctx.fillText('no answers yet', x0, y0 + h / 2);
      return;
    }
    var maxC = Math.max.apply(null, counts.concat([1]));
    var rowH = Math.min(34, h / counts.length);
    var labelW = w * 0.42, barMax = w - labelW - 50;
    counts.forEach(function (n, i) {
      var y = y0 + i * rowH;
      ctx.fillStyle = '#241f1a';
      ctx.fillText(options[i] || ('option ' + i), x0, y + rowH * 0.7, labelW - 10);
      ctx.fillStyle = '#c9a24b';
      var bw = (n / maxC) * barMax;
      ctx.fillRect(x0 + labelW, y + rowH * 0.18, Math.max(bw, 2), rowH * 0.6);
      ctx.fillStyle = '#8a8175';
      ctx.fillText(String(n), x0 + labelW + bw + 8, y + rowH * 0.7);
    });
  }

  // ---------- wage-style form rounds: dot-swarm rows on one shared axis ----------
  // Triggers when every input field is numeric with one shared [min, max] and
  // there are no vignettes: the fields ARE comparable, so rows beat tiles.

  function wageFields(config) {
    if (!config || config.vignettes) return null;
    var fields = (config.fields || []).filter(function (f) {
      return f.type !== 'note' && f.type !== 'break';
    });
    if (fields.length < 2) return null;
    var f0 = fields[0];
    if (f0.type !== 'numeric' || f0.min === undefined || f0.max === undefined) return null;
    for (var i = 1; i < fields.length; i++) {
      if (fields[i].type !== 'numeric' ||
          Number(fields[i].min) !== Number(f0.min) ||
          Number(fields[i].max) !== Number(f0.max)) return null;
    }
    return fields;
  }

  function median(values) {
    if (!values.length) return undefined;
    var s = values.slice().sort(function (a, b) { return a - b; });
    var m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }

  function compact(v, prefix) {
    var body = Math.abs(v) >= 1000
      ? (Math.round(v / 100) / 10) + 'k'
      : String(Math.round(v * 100) / 100);
    return (prefix || '') + body;
  }

  // Deterministic per-index jitter so dots hold still between polls.
  function jitterFrac(j) {
    return ((j * 2654435761 % 1000) / 1000) - 0.5;
  }

  // Marks grow and solidify as the room shrinks: 30 students must read as a
  // picture, not as dust (and 8 must still look deliberate).
  function dotStyle(m) {
    if (m <= 15) return { r: 13, alpha: 0.8 };
    if (m <= 40) return { r: 10, alpha: 0.65 };
    if (m <= 100) return { r: 8, alpha: 0.5 };
    return { r: 6, alpha: 0.38 };
  }

  function drawWageRows(d, fields) {
    var canvas = el('hist');
    var ctx = canvas.getContext('2d');
    var W = canvas.width = canvas.clientWidth * 2;
    var H = canvas.height = canvas.clientHeight * 2;
    ctx.clearRect(0, 0, W, H);
    var conf = d.config || {};
    var prefix = conf.axis_prefix ? String(conf.axis_prefix) : '';
    var truthObj = (d.truth && typeof d.truth === 'object') ? d.truth : null;

    // Waiting placeholder only holds pre-reveal (no truth in the payload);
    // once revealed, always draw the rows and truth marks even at N = 1.
    if ((d.n || 0) < 3 && !truthObj) {
      ctx.font = '32px system-ui, sans-serif';
      ctx.fillStyle = '#8a8175';
      ctx.fillText('Waiting for answers…  N = ' + (d.n || 0), 60, H / 2);
      return;
    }

    var rows = fields.map(function (f) {
      var vals = ((d.fields || {})[f.id] || {}).values || [];
      return { id: f.id, label: f.label, values: vals, median: median(vals),
               truth: truthObj ? truthObj[f.id] : undefined };
    });
    // Frozen data after reveal, so this sort is stable: highest class median
    // on top, and the rows do NOT re-sort when the truth toggle flips.
    if (truthObj) {
      rows.sort(function (a, b) { return (b.median || 0) - (a.median || 0); });
    }

    var lo = Number(fields[0].min), hi = Number(fields[0].max);
    if (truthObj) {
      // tighten to the data-plus-truth extent so a thin room fills the frame
      var vlo = Infinity, vhi = -Infinity;
      rows.forEach(function (r) {
        r.values.forEach(function (v) {
          if (v < vlo) vlo = v;
          if (v > vhi) vhi = v;
        });
        if (r.truth !== undefined) {
          vlo = Math.min(vlo, r.truth); vhi = Math.max(vhi, r.truth);
        }
      });
      if (isFinite(vlo) && vhi > vlo) {
        var pad = (vhi - vlo) * 0.06;
        lo = vlo - pad; hi = vhi + pad;
      }
    }

    // the canvas draws at 2x resolution, so canvas px = half a screen px;
    // fonts here are sized for the back of a lecture theater
    var padL = Math.floor(W * 0.22), padR = 60, padT = 72, padB = 96;
    var plotW = W - padL - padR, plotH = H - padT - padB;
    var rowH = plotH / rows.length;
    function x(v) { return padL + (v - lo) / (hi - lo) * plotW; }

    // gridlines + axis labels on nice round steps
    ctx.font = '34px system-ui, sans-serif';
    niceTicks(lo, hi, 6).forEach(function (tv) {
      var tx = x(tv);
      ctx.strokeStyle = '#e6ddcd'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(tx, padT); ctx.lineTo(tx, padT + plotH); ctx.stroke();
      ctx.fillStyle = '#8a8175';
      var lbl = compact(tv, prefix);
      ctx.fillText(lbl, tx - ctx.measureText(lbl).width / 2, padT + plotH + 58);
    });

    // legend, top left of the plot area
    var legendItems = [
      { kind: 'dot', color: '#c9a24b', text: 'one answer' },
      { kind: 'dot', color: '#76232f', text: 'class median' },
    ];
    if (state.showTruth && truthObj) {
      legendItems.push({ kind: 'diamond', color: '#0f7a63',
        text: conf.truth_label ? String(conf.truth_label) : 'truth' });
    }
    var lx = padL;
    legendItems.forEach(function (item) {
      ctx.fillStyle = item.color;
      if (item.kind === 'diamond') {
        drawDiamond(ctx, lx + 13, 32, 13);
      } else {
        ctx.beginPath(); ctx.arc(lx + 13, 32, 12, 0, 2 * Math.PI); ctx.fill();
      }
      lx += 40;
      ctx.font = '32px system-ui, sans-serif';
      ctx.fillStyle = '#6f695e';
      ctx.fillText(item.text, lx, 43);
      lx += ctx.measureText(item.text).width + 56;
    });

    rows.forEach(function (r, i) {
      var cy = padT + i * rowH + rowH / 2;
      ctx.font = (rows.length > 8 ? '34px' : '40px') + ' system-ui, sans-serif';
      ctx.fillStyle = '#241f1a';
      var lab = r.label;
      ctx.fillText(lab, padL - 24 - ctx.measureText(lab).width, cy + 12);
      ctx.strokeStyle = '#e6ddcd'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(padL, cy); ctx.lineTo(padL + plotW, cy); ctx.stroke();

      var ds = dotStyle(r.values.length);
      ctx.fillStyle = '#c9a24b';
      ctx.globalAlpha = ds.alpha;
      var jMax = Math.max(rowH * 0.30, ds.r);
      r.values.forEach(function (v, j) {
        ctx.beginPath();
        ctx.arc(x(v), cy + jitterFrac(j) * 2 * jMax, ds.r, 0, 2 * Math.PI);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      if (r.median !== undefined) {
        ctx.fillStyle = '#76232f';
        ctx.globalAlpha = 0.82;
        ctx.beginPath();
        ctx.arc(x(r.median), cy, Math.max(ds.r + 3, 11), 0, 2 * Math.PI);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      if (state.showTruth && r.truth !== undefined) {
        var tx2 = x(r.truth);
        ctx.fillStyle = '#0f7a63';
        drawDiamond(ctx, tx2, cy, Math.max(ds.r + 3, 12));
        ctx.font = '30px system-ui, sans-serif';
        var tl = compact(r.truth, prefix);
        ctx.fillText(tl, tx2 - ctx.measureText(tl).width / 2, cy - rowH * 0.28);
      }
    });
  }

  // Round tick values (1/2/2.5/5 x 10^k steps) inside [lo, hi].
  function niceTicks(lo, hi, target) {
    var raw = (hi - lo) / target;
    var mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10));
    var step = 10 * mag;
    [1, 2, 2.5, 5, 10].some(function (m) {
      if ((hi - lo) / (m * mag) <= target + 1) { step = m * mag; return true; }
      return false;
    });
    var out = [];
    for (var v = Math.ceil(lo / step) * step; v <= hi; v += step) out.push(v);
    return out;
  }

  function drawDiamond(ctx, cx, cy, r) {
    ctx.beginPath();
    ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r, cy);
    ctx.lineTo(cx, cy + r); ctx.lineTo(cx - r, cy);
    ctx.closePath(); ctx.fill();
  }

  // The takeaway is computed from the room's real data, never hardcoded:
  // largest over- and underestimate, plus the spread across true values.
  function wageTakeaway(d, fields) {
    var truthObj = (d.truth && typeof d.truth === 'object') ? d.truth : null;
    if (!truthObj) return '';
    var prefix = (d.config && d.config.axis_prefix) ? String(d.config.axis_prefix) : '';
    var diffs = [];
    var tvals = [];
    fields.forEach(function (f) {
      var t = truthObj[f.id];
      if (t === undefined) return;
      tvals.push(t);
      var m = median(((d.fields || {})[f.id] || {}).values || []);
      if (m !== undefined) diffs.push({ label: f.label, median: m, truth: t, diff: m - t });
    });
    if (!diffs.length) return '';
    var over = diffs.reduce(function (a, b) { return b.diff > a.diff ? b : a; });
    var under = diffs.reduce(function (a, b) { return b.diff < a.diff ? b : a; });
    var parts = [];
    if (over.diff > 0) {
      parts.push('Biggest overestimate: <b>' + escText(over.label) + '</b> (class median ' +
        compact(over.median, prefix) + ', real ' + compact(over.truth, prefix) + ')');
    }
    if (under.diff < 0) {
      parts.push('Biggest underestimate: <b>' + escText(under.label) + '</b> (class median ' +
        compact(under.median, prefix) + ', real ' + compact(under.truth, prefix) + ')');
    }
    if (tvals.length >= 2) {
      var spread = Math.max.apply(null, tvals) - Math.min.apply(null, tvals);
      parts.push('Real spread across fields: <b>' + compact(spread, prefix) + '</b>');
    }
    return '<ul>' + parts.map(function (p) { return '<li>' + p + '</li>'; }).join('') + '</ul>';
  }

  function escText(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function syncWageChrome(d, fields) {
    var bar = el('wage-bar');
    var btn = el('truth-toggle-btn');
    var take = el('wage-takeaway');
    if (!fields) {
      bar.style.display = 'none';
      take.style.display = 'none';
      return;
    }
    var truthObj = (d.truth && typeof d.truth === 'object') ? d.truth : null;
    bar.style.display = 'flex';
    // the takeaway block holds its space (visibility, not display) from the
    // moment a wage round shows, so the chart never resizes at reveal
    take.style.display = 'block';
    if (!truthObj) {
      state.showTruth = false;
      btn.disabled = true;
      btn.textContent = 'Truth unlocks at reveal';
      take.innerHTML = '';
      take.style.visibility = 'hidden';
      return;
    }
    btn.disabled = false;
    btn.textContent = state.showTruth ? 'Hide the real numbers' : 'Reveal the real numbers';
    if (state.showTruth) {
      take.innerHTML = wageTakeaway(d, fields);
      take.style.visibility = take.innerHTML ? 'visible' : 'hidden';
    } else {
      take.innerHTML = '';
      take.style.visibility = 'hidden';
    }
  }

  function render() {
    var d = state.data;
    if (!d || !d.ok) return;
    el('n-counter').textContent = 'N = ' + d.n;
    el('round-label').textContent = d.label +
      (state.simulating ? '  [SIMULATED]' : '') +
      (state.coldOpen ? '  [COLD OPEN]' : '');
    var promptEl = el('round-prompt');
    if (promptEl) promptEl.textContent = d.prompt || '';
    var wf = d.mode === 'form' ? wageFields(d.config) : null;
    syncWageChrome(d, wf);
    if (wf && d.fields) {
      drawWageRows(d, wf);
    } else if (d.mode === 'form' && d.fields) {
      drawFormPanels(d.fields, d.config);
    } else if (d.mode === 'categorical' && d.counts) {
      drawCounts(d.counts, (d.config && d.config.options) || [], d.truth);
    } else {
      drawHistogram(d.values || [], d.truth);
    }
  }

  // ---------- polling ----------

  function poll() {
    if (state.simulating || state.coldOpen || !state.round) return;
    get('?q=data&round=' + encodeURIComponent(state.round)).then(function (d) {
      state.data = d;
      render();
    }).catch(function () { /* transient; next poll retries */ });
  }

  function startPolling() {
    if (state.timer) clearInterval(state.timer);
    state.timer = setInterval(poll, POLL_MS);
    poll();
  }

  // ---------- rounds and controls ----------

  function refreshRounds() {
    return get('?q=rounds').then(function (res) {
      var sel = el('round-select');
      sel.innerHTML = '';
      (res.rounds || []).forEach(function (r) {
        var o = document.createElement('option');
        o.value = r.round_id;
        o.textContent = r.label + ' (' + (r.state || r.status) + ')';
        sel.appendChild(o);
      });
      if (res.rounds && res.rounds.length && !state.round) {
        state.round = res.rounds[res.rounds.length - 1].round_id;
      }
      if (state.round) sel.value = state.round;
    });
  }

  function selectRound() {
    state.round = el('round-select').value;
    state.showTruth = false; // a fresh round starts with the truth hidden
    poll();
  }

  function saveToken() {
    localStorage.setItem('agg_token', el('token-input').value.trim());
    el('token-input').value = '';
    flash('Token saved on this machine.');
  }

  function flash(msg) {
    el('ctl-status').textContent = msg;
    setTimeout(function () { el('ctl-status').textContent = ''; }, 4000);
  }

  function newRound() {
    post({
      action: 'new_round',
      label: el('new-label').value || 'Round',
      prompt: el('new-prompt').value || '',
      truth: el('new-truth').value === '' ? '' : Number(el('new-truth').value),
      mode: 'numeric',
      lock_rule: el('new-lock').checked ? 'lock_first' : 'resubmit',
    }).then(function (res) {
      if (!res.ok) return flash('Failed: ' + res.error);
      state.round = res.round;
      refreshRounds().then(startPolling);
      flash('Round created.');
    });
  }

  function roundAction(action) {
    if (!state.round) return;
    post({ action: action, round: state.round }).then(function (res) {
      if (!res.ok && res.error === 'grace_violation') {
        // the server enforces reveal_ts >= close_ts + grace; count it down
        startGraceCountdown(res.earliest);
        return;
      }
      flash(res.ok ? action.replace('_', ' ') + ' done' : 'Failed: ' + res.error);
      if (res.ok && action === 'close_round') {
        startGraceCountdown(Date.now() + 30000);
      }
      refreshRounds();
      poll();
    });
  }

  // Lectern choreography after close: watch the 30s grace tick down, then
  // reveal. The server refuses an early reveal anyway; this makes the wait
  // visible instead of mysterious.
  function startGraceCountdown(untilTs) {
    if (state.graceTimer) clearInterval(state.graceTimer);
    state.graceTimer = setInterval(function () {
      var left = Math.ceil((untilTs - Date.now()) / 1000);
      if (left <= 0) {
        clearInterval(state.graceTimer);
        state.graceTimer = null;
        el('ctl-status').textContent = 'grace over: reveal when ready';
        return;
      }
      el('ctl-status').textContent = 'grace: reveal allowed in ' + left + 's';
    }, 250);
  }

  // Held-over reveal as the lecture's first slide: one fetch, the finished
  // distribution plus truth, no live filling and no polling.
  function coldOpen() {
    if (!state.round) return;
    state.coldOpen = true;
    if (state.timer) { clearInterval(state.timer); state.timer = null; }
    get('?q=data&round=' + encodeURIComponent(state.round)).then(function (d) {
      state.data = d;
      render();
      flash(d.status === 'revealed' ? 'cold open ready' :
            'round not revealed yet (showing live data)');
    });
  }

  function liveMode() {
    state.coldOpen = false;
    startPolling();
    flash('live polling resumed');
  }

  // ---------- simulate fallback ----------

  function toggleSimulate() {
    state.simulating = !state.simulating;
    if (state.simTimer) { clearInterval(state.simTimer); state.simTimer = null; }
    if (!state.simulating) { poll(); return; }
    // pre-generate a class's worth of draws: normal around a "truth"
    var truth = Number(el('new-truth').value) || 50;
    var sd = Math.abs(truth) * 0.25 || 10;
    state.simValues = [];
    var i = 0;
    state.simTimer = setInterval(function () {
      var burst = i < 15 ? 12 : 3; // front-loaded like a real room
      for (var b = 0; b < burst && state.simValues.length < 180; b++) {
        var u1 = Math.random(), u2 = Math.random();
        var z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        state.simValues.push(truth + sd * z);
      }
      i += 1;
      state.data = {
        ok: true, n: state.simValues.length, values: state.simValues.slice(),
        label: (el('new-label').value || 'Round'), status: 'open',
      };
      if (state.simValues.length >= 180) {
        state.data.truth = truth; // auto-reveal at the end of the simulation
        clearInterval(state.simTimer); state.simTimer = null;
      }
      render();
    }, 700);
  }

  // simulate mode has no button or key: it draws data unrelated to the live
  // round, and a stray keypress mid-lecture put fake numbers on the screen.
  // True emergency use: AGG_PROJECTOR.simulate() from the console; liveMode()
  // returns to real data.
  document.addEventListener('keydown', function (e) {
    if (document.activeElement.tagName === 'INPUT') return;
    if (e.key === 'h') { document.body.classList.toggle('bare'); render(); }
  });

  // fullscreen (F11) and window changes re-render at the new canvas size
  window.addEventListener('resize', function () { render(); });

  function toggleTruth() {
    state.showTruth = !state.showTruth;
    render();
  }

  window.AGG_PROJECTOR = {
    saveToken: saveToken, newRound: newRound, selectRound: selectRound,
    open: function () { roundAction('open_round'); },
    close: function () { roundAction('close_round'); },
    reveal: function () { roundAction('reveal'); },
    simulate: toggleSimulate,
    coldOpen: coldOpen,
    liveMode: liveMode,
    toggleTruth: toggleTruth,
  };

  // Test-only handle: lets tests/test_projector_render.js drive the wage
  // renderer against a stubbed canvas. Mirrors PORTAL._test in portal.js.
  window.AGG_PROJECTOR._test = {
    drawWageRows: drawWageRows,
    wageFields: wageFields,
    setShowTruth: function (v) { state.showTruth = v; },
  };

  document.addEventListener('DOMContentLoaded', function () {
    if (!ENDPOINT) { el('round-label').textContent = 'Missing endpoint URL in HTML.'; return; }
    refreshRounds().then(startPolling);
  });
})();
