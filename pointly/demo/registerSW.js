// Auto-updating service worker registration — forces skip-waiting on every new SW
if ('serviceWorker' in navigator) {
  // When new SW takes control, reload immediately
  var refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });

  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/demo/sw.js', { scope: '/demo/' })
      .then(function (reg) {
        // If there's already a waiting SW, skip it now
        if (reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }

        // When a new SW installs, skip waiting immediately
        reg.addEventListener('updatefound', function () {
          var newSW = reg.installing;
          newSW.addEventListener('statechange', function () {
            if (newSW.state === 'installed') {
              newSW.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });

        // Actively check for a SW update on every load
        reg.update();
      })
      .catch(function (err) {
        console.warn('[SW] Registration failed:', err);
      });
  });
}
