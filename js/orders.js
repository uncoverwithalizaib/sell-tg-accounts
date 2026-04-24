let currentTab    = 'pending';
let allAccounts   = { pending: [], accepted: [], rejected: [] };
let timerInterval = null;

document.addEventListener('DOMContentLoaded', async () => {
  // Telegram Back Button
  if (twa?.BackButton) {
    twa.BackButton.show();
    twa.BackButton.onClick(() => navigate('index.html'));
  }

  // Tab switching
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      currentTab = tab.dataset.tab;
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderList();
    });
  });

  // Live search
  document.getElementById('searchInput').addEventListener('input', renderList);

  try {
    await initAuth();
    await loadAll();
  } catch (err) {
    showLoading(false);
    document.getElementById('accountList').innerHTML =
      `<div class="empty-state"><div class="empty-state-icon">⚠️</div>${err.message}</div>`;
  }

  startTimerTick();
});

async function loadAll() {
  showLoading(true);
  try {
    const [pending, accepted, rejected] = await Promise.all([
      apiRequest('GET', '/accounts?status=pending'),
      apiRequest('GET', '/accounts?status=accepted'),
      apiRequest('GET', '/accounts?status=rejected'),
    ]);
    allAccounts = { pending, accepted, rejected };
    renderList();
  } finally {
    showLoading(false);
  }
}

function renderList() {
  const search = document.getElementById('searchInput').value
    .toLowerCase().replace(/\s/g, '');
  let items = allAccounts[currentTab] || [];

  if (search) {
    items = items.filter(a =>
      a.phone.replace(/\s/g, '').toLowerCase().includes(search)
    );
  }

  const list = document.getElementById('accountList');

  if (!items.length) {
    const labels = { pending: 'pending', accepted: 'accepted', rejected: 'rejected' };
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📭</div>
        No ${labels[currentTab]} accounts
      </div>`;
    return;
  }

  list.innerHTML = items.map(renderItem).join('');
}

function renderItem(a) {
  const phone  = formatPhone(a.phone);
  const amount = `${(a.price || 0).toFixed(2)} USDT`;
  const badges = buildBadges(a);
  const meta   = buildMeta(a);

  return `
    <div class="account-item">
      <div class="account-info">
        <div class="account-phone">${phone}</div>
        <div class="account-amount">${amount}</div>
        <div class="account-badges">${badges}</div>
      </div>
      <div class="account-meta">
        ${meta}
        <svg class="account-arrow" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </div>
    </div>`;
}

function buildBadges(a) {
  const b = [];

  if (a.status === 'WAIT') {
    b.push('<span class="badge badge-pending">PENDING</span>');
    b.push('<span class="badge badge-free">FREE</span>');
    b.push(`<span class="badge badge-timer" data-sub="${a.submittedAt}">${getRemainingTime(a.submittedAt)}</span>`);

  } else if (a.status === 'CHECKING') {
    b.push('<span class="badge badge-checking">CHECKING</span>');
    b.push('<span class="badge badge-free">FREE</span>');

  } else if (a.status === 'OK') {
    b.push('<span class="badge badge-accepted">ACCEPTED</span>');
    b.push('<span class="badge badge-free">FREE</span>');

  } else {
    // REJECTED / FROZEN / DEL
    b.push('<span class="badge badge-rejected">REJECTED</span>');
    b.push('<span class="badge badge-free">FREE</span>');

    if (a.status === 'FROZEN' || a.checks?.frozenCheck) {
      b.push('<span class="badge badge-frozen">FROZEN</span>');
    } else if (a.checks?.spamBan) {
      b.push('<span class="badge badge-spam">SPAM</span>');
    } else if (a.rejectionReason?.toLowerCase().includes('deactivated') ||
               a.rejectionReason?.toLowerCase().includes('invalid')) {
      b.push('<span class="badge badge-used">USED</span>');
    }
  }

  return b.join('');
}

function buildMeta(a) {
  if (a.status === 'WAIT' || a.status === 'CHECKING') return '';
  return `<span class="account-date">${formatDate(a.submittedAt)}</span>`;
}

function startTimerTick() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    document.querySelectorAll('.badge-timer[data-sub]').forEach(el => {
      el.textContent = getRemainingTime(el.dataset.sub);
    });
  }, 1000);
}
