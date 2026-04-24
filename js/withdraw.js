let selectedMethod = null;

const METHOD_CONFIG = {
  TRX: {
    label:       'Wallet Address',
    placeholder: 'TRC-20 address (T…)',
    hint:        'Enter your TRC-20 (Tron) wallet address starting with T',
    inputMode:   'text',
  },
  USDT_BSC: {
    label:       'Wallet Address',
    placeholder: 'BEP-20 address (0x…)',
    hint:        'Enter your BEP-20 (BSC) wallet address starting with 0x',
    inputMode:   'text',
  },
  LEADER_CARD: {
    label:       'Leader Card Mobile Number',
    placeholder: '03001234567',
    hint:        'Enter your Leader Card mobile number (e.g. 03001234567)',
    inputMode:   'numeric',
  },
};

document.addEventListener('DOMContentLoaded', async () => {
  if (twa?.BackButton) {
    twa.BackButton.show();
    twa.BackButton.onClick(() => navigate('index.html'));
  }

  try {
    showLoading(true);
    const user = await initAuth();
    showLoading(false);
    document.getElementById('balanceAmount').textContent = (user.balance || 0).toFixed(2);

    apiRequest('GET', '/me').then(me => {
      document.getElementById('balanceAmount').textContent = (me.balance || 0).toFixed(2);
      document.getElementById('amountInput').max = me.balance;
    }).catch(() => {});

  } catch (err) {
    showLoading(false);
    showToast(err.message);
  }

  document.querySelectorAll('.method-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedMethod = btn.dataset.method;
      document.querySelectorAll('.method-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const cfg = METHOD_CONFIG[selectedMethod] || {};
      const input = document.getElementById('walletInput');
      document.getElementById('addressLabel').textContent = cfg.label || 'Address';
      input.placeholder  = cfg.placeholder || '';
      input.inputMode    = cfg.inputMode   || 'text';
      document.getElementById('walletHint').textContent = cfg.hint || '';
    });
  });

  document.getElementById('withdrawForm').addEventListener('submit', handleWithdraw);
});

async function handleWithdraw(e) {
  e.preventDefault();
  const errEl = document.getElementById('withdrawError');
  errEl.classList.remove('show');

  if (!selectedMethod) {
    showToast('Select a payment method first.');
    return;
  }

  const walletAddress = document.getElementById('walletInput').value.trim();
  const amountStr     = document.getElementById('amountInput').value.trim();

  if (!walletAddress) {
    errEl.textContent = 'Enter your ' + (selectedMethod === 'LEADER_CARD' ? 'mobile number.' : 'wallet address.');
    errEl.classList.add('show');
    return;
  }

  // Client-side format check
  if (selectedMethod === 'LEADER_CARD') {
    if (!/^(03\d{9}|(\+92|0092)3\d{9})$/.test(walletAddress)) {
      errEl.textContent = 'Enter a valid Pakistani mobile number (e.g. 03001234567).';
      errEl.classList.add('show');
      return;
    }
  }

  const amount = parseFloat(amountStr);
  if (!amountStr || isNaN(amount) || amount <= 0) {
    errEl.textContent = 'Enter a valid amount.';
    errEl.classList.add('show');
    return;
  }

  showLoading(true);
  document.querySelector('#withdrawForm .btn-primary').disabled = true;

  try {
    await apiRequest('POST', '/withdraw', { method: selectedMethod, walletAddress, amount });
    showToast('Withdrawal request submitted! ✅', 3000);
    setTimeout(() => navigate('index.html'), 1600);
  } catch (ex) {
    errEl.textContent = ex.message;
    errEl.classList.add('show');
  } finally {
    showLoading(false);
    document.querySelector('#withdrawForm .btn-primary').disabled = false;
  }
}
