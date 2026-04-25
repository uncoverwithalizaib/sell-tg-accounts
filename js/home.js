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
    const user = await initAuth();

    // ── Profile photo ──────────────────────────────────────────────────────────
    const avatarSkeleton = document.getElementById('avatarSkeleton');
    const profilePhoto   = document.getElementById('profilePhoto');

    // Try photo_url from Telegram WebApp first (fastest, no extra request)
    const twaUser = twa?.initDataUnsafe?.user;
    const photoUrl = twaUser?.photo_url || null;

    if (photoUrl) {
      profilePhoto.src = photoUrl;
      profilePhoto.onload = () => {
        avatarSkeleton.style.display = 'none';
        profilePhoto.style.display   = 'block';
      };
      profilePhoto.onerror = () => {
        avatarSkeleton.style.display = 'none';
        profilePhoto.style.display   = 'none';
        showDefaultAvatar();
      };
    } else {
      // Fallback: fetch photo via backend (uses Bot API)
      try {
        const photoData = await apiRequest('GET', '/me/photo');
        if (photoData.photoUrl) {
          profilePhoto.src = photoData.photoUrl;
          profilePhoto.onload = () => {
            avatarSkeleton.style.display = 'none';
            profilePhoto.style.display   = 'block';
          };
          profilePhoto.onerror = () => { showDefaultAvatar(); };
        } else { showDefaultAvatar(); }
      } catch (_) { showDefaultAvatar(); }
    }

    function showDefaultAvatar() {
      avatarSkeleton.style.display = 'none';
      document.getElementById('avatarWrap').innerHTML =
        '<svg viewBox="0 0 24 24" width="20" height="20" fill="none"' +
        ' stroke="currentColor" stroke-width="2"' +
        ' stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>' +
        '<circle cx="12" cy="7" r="4"/></svg>';
    }

    // ── Name & meta ────────────────────────────────────────────────────────────
    const nameParts = [user.firstName, user.lastName].filter(Boolean);
    document.getElementById('profileName').textContent =
      nameParts.length ? nameParts.join(' ') : 'User';

    document.getElementById('profileMeta').textContent =
      user.username ? `@${user.username}` : '';

    // ── User ID + Join Date badges ─────────────────────────────────────────────
    const badgesEl = document.getElementById('profileBadges');
    document.getElementById('userIdBadge').textContent = `ID: ${user.telegramId}`;
    if (user.joinedAt) {
      const d = new Date(user.joinedAt);
      document.getElementById('joinDateBadge').textContent =
        `Joined: ${d.toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' })}`;
    }
    badgesEl.style.display = 'flex';

    // ── Stats ──────────────────────────────────────────────────────────────────
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
      .catch(() => {
        document.getElementById('ordersSubtitle').textContent = '0';
      });

    // Referrals badge
    if (user.totalReferrals > 0) {
      const badge = document.getElementById('referralsBadge');
      badge.textContent = user.totalReferrals + ' invited';
      badge.style.display = 'inline-block';
    }

    if (user.inviteLink) {
      localStorage.setItem('tg_invite_link', user.inviteLink);
    }

  } catch (err) {
    // Clear skeletons on error
    ['balanceSubtitle','sellSubtitle','ordersSubtitle','commSubtitle'].forEach(id => {
      document.getElementById(id).textContent = '—';
    });
    document.getElementById('profileName').textContent = 'Error';
    showToast(err.message || 'Failed to load. Please try again.');
  }
});
