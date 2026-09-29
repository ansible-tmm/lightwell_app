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
      ? 'Production-ready — Lightwell Spring via Nexus'
      : 'Vulnerable — community Spring (before Lightwell)';

    if (chipEl) {
      chipEl.className = 'build-chip ' + (isLw ? 'lightwell' : 'community');
      chipEl.textContent = (isLw ? 'Production-ready · ' : 'Vulnerable · ') + 'Spring ' + data.springFrameworkVersion;
      chipEl.title = 'Open “About this demo” for Spring remediation details';
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
      card.className = 'card dep-card spring-focus' + (lw ? ' lightwell' : '');
      card.innerHTML =
        '<h3>' + escapeHtml(dep.name) + '</h3>' +
        '<div class="coord">' + escapeHtml(dep.coordinate) + '</div>' +
        '<div class="ver">' + escapeHtml(dep.version) + '</div>' +
        (dep.note ? '<p class="note">' + escapeHtml(dep.note) + '</p>' : '') +
        '<span class="repo-pill' + (lw ? ' lw' : '') + '">' + escapeHtml(dep.repository) + '</span>';
      depsEl.appendChild(card);
    });

    cveEl.innerHTML = '';
    (data.cves || []).forEach(function (row) {
      cveEl.appendChild(cveRowEl(row));
    });
  }

  function cveRowEl(row) {
    const div = document.createElement('div');
    const remediated = row.status === 'REMEDIATED';
    div.className = 'cve-row ' + (remediated ? 'target' : 'unchanged');
    const url = row.nvdUrl || ('https://nvd.nist.gov/vuln/detail/' + row.cveId);
    div.innerHTML =
      '<span class="chip ' + escapeHtml(row.status) + '">' + escapeHtml(row.status) + '</span>' +
      '<a class="cve-link" href="' + escapeHtml(url) + '" target="_blank" rel="noopener noreferrer">' +
        escapeHtml(row.cveId) + '</a>' +
      '<span class="lib">' + escapeHtml(row.library) + '</span>';
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

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      const fd = new FormData(form);
      const body = {
        customerName: fd.get('customerName'),
        orderId: fd.get('orderId'),
        note: fd.get('note') || undefined
      };
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting…';
      }
      fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
        .then(function (r) {
          if (!r.ok) {
            throw new Error('Order request failed (' + r.status + ')');
          }
          return r.json();
        })
        .then(function (data) {
          showOrderConfirmation(data);
        })
        .catch(function (err) {
          showOrderConfirmation(null, err);
        })
        .finally(function () {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit order';
          }
        });
    });
  }

  function showOrderConfirmation(data, err) {
    if (!resultWrap || !resultEl) return;
    resultWrap.hidden = false;
    resultWrap.removeAttribute('hidden');
    if (err) {
      resultWrap.classList.add('error');
      resultEl.textContent = String(err);
      return;
    }
    resultWrap.classList.remove('error');
    const msg = (data && data.statusMessage) || 'Order accepted.';
    const pretty = JSON.stringify(data, null, 2);
    resultEl.textContent = msg + '\n\n' + pretty;
    resultWrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  const overlay = document.getElementById('walkthrough-overlay');
  const wtText = document.getElementById('wt-step-text');
  const wtVisual = document.getElementById('wt-visual');
  const wtNext = document.getElementById('wt-next');
  const wtSkip = document.getElementById('wt-skip');
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
    if (wtNext) {
      wtNext.textContent = wtIndex >= wtSteps.length - 1 ? 'Done' : 'Next';
    }
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
  if (wtSkip) {
    wtSkip.addEventListener('click', closeWalkthrough);
  }
  if (wtNext) {
    wtNext.addEventListener('click', function () {
      wtIndex += 1;
      if (wtIndex >= wtSteps.length) {
        closeWalkthrough();
      } else {
        showWtStep();
      }
    });
  }
})();
