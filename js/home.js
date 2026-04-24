document.addEventListener('DOMContentLoaded', async () => {
  let appVersion = 'v1.0.0';
  let channelUrl = '#';

  // Fetch remote config (version + channel URL)
  try {
    const cfg = await fetch(API_BASE + '/config').then(r => r.json());
    appVersion = cfg.appVersion || appVersion;
    channelUrl = cfg.channelUrl || channelUrl;
  } catch (_) {}

  document.getElementById('versionText').textContent = appVersion;

  // Channel button
  document.getElementById('channelItem').addEventListener('click', () => {
    if (channelUrl && channelUrl !== '#') {
      twa ? twa.openLink(channelUrl) : window.open(channelUrl, '_blank');
    }
  });

  try {
    showLoading(true);
    const user = await initAuth();
    showLoading(false);

    // Profile
    const nameParts = [user.firstName, user.lastName].filter(Boolean);
    document.getElementById('profileName').textContent =
      nameParts.length ? nameParts.join(' ') : 'User';

    document.getElementById('profileMeta').textContent =
      user.username ? `@${user.username}` : `ID: ${user.telegramId}`;

    // Withdraw subtitle
    document.getElementById('balanceSubtitle').textContent =
      `${(user.balance || 0).toFixed(2)} USDT`;

    // Sell Account subtitle — total submitted
    document.getElementById('sellSubtitle').textContent =
      `${user.totalSold || 0} sold`;

    // Pending orders count (async, non-blocking)
    apiRequest('GET', '/accounts?status=pending')
      .then(list => {
        document.getElementById('ordersSubtitle').textContent = list.length;
      })
      .catch(() => {});

  } catch (err) {
    showLoading(false);
    showToast(err.message || 'Failed to load. Please try again.');
  }
});
