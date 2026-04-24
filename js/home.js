document.addEventListener('DOMContentLoaded', async () => {
  let appVersion = 'v1.0.0';
  let channelUrl = '#';

  try {
    const cfg = await fetch(API_BASE + '/config').then(r => r.json());
    appVersion = cfg.appVersion || appVersion;
    channelUrl = cfg.channelUrl || channelUrl;
  } catch (_) {}

  document.getElementById('versionText').textContent = appVersion;

  document.getElementById('channelItem').addEventListener('click', () => {
    if (channelUrl && channelUrl !== '#') {
      twa ? twa.openLink(channelUrl) : window.open(channelUrl, '_blank');
    }
  });

  try {
    showLoading(true);
    const user = await initAuth();
    showLoading(false);

    const nameParts = [user.firstName, user.lastName].filter(Boolean);
    document.getElementById('profileName').textContent =
      nameParts.length ? nameParts.join(' ') : 'User';

    document.getElementById('profileMeta').textContent =
      user.username ? `@${user.username}` : `ID: ${user.telegramId}`;

    document.getElementById('balanceSubtitle').textContent =
      `${(user.balance || 0).toFixed(2)} USDT`;

    document.getElementById('sellSubtitle').textContent = user.totalSold || 0;

    document.getElementById('commSubtitle').textContent =
      `$${(user.commissionEarned || 0).toFixed(2)}`;

    // Pending orders count
    apiRequest('GET', '/accounts?status=pending')
      .then(list => {
        document.getElementById('ordersSubtitle').textContent = list.length;
      })
      .catch(() => {});

    // Referrals badge
    if (user.totalReferrals > 0) {
      const badge = document.getElementById('referralsBadge');
      badge.textContent = user.totalReferrals + ' invited';
      badge.style.display = 'inline-block';
    }

    // Cache invite link (built server-side) for instant display on invite page
    if (user.inviteLink) {
      localStorage.setItem('tg_invite_link', user.inviteLink);
    }

  } catch (err) {
    showLoading(false);
    showToast(err.message || 'Failed to load. Please try again.');
  }
});
