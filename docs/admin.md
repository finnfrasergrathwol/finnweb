---
title: admin
draft: false
tags: []
---

<div id="admin-panel">
  <div id="admin-login" style="max-width:340px;margin:4rem auto;">
    <h2 style="color:var(--darkgray);font-weight:500;margin-bottom:1.4rem;">admin login</h2>
    <input type="password" id="admin-password" placeholder="password" style="width:100%;padding:0.6rem 0.8rem;border:1px solid var(--lightgray);border-radius:4px;font-size:0.95rem;background:var(--light);color:var(--dark);margin-bottom:0.8rem;box-sizing:border-box;" />
    <button id="admin-login-btn" style="width:100%;padding:0.6rem;border:none;border-radius:4px;background:var(--secondary);color:var(--light);font-size:0.95rem;cursor:pointer;">log in</button>
    <p id="admin-error" style="color:#c0392b;font-size:0.85rem;margin-top:0.6rem;display:none;"></p>
  </div>
  <div id="admin-status" style="max-width:340px;margin:4rem auto;display:none;">
    <p style="color:var(--darkgray);margin-bottom:1rem;">you are logged in as admin.</p>
    <button id="admin-logout-btn" style="padding:0.6rem 1.2rem;border:none;border-radius:4px;background:var(--secondary);color:var(--light);font-size:0.95rem;cursor:pointer;">log out</button>
  </div>
</div>

<script>
(function() {
  async function checkAndShow() {
    try {
      var res = await fetch('/api/auth/status', { credentials: 'include' });
      var data = await res.json();
      if (data.authenticated) {
        document.getElementById('admin-login').style.display = 'none';
        document.getElementById('admin-status').style.display = 'block';
      } else {
        document.getElementById('admin-login').style.display = 'block';
        document.getElementById('admin-status').style.display = 'none';
      }
    } catch(e) {
      document.getElementById('admin-login').style.display = 'block';
      document.getElementById('admin-status').style.display = 'none';
    }
  }

  function init() {
    checkAndShow();

    document.getElementById('admin-login-btn').onclick = async function() {
      var pw = document.getElementById('admin-password').value;
      var errEl = document.getElementById('admin-error');
      errEl.style.display = 'none';
      try {
        var res = await fetch('/api/auth/login', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: pw })
        });
        if (res.ok) {
          checkAndShow();
        } else {
          errEl.textContent = 'invalid password';
          errEl.style.display = 'block';
        }
      } catch(e) {
        errEl.textContent = 'connection error';
        errEl.style.display = 'block';
      }
    };

    document.getElementById('admin-password').onkeydown = function(e) {
      if (e.key === 'Enter') document.getElementById('admin-login-btn').click();
    };

    document.getElementById('admin-logout-btn').onclick = async function() {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      document.body.classList.remove('admin-authenticated');
      checkAndShow();
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  document.addEventListener('nav', function() { init(); });
})();
</script>
