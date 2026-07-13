// ReviseLeet — MAIN world fetch hook
// This file runs in the page's MAIN world (via manifest "world": "MAIN")
// to intercept LeetCode's submission-check API responses.
//
// How we distinguish Run vs Submit:
//   - Run/test checks use IDs like "runcode_1720884321_..."  (contain "runcode")
//   - Real submission checks use purely numeric IDs like "1234567890"
// We simply skip any check URL that contains "runcode".

(function () {
  if (window.__reviseLeetHooked) return;
  window.__reviseLeetHooked = true;

  const originalFetch = window.fetch;

  window.fetch = async function (...args) {
    const response = await originalFetch.apply(this, args);

    try {
      const url = (typeof args[0] === 'string') ? args[0] : args[0]?.url || '';

      // LeetCode polls:  /submissions/detail/<id>/check/
      if (url.includes('/submissions/detail/') && url.includes('/check')) {

        // Skip Run/test results — their IDs start with "runcode_"
        if (url.includes('runcode')) {
          return response;
        }

        const clone = response.clone();
        clone.json().then(data => {
          if (data && data.status_msg === 'Accepted' && data.state === 'SUCCESS') {
            const slug = window.location.pathname.match(/\/problems\/([^/]+)/)?.[1] || '';
            console.log('[ReviseLeet] ✅ Accepted submission detected:', slug);
            window.postMessage({
              type: '__REVISELEET_ACCEPTED__',
              slug: slug,
              runtime: data.status_runtime || '',
              memory: data.status_memory || ''
            }, '*');
          }
        }).catch(() => {});
      }
    } catch (e) {
      // Never break LeetCode's own functionality
    }

    return response;
  };

  console.log('[ReviseLeet] Fetch hook active in MAIN world');
})();
