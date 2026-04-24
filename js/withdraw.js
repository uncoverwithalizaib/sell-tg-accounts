let selectedMethod = null;

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

    // Refresh balance from /me
    apiRequest('GET', '/me').then(me => {
      document.getElementById('balanceAmount').textContent = (me.balance || 0).toFixed(2);
      document.getElementById('amountInput').max = me.balance;
    }).catch(() => {});

  } catch (err) {
    showLoading(false);
    showToast(err.message);
  }

  // Method selection
  document.querySelectorAll('.method-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedMethod = btn.dataset.method;
      document.querySelectorAll('.method-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('walletInput').placeholder =
        selectedMethod === 'TRX' ? 'TRC20 address (T...)' : 'BEP-20 address (0x...)';
      document.getElementById('walletHint').textContent =
        selectedMethod === 'TRX'
          ? 'Enter your TRC-20 (Tron) wallet address starting with T'
          : 'Enter your BEP-20 (BSC) wallet address starting with 0x';
    });
  });

  document.getElementById('withdrawForm').addEventListener('submit', handleWithdraw);
});

async function handleWithdraw(e) {
  e.preventDefault();
  const err = document.getElementById('withdrawError');
  err.classList.remove('show');

  if (!selectedMethod) {
    showToast('Select a payment method first.');
    return;
  }

  const walletAddress = document.getElementById('walletInput').value.trim();
  const amountStr     = document.getElementById('amountInput').value.trim();

  if (!walletAddress) {
    err.textContent = 'Enter your wallet address.';
    err.classList.add('show');
    return;
  }

  const amount = parseFloat(amountStr);
  if (!amountStr || isNaN(amount) || amount <= 0) {
    err.textContent = 'Enter a valid amount.';
    err.classList.add('show');
    return;
  }

  showLoading(true);
  document.querySelector('#withdrawForm .btn-primary').disabled = true;

  try {
    await apiRequest('POST', '/withdraw', { method: selectedMethod, walletAddress, amount });
    showToast('Withdrawal request submitted! ✅', 3000);
    setTimeout(() => navigate('index.html'), 1600);
  } catch (ex) {
    err.textContent = ex.message;
    err.classList.add('show');
  } finally {
    showLoading(false);
    document.querySelector('#withdrawForm .btn-primary').disabled = false;
  }
}
