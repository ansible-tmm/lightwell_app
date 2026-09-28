(function () {
  const bannerEl = document.getElementById('build-banner');
  const chipEl = document.getElementById('build-chip');
  const depsEl = document.getElementById('deps');
  const cveEl = document.getElementById('cve-list');
  const form = document.getElementById('order-form');
  const resultEl = document.getElementById('order-result');
  const resultWrap = document.getElementById('order-result-wrap');

  function renderStatus(data) {
    const isLw = !!(data.lightwellActive || (data.springFrameworkVersion && data.springFrameworkVersion.includes('rhlw')));
    const verClass = isLw ? 'version rhlw' : 'version';
    const kicker = isLw
      ? 'Stage 2 build — Lightwell Spring via Nexus'
      : 'Stage 1 build — community packages (before Lightwell)';

    if (chipEl) {
      chipEl.className = 'build-chip ' + (isLw ? 'lightwell' : 'community');
      chipEl.textContent = (isLw ? 'Lightwell · ' : 'Community · ') + 'Spring ' + data.springFrameworkVersion;
      chipEl.title = 'Open “About this demo” for dependency and CVE details';
    }

    if (bannerEl) {
      bannerEl.className = 'build-banner ' + (isLw ? 'lightwell' : 'community');
      bannerEl.innerHTML =
        '<span class="banner-kicker">' + escapeHtml(kicker) + '</span>' +
        '<strong>Built from:</strong> ' + escapeHtml(data.buildProfile) +
        ' &nbsp;|&nbsp; <span class="' + verClass + '">Spring ' + escapeHtml(data.springFrameworkVersion) + '</span>';
    }

    if (!depsEl || !cveEl) return;

    depsEl.innerHTML = '';
    (data.dependencies || []).forEach(function (dep) {
      const card = document.createElement('article');
      const lw = dep.repository && dep.repository.toLowerCase().includes('lightwell');
      const isSpring = dep.name && dep.name.toLowerCase().includes('spring');
      card.className = 'card dep-card' + (lw ? ' lightwell' : '') + (isSpring ? ' spring-focus' : '');
      card.innerHTML =
        '<h3>' + escapeHtml(dep.name) + '</h3>' +
        '<div class="coord">' + escapeHtml(dep.coordinate) + '</div>' +
        '<div class="ver">' + escapeHtml(dep.version) + '</div>' +
        (dep.note ? '<p class="note">' + escapeHtml(dep.note) + '</p>' : '') +
        '<span class="repo-pill' + (lw ? ' lw' : '') + '">' + escapeHtml(dep.repository) + '</span>';
      depsEl.appendChild(card);
    });

    const targets = [];
    const unchanged = [];
    (data.cves || []).forEach(function (row) {
      if (row.storyRole === 'UNCHANGED_PIN') {
        unchanged.push(row);
      } else {
        targets.push(row);
      }
    });

    cveEl.innerHTML = '';
    if (targets.length) {
      appendGroupLabel(cveEl, 'Lightwell target (Spring)');
      targets.forEach(function (row) { cveEl.appendChild(cveRowEl(row)); });
    }
    if (unchanged.length) {
      appendGroupLabel(cveEl, 'Unchanged pins (not remediated in this demo)');
      unchanged.forEach(function (row) { cveEl.appendChild(cveRowEl(row)); });
    }
  }

  function appendGroupLabel(parent, text) {
    const label = document.createElement('div');
    label.className = 'cve-group-label';
    label.textContent = text;
    parent.appendChild(label);
  }

  function cveRowEl(row) {
    const div = document.createElement('div');
    const unchanged = row.storyRole === 'UNCHANGED_PIN';
    div.className = 'cve-row ' + (unchanged ? 'unchanged' : 'target');
    const url = row.nvdUrl || ('https://nvd.nist.gov/vuln/detail/' + row.cveId);
    const roleLabel = unchanged ? 'pin unchanged' : (row.status === 'REMEDIATED' ? 'remediated after Stage 2 rebuild' : 'flips after Stage 2 rebuild');
    div.innerHTML =
      '<span class="chip ' + escapeHtml(row.status) + '">' + escapeHtml(row.status) + '</span>' +
      '<a class="cve-link" href="' + escapeHtml(url) + '" target="_blank" rel="noopener noreferrer">' +
        escapeHtml(row.cveId) + '</a>' +
      '<span class="lib">' + escapeHtml(row.library) + '</span>' +
      '<span class="role-tag">' + escapeHtml(roleLabel) + '</span>';
    return div;
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
      if (chipEl) chipEl.textContent = 'Status unavailable';
      if (bannerEl) bannerEl.textContent = 'Could not load /api/status';
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
        resultWrap.hidden = false;
        resultEl.textContent = JSON.stringify(data, null, 2);
      })
      .catch(function (err) {
        resultWrap.hidden = false;
        resultEl.textContent = String(err);
      });
  });

  const overlay = document.getElementById('walkthrough-overlay');
  const wtText = document.getElementById('wt-step-text');
  const wtVisual = document.getElementById('wt-visual');
  const wtNext = document.getElementById('wt-next');
  const wtBtn = document.getElementById('walkthrough-btn');
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
    wtNext.textContent = wtIndex >= wtSteps.length - 1 ? 'Done' : 'Next';
  }

  function openWalkthrough() {
    loadWalkthrough().then(function (data) {
      wtSteps = data.steps || [];
      wtIndex = 0;
      overlay.classList.remove('hidden');
      showWtStep();
    });
  }

  function closeWalkthrough() {
    overlay.classList.add('hidden');
    wtIndex = 0;
  }

  if (wtBtn) {
    wtBtn.addEventListener('click', openWalkthrough);
  }
  document.getElementById('wt-skip').addEventListener('click', closeWalkthrough);
  wtNext.addEventListener('click', function () {
    wtIndex += 1;
    if (wtIndex >= wtSteps.length) {
      closeWalkthrough();
    } else {
      showWtStep();
    }
  });
})();
