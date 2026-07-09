
(() => {
  "use strict";

  // Anti-spam state
  let lastSubmittedSlug = "";
  let lastSubmittedTime = 0;
  const DEBOUNCE_MS = 8000; // Ignore duplicate detections within 8 seconds

  /*
    Extract the problem slug from a URL path.
    "/problems/two-sum/description/" → "two-sum"
  */
  function getSlugFromPath(path) {
    const match = (path || window.location.pathname).match(/\/problems\/([^/]+)/);
    return match ? match[1] : null;
  }

  /**
   * Send the tracked submission to the background service worker.
   */
  function reportSubmission(slug) {
    if (!slug) return;

    const now = Date.now();

    // Anti-spam: skip if same slug was just reported
    if (slug === lastSubmittedSlug && (now - lastSubmittedTime) < DEBOUNCE_MS) {
      return;
    }

    lastSubmittedSlug = slug;
    lastSubmittedTime = now;

    console.log(`[ReviseLeet] ✅ Detected accepted submission: ${slug}`);

    chrome.runtime.sendMessage({
      action: "trackSubmission",
      problemSlug: slug,
      url: `https://leetcode.com/problems/${slug}/`,
      timestamp: now
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.warn("[ReviseLeet] Could not reach background:", chrome.runtime.lastError.message);
      } else {
        console.log("[ReviseLeet] Background response:", response?.status || "OK");
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // LAYER 1: API Interception (Primary — most reliable)
  // ═══════════════════════════════════════════════════════════════════

  const injectedCode = `
    (function() {
      if (window.__reviseLeetHooked) return;
      window.__reviseLeetHooked = true;

      const originalFetch = window.fetch;

      window.fetch = async function(...args) {
        const response = await originalFetch.apply(this, args);

        try {
          const url = (typeof args[0] === 'string') ? args[0] : args[0]?.url || '';

          // LeetCode polls:  /submissions/detail/<id>/check/
          if (url.includes('/submissions/detail/') && url.includes('/check')) {
            const clone = response.clone();
            clone.json().then(data => {
              // status_msg is "Accepted" for successful submissions
              // state is "SUCCESS" when the check is complete
              if (data && data.status_msg === 'Accepted' && data.state === 'SUCCESS') {
                window.postMessage({
                  type: '__REVISELEET_ACCEPTED__',
                  slug: window.location.pathname.match(/\\/problems\\/([^/]+)/)?.[1] || '',
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
    })();
  `;

  // Inject into the MAIN world via a <script> tag
  function injectFetchHook() {
    const script = document.createElement("script");
    script.textContent = injectedCode;
    (document.head || document.documentElement).appendChild(script);
    script.remove(); // Clean up — the code has already executed
    console.log("[ReviseLeet] Fetch hook injected into MAIN world");
  }

  // Listen for messages from the injected script
  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    if (event.data?.type !== "__REVISELEET_ACCEPTED__") return;

    const slug = event.data.slug;
    if (slug) {
      console.log(`[ReviseLeet] API intercepted accepted: ${slug} (${event.data.runtime}, ${event.data.memory})`);
      reportSubmission(slug);
    }
  });

  // Inject immediately
  injectFetchHook();

  // ═══════════════════════════════════════════════════════════════════
  // LAYER 2: DOM MutationObserver (Fallback safety net)
  // ═══════════════════════════════════════════════════════════════════

  let fallbackFired = false; // Only fire once per page to avoid noise

  const observer = new MutationObserver((mutations) => {
    if (fallbackFired) return;

    for (const mutation of mutations) {
      if (mutation.addedNodes.length === 0 && mutation.type !== "characterData") continue;

      // Quick check: look for "Accepted" text in the page
      const bodyText = document.body?.innerText || "";

      if (
        bodyText.includes("Accepted") &&
        bodyText.includes("Runtime") &&
        bodyText.includes("Memory")
      ) {
        const slug = getSlugFromPath();
        if (slug) {
          // Only use fallback if the API hook hasn't already caught this
          if (slug !== lastSubmittedSlug || (Date.now() - lastSubmittedTime) > DEBOUNCE_MS) {
            console.log(`[ReviseLeet] DOM fallback detected accepted: ${slug}`);
            fallbackFired = true;
            reportSubmission(slug);
          }
        }
      }
    }
  });

  // Start observing
  function startObserving() {
    const target = document.body || document.documentElement;
    if (target) {
      observer.observe(target, {
        childList: true,
        subtree: true,
        characterData: true
      });
      console.log("[ReviseLeet] DOM observer active on", window.location.pathname);
    }
  }

  if (document.body) {
    startObserving();
  } else {
    document.addEventListener("DOMContentLoaded", startObserving);
  }

  // Reset fallback flag on SPA navigation (URL change)
  let lastUrl = window.location.href;
  const urlObserver = new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      fallbackFired = false;
      console.log("[ReviseLeet] URL changed, fallback reset:", lastUrl);
    }
  });
  urlObserver.observe(document.body || document.documentElement, {
    childList: true,
    subtree: true
  });

})();