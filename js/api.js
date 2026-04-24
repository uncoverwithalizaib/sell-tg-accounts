// ── Telegram WebApp bootstrap ────────────────────────────────────────────────
const twa = window.Telegram?.WebApp;

if (twa) {
  twa.ready();
  twa.expand();
  twa.setHeaderColor('#0c0c0c');
  twa.setBackgroundColor('#0c0c0c');
}

// ── Auth token (stored across sessions) ─────────────────────────────────────
let _authToken = localStorage.getItem('tg_auth_token');

async function apiRequest(method, path, body = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (_authToken) headers['Authorization'] = `Bearer ${_authToken}`;

  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res  = await fetch(API_BASE + path, opts);
  const data = await res.json();

  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

async function initAuth() {
  const initData = twa?.initData || '';

  if (!initData) {
    // Not inside Telegram — use cached token for dev/testing
    if (_authToken) {
      const me = await apiRequest('GET', '/me').catch(() => null);
      if (me) return me;
    }
    throw new Error('Please open this app from Telegram.');
  }

  const { token, user } = await apiRequest('POST', '/auth', { initData });
  _authToken = token;
  localStorage.setItem('tg_auth_token', token);
  return user;
}

// ── UI helpers ───────────────────────────────────────────────────────────────
function showToast(msg, duration = 2500) {
  let el = document.getElementById('__toast');
  if (!el) {
    el = document.createElement('div');
    el.id = '__toast';
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._tid);
  el._tid = setTimeout(() => el.classList.remove('show'), duration);
}

function showLoading(show) {
  let el = document.getElementById('__overlay');
  if (!el) {
    el = document.createElement('div');
    el.id = '__overlay';
    el.className = 'loading-overlay';
    el.innerHTML = '<div class="spinner"></div>';
    document.body.appendChild(el);
  }
  el.classList.toggle('show', show);
}

function navigate(page) {
  window.location.href = page;
}

// ── Formatting helpers ───────────────────────────────────────────────────────
function formatPhone(phone) {
  // Format: +40 771 509 547 style
  return phone.replace(/(\+\d{1,3})(\d{3})(\d{3})(\d{3,4})$/, '$1 $2 $3 $4');
}

function formatDate(dateStr) {
  const d   = new Date(dateStr);
  const mm  = String(d.getMonth() + 1).padStart(2, '0');
  const dd  = String(d.getDate()).padStart(2, '0');
  const hh  = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${mm}/${dd} ${hh}:${min}`;
}

function getRemainingTime(submittedAt) {
  const expiry    = new Date(submittedAt).getTime() + 20 * 60 * 1000;
  const remaining = expiry - Date.now();
  if (remaining <= 0) return '00:00:00';
  const h   = Math.floor(remaining / 3_600_000);
  const m   = Math.floor((remaining % 3_600_000) / 60_000);
  const s   = Math.floor((remaining % 60_000) / 1_000);
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}
