(function () {
  const bannerEl = document.getElementById('build-banner');
  const depsEl = document.getElementById('deps');
  const cveEl = document.getElementById('cve-list');
  const form = document.getElementById('order-form');
  const resultEl = document.getElementById('order-result');

  function renderStatus(data) {
    const isLw = data.springFrameworkVersion && data.springFrameworkVersion.includes('rhlw');
    bannerEl.className = 'build-banner ' + (isLw ? 'lightwell' : 'community');
    const verClass = isLw ? 'version rhlw' : 'version';
    bannerEl.innerHTML =
      '<strong>Built from:</strong> ' + escapeHtml(data.buildProfile) +
      ' &nbsp;|&nbsp; <span class="' + verClass + '">Spring ' + escapeHtml(data.springFrameworkVersion) + '</span>';

    depsEl.innerHTML = '';
    (data.dependencies || []).forEach(function (dep) {
      const card = document.createElement('article');
      const lw = dep.repository && dep.repository.toLowerCase().includes('lightwell');
      card.className = 'card dep-card' + (lw ? ' lightwell' : '');
      card.innerHTML =
        '<h3>' + escapeHtml(dep.name) + '</h3>' +
        '<div class="coord">' + escapeHtml(dep.coordinate) + '</div>' +
        '<div class="ver">' + escapeHtml(dep.version) + '</div>' +
        '<span class="repo-pill' + (lw ? ' lw' : '') + '">' + escapeHtml(dep.repository) + '</span>';
      depsEl.appendChild(card);
    });

    cveEl.innerHTML = '';
    (data.cves || []).forEach(function (row) {
      const div = document.createElement('div');
      div.className = 'cve-row';
      div.innerHTML =
        '<span class="chip ' + row.status + '">' + row.status + '</span>' +
        '<strong>' + escapeHtml(row.cveId) + '</strong>' +
        '<span>' + escapeHtml(row.library) + '</span>';
      cveEl.appendChild(div);
    });
  }

  function escapeHtml(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  fetch('/api/status')
    .then(function (r) { return r.json(); })
    .then(renderStatus)
    .catch(function () {
      bannerEl.textContent = 'Could not load /api/status';
    });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const fd = new FormData(form);
    const body = {
      customerName: fd.get('customerName'),
      orderId: fd.get('orderId'),
      note: fd.get('note') || undefined
    };
    fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        resultEl.hidden = false;
        resultEl.textContent = JSON.stringify(data, null, 2);
      })
      .catch(function (err) {
        resultEl.hidden = false;
        resultEl.textContent = String(err);
      });
  });

  /* Walkthrough — simulation only; does not alter live status cards */
  const overlay = document.getElementById('walkthrough-overlay');
  const wtText = document.getElementById('wt-step-text');
  const wtVisual = document.getElementById('wt-visual');
  let wtSteps = [];
  let wtIndex = 0;

  function loadWalkthrough() {
    return fetch('/data/walkthrough.json').then(function (r) { return r.json(); });
  }

  function showWtStep() {
    const step = wtSteps[wtIndex];
    if (!step) {
      closeWalkthrough();
      return;
    }
    wtText.textContent = step.text;
    wtVisual.textContent = step.visual || '';
  }

  function closeWalkthrough() {
    overlay.classList.add('hidden');
    wtIndex = 0;
  }

  document.getElementById('walkthrough-btn').addEventListener('click', function () {
    loadWalkthrough().then(function (data) {
      wtSteps = data.steps || [];
      wtIndex = 0;
      overlay.classList.remove('hidden');
      showWtStep();
    });
  });

  document.getElementById('wt-skip').addEventListener('click', closeWalkthrough);
  document.getElementById('wt-next').addEventListener('click', function () {
    wtIndex += 1;
    if (wtIndex >= wtSteps.length) {
      closeWalkthrough();
    } else {
      showWtStep();
    }
  });
})();
