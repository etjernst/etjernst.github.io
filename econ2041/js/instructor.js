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

  function markSuppressed(node, cell) {
    node.textContent = formatCell(cell);
    node.className = cell && cell.suppressed ? 'suppressed' : '';
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

  function addCell(row, label, text, suppressed) {
    var td = document.createElement('td');
    td.setAttribute('data-label', label);
    td.textContent = text;
    if (suppressed) td.className = 'suppressed';
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
      addCell(row, 'Codes', formatCell(topic.distinct_codes), topic.distinct_codes.suppressed);
      addCell(row, 'Draws', formatCell(topic.draws), topic.draws.suppressed);
      addCell(row, 'Questions tried', formatCell(topic.questions_tried), topic.questions_tried.suppressed);
      addCell(row, 'Pool complete', formatCell(topic.pool_completions), topic.pool_completions.suppressed);
      addCell(row, 'Past 24h', formatCell(topic.recent_24h.distinct_codes),
        topic.recent_24h.distinct_codes.suppressed);
      addCell(row, 'Last activity', topic.last_activity_hour
        ? localTime(topic.last_activity_hour, summary.timezone)
        : (topic.distinct_codes.suppressed ? 'Hidden' : 'No activity'), false);
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

  function renderActivity(days) {
    var chart = el('activity-chart');
    var table = el('daily-body');
    chart.innerHTML = '';
    table.innerHTML = '';
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
      bar.className = 'bar' + (day.draws.suppressed ? ' suppressed-bar' : '');
      var count = typeof day.draws.count === 'number' ? day.draws.count : 0;
      bar.style.height = day.draws.suppressed ? '18px' :
        (count ? Math.max(6, Math.round(124 * count / max)) + 'px' : '0');
      track.appendChild(bar);
      var label = document.createElement('div');
      label.className = 'day-label';
      label.textContent = day.date.slice(5);
      wrap.appendChild(val);
      wrap.appendChild(track);
      wrap.appendChild(label);
      chart.appendChild(wrap);

      var row = document.createElement('tr');
      addCell(row, 'Date', day.date, false);
      addCell(row, 'Distinct codes', formatCell(day.distinct_codes), day.distinct_codes.suppressed);
      addCell(row, 'Draws', formatCell(day.draws), day.draws.suppressed);
      table.appendChild(row);
    });
  }

  function render(summary) {
    markSuppressed(el('total-codes'), summary.overall.distinct_codes);
    markSuppressed(el('total-draws'), summary.overall.draws);
    markSuppressed(el('total-questions'), summary.overall.questions_tried);
    markSuppressed(el('recent-codes'), summary.overall.recent_24h.distinct_codes);
    renderTopics(summary);
    renderActivity(summary.days);

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
  el('clear-access').addEventListener('click', function () { clearStoredAccess(true); });

  activeToken = storedToken();
  if (activeToken) {
    showDashboard();
    load(false);
  } else {
    showAccess('');
  }
}());
