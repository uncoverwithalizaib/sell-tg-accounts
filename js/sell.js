let currentStep   = 1;
let sellSessionId = null;

document.addEventListener('DOMContentLoaded', async () => {
  if (twa?.BackButton) {
    twa.BackButton.show();
    twa.BackButton.onClick(() => {
      if (currentStep === 1) navigate('index.html');
      else if (currentStep <= 3) showStep(currentStep - 1);
    });
  }

  try {
    await initAuth();
  } catch (err) {
    showToast(err.message);
  }

  document.getElementById('phoneForm').addEventListener('submit', handlePhone);
  document.getElementById('otpForm').addEventListener('submit', handleOtp);
  document.getElementById('tfaForm').addEventListener('submit', handleTfa);
});

function showStep(n) {
  currentStep = n;
  document.querySelectorAll('.sell-step').forEach(s => s.classList.remove('active'));
  document.getElementById(`step${n}`).classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Step 1: phone ────────────────────────────────────────────────────────────
async function handlePhone(e) {
  e.preventDefault();
  const phone = document.getElementById('phoneInput').value.trim();
  const err   = document.getElementById('phoneError');

  err.classList.remove('show');
  if (!phone) { err.textContent = 'Enter your phone number.'; err.classList.add('show'); return; }

  showLoading(true);
  document.querySelector('#phoneForm .btn-primary').disabled = true;

  try {
    const res   = await apiRequest('POST', '/sell/phone', { phone });
    sellSessionId = res.sellSessionId;
    document.getElementById('otpPhoneLabel').textContent = phone;
    showStep(2);
  } catch (ex) {
    err.textContent = ex.message;
    err.classList.add('show');
  } finally {
    showLoading(false);
    document.querySelector('#phoneForm .btn-primary').disabled = false;
  }
}

// ── Step 2: OTP ──────────────────────────────────────────────────────────────
async function handleOtp(e) {
  e.preventDefault();
  const code = document.getElementById('otpInput').value.trim();
  const err  = document.getElementById('otpError');

  err.classList.remove('show');
  if (!code) { err.textContent = 'Enter the OTP code.'; err.classList.add('show'); return; }

  showLoading(true);
  document.querySelector('#otpForm .btn-primary').disabled = true;

  try {
    const res = await apiRequest('POST', '/sell/otp', { sellSessionId, code });

    if (res.requires2fa) {
      showStep(3);
    } else {
      showResult(res.account);
    }
  } catch (ex) {
    err.textContent = ex.message;
    err.classList.add('show');
    if (ex.message.toLowerCase().includes('expired')) {
      setTimeout(() => { err.classList.remove('show'); showStep(1); }, 2500);
    }
  } finally {
    showLoading(false);
    document.querySelector('#otpForm .btn-primary').disabled = false;
  }
}

// ── Step 3: 2FA ──────────────────────────────────────────────────────────────
async function handleTfa(e) {
  e.preventDefault();
  const pass = document.getElementById('tfaInput').value.trim();
  const err  = document.getElementById('tfaError');

  err.classList.remove('show');
  if (!pass) { err.textContent = 'Enter your 2FA password.'; err.classList.add('show'); return; }

  showLoading(true);
  document.querySelector('#tfaForm .btn-primary').disabled = true;

  try {
    const res = await apiRequest('POST', '/sell/2fa', { sellSessionId, password: pass });
    showResult(res.account);
  } catch (ex) {
    err.textContent = ex.message;
    err.classList.add('show');
  } finally {
    showLoading(false);
    document.querySelector('#tfaForm .btn-primary').disabled = false;
  }
}

// ── Step 4: Result ───────────────────────────────────────────────────────────
function showResult(account) {
  showStep(4);
  const ok = account.status === 'WAIT';

  document.getElementById('resultIcon').textContent  = ok ? '✅' : '❌';
  document.getElementById('resultTitle').textContent = ok ? 'Submitted Successfully!' : 'Account Rejected';

  if (ok) {
    const c = account.checks || {};
    document.getElementById('resultDetail').innerHTML = `
      Phone: <strong>${account.phone}</strong><br>
      Offered price: <strong>${(account.price || 0).toFixed(2)} USDT</strong><br>
      Status: <strong>Waiting for review</strong><br><br>
      Our team will review your account and notify you once approved and paid.
      <div class="checks-grid">
        <div class="check-item">
          <div class="ci-label">Login</div>
          <div class="ci-val ${c.loginOk ? 'ci-ok' : 'ci-fail'}">${c.loginOk ? 'OK' : 'Failed'}</div>
        </div>
        <div class="check-item">
          <div class="ci-label">Spam ban</div>
          <div class="ci-val ${!c.spamBan ? 'ci-ok' : 'ci-fail'}">${c.spamBan ? 'Yes' : 'None'}</div>
        </div>
        <div class="check-item">
          <div class="ci-label">Multi-device</div>
          <div class="ci-val ${!c.multiDevice ? 'ci-ok' : 'ci-fail'}">${c.multiDevice ? 'Yes' : 'No'}</div>
        </div>
        <div class="check-item">
          <div class="ci-label">Account age</div>
          <div class="ci-val ci-ok">~${c.accountAge || 0}d</div>
        </div>
      </div>`;
  } else {
    document.getElementById('resultDetail').innerHTML = `
      Phone: <strong>${account.phone}</strong><br>
      Reason: ${account.rejectionReason || 'Did not meet quality requirements.'}<br><br>
      You can try submitting a different number.`;
  }
}
