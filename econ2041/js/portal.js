/* Portal page logic: the phone-facing home for the whole semester.
 *
 * One POST fetches the student's world (action: home): every open or
 * recently revealed round with this seed's commit state. No polling ever;
 * the Refresh button and a fresh page load are the only re-fetches, and
 * countdowns run client-side from the server-clock offset.
 *
 * Round card states: open (commit now) -> committed (locked, unlock
 * countdown) -> revealed (own answer + class result on tap).
 *
 * Depends on transport.js (window.AGGT). Endpoint from window.AGG_ENDPOINT.
 */

(function () {
  'use strict';

  var ENDPOINT = window.AGG_ENDPOINT;

  var el = function (id) { return document.getElementById(id); };
  var telemetry = null;
  var serverOffset = 0; // server now minus client now; countdowns use this
  var homeRounds = [];
  var pendingSelections = {}; // round_id -> array of selected option indices
  var shownPractice = {};     // round_id -> practice_shown already logged
  var formState = {};         // round_id -> { answers: {fieldId: value}, touched: {} }
  var DRAW_SIZE = 3;          // items per practice draw
  var practiceState = {};     // round_id -> { phase, draw, answers, optOrder, given, fb }
  var loggedTabOpen = false;  // practice_tab_open once per page session

  // ---------- variant assignment (parity-tested against Code.gs) ----------

  function hashStr(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function variantOf(seed, roundId, k) {
    if (!k || k < 2) return 0;
    return hashStr(seed + ':' + roundId) % k;
  }

  // Math.random Fisher-Yates: practice option order and draw fill must vary
  // per render, unlike the seed-deterministic vignette shuffle below.
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i >= 1; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function range(n) {
    var out = [];
    for (var i = 0; i < n; i++) out.push(i);
    return out;
  }

  // ---------- vignette assignment (parity-tested against Code.gs) ----------
  // Grid cells in attribute-declaration order, last attribute fastest;
  // Fisher-Yates with draw hashStr(seed+':'+roundId+':vig:'+i) % (i+1).

  function vignetteAssignment(seed, roundId, vig) {
    var attrs = vig.attributes;
    var grid = 1;
    for (var i = 0; i < attrs.length; i++) grid *= attrs[i].levels.length;
    var cells = [];
    for (var c = 0; c < grid; c++) cells.push(c);
    for (var s = grid - 1; s >= 1; s--) {
      var j = hashStr(seed + ':' + roundId + ':vig:' + s) % (s + 1);
      var t = cells[s]; cells[s] = cells[j]; cells[j] = t;
    }
    var out = [];
    for (var v = 0; v < vig.count; v++) out.push(cellToLevels(cells[v], attrs));
    return out;
  }

  function cellToLevels(cell, attrs) {
    var out = new Array(attrs.length);
    for (var i = attrs.length - 1; i >= 0; i--) {
      var L = attrs[i].levels.length;
      out[i] = cell % L;
      cell = Math.floor(cell / L);
    }
    return out;
  }

  // Input field specs in submit order: plain fields, then v<i>_<qid> per
  // vignette; display labels prefix the hypothetical-student number.
  function formFieldSpecs(config) {
    var out = [];
    var fields = (config && config.fields) || [];
    for (var i = 0; i < fields.length; i++) {
      if (fields[i].type !== 'note' && fields[i].type !== 'break') {
        out.push({ id: fields[i].id, spec: fields[i], label: fields[i].label });
      }
    }
    var vig = config && config.vignettes;
    if (vig) {
      for (var v = 1; v <= vig.count; v++) {
        for (var q = 0; q < vig.questions.length; q++) {
          out.push({
            id: 'v' + v + '_' + vig.questions[q].id,
            spec: vig.questions[q],
            label: 'Student ' + v + ': ' + vig.questions[q].label,
          });
        }
      }
    }
    return out;
  }

  // Wage-style form: every input field numeric with one shared [min, max]
  // and no vignettes, so the fields are comparable on one axis. Guessing
  // renders as compact slider rows; the reveal renders as a row chart.
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

  // ---------- fitline: scatter + line canvas (shared by the guessing card,
  // the locked view, and the reveal) ----------

  function fmtNum(v) {
    return String(Math.round(Number(v) * 100) / 100);
  }

  function lineEquation(cfg, alpha, beta) {
    var yl = (cfg && cfg.y_label) || 'y', xl = (cfg && cfg.x_label) || 'x';
    return esc(yl) + ' = ' + fmtNum(alpha) + (beta >= 0 ? ' + ' : ' − ') +
      fmtNum(Math.abs(beta)) + ' × ' + esc(xl);
  }

  // Fitline canvases size themselves to the card column: CSS keeps the box
  // at 100% of its container width, and this locks the backing store to that
  // measured width at a fixed aspect ratio, scaled by devicePixelRatio, so
  // lines and dots stay crisp instead of a 320px bitmap stretching to fit.
  // The aspect ratio comes from the canvas's own width/height HTML attributes
  // the first time it is sized, then is cached so later resizes cannot drift.
  var FIT_CANVAS_CLASS = 'fit-canvas';

  function sizeFitCanvas(canvas) {
    var w = Math.round(canvas.getBoundingClientRect().width);
    if (!w) return null;
    if (!canvas._fitAspect) {
      canvas._fitAspect = (canvas.width && canvas.height)
        ? canvas.width / canvas.height : 320 / 230;
    }
    var h = Math.round(w / canvas._fitAspect);
    var dpr = window.devicePixelRatio || 1;
    canvas.classList.add(FIT_CANVAS_CLASS);
    canvas.style.height = h + 'px';
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
    return { w: w, h: h };
  }

  // Round tick positions inside [lo, hi]: step from {1,2,5} x 10^k so that
  // about n ticks fit.
  function niceTicks(lo, hi, n) {
    var span = hi - lo;
    if (!(span > 0)) return [];
    var raw = span / n, mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10));
    var step = [1, 2, 5, 10].map(function (m) { return m * mag; })
      .filter(function (s) { return s >= raw; })[0];
    var out = [], t = Math.ceil(lo / step) * step;
    for (; t <= hi + step * 1e-9; t += step) out.push(Math.round(t * 1e6) / 1e6);
    return out;
  }

  // opts: { mine: {alpha,beta}, truth: {alpha,beta}, pairs: [{alpha,beta}] }.
  // pairs draw first as thin translucent "spaghetti", truth in bold green,
  // mine as a solid accent line on top, so a student's own guess never gets
  // buried under the class's.
  function drawFitCanvas(canvas, config, opts) {
    if (!canvas || !config) return;
    opts = opts || {};
    canvas._fitConfig = config;
    canvas._fitOpts = opts;
    var dims = sizeFitCanvas(canvas);
    if (!dims) return; // not laid out yet (e.g. a hidden tab)
    var ctx = canvas.getContext('2d');
    var W = dims.w, H = dims.h;
    var padL = 40, padR = 8, padT = 8, padB = 34;
    var xr = config.x_range || {}, yr = config.y_range || {};
    var xlo = Number(xr.min), xhi = Number(xr.max);
    var ylo = Number(yr.min), yhi = Number(yr.max);
    function X(v) { return padL + (v - xlo) / (xhi - xlo) * (W - padL - padR); }
    function Y(v) { return H - padB - (v - ylo) / (yhi - ylo) * (H - padT - padB); }
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = '#d8cdb8'; ctx.lineWidth = 1;
    ctx.strokeRect(padL, padT, W - padL - padR, H - padT - padB);
    // ticks and axis titles live in the padding, so the plot spans the card
    ctx.fillStyle = '#6b6259'; ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    niceTicks(xlo, xhi, 6).forEach(function (t) {
      ctx.fillText(String(t), X(t), H - padB + 3);
    });
    ctx.fillText(String(config.x_label || 'x'), padL + (W - padL - padR) / 2, H - padB + 17);
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    niceTicks(ylo, yhi, 5).forEach(function (t) {
      ctx.fillText(String(t), padL - 4, Y(t));
    });
    ctx.save();
    ctx.translate(10, padT + (H - padT - padB) / 2); ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(config.y_label || 'y'), 0, 0);
    ctx.restore();
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    if (xlo < 0 && xhi > 0) { // dashed guide at x = 0: the intercept is read here
      ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = '#8c8377'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(X(0), padT); ctx.lineTo(X(0), H - padB); ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = 'rgba(74,127,181,0.55)';
    (config.x || []).forEach(function (xv, i) {
      var yv = (config.y || [])[i];
      if (yv === undefined) return;
      ctx.beginPath(); ctx.arc(X(xv), Y(yv), 2.6, 0, 2 * Math.PI); ctx.fill();
    });
    ctx.save();
    ctx.beginPath();
    ctx.rect(padL, padT, W - padL - padR, H - padT - padB);
    ctx.clip();
    function drawLine(alpha, beta, color, width, alphaOp) {
      ctx.strokeStyle = color; ctx.lineWidth = width;
      ctx.globalAlpha = alphaOp === undefined ? 1 : alphaOp;
      ctx.beginPath();
      ctx.moveTo(X(xlo), Y(alpha + beta * xlo));
      ctx.lineTo(X(xhi), Y(alpha + beta * xhi));
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    (opts.pairs || []).forEach(function (p) {
      drawLine(Number(p.alpha), Number(p.beta), '#c9a24b', 1.4, 0.35);
    });
    if (opts.truth) drawLine(Number(opts.truth.alpha), Number(opts.truth.beta), '#0f7a63', 3, 1);
    if (opts.mine) drawLine(Number(opts.mine.alpha), Number(opts.mine.beta), '#76232f', 2.6, 1);
    ctx.restore();
  }

  function fitlineCommitHtml(r) {
    var c = r.config || {};
    var a = c.alpha || {}, b = c.beta || {};
    var midA = fmtNum(a.start !== undefined ? Number(a.start) : (Number(a.min) + Number(a.max)) / 2);
    var midB = fmtNum(b.start !== undefined ? Number(b.start) : (Number(b.min) + Number(b.max)) / 2);
    return '<canvas id="fit-' + r.round_id + '" width="320" height="230"></canvas>' +
      '<div class="field"><p class="field-label">Intercept: ' + esc(c.y_label || 'y') +
      ' when ' + esc(c.x_label || 'x') + ' = 0</p>' +
      '<input type="range" id="fa-slider-' + r.round_id + '" min="' + a.min +
      '" max="' + a.max + '" step="' + (a.step || 'any') + '" value="' + midA + '">' +
      '<input type="number" id="fa-num-' + r.round_id + '" step="' + (a.step || 'any') +
      '" inputmode="decimal" value="' + midA + '"></div>' +
      '<div class="field"><p class="field-label">Slope: change in ' + esc(c.y_label || 'y') +
      ' per unit ' + esc(c.x_label || 'x') + '</p>' +
      '<input type="range" id="fb-slider-' + r.round_id + '" min="' + b.min +
      '" max="' + b.max + '" step="' + (b.step || 'any') + '" value="' + midB + '">' +
      '<input type="number" id="fb-num-' + r.round_id + '" step="' + (b.step || 'any') +
      '" inputmode="decimal" value="' + midB + '"></div>' +
      '<button id="go-' + r.round_id + '">Submit</button>';
  }

  function fitlineCommittedHtml(r) {
    var mv = normalizeValue(r.my_value);
    if (!mv || typeof mv !== 'object') return '<p class="mine">Your line is in.</p>';
    return '<canvas id="fitc-' + r.round_id + '" width="320" height="230"></canvas>' +
      '<p class="mine">Your line: <strong>' +
      lineEquation(r.config, mv.alpha, mv.beta) + '</strong></p>';
  }

  function compact(v, prefix) {
    var body = Math.abs(v) >= 1000
      ? (Math.round(v / 100) / 10) + 'k'
      : String(Math.round(v * 100) / 100);
    return (prefix || '') + body;
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

  // Stored form/multi-select values arrive as JSON strings on some paths.
  function normalizeValue(v) {
    if (typeof v === 'string' && (v.charAt(0) === '{' || v.charAt(0) === '[')) {
      try { return JSON.parse(v); } catch (e) { return v; }
    }
    return v;
  }

  // ---------- seed handling (same convention as submit.js) ----------

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

  // ---------- time ----------

  function serverNow() {
    return Date.now() + serverOffset;
  }

  function fmtCountdown(ms) {
    if (ms <= 0) return 'now';
    var s = Math.floor(ms / 1000);
    var d = Math.floor(s / 86400);
    var h = Math.floor((s % 86400) / 3600);
    var m = Math.floor((s % 3600) / 60);
    if (d > 0) return d + 'd ' + h + 'h';
    if (h > 0) return h + 'h ' + m + 'm';
    if (m > 0) return m + 'm';
    return s + 's';
  }

  // ---------- rendering ----------

  var ERRORS = {
    bad_seed: 'That code isn’t on the class list. Check your code and try again.',
    round_closed: 'This round has closed.',
    no_such_round: 'This round no longer exists. Refresh the page.',
    not_a_number: 'Please enter a number.',
    out_of_range: 'That number is outside the allowed range.',
    bad_choice: 'That choice didn’t work. Tap an option and try again.',
    missing_field: 'Something was empty. Enter a value and try again.',
    not_yet: 'The reveal hasn’t unlocked yet.',
    form_missing_field: 'This one still needs an answer.',
    form_unknown_field: 'Something went out of sync. Refresh the page and try again.',
    vignette_mismatch: 'The page went stale. Refresh and try again; your answers are saved on this phone.',
    bad_value: 'Something went out of sync. Refresh the page and try again.',
  };

  // ---------- form drafts (survive a locked phone mid-form) ----------

  function draftKey(roundId) {
    return 'agg_draft_' + getSeed() + ':' + roundId;
  }

  function formStateFor(r) {
    var id = r.round_id;
    if (!formState[id]) {
      var answers = {};
      try {
        var raw = localStorage.getItem(draftKey(id));
        if (raw) answers = JSON.parse(raw) || {};
      } catch (e) { answers = {}; }
      formState[id] = { answers: answers, touched: {}, fieldErrors: {} };
    }
    return formState[id];
  }

  function saveDraft(r) {
    try {
      localStorage.setItem(draftKey(r.round_id),
        JSON.stringify(formStateFor(r).answers));
    } catch (e) { /* storage full or blocked: drafts are best-effort */ }
  }

  function clearDraft(r) {
    delete formState[r.round_id];
    try { localStorage.removeItem(draftKey(r.round_id)); } catch (e) { /* ditto */ }
  }

  function show(section) {
    ['seed-section', 'home-section'].forEach(function (id) {
      el(id).style.display = id === section ? 'block' : 'none';
    });
  }

  function setStatus(msg, cls) {
    var s = el('status');
    s.textContent = msg;
    s.className = cls || '';
  }

  function stateChip(state, practice) {
    if (practice) return '<span class="chip chip-practice">practice</span>';
    var labels = { open: 'open', closed: 'awaiting reveal', revealed: 'revealed' };
    return '<span class="chip chip-' + state + '">' + (labels[state] || state) + '</span>';
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // Authored text (prompts, field labels, explanations) may carry newlines,
  // which HTML collapses to a space. Escape first, then turn the newlines into
  // breaks, so the escaping still owns everything the author wrote. Used to put
  // the question being asked about on its own line, under the instruction.
  function escLines(s) {
    return esc(s).replace(/\r?\n/g, '<br>');
  }

  function practiceLabelHtml(label, isCode) {
    return String(label).split(/\r?\n/).map(function (line) {
      if (isCode && /^ {4}\S/.test(line)) {
        return '<code class="practice-code-line">' + esc(line.slice(4)) + '</code>';
      }
      return esc(line);
    }).join('<br>');
  }

  function practiceFigureHtml(spec) {
    var src = String((spec && spec.figure) || '');
    var alt = String((spec && spec.figure_alt) || '');
    if (!/^assets\/practice\/[a-z0-9][a-z0-9-]*\.png$/.test(src) || !alt) return '';
    return '<figure class="practice-figure"><img src="' + esc(src) +
      '" alt="' + esc(alt) + '" loading="lazy" decoding="async"></figure>';
  }

  // Escaping and math coexist: esc() turns "<" into "&lt;" in the markup, and
  // the typesetter reads text content, where it is "<" again. Call this after
  // every innerHTML write. A missing library is not an error worth surfacing
  // to a student mid-lecture; the LaTeX source just stays visible.
  var MATH_DELIMS = [
    { left: '$$', right: '$$', display: true },
    { left: '\\[', right: '\\]', display: true },
    { left: '$', right: '$', display: false },
    { left: '\\(', right: '\\)', display: false },
  ];

  function typeset(node) {
    if (!node || typeof window.renderMathInElement !== 'function') return;
    try {
      window.renderMathInElement(node, { delimiters: MATH_DELIMS, throwOnError: false });
    } catch (e) { /* leave the source text as written */ }
  }

  // A cap equal to the number of options is not really a cap, so say so.
  function pickHint(maxSelections, optionCount) {
    return maxSelections >= optionCount
      ? 'Pick all that apply.'
      : 'Pick up to ' + maxSelections + '.';
  }

  function describeValue(round, value) {
    value = normalizeValue(value);
    if (value === null || value === undefined) return '';
    if (round.mode === 'numeric') return String(value);
    var opts = (round.config && round.config.options) || [];
    var picks = Array.isArray(value) ? value : [value];
    return picks.map(function (p) { return opts[p] === undefined ? p : opts[p]; }).join(', ');
  }

  function describeFieldValue(spec, value) {
    if (value === null || value === undefined) return '—';
    if (spec.type === 'numeric') return String(value);
    var opts = spec.options || [];
    var picks = Array.isArray(value) ? value : [value];
    return picks.map(function (p) { return opts[p] === undefined ? p : opts[p]; }).join(', ');
  }

  // ---------- routing: lecture is the default; #practice is the tab ----------

  function practiceRounds() {
    return homeRounds.filter(function (r) { return r.practice; });
  }

  function lectureRounds() {
    return homeRounds.filter(function (r) { return !r.practice; });
  }

  function slugOf(r) {
    return (r.config && r.config.slug) || r.round_id;
  }

  function route() {
    var h = window.location.hash || '';
    if (h.indexOf('#practice') !== 0) return { view: 'lecture', slug: null };
    var rest = h.slice('#practice'.length);
    if (rest.charAt(0) === '/' && rest.length > 1) {
      return { view: 'practice', slug: rest.slice(1) };
    }
    return { view: 'practice', slug: null };
  }

  function render() {
    var pools = practiceRounds();
    var tabs = el('tabs');
    if (tabs) tabs.style.display = pools.length ? 'flex' : 'none';
    // no pools on the server means no practice surface at all, whatever the hash
    var rt = pools.length ? route() : { view: 'lecture', slug: null };
    if (tabs) {
      el('tab-lecture').className = 'tab' + (rt.view === 'lecture' ? ' active' : '');
      el('tab-practice').className = 'tab' + (rt.view === 'practice' ? ' active' : '');
    }
    // the refresh button re-fetches the round list, which only the lecture
    // tab needs (a round can open mid-session); next to "Draw three more"
    // it reads as a second, mystery draw button, so practice hides it
    var refresh = el('refresh-btn');
    if (refresh) refresh.style.display = rt.view === 'practice' ? 'none' : '';
    var wrap = el('rounds');
    wrap.innerHTML = '';
    if (rt.view === 'practice') {
      if (rt.slug) renderTopic(wrap, rt.slug);
      else renderPracticeHome(wrap);
      typeset(wrap);
      return;
    }
    renderLecture(wrap);
  }

  function renderLecture(wrap) {
    var rounds = lectureRounds();
    if (rounds.length === 0) {
      wrap.innerHTML = '<p class="muted">Nothing is open right now. ' +
        'New questions appear here during and after each lecture.</p>';
      return;
    }
    rounds.forEach(function (r) {
      var card = document.createElement('div');
      card.className = 'round';
      card.innerHTML = cardHtml(r);
      wrap.appendChild(card);
    });
    typeset(wrap);
    rounds.forEach(function (r) { wireCard(r); });
  }

  // ---------- practice: front page, topic subpage, draw flow ----------

  function answeredMap(r) {
    var mv = normalizeValue(r.my_value);
    return (mv && typeof mv === 'object' && !Array.isArray(mv)) ? mv : {};
  }

  function latestPick(v) {
    return Number(Array.isArray(v) ? v[0] : v);
  }

  // Per-item status in pool order, from the home fetch: 'unseen' | 'tried'
  // (answered, latest answer not right) | 'right' (latest answer correct).
  // A cold cache cannot recover completion yet, but still returns hollow
  // placeholders so every topic card keeps its one-square-per-item strip.
  function itemStatuses(r) {
    var specs = formFieldSpecs(r.config);
    if (r.committed === 'unknown') {
      return {
        known: false,
        values: specs.map(function () { return 'unseen'; }),
      };
    }
    var mine = answeredMap(r);
    var truth = (r.feedback && r.feedback.truth) || {};
    return {
      known: true,
      values: specs.map(function (s) {
        var v = mine[s.id];
        if (v === undefined || v === null) return 'unseen';
        return (truth[s.id] !== undefined && latestPick(v) === Number(truth[s.id]))
          ? 'right' : 'tried';
      }),
    };
  }

  // One progress square per pool item; the mini variant sits on the
  // front-page cards. The counts ride along as the tooltip and the
  // accessible label, since the squares themselves are the display.
  function squaresHtml(r, mini) {
    var progress = itemStatuses(r);
    var sts = progress.values;
    if (!sts.length) return '';
    var tried = 0, right = 0;
    sts.forEach(function (st) {
      if (st !== 'unseen') tried++;
      if (st === 'right') right++;
    });
    var title = progress.known
      ? 'Tried ' + tried + ' of ' + sts.length + ', ' + right + ' right'
      : 'Progress loading for ' + sts.length + ' questions';
    return '<span class="' + (mini ? 'mini-strip' : 'sq-strip') +
      '" role="img" title="' + title + '" aria-label="' + title + '">' +
      sts.map(function (st) { return '<span class="sq ' + st + '"></span>'; }).join('') +
      '</span>';
  }

  function renderPracticeHome(wrap) {
    if (!loggedTabOpen) {
      loggedTabOpen = true;
      telemetry.log('practice_tab_open', '', null);
    }
    var intro = document.createElement('p');
    intro.className = 'prompt';
    intro.textContent = 'What do you want to practice today?';
    wrap.appendChild(intro);
    practiceRounds().forEach(function (r) {
      var card = document.createElement('a');
      card.className = 'round is-practice topic-card';
      card.href = '#practice/' + slugOf(r);
      card.innerHTML = '<span class="round-label">' + esc(r.label) + '</span>' +
        (r.prompt ? '<p class="muted">' + escLines(r.prompt) + '</p>' : '') +
        squaresHtml(r, true);
      wrap.appendChild(card);
    });
  }

  function practiceStateFor(r) {
    var id = r.round_id;
    if (!practiceState[id]) {
      practiceState[id] = { phase: 'idle', draw: [], answers: {}, optOrder: {} };
    }
    return practiceState[id];
  }

  // Draw preference: unseen first, then previously-wrong (the home fetch
  // already carries this seed's latest answers and their keys), then random
  // refill. All three groups are shuffled, so nothing about item order is
  // load-bearing; the draw event logs the served ids.
  function drawItems(r, n) {
    var mine = answeredMap(r);
    var truth = (r.feedback && r.feedback.truth) || {};
    var unseen = [], wrong = [], rest = [];
    formFieldSpecs(r.config).forEach(function (s) {
      var v = mine[s.id];
      if (v === undefined || v === null) { unseen.push(s.id); return; }
      if (truth[s.id] !== undefined && latestPick(v) !== Number(truth[s.id])) {
        wrong.push(s.id);
      } else {
        rest.push(s.id);
      }
    });
    var order = shuffle(unseen).concat(shuffle(wrong)).concat(shuffle(rest));
    return order.slice(0, Math.min(n, order.length));
  }

  function specById(r) {
    var out = {};
    formFieldSpecs(r.config).forEach(function (s) { out[s.id] = s; });
    return out;
  }

  function renderTopic(wrap, slug) {
    var r = null;
    practiceRounds().forEach(function (x) { if (slugOf(x) === slug) r = x; });
    var crumb = '<p class="crumb"><a href="#practice">&#8592; All topics</a></p>';
    if (!r) {
      wrap.innerHTML = crumb +
        '<p class="muted">That practice topic isn&#8217;t here. Pick one from the list.</p>';
      return;
    }
    var id = r.round_id;
    if (!shownPractice[id]) {
      // opens the time-on-task clock: the first moment this student could be
      // reading this topic's questions
      shownPractice[id] = true;
      telemetry.log('practice_shown', id, null);
      telemetry.log('practice_topic_open', id, null);
    }
    var ps = practiceStateFor(r);
    var html = crumb + '<div class="round-head">' +
      '<span class="chip chip-practice">practice</span>' +
      '<span class="round-label">' + esc(r.label) + '</span></div>' +
      squaresHtml(r, false);
    var poolN = formFieldSpecs(r.config).length;
    var drawN = Math.min(DRAW_SIZE, poolN);
    var drawWord = drawN === 3 ? 'three' : String(drawN);
    if (ps.phase === 'answer') {
      ps.draw.forEach(function (fid) {
        html += practiceItemHtml(r, fid, ps);
      });
      html += '<button id="go-draw-' + id + '" disabled>Check my answers</button>';
    } else if (ps.phase === 'feedback') {
      html += drawFeedbackHtml(r, ps) +
        '<button id="draw-' + id + '">Draw ' + drawWord + ' more</button>';
    } else {
      html += '<button id="draw-' + id + '">Draw ' + drawWord + ' questions</button>';
    }
    wrap.innerHTML = html;
    wireTopic(r, ps);
  }

  // One pool item, options in this draw's shuffled display order; the data-i
  // attribute keeps the canonical index, so storage and telemetry never see
  // display order.
  function practiceItemHtml(r, fid, ps) {
    var s = specById(r)[fid];
    if (!s) return '';
    var spec = s.spec;
    var html = '<div class="field"><p class="field-label">' +
      practiceLabelHtml(s.label, spec.code) + '</p>' + practiceFigureHtml(spec);
    if (spec.help) html += '<p class="help">' + esc(spec.help) + '</p>';
    if (spec.type === 'numeric') {
      var cur = ps.answers[fid];
      html += '<input type="number" step="' + (spec.step || 'any') +
        '" inputmode="decimal" id="pnum-' + r.round_id + '-' + esc(fid) +
        '" placeholder="Your answer" value="' +
        esc(cur === undefined || cur === null ? '' : String(cur)) + '">';
    } else {
      var opts = spec.options || [];
      var order = ps.optOrder[fid] || range(opts.length);
      html += '<div class="opts">' + order.map(function (ci) {
        return '<button class="opt popt' +
          (ps.answers[fid] === ci ? ' picked' : '') +
          '" data-round="' + r.round_id + '" data-field="' + esc(fid) +
          '" data-i="' + ci + '">' + esc(opts[ci]) + '</button>';
      }).join('') + '</div>';
    }
    return html + '</div>';
  }

  function startDraw(r, ps) {
    ps.draw = drawItems(r, DRAW_SIZE);
    ps.answers = {};
    ps.optOrder = {};
    var byId = specById(r);
    ps.draw.forEach(function (fid) {
      var spec = (byId[fid] || {}).spec || {};
      ps.optOrder[fid] = shuffle(range((spec.options || []).length));
    });
    ps.phase = 'answer';
    telemetry.log('practice_draw', r.round_id, { items: ps.draw });
    render();
  }

  function wireTopic(r, ps) {
    var id = r.round_id;
    var drawBtn = el('draw-' + id);
    if (drawBtn) drawBtn.onclick = function () { startDraw(r, ps); };
    var goBtn = el('go-draw-' + id);
    var byId = specById(r);

    function updateGate() {
      if (!goBtn) return;
      var done = ps.draw.every(function (fid) {
        var v = ps.answers[fid];
        if (v === undefined || v === null) return false;
        var spec = (byId[fid] || {}).spec || {};
        if (spec.type === 'numeric') {
          return String(v).trim() !== '' && isFinite(Number(v));
        }
        return typeof v === 'number';
      });
      goBtn.disabled = !done;
    }

    ps.draw.forEach(function (fid) {
      var spec = (byId[fid] || {}).spec || {};
      if (spec.type !== 'numeric') return;
      var num = el('pnum-' + id + '-' + fid);
      if (!num) return;
      num.oninput = function () {
        ps.answers[fid] = num.value.trim();
        updateGate();
      };
    });

    document.querySelectorAll('.popt[data-round="' + id + '"]').forEach(function (b) {
      b.onclick = function () {
        var fid = b.getAttribute('data-field');
        ps.answers[fid] = Number(b.getAttribute('data-i'));
        document.querySelectorAll(
          '.popt[data-round="' + id + '"][data-field="' + fid + '"]'
        ).forEach(function (g) {
          g.classList.toggle('picked', Number(g.getAttribute('data-i')) === ps.answers[fid]);
        });
        updateGate();
      };
    });

    if (goBtn) {
      goBtn.onclick = function () {
        var value = {};
        for (var i = 0; i < ps.draw.length; i++) {
          var fid = ps.draw[i];
          var v = ps.answers[fid];
          if (v === undefined || v === null) return; // gate should prevent this
          var spec = (byId[fid] || {}).spec || {};
          value[fid] = spec.type === 'numeric' ? Number(v) : v;
        }
        commitDraw(r, ps, value, goBtn);
      };
    }

    updateGate();
  }

  // Commit one draw. On confirmation, merge the answers and the returned
  // feedback into the round's standing state (the server merges the same way,
  // so a later home fetch agrees), then show the per-item marking.
  function commitDraw(r, ps, value, btn) {
    var seed = getSeed();
    if (btn) btn.disabled = true;
    var payload = {
      action: 'submit',
      seed: seed,
      round: r.round_id,
      value: value,
      nonce: AGGT.makeNonce(seed, r.round_id),
    };
    telemetry.log('commit_tap', r.round_id, null);
    AGGT.submitWithRetry(ENDPOINT, payload, function (state, attempt, res) {
      if (state === 'sending') {
        setStatus(attempt ? 'Sending… (retry ' + attempt + ')' : 'Sending…', 'busy');
      } else if (state === 'confirmed') {
        setStatus('', '');
        r.committed = 'yes';
        var mine = answeredMap(r);
        Object.keys(value).forEach(function (k) { mine[k] = value[k]; });
        r.my_value = mine;
        var fb = res && res.feedback;
        if (fb) {
          var have = r.feedback || { truth: {}, explain: {} };
          Object.keys(fb.truth || {}).forEach(function (k) {
            have.truth[k] = fb.truth[k];
          });
          Object.keys(fb.explain || {}).forEach(function (k) {
            have.explain[k] = fb.explain[k];
          });
          r.feedback = have;
        }
        ps.given = value;
        ps.fb = fb || { truth: {}, explain: {} };
        ps.phase = 'feedback';
        render();
      } else if (state === 'rejected') {
        if (btn) btn.disabled = false;
        setStatus(ERRORS[res.error] || ('Not accepted: ' + res.error), 'err');
        if (res.error === 'bad_seed') {
          localStorage.removeItem('agg_seed');
          show('seed-section');
        }
        if (res.error === 'form_unknown_field' || res.error === 'no_such_round') boot();
      } else if (state === 'failed') {
        if (btn) btn.disabled = false;
        setStatus('Still couldn’t reach the server after several tries. ' +
                  'Check your connection (cellular often works when wifi is jammed) ' +
                  'and tap again.', 'err');
      }
    });
  }

  // Per-item marking for one draw, same three verdicts as the lecture-side
  // feedback cards: right, wrong, and (unreachable here, since the gate
  // requires an answer) blank.
  function drawFeedbackHtml(r, ps) {
    var truth = (ps.fb && ps.fb.truth) || {};
    var explain = (ps.fb && ps.fb.explain) || {};
    var byId = specById(r);
    var right = 0, marked = 0;
    var items = ps.draw.map(function (fid) {
      var s = byId[fid];
      var key = truth[fid];
      if (!s || key === undefined) return '';
      marked++;
      var given = ps.given[fid];
      var correct = latestPick(given) === Number(key);
      if (correct) right++;
      var verdict = correct
        ? '<span class="fb-right">Correct.</span> ' +
          esc(describeFieldValue(s.spec, given))
        : '<span class="fb-wrong">Not this time.</span> You said ' +
          '<strong>' + esc(describeFieldValue(s.spec, given)) +
          '</strong>; the answer is <strong>' +
          esc(describeFieldValue(s.spec, key)) + '</strong>.';
      var why = explain[fid];
      return '<div class="fb-item ' + (correct ? 'is-right' : 'is-wrong') +
             '"><p class="fb-q">' + practiceLabelHtml(s.label, s.spec.code) + '</p>' +
             practiceFigureHtml(s.spec) +
             '<p class="fb-verdict">' + verdict + '</p>' +
             (why ? '<p class="fb-explain">' + escLines(why) + '</p>' : '') +
             '</div>';
    }).join('');
    var score = marked
      ? '<p class="fb-score">You got ' + right + ' of ' + marked + '.</p>'
      : '';
    return '<div class="fb">' + score + items + '</div>';
  }

  function cardHtml(r) {
    var head = '<div class="round-head">' + stateChip(r.state, r.practice) +
               '<span class="round-label">' + esc(r.label) + '</span></div>' +
               '<p class="prompt">' + escLines(r.prompt || '') + '</p>';
    // A practice round never closes and never reveals, so its only two
    // shapes are "not answered yet" and "answered, here is how it went".
    if (r.practice && r.committed === 'yes') {
      return head + practiceFeedbackHtml(r) +
        (r.lock_rule === 'resubmit'
          ? '<button class="ghost" id="change-' + r.round_id + '">Try these again</button>'
          : '');
    }
    if (r.state === 'open' && r.committed !== 'yes') {
      return head + commitHtml(r) +
        (r.committed === 'unknown'
          ? '<p class="muted">Could not confirm whether you already answered; ' +
            'submitting again is safe, ' +
            (r.lock_rule === 'lock_first'
              ? 'your first answer is the one that counts.'
              : 'your latest answer is the one that counts.') + '</p>'
          : '');
    }
    if (r.state === 'open') {
      var change = r.lock_rule === 'resubmit'
        ? '<button class="ghost" id="change-' + r.round_id + '">Change my answer</button>'
        : '<p class="muted">First answer locked in.</p>';
      return head + committedHtml(r) + change + revealEta(r);
    }
    if (r.state === 'closed') {
      return head + committedHtml(r) + revealEta(r);
    }
    // revealed
    return head + committedHtml(r) +
      '<button id="view-' + r.round_id + '">See the result</button>' +
      '<div class="result" id="result-' + r.round_id + '"></div>';
  }

  function committedHtml(r) {
    if (r.committed !== 'yes') return '<p class="muted">You didn’t answer this one.</p>';
    if (r.mode === 'fitline') return fitlineCommittedHtml(r);
    if (r.mode === 'form') {
      var mv = normalizeValue(r.my_value);
      if (!mv || typeof mv !== 'object') {
        return '<p class="mine">Your answers are in.</p>';
      }
      var specs = formFieldSpecs(r.config);
      var wagePrefix = wageFields(r.config)
        ? ((r.config && r.config.axis_prefix) || '') : null;
      return '<div class="form-summary">' + specs.map(function (s) {
        var shown = (wagePrefix !== null && typeof mv[s.id] === 'number')
          ? compact(mv[s.id], wagePrefix)
          : describeFieldValue(s.spec, mv[s.id]);
        return '<p class="mine">' + esc(s.label) + ': <strong>' +
               esc(shown) + '</strong></p>';
      }).join('') + '</div>';
    }
    return '<p class="mine">Your answer: <strong>' +
           esc(describeValue(r, r.my_value)) + '</strong></p>';
  }

  // Per-item marking for a practice round. Three outcomes per item, because a
  // blank answer is a different thing from a wrong one and a student who
  // skipped should not read "not quite".
  function practiceFeedbackHtml(r) {
    var fb = r.feedback;
    if (!fb || !fb.truth) return '<p class="muted">Your answers are in.</p>';
    var mine = normalizeValue(r.my_value) || {};
    var specs = formFieldSpecs(r.config);
    var right = 0, marked = 0;

    var items = specs.map(function (s) {
      var key = fb.truth[s.id];
      if (key === undefined) return ''; // unkeyed field, nothing to mark
      marked++;
      var given = mine[s.id];
      var blank = given === undefined || given === null ||
                  (Array.isArray(given) && given.length === 0);
      var correct = !blank && Number(
        Array.isArray(given) ? given[0] : given) === Number(key);
      if (correct) right++;

      var verdict;
      if (blank) {
        verdict = '<span class="fb-blank">You skipped this one.</span> ' +
                  'The answer is <strong>' + esc(describeFieldValue(s.spec, key)) +
                  '</strong>.';
      } else if (correct) {
        verdict = '<span class="fb-right">Correct.</span> ' +
                  esc(describeFieldValue(s.spec, given));
      } else {
        verdict = '<span class="fb-wrong">Not this time.</span> You said ' +
                  '<strong>' + esc(describeFieldValue(s.spec, given)) +
                  '</strong>; the answer is <strong>' +
                  esc(describeFieldValue(s.spec, key)) + '</strong>.';
      }

      var why = (fb.explain || {})[s.id];
      var tone = blank ? 'is-blank' : (correct ? 'is-right' : 'is-wrong');
      return '<div class="fb-item ' + tone + '"><p class="fb-q">' +
             practiceLabelHtml(s.label, s.spec.code) + '</p>' +
             practiceFigureHtml(s.spec) +
             '<p class="fb-verdict">' + verdict + '</p>' +
             (why ? '<p class="fb-explain">' + escLines(why) + '</p>' : '') + '</div>';
    }).join('');

    var score = marked
      ? '<p class="fb-score">You got ' + right + ' of ' + marked + '.</p>'
      : '';
    return '<div class="fb">' + score + items + '</div>';
  }

  function revealEta(r) {
    // no reveal timestamp means the lecturer unlocks it live, so promising a
    // time would be wrong; say nothing rather than guess
    if (!r.reveal_ts) return '';
    return '<p class="muted">Reveal unlocks in ' +
           fmtCountdown(r.reveal_ts - serverNow()) + '.</p>';
  }

  function commitHtml(r) {
    if (r.mode === 'form') return formCommitHtml(r);
    if (r.mode === 'fitline') return fitlineCommitHtml(r);
    if (r.mode === 'numeric') {
      var c = r.config || {};
      var slider = (c.min !== undefined && c.max !== undefined)
        ? '<input type="range" id="slider-' + r.round_id + '" min="' + c.min +
          '" max="' + c.max + '" step="' + (c.step || 'any') + '" value="' +
          ((Number(c.min) + Number(c.max)) / 2) + '">'
        : '';
      return slider +
        '<input type="number" step="' + (r.config && r.config.step || 'any') +
        '" inputmode="decimal" id="num-' + r.round_id + '" placeholder="Your answer">' +
        '<button id="go-' + r.round_id + '">Submit</button>';
    }
    var opts = (r.config && r.config.options) || [];
    var ms = (r.config && r.config.max_selections) || 1;
    var btns = opts.map(function (o, i) {
      return '<button class="opt" data-round="' + r.round_id + '" data-i="' + i + '">' +
             esc(o) + '</button>';
    }).join('');
    // the hint sits above the choices, so it is read before the picking
    var hint = ms > 1 ? '<p class="muted">' + pickHint(ms, opts.length) + '</p>' : '';
    var submit = ms > 1
      ? '<button id="go-' + r.round_id + '" disabled>Submit picks</button>' : '';
    return hint + '<div class="opts">' + btns + '</div>' + submit;
  }

  // ---------- form rendering: one scrollable screen ----------

  // Screens: a {type: 'break'} entry in the field list splits the form into
  // pages, and each vignette then renders as its own page. A form with no
  // break renders one scrollable screen. The vignette block sits at
  // vignettes.position in the field list (display-only); default is last.
  function buildFormPages(r) {
    var conf = r.config || {};
    var fields = conf.fields || [];
    var vig = conf.vignettes;
    var vigAt = vig
      ? (vig.position === undefined ? fields.length : vig.position)
      : -1;
    var paged = fields.some(function (f) { return f.type === 'break'; });
    var pages = [];
    var cur = [];
    function flush() {
      if (cur.length) { pages.push(cur); cur = []; }
    }
    for (var fi = 0; fi <= fields.length; fi++) {
      if (fi === vigAt && vig) {
        if (paged) {
          flush();
          for (var v = 1; v <= vig.count; v++) pages.push([{ vig: v }]);
        } else {
          cur.push({ vigBlock: true });
        }
      }
      if (fi === fields.length) break;
      if (fields[fi].type === 'break') flush();
      else cur.push({ field: fields[fi] });
    }
    flush();
    if (!pages.length) pages.push([]);
    return pages;
  }

  function formCommitHtml(r) {
    var vig = (r.config || {}).vignettes;
    var st = formStateFor(r);
    var pages = buildFormPages(r);
    if (st.page === undefined) st.page = firstIncompletePage(r, pages);
    st.page = Math.min(Math.max(st.page, 0), pages.length - 1);
    var p = st.page;
    var derived = vig ? vignetteAssignment(getSeed(), r.round_id, vig) : null;
    var html = pages.length > 1
      ? '<p class="muted screen-marker">Screen ' + (p + 1) + ' of ' + pages.length + '</p>'
      : '';
    var wage = !!wageFields(r.config || {});
    pages[p].forEach(function (item) {
      if (item.field) {
        html += item.field.type === 'note'
          ? '<p class="note">' + esc(item.field.text) + '</p>'
          : formFieldHtml(r, item.field, item.field.id, item.field.label, wage);
      } else if (item.vig) {
        html += vignettePageHtml(r, vig, item.vig, derived);
      } else if (item.vigBlock) {
        for (var v = 1; v <= vig.count; v++) {
          html += vignettePageHtml(r, vig, v, derived);
        }
      }
    });
    html += '<p class="muted progress" id="prog-' + r.round_id + '"></p>';
    if (pages.length > 1) {
      html += '<div class="nav-row">' +
        (p > 0 ? '<button class="ghost half" id="back-' + r.round_id + '">Back</button>' : '') +
        (p < pages.length - 1 ? '<button class="half" id="next-' + r.round_id + '">Next</button>' : '') +
        '</div>';
    }
    if (p === pages.length - 1) {
      html += '<button id="go-' + r.round_id + '" disabled>Submit answers</button>';
    }
    return html;
  }

  function vignettePageHtml(r, vig, v, derived) {
    var html = (v === 1 && vig.intro)
      ? '<p class="note">' + esc(vig.intro) + '</p>'
      : '';
    html += '<div class="vig"><p class="vig-title">Hypothetical student ' + v + '</p><ul>';
    vig.attributes.forEach(function (a, ai) {
      html += '<li>' + esc(a.label) + ': <strong>' +
              esc(a.levels[derived[v - 1][ai]]) + '</strong></li>';
    });
    html += '</ul>';
    for (var q = 0; q < vig.questions.length; q++) {
      html += formFieldHtml(r, vig.questions[q],
        'v' + v + '_' + vig.questions[q].id, vig.questions[q].label);
    }
    return html + '</div>';
  }

  function vigFieldIds(vig, v) {
    return vig.questions.map(function (q) { return 'v' + v + '_' + q.id; });
  }

  // First page holding an unanswered input, so a restored draft resumes
  // where the student stopped.
  function firstIncompletePage(r, pages) {
    var st = formStateFor(r);
    var vig = (r.config || {}).vignettes;
    for (var p = 0; p < pages.length; p++) {
      for (var i = 0; i < pages[p].length; i++) {
        var it = pages[p][i];
        if (it.field && it.field.type !== 'note' && it.field.type !== 'break') {
          if (!isAnswered(it.field, st.answers[it.field.id])) return p;
        }
        var vs = it.vig ? [it.vig] : (it.vigBlock ? rangeTo(vig.count) : []);
        for (var vi = 0; vi < vs.length; vi++) {
          for (var q = 0; q < vig.questions.length; q++) {
            var fid = 'v' + vs[vi] + '_' + vig.questions[q].id;
            if (!isAnswered(vig.questions[q], st.answers[fid])) return p;
          }
        }
      }
    }
    return 0;
  }

  function rangeTo(n) {
    var out = [];
    for (var i = 1; i <= n; i++) out.push(i);
    return out;
  }

  function pageOfField(r, fid) {
    var pages = buildFormPages(r);
    var vig = (r.config || {}).vignettes;
    for (var p = 0; p < pages.length; p++) {
      for (var i = 0; i < pages[p].length; i++) {
        var it = pages[p][i];
        if (it.field && it.field.id === fid) return p;
        var vs = it.vig ? [it.vig] : (it.vigBlock && vig ? rangeTo(vig.count) : []);
        for (var vi = 0; vi < vs.length; vi++) {
          if (vigFieldIds(vig, vs[vi]).indexOf(fid) !== -1) return p;
        }
      }
    }
    return 0;
  }

  function formFieldHtml(r, spec, fid, label, wage) {
    var key = r.round_id + '-' + fid;
    var st = formStateFor(r);
    var cur = st.answers[fid];
    var errMsg = (st.fieldErrors || {})[fid] || '';
    if (wage && spec.type === 'numeric') {
      // compact slider row: name left, live value right, em-dash until touched
      var prefix = (r.config && r.config.axis_prefix) || '';
      var answered = cur !== undefined && cur !== null && String(cur).trim() !== '';
      var wHtml = '<div class="drow"><div class="drow-top">' +
        '<span class="dname">' + esc(label) + '</span>' +
        '<span class="dval' + (answered ? '' : ' empty') + '" id="dval-' + key + '">' +
        (answered ? esc(compact(Number(cur), prefix)) : '—') + '</span></div>';
      if (spec.help) wHtml += '<p class="help">' + esc(spec.help) + '</p>';
      wHtml += '<input type="range" id="slider-' + key + '" min="' + spec.min +
        '" max="' + spec.max + '" step="' + (spec.step || 'any') +
        '" value="' + esc(answered ? String(cur) : String(spec.min)) + '">';
      return wHtml + '<p class="field-err" id="err-' + r.round_id + '-' + esc(fid) +
             '">' + esc(errMsg) + '</p></div>';
    }
    var html = '<div class="field"><p class="field-label">' + escLines(label) + '</p>';
    if (spec.help) html += '<p class="help">' + esc(spec.help) + '</p>';
    if (spec.type === 'numeric') {
      var hasRange = spec.min !== undefined && spec.max !== undefined;
      var val = (cur === undefined || cur === null) ? '' : String(cur);
      if (hasRange) {
        html += '<input type="range" id="slider-' + key + '" min="' + spec.min +
                '" max="' + spec.max + '" step="' + (spec.step || 'any') +
                '" value="' + esc(val !== '' ? val
                  : String((Number(spec.min) + Number(spec.max)) / 2)) + '">';
      }
      html += '<input type="number" step="' + (spec.step || 'any') +
              '" inputmode="decimal" id="num-' + key +
              '" placeholder="Your answer" value="' + esc(val) + '">';
    } else {
      var opts = spec.options || [];
      var picks = Array.isArray(cur) ? cur
        : (cur === undefined || cur === null ? [] : [cur]);
      // the hint sits under the question, above the choices, so it is read
      // before the picking rather than after it
      if ((spec.max_selections || 1) > 1) {
        html += '<p class="muted">' + pickHint(spec.max_selections, opts.length) + '</p>';
      }
      html += '<div class="opts">' + opts.map(function (o, i) {
        return '<button class="opt fopt' + (picks.indexOf(i) !== -1 ? ' picked' : '') +
               '" data-round="' + r.round_id + '" data-field="' + esc(fid) +
               '" data-i="' + i + '">' + esc(o) + '</button>';
      }).join('') + '</div>';
    }
    return html + '<p class="field-err" id="err-' + r.round_id + '-' + esc(fid) +
                  '">' + esc(errMsg) + '</p></div>';
  }

  function wireCard(r) {
    var id = r.round_id;
    var viewBtn = el('view-' + id);
    if (viewBtn) viewBtn.onclick = function () { viewReveal(r); };
    var changeBtn = el('change-' + id);
    if (changeBtn) {
      changeBtn.onclick = function () {
        if (r.practice) {
          // a retry starts blank: prefilling after the answers have been shown
          // turns a second attempt into copying the two red ones across
          var stp = formStateFor(r);
          stp.answers = {};
          stp.page = 0;
          stp.fieldErrors = {};
          saveDraft(r);
          r.committed = 'no';
          delete r.feedback;
          render();
          return;
        }
        if (r.mode === 'form') {
          // prefill the form from the committed object so a revision starts
          // from the standing answers, not a blank slate
          var mv = normalizeValue(r.my_value);
          if (mv && typeof mv === 'object') {
            var answers = {};
            formFieldSpecs(r.config).forEach(function (s) {
              if (mv[s.id] !== undefined) answers[s.id] = mv[s.id];
            });
            var stc = formStateFor(r);
            stc.answers = answers;
            stc.page = 0;
            stc.fieldErrors = {};
            saveDraft(r);
          }
        }
        r.committed = 'no';
        render();
      };
    }
    if (r.mode === 'form') { wireForm(r); return; }
    if (r.mode === 'fitline') { wireFitline(r); return; }
    var goBtn = el('go-' + id);
    var slider = el('slider-' + id);
    var num = el('num-' + id);
    if (slider && num) {
      slider.oninput = function () { num.value = slider.value; };
      num.oninput = function () { slider.value = num.value; };
    }
    if (r.mode === 'numeric' && goBtn) {
      goBtn.onclick = function () {
        var raw = num.value.trim();
        if (!raw) return;
        commit(r, Number(raw), goBtn);
      };
    }
    if (r.mode === 'categorical') {
      var ms = (r.config && r.config.max_selections) || 1;
      var optBtns = document.querySelectorAll('.opt[data-round="' + id + '"]');
      optBtns.forEach(function (b) {
        b.onclick = function () {
          var i = Number(b.getAttribute('data-i'));
          if (ms === 1) return commit(r, i, b); // one tap commits
          var sel = pendingSelections[id] || (pendingSelections[id] = []);
          var at = sel.indexOf(i);
          if (at >= 0) { sel.splice(at, 1); b.classList.remove('picked'); }
          else if (sel.length < ms) { sel.push(i); b.classList.add('picked'); }
          if (goBtn) goBtn.disabled = sel.length === 0;
        };
      });
      if (ms > 1 && goBtn) {
        goBtn.onclick = function () {
          var sel = pendingSelections[id] || [];
          if (sel.length === 0) return;
          commit(r, sel.slice(), goBtn);
        };
      }
    }
  }

  // ---------- form wiring: drafts, progress gate, first-touch telemetry ----------

  function isAnswered(spec, v) {
    if (v === undefined || v === null) return false;
    if (spec.type === 'numeric') {
      return String(v).trim() !== '' && isFinite(Number(v));
    }
    if ((spec.max_selections || 1) > 1) return Array.isArray(v) && v.length > 0;
    return typeof v === 'number';
  }

  function wireForm(r) {
    var id = r.round_id;
    var st = formStateFor(r);
    var specs = formFieldSpecs(r.config);
    var specById = {};
    specs.forEach(function (s) { specById[s.id] = s.spec; });
    var goBtn = el('go-' + id); // only exists on the last screen

    var backBtn = el('back-' + id);
    var nextBtn = el('next-' + id);
    if (backBtn) {
      backBtn.onclick = function () {
        st.page -= 1;
        telemetry.log('form_page', id, { page: st.page });
        render();
      };
    }
    if (nextBtn) {
      nextBtn.onclick = function () {
        st.page += 1;
        telemetry.log('form_page', id, { page: st.page });
        render();
      };
    }

    function touch(fid) {
      if (st.touched[fid]) return;
      st.touched[fid] = true;
      telemetry.log('field_touch', id, { field: fid });
    }

    function updateProgress() {
      var done = 0;
      specs.forEach(function (s) {
        if (isAnswered(s.spec, st.answers[s.id])) done += 1;
      });
      var prog = el('prog-' + id);
      if (prog) prog.textContent = done + ' of ' + specs.length + ' answered';
      if (goBtn) goBtn.disabled = done < specs.length;
    }

    var prefix = (r.config && r.config.axis_prefix) || '';
    specs.forEach(function (s) {
      if (s.spec.type !== 'numeric') return;
      var key = id + '-' + s.id;
      var num = el('num-' + key);
      var slider = el('slider-' + key);
      if (!num && !slider) return;
      var onNum = function () {
        st.answers[s.id] = num.value.trim();
        touch(s.id);
        saveDraft(r);
        updateProgress();
      };
      if (num) {
        num.oninput = function () {
          if (slider) slider.value = num.value;
          onNum();
        };
        if (slider) {
          slider.oninput = function () {
            num.value = slider.value;
            onNum();
          };
        }
        return;
      }
      // wage row: slider only, live value label, dash until first touch
      var dval = el('dval-' + key);
      slider.oninput = function () {
        st.answers[s.id] = slider.value;
        if (dval) {
          dval.textContent = compact(Number(slider.value), prefix);
          dval.className = 'dval';
        }
        touch(s.id);
        saveDraft(r);
        updateProgress();
      };
    });

    document.querySelectorAll('.fopt[data-round="' + id + '"]').forEach(function (b) {
      b.onclick = function () {
        var fid = b.getAttribute('data-field');
        var i = Number(b.getAttribute('data-i'));
        var spec = specById[fid];
        var ms = spec.max_selections || 1;
        var ex = spec.exclusive_options || [];
        var group = document.querySelectorAll(
          '.fopt[data-round="' + id + '"][data-field="' + fid + '"]');
        if (ms === 1) {
          st.answers[fid] = i;
          group.forEach(function (g) { g.classList.remove('picked'); });
          b.classList.add('picked');
        } else {
          var sel = Array.isArray(st.answers[fid]) ? st.answers[fid] : [];
          var at = sel.indexOf(i);
          if (at >= 0) {
            sel.splice(at, 1);
          } else {
            // an exclusive pick clears the rest; a normal pick clears exclusives
            if (ex.indexOf(i) !== -1) sel = [i];
            else sel = sel.filter(function (p) { return ex.indexOf(p) === -1; });
            if (sel.indexOf(i) === -1 && sel.length < ms) sel.push(i);
          }
          st.answers[fid] = sel;
          group.forEach(function (g) {
            var gi = Number(g.getAttribute('data-i'));
            g.classList.toggle('picked', sel.indexOf(gi) !== -1);
          });
        }
        touch(fid);
        saveDraft(r);
        updateProgress();
      };
    });

    if (goBtn) {
      goBtn.onclick = function () {
        var value = {};
        for (var k = 0; k < specs.length; k++) {
          var s = specs[k];
          var v = st.answers[s.id];
          if (!isAnswered(s.spec, v)) return; // gate should prevent this
          if (s.spec.type === 'numeric') value[s.id] = Number(v);
          else value[s.id] = Array.isArray(v) ? v.slice() : v;
        }
        if (r.config && r.config.vignettes) {
          value.vignette_attrs = vignetteAssignment(getSeed(), id, r.config.vignettes);
        }
        st.fieldErrors = {};
        commit(r, value, goBtn);
      };
    }

    updateProgress();
  }

  // ---------- fitline wiring: live scatter+line, or the committed static one ----------

  function wireFitline(r) {
    var id = r.round_id;
    if (r.committed === 'yes') {
      var mv = normalizeValue(r.my_value);
      var lockedCanvas = el('fitc-' + id);
      if (lockedCanvas && mv && typeof mv === 'object') {
        drawFitCanvas(lockedCanvas, r.config, { mine: mv });
      }
      return;
    }
    var canvas = el('fit-' + id);
    var aSlider = el('fa-slider-' + id), aNum = el('fa-num-' + id);
    var bSlider = el('fb-slider-' + id), bNum = el('fb-num-' + id);
    var goBtn = el('go-' + id);

    function current() {
      return { alpha: Number(aNum.value), beta: Number(bNum.value) };
    }
    function redraw() {
      drawFitCanvas(canvas, r.config, { mine: current() });
    }
    if (aSlider && aNum) {
      aSlider.oninput = function () { aNum.value = aSlider.value; redraw(); };
      aNum.oninput = function () { aSlider.value = aNum.value; redraw(); };
    }
    if (bSlider && bNum) {
      bSlider.oninput = function () { bNum.value = bSlider.value; redraw(); };
      bNum.oninput = function () { bSlider.value = bNum.value; redraw(); };
    }
    if (goBtn) {
      goBtn.onclick = function () {
        var v = current();
        if (!isFinite(v.alpha) || !isFinite(v.beta)) return;
        commit(r, v, goBtn);
      };
    }
    redraw();
  }

  // ---------- actions ----------

  function commit(r, value, btn) {
    var seed = getSeed();
    if (btn) btn.disabled = true;
    var payload = {
      action: 'submit',
      seed: seed,
      round: r.round_id,
      value: value,
      nonce: AGGT.makeNonce(seed, r.round_id),
    };
    telemetry.log('commit_tap', r.round_id, null);
    AGGT.submitWithRetry(ENDPOINT, payload, function (state, attempt, res) {
      if (state === 'sending') {
        setStatus(attempt ? 'Sending… (retry ' + attempt + ')' : 'Sending…', 'busy');
      } else if (state === 'confirmed') {
        setStatus('', '');
        r.committed = 'yes';
        r.my_value = (res && res.locked && r.my_value !== null) ? r.my_value : value;
        // practice rounds answer the student on the submit response itself;
        // there is no reveal to wait for
        if (res && res.feedback) r.feedback = res.feedback;
        delete pendingSelections[r.round_id];
        if (r.mode === 'form') clearDraft(r);
        render();
      } else if (state === 'rejected') {
        if (btn) btn.disabled = false;
        setStatus(ERRORS[res.error] || ('Not accepted: ' + res.error), 'err');
        if (res.field && r.mode === 'form') {
          // land the student on the offending field's screen with the
          // message rendered at the field
          var stf = formStateFor(r);
          stf.fieldErrors = {};
          stf.fieldErrors[res.field] = ERRORS[res.error] || res.error;
          stf.page = pageOfField(r, res.field);
          render();
        }
        if (res.error === 'bad_seed') { localStorage.removeItem('agg_seed'); show('seed-section'); }
        if (res.error === 'round_closed') boot();
      } else if (state === 'failed') {
        if (btn) btn.disabled = false;
        setStatus('Still couldn’t reach the server after several tries. ' +
                  'Check your connection (cellular often works when wifi is jammed) ' +
                  'and tap again.', 'err');
      }
    });
  }

  // The reveal fetch is idempotent, and the cold-open moment is a herd:
  // 249 phones tapping within seconds of each other against ~30 execution
  // slots. It must ride the same retry-with-jitter queue as commits, or
  // most of the room's first taps bounce off the concurrency cap.
  function viewReveal(r) {
    var box = el('result-' + r.round_id);
    box.innerHTML = '<p class="muted">Loading…</p>';
    telemetry.log('reveal_view', r.round_id, null);
    var payload = { action: 'reveal_view', seed: getSeed(), round: r.round_id };
    AGGT.submitWithRetry(ENDPOINT, payload, function (state, attempt, res) {
      if (state === 'confirmed') {
        if (typeof res.now === 'number') serverOffset = res.now - Date.now();
        renderResult(r, res, box);
        typeset(box);
      } else if (state === 'rejected') {
        box.innerHTML = '<p class="muted">' +
          esc(ERRORS[res.error] || res.error) + '</p>';
      } else if (state === 'failed') {
        box.innerHTML = '<p class="muted">Could not load the result. Tap again.</p>';
      }
    });
  }

  // Reveal on the phone: the same scatter-plus-spaghetti language as the
  // projector, at card width — every committed line thin and translucent,
  // the OLS truth line bold green, this student's own line on top.
  function renderFitlineResult(r, res, box) {
    var c = r.config || {};
    var mv = normalizeValue(res.my_value);
    var html = '<p class="mine">Class lines: <strong>' + res.n + '</strong></p>' +
      '<canvas id="fitr-' + r.round_id + '" width="320" height="240"></canvas>';
    if (res.truth) {
      html += '<p class="mine">True line: <strong>' +
        lineEquation(c, res.truth.alpha, res.truth.beta) + '</strong></p>';
    }
    box.innerHTML = html;
    drawFitCanvas(el('fitr-' + r.round_id), c, {
      pairs: res.pairs || [],
      mine: (mv && typeof mv === 'object') ? mv : undefined,
      truth: res.truth,
    });
  }

  function renderResult(r, res, box) {
    if (r.mode === 'form') return renderFormResult(r, res, box);
    if (r.mode === 'fitline') return renderFitlineResult(r, res, box);
    var html = '<p class="mine">Class answers: <strong>' + res.n + '</strong></p>';
    if (res.my_value !== null && res.my_value !== undefined) {
      html += '<p class="mine">Yours: <strong>' +
              esc(describeValue(r, res.my_value)) + '</strong></p>';
    }
    if (r.mode === 'numeric') {
      html += '<canvas id="hist-' + r.round_id + '" width="320" height="150"></canvas>';
      if (res.truth !== undefined) {
        html += '<p class="mine">Truth: <strong>' + esc(String(res.truth)) + '</strong></p>';
      }
      box.innerHTML = html;
      drawHistogram(el('hist-' + r.round_id), res.values,
        res.my_value, res.truth);
      return;
    }
    var opts = (res.config && res.config.options) || [];
    var counts = res.counts || [];
    var total = counts.reduce(function (a, b) { return a + b; }, 0) || 1;
    var picks = Array.isArray(res.my_value) ? res.my_value : [res.my_value];
    html += counts.map(function (n, i) {
      var pct = Math.round(100 * n / total);
      var isMine = picks.indexOf(i) !== -1;
      var isTruth = res.truth !== undefined && Number(res.truth) === i;
      return '<div class="bar-row' + (isMine ? ' mine-row' : '') + '">' +
        '<span class="bar-label">' + esc(opts[i] || ('option ' + i)) +
        (isTruth ? ' ✓' : '') + '</span>' +
        '<span class="bar" style="width:' + Math.max(pct, 2) + '%"></span>' +
        '<span class="bar-n">' + n + '</span></div>';
    }).join('');
    box.innerHTML = html;
  }

  // Wage-style reveal: one row per field on a shared axis, three
  // shape-distinct marks (ring = you, dot = class median, diamond = truth),
  // plus a one-line personal miss. No dot swarm at phone width.
  function renderWageResult(r, res, box, fields) {
    var conf = r.config || {};
    var prefix = conf.axis_prefix ? String(conf.axis_prefix) : '';
    var truthLabel = conf.truth_label ? String(conf.truth_label) : 'truth';
    var mv = normalizeValue(res.my_value) || {};
    var rows = fields.map(function (f) {
      var vals = ((res.fields || {})[f.id] || {}).values || [];
      return { label: f.label, median: median(vals),
               truth: res.truth[f.id],
               mine: typeof mv[f.id] === 'number' ? mv[f.id] : undefined };
    });
    rows.sort(function (a, b) { return (b.median || 0) - (a.median || 0); });

    var html = '<p class="mine">Class answers: <strong>' + res.n + '</strong></p>' +
      '<canvas id="wage-' + r.round_id + '" width="680" height="' +
      (rows.length * 56 + 64) + '"></canvas>' +
      '<p class="help">' +
      '<span class="mark-you"></span> you &nbsp; ' +
      '<span class="mark-med"></span> class median &nbsp; ' +
      '<span class="mark-truth"></span> ' + esc(truthLabel) + '</p>';

    // the largest personal miss, in words (only when this student answered)
    var worst = null;
    rows.forEach(function (rw) {
      if (rw.mine === undefined || rw.truth === undefined) return;
      if (!worst || Math.abs(rw.mine - rw.truth) > Math.abs(worst.mine - worst.truth)) {
        worst = rw;
      }
    });
    if (worst && Math.abs(worst.mine - worst.truth) > 0) {
      html += '<p class="mine">Your biggest miss: <strong>' + esc(worst.label) +
        '</strong> — you guessed ' + esc(compact(worst.mine, prefix)) +
        '; the real number is ' + esc(compact(worst.truth, prefix)) + '.</p>';
    }
    box.innerHTML = html;
    drawWagePhone(el('wage-' + r.round_id), rows, r.config);
  }

  function drawWagePhone(canvas, rows, conf) {
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var W = canvas.width, H = canvas.height;
    var prefix = conf.axis_prefix ? String(conf.axis_prefix) : '';
    var f0 = wageFields(conf)[0];
    var lo = Number(f0.min), hi = Number(f0.max);
    var vlo = Infinity, vhi = -Infinity;
    rows.forEach(function (r) {
      [r.median, r.truth, r.mine].forEach(function (v) {
        if (v === undefined) return;
        if (v < vlo) vlo = v;
        if (v > vhi) vhi = v;
      });
    });
    if (isFinite(vlo) && vhi > vlo) {
      var pad = (vhi - vlo) * 0.08;
      lo = vlo - pad; hi = vhi + pad;
    }
    var padL = 200, padR = 24, padT = 10, padB = 44;
    var plotW = W - padL - padR, rowH = (H - padT - padB) / rows.length;
    function x(v) { return padL + (v - lo) / (hi - lo) * plotW; }

    ctx.clearRect(0, 0, W, H);
    ctx.font = '20px system-ui, sans-serif';
    niceTicks(lo, hi, 4).forEach(function (tv) {
      ctx.strokeStyle = '#e6ddcd'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x(tv), padT); ctx.lineTo(x(tv), H - padB); ctx.stroke();
      ctx.fillStyle = '#8a8175';
      var lbl = compact(tv, prefix);
      var lx = Math.min(x(tv) - ctx.measureText(lbl).width / 2,
                        W - ctx.measureText(lbl).width - 2);
      ctx.fillText(lbl, lx, H - padB + 30);
    });
    rows.forEach(function (r, i) {
      var cy = padT + i * rowH + rowH / 2;
      ctx.fillStyle = '#241f1a';
      ctx.font = '20px system-ui, sans-serif';
      ctx.fillText(r.label, 4, cy + 7, padL - 16);
      ctx.strokeStyle = '#e6ddcd'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(padL, cy); ctx.lineTo(W - padR, cy); ctx.stroke();
      if (r.median !== undefined) {
        ctx.fillStyle = '#76232f';
        ctx.beginPath(); ctx.arc(x(r.median), cy, 8, 0, 2 * Math.PI); ctx.fill();
      }
      if (r.truth !== undefined) {
        ctx.fillStyle = '#0f7a63';
        ctx.beginPath();
        ctx.moveTo(x(r.truth), cy - 10); ctx.lineTo(x(r.truth) + 10, cy);
        ctx.lineTo(x(r.truth), cy + 10); ctx.lineTo(x(r.truth) - 10, cy);
        ctx.closePath(); ctx.fill();
      }
      if (r.mine !== undefined) {
        ctx.strokeStyle = '#76232f'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(x(r.mine), cy, 10, 0, 2 * Math.PI); ctx.stroke();
      }
    });
  }

  // Per-field marginals for a revealed form: a histogram per numeric field,
  // bar rows per categorical field, own answer marked in each.
  function renderFormResult(r, res, box) {
    var wf = wageFields(r.config);
    if (wf && res.truth && typeof res.truth === 'object') {
      return renderWageResult(r, res, box, wf);
    }
    var mv = normalizeValue(res.my_value) || {};
    var specs = formFieldSpecs(r.config);
    var fields = res.fields || {};
    var html = '<p class="mine">Class answers: <strong>' + res.n + '</strong></p>';
    specs.forEach(function (s) {
      var agg = fields[s.id] || {};
      html += '<p class="field-label">' + escLines(s.label) + '</p>';
      if (s.spec.type === 'numeric') {
        html += '<canvas id="hist-' + r.round_id + '-' + esc(s.id) +
                '" width="320" height="110"></canvas>';
        return;
      }
      var opts = s.spec.options || [];
      var counts = agg.counts || [];
      var total = counts.reduce(function (a, b) { return a + b; }, 0) || 1;
      var picks = Array.isArray(mv[s.id]) ? mv[s.id] : [mv[s.id]];
      html += counts.map(function (n, i) {
        var pct = Math.round(100 * n / total);
        var isMine = picks.indexOf(i) !== -1;
        return '<div class="bar-row' + (isMine ? ' mine-row' : '') + '">' +
          '<span class="bar-label">' + esc(opts[i] || ('option ' + i)) + '</span>' +
          '<span class="bar" style="width:' + Math.max(pct, 2) + '%"></span>' +
          '<span class="bar-n">' + n + '</span></div>';
      }).join('');
    });
    box.innerHTML = html;
    specs.forEach(function (s) {
      if (s.spec.type !== 'numeric') return;
      var agg = fields[s.id] || {};
      drawHistogram(el('hist-' + r.round_id + '-' + s.id), agg.values || [],
        typeof mv[s.id] === 'number' ? mv[s.id] : undefined, undefined);
    });
  }

  function drawHistogram(canvas, values, mine, truth) {
    if (!canvas || !values || values.length === 0) return;
    var ctx = canvas.getContext('2d');
    var W = canvas.width, H = canvas.height, pad = 8;
    var lo = Math.min.apply(null, values), hi = Math.max.apply(null, values);
    if (truth !== undefined) { lo = Math.min(lo, truth); hi = Math.max(hi, truth); }
    if (lo === hi) { lo -= 1; hi += 1; }
    var span = hi - lo;
    lo -= span * 0.05; hi += span * 0.05; span = hi - lo;
    var nBins = Math.min(16, Math.max(6, Math.round(Math.sqrt(values.length))));
    var bins = new Array(nBins).fill(0);
    values.forEach(function (v) {
      var b = Math.min(nBins - 1, Math.floor((v - lo) / span * nBins));
      bins[b] += 1;
    });
    var maxBin = Math.max.apply(null, bins);
    var bw = (W - 2 * pad) / nBins;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#4a7fb5';
    bins.forEach(function (n, i) {
      var h = maxBin ? (H - 2 * pad) * n / maxBin : 0;
      ctx.fillRect(pad + i * bw + 1, H - pad - h, bw - 2, h);
    });
    function xFor(v) { return pad + (v - lo) / span * (W - 2 * pad); }
    if (mine !== null && mine !== undefined && typeof mine === 'number') {
      ctx.fillStyle = '#e67e22';
      ctx.fillRect(xFor(mine) - 1.5, pad, 3, H - 2 * pad);
    }
    if (truth !== undefined && typeof truth === 'number') {
      ctx.fillStyle = '#2c8a4b';
      ctx.fillRect(xFor(truth) - 1.5, pad, 3, H - 2 * pad);
    }
  }

  // ---------- boot ----------

  function boot() {
    var seed = getSeed();
    if (!ENDPOINT) { setStatus('Page not configured: missing endpoint URL.', 'err'); return; }
    if (!seed) { show('seed-section'); return; }
    el('seed-badge').textContent = seed;
    show('home-section');
    setStatus('Loading…', 'busy');
    // home is idempotent; ride the retry queue so a burst-time page load
    // survives the concurrency cap instead of demanding a manual refresh
    AGGT.submitWithRetry(ENDPOINT, { action: 'home', seed: seed },
      function (state, attempt, res) {
        if (state === 'confirmed') {
          serverOffset = res.now - Date.now();
          // what needs you comes first: open rounds, then awaiting-reveal,
          // then revealed (newest first within each group). Practice sits
          // below all of them: it is always open, so it would otherwise
          // permanently outrank the lecture round it should never bury.
          var rank = { open: 0, closed: 1, revealed: 2 };
          homeRounds = res.rounds.slice().sort(function (a, b) {
            var p = (a.practice ? 1 : 0) - (b.practice ? 1 : 0);
            if (p) return p;
            var d = (rank[a.state] || 0) - (rank[b.state] || 0);
            if (d) return d;
            return (b.close_ts || b.reveal_ts || 0) - (a.close_ts || a.reveal_ts || 0);
          });
          setStatus('', '');
          render();
          telemetry.log('page_view', '', { rounds: homeRounds.length });
        } else if (state === 'rejected') {
          if (res.error === 'bad_seed') {
            localStorage.removeItem('agg_seed');
            show('seed-section');
            setStatus(ERRORS.bad_seed, 'err');
            return;
          }
          setStatus('Could not load: ' + res.error, 'err');
        } else if (state === 'failed') {
          setStatus('Could not reach the class server. Tap Refresh to try again.', 'err');
        }
      });
  }

  document.addEventListener('DOMContentLoaded', function () {
    telemetry = AGGT.createTelemetry(ENDPOINT, getSeed);
    el('tab-lecture').onclick = function () {
      // clearing the hash without a reload keeps the fetched state
      if (window.location.hash) {
        history.pushState(null, '', window.location.pathname);
        render();
      }
    };
    el('tab-practice').onclick = function () { window.location.hash = '#practice'; };
    window.addEventListener('hashchange', render);
    // Redraw every mounted fit-line canvas at its new column width instead of
    // rebuilding the whole round list; each canvas remembers its own config
    // and draw opts from the last drawFitCanvas call.
    window.addEventListener('resize', function () {
      var canvases = document.querySelectorAll('.' + FIT_CANVAS_CLASS);
      for (var i = 0; i < canvases.length; i++) {
        var c = canvases[i];
        if (c._fitConfig) drawFitCanvas(c, c._fitConfig, c._fitOpts);
      }
    });
    boot();
  });

  window.PORTAL = {
    boot: boot,
    saveSeedFromInput: saveSeedFromInput,
    _test: {
      hashStr: hashStr,
      variantOf: variantOf,
      vignetteAssignment: vignetteAssignment,
      cellToLevels: cellToLevels,
      formFieldSpecs: formFieldSpecs,
    },
  };
})();
