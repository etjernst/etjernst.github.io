/* Private aggregate-only practice dashboard. */

(function () {
  'use strict';

  var meta = document.querySelector('meta[name="agg-endpoint"]');
  var configured = meta ? meta.getAttribute('content') : '';
  var ENDPOINT = configured === '__AGG_ENDPOINT__'
    ? (localStorage.getItem('agg_endpoint') || '') : configured;
  var SESSION_KEY = 'agg_instructor_token_session';
  var LOCAL_KEY = 'agg_instructor_token_persistent';
  var LEGACY_KEY = 'agg_token';
  var activeToken = '';
  var allItems = [];

  function el(id) { return document.getElementById(id); }

  function storedToken() {
    return sessionStorage.getItem(SESSION_KEY) ||
      localStorage.getItem(LOCAL_KEY) ||
      localStorage.getItem(LEGACY_KEY) || '';
  }

  function setStatus(node, message, isError) {
    node.textContent = message || '';
    node.className = 'status' + (isError ? ' error' : '');
  }

  function post(payload) {
    payload.token = activeToken;
    return fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow',
    }).then(function (response) { return response.json(); });
  }

  function formatCell(cell) {
    return cell && typeof cell.display === 'string' ? cell.display : '-';
  }

  function renderCell(node, cell) {
    node.textContent = formatCell(cell);
    node.className = '';
  }

  function localTime(ts, timezone) {
    if (!ts) return 'No activity';
    try {
      return new Intl.DateTimeFormat('en-AU', {
        timeZone: timezone,
        day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
      }).format(new Date(ts));
    } catch (e) {
      return new Date(ts).toLocaleString();
    }
  }

  function shortDate(isoDate, timezone) {
    if (!isoDate) return 'practice opened';
    try {
      return new Intl.DateTimeFormat('en-AU', {
        timeZone: timezone, day: 'numeric', month: 'short',
      }).format(new Date(isoDate + 'T12:00:00Z'));
    } catch (e) {
      return isoDate;
    }
  }

  function addCell(row, label, text) {
    var td = document.createElement('td');
    td.setAttribute('data-label', label);
    td.textContent = text;
    row.appendChild(td);
  }

  function renderTopics(summary) {
    var body = el('topic-body');
    body.innerHTML = '';
    (summary.topics || []).forEach(function (topic) {
      var row = document.createElement('tr');
      var name = document.createElement('td');
      var strong = document.createElement('span');
      strong.className = 'topic-name';
      strong.textContent = topic.label;
      name.appendChild(strong);
      var metaLine = document.createElement('span');
      metaLine.className = 'topic-meta';
      metaLine.textContent = topic.pool_items + ' questions' +
        (topic.duplicate_slug ? ' - configuration warning' : '');
      name.appendChild(metaLine);
      row.appendChild(name);
      addCell(row, 'Codes', formatCell(topic.distinct_codes));
      addCell(row, 'Draws', formatCell(topic.draws));
      addCell(row, 'Questions tried', formatCell(topic.questions_tried));
      addCell(row, 'Pool complete', formatCell(topic.pool_completions));
      addCell(row, 'Past 24h', formatCell(topic.recent_24h.distinct_codes));
      addCell(row, 'Last activity', topic.last_activity_hour
        ? localTime(topic.last_activity_hour, summary.timezone)
        : 'No activity');
      body.appendChild(row);
    });
    if (!(summary.topics || []).length) {
      var empty = document.createElement('tr');
      var td = document.createElement('td');
      td.colSpan = 7;
      td.textContent = 'No open practice pools.';
      empty.appendChild(td);
      body.appendChild(empty);
    }
  }

  // Ascending first-try share, so the question the largest fraction of
  // students got wrong on their first look sits at the top. Items under the
  // display threshold have no share to rank on and park at the bottom.
  function sortItems(items) {
    function share(item) {
      return item.first_try && typeof item.first_try.share === 'number'
        ? item.first_try.share : null;
    }
    function attempts(item) {
      return item.first_try && typeof item.first_try.attempts === 'number'
        ? item.first_try.attempts : 0;
    }
    return items.slice().sort(function (a, b) {
      var sa = share(a);
      var sb = share(b);
      if (sa === null && sb !== null) return 1;
      if (sb === null && sa !== null) return -1;
      if (sa !== null && sa !== sb) return sa - sb;
      return attempts(b) - attempts(a);
    });
  }

  function addShareCell(row, label, cell) {
    var td = document.createElement('td');
    td.setAttribute('data-label', label);
    var value = document.createElement('span');
    value.className = 'share' +
      (cell && typeof cell.share === 'number' && cell.share < 0.5 ? ' low' : '');
    value.textContent = formatCell(cell);
    td.appendChild(value);
    var n = document.createElement('span');
    n.className = 'share-n';
    n.textContent = (cell && typeof cell.attempts === 'number' ? cell.attempts : 0) +
      ' answered';
    td.appendChild(n);
    row.appendChild(td);
  }

  function collectItems(summary) {
    var out = [];
    (summary.topics || []).forEach(function (topic) {
      (topic.items || []).forEach(function (item) {
        out.push({
          round_id: topic.round_id,
          topic_label: topic.label,
          field_id: item.field_id,
          label: item.label,
          tag: item.tag,
          code: !!item.code,
          first_try: item.first_try,
          all_attempts: item.all_attempts,
        });
      });
    });
    return out;
  }

  function fillTopicFilter(summary) {
    var select = el('item-topic');
    var current = select.value;
    select.innerHTML = '';
    var all = document.createElement('option');
    all.value = '';
    all.textContent = 'All topics';
    select.appendChild(all);
    (summary.topics || []).forEach(function (topic) {
      var option = document.createElement('option');
      option.value = topic.round_id;
      option.textContent = topic.label;
      select.appendChild(option);
    });
    select.value = current;
    if (select.selectedIndex < 0) select.value = '';
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // Mirrors portal.js: a four-space indent inside a code-flagged stem marks a
  // line the student sees as code, and the authored newlines become breaks.
  function stemHtml(label, isCode) {
    return String(label).split(/\r?\n/).map(function (line) {
      if (isCode && /^ {4}\S/.test(line)) {
        return '<code class="practice-code-line">' + esc(line.slice(4)) + '</code>';
      }
      return esc(line);
    }).join('<br>');
  }

  // Question stems are authored with the same LaTeX the portal renders, so
  // the table typesets them the same way. A missing library leaves the source
  // visible rather than failing the render.
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

  function renderItems() {
    var body = el('item-body');
    var filter = el('item-topic').value;
    body.innerHTML = '';
    var items = sortItems(allItems.filter(function (item) {
      return !filter || item.round_id === filter;
    }));
    items.forEach(function (item) {
      var row = document.createElement('tr');
      var name = document.createElement('td');
      var stem = document.createElement('span');
      stem.className = 'item-stem';
      stem.innerHTML = stemHtml(item.label, item.code);
      name.appendChild(stem);
      var metaLine = document.createElement('span');
      metaLine.className = 'item-meta';
      metaLine.textContent = item.topic_label + (item.tag ? ' - ' + item.tag : '');
      name.appendChild(metaLine);
      row.appendChild(name);
      addShareCell(row, 'First try', item.first_try);
      addShareCell(row, 'All attempts', item.all_attempts);
      body.appendChild(row);
    });
    if (!items.length) {
      var empty = document.createElement('tr');
      var td = document.createElement('td');
      td.colSpan = 3;
      td.textContent = 'No practice answers yet.';
      empty.appendChild(td);
      body.appendChild(empty);
    }
    typeset(body);
  }

  function renderActivity(days, startDate, timezone) {
    var chart = el('activity-chart');
    var table = el('daily-body');
    chart.innerHTML = '';
    table.innerHTML = '';
    chart.className = 'chart' + ((days || []).length > 7 ? ' dense' : '');
    chart.style.setProperty('--day-count', Math.max(1, (days || []).length));
    el('activity-window').textContent = 'Since ' + shortDate(startDate, timezone);
    var visible = (days || []).map(function (d) {
      return d.draws && typeof d.draws.count === 'number' ? d.draws.count : 0;
    });
    var max = Math.max.apply(Math, visible.concat([1]));

    (days || []).forEach(function (day) {
      var wrap = document.createElement('div');
      wrap.className = 'day';
      var val = document.createElement('div');
      val.className = 'day-value';
      val.textContent = formatCell(day.draws);
      var track = document.createElement('div');
      track.className = 'bar-track';
      var bar = document.createElement('div');
      bar.className = 'bar';
      var count = typeof day.draws.count === 'number' ? day.draws.count : 0;
      bar.style.height = count
        ? Math.max(6, Math.round(124 * count / max)) + 'px' : '0';
      track.appendChild(bar);
      var label = document.createElement('div');
      label.className = 'day-label';
      label.textContent = day.date.slice(5);
      wrap.appendChild(val);
      wrap.appendChild(track);
      wrap.appendChild(label);
      chart.appendChild(wrap);

      var row = document.createElement('tr');
      addCell(row, 'Date', day.date);
      addCell(row, 'Distinct codes', formatCell(day.distinct_codes));
      addCell(row, 'Draws', formatCell(day.draws));
      table.appendChild(row);
    });
  }

  function render(summary) {
    renderCell(el('total-codes'), summary.overall.distinct_codes);
    renderCell(el('total-draws'), summary.overall.draws);
    renderCell(el('total-questions'), summary.overall.questions_tried);
    renderCell(el('recent-codes'), summary.overall.recent_24h.distinct_codes);
    renderTopics(summary);
    allItems = collectItems(summary);
    fillTopicFilter(summary);
    renderItems();
    el('min-attempts').textContent = summary.min_attempts || 3;
    var first = summary.overall.first_try;
    el('items-window').textContent = first && typeof first.share === 'number'
      ? 'Hardest first - ' + first.display + ' of ' + first.attempts +
        ' first answers correct'
      : 'Hardest first';
    renderActivity(summary.days, summary.activity_start_date, summary.timezone);

    var generated = localTime(summary.generated_at, summary.timezone);
    var through = summary.data_through
      ? localTime(summary.data_through, summary.timezone) : 'no submissions';
    var cache = summary.cache_status === 'fresh' ? 'fresh scan' :
      (summary.cache_status === 'cooldown' ? 'recent result' :
        (summary.cache_status === 'stale' ? 'older snapshot' : 'cached result'));
    el('freshness').textContent = 'Data through ' + through + ' - ' + cache +
      ', generated ' + generated;

    var quality = summary.quality || {};
    el('quality-note').textContent = quality.excluded_rows || quality.duplicate_rows
      ? 'Validation excluded some malformed or duplicate submission rows from these totals.' : '';
  }

  function showAccess(message) {
    el('access-view').hidden = false;
    el('dashboard').hidden = true;
    el('toolbar').hidden = true;
    if (message) setStatus(el('access-status'), message, true);
  }

  function showDashboard() {
    el('access-view').hidden = true;
    el('dashboard').hidden = false;
    el('toolbar').hidden = false;
  }

  function load(force) {
    if (!ENDPOINT) {
      showAccess('The dashboard endpoint is not configured.');
      return Promise.resolve();
    }
    var button = el('refresh');
    button.disabled = true;
    setStatus(el('dashboard-status'), force ? 'Refreshing' : 'Loading', false);
    return post({ action: 'practice_summary', force: force === true })
      .then(function (summary) {
        if (!summary.ok) {
          if (summary.error === 'bad_token') {
            clearStoredAccess(false);
            showAccess('Access was not accepted.');
            return;
          }
          if (summary.error === 'summary_busy') {
            setStatus(el('dashboard-status'), 'Counts are being refreshed. Try again shortly.', false);
            return;
          }
          throw new Error('summary_failed');
        }
        showDashboard();
        render(summary);
        if (summary.cache_status === 'stale') {
          setStatus(el('dashboard-status'), 'Showing an older snapshot. Refresh again shortly.', false);
        } else {
          setStatus(el('dashboard-status'), force ? 'Updated' : '', false);
        }
      })
      .catch(function () {
        if (!el('dashboard').hidden) {
          setStatus(el('dashboard-status'), 'Could not load practice activity. Try again.', true);
        } else {
          showAccess('Could not open the dashboard. Try again.');
        }
      })
      .finally(function () { button.disabled = false; });
  }

  function clearStoredAccess(showMessage) {
    activeToken = '';
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(LOCAL_KEY);
    localStorage.removeItem(LEGACY_KEY);
    el('token').value = '';
    showAccess(showMessage ? 'Access cleared.' : '');
  }

  el('access-form').addEventListener('submit', function (event) {
    event.preventDefault();
    activeToken = el('token').value.trim();
    if (!activeToken) return;
    sessionStorage.setItem(SESSION_KEY, activeToken);
    if (el('remember').checked) localStorage.setItem(LOCAL_KEY, activeToken);
    else localStorage.removeItem(LOCAL_KEY);
    setStatus(el('access-status'), 'Opening dashboard', false);
    load(false);
  });
  el('refresh').addEventListener('click', function () { load(true); });
  el('item-topic').addEventListener('change', renderItems);
  el('clear-access').addEventListener('click', function () { clearStoredAccess(true); });

  activeToken = storedToken();
  if (activeToken) {
    showDashboard();
    load(false);
  } else {
    showAccess('');
  }
}());
