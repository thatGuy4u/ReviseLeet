/* global chrome */

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

    try {
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
    } catch (err) {
      console.warn("[ReviseLeet] Extension context error:", err.message);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // LAYER 1: API Interception (Primary — most reliable)
  // inject.js intercepts fetch in the MAIN world and posts messages
  // back here when an accepted submission is found.
  // ═══════════════════════════════════════════════════════════════════

  // Ensure inject.js is loaded in the MAIN world.
  // The manifest "world":"MAIN" entry handles this, but we also
  // inject via <script src> as a reliable CSP-safe fallback.
  function ensureFetchHook() {
    try {
      const script = document.createElement("script");
      script.src = chrome.runtime.getURL("inject.js");
      script.onload = () => {
        script.remove();
        console.log("[ReviseLeet] Fetch hook injected via <script src> fallback");
      };
      script.onerror = () => {
        script.remove();
        console.log("[ReviseLeet] Fetch hook <script src> failed (manifest injection should handle it)");
      };
      (document.head || document.documentElement).appendChild(script);
    } catch (err) {
      console.warn("[ReviseLeet] Could not inject fetch hook:", err.message);
    }
  }

  ensureFetchHook();

  // Listen for messages from the MAIN-world inject.js
  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    if (event.data?.type !== "__REVISELEET_ACCEPTED__") return;

    const slug = event.data.slug;
    if (slug) {
      console.log(`[ReviseLeet] API intercepted accepted: ${slug} (${event.data.runtime}, ${event.data.memory})`);
      reportSubmission(slug);
    }
  });

  // ═══════════════════════════════════════════════════════════════════
  // LAYER 2: DOM MutationObserver (Fallback safety net)
  // Only activates after the user clicks the Submit button.
  // This prevents false positives from browsing past submissions.
  // ═══════════════════════════════════════════════════════════════════

  let fallbackFired = false; // Only fire once per page to avoid noise
  let userClickedSubmit = false; // Gate: only track after a real submit click

  // Watch for clicks on LeetCode's Submit button
  document.addEventListener("click", (event) => {
    const target = event.target.closest(
      '[data-e2e-locator="console-submit-button"]'
    );

    if (!target) {
      // Fallback: look for a button whose text contains "Submit"
      // (but not "Submissions" to avoid the tab link)
      const btn = event.target.closest("button");
      if (btn) {
        const text = btn.textContent.trim();
        if (text === "Submit" || text === "Submit Code") {
          userClickedSubmit = true;
          console.log("[ReviseLeet] Submit button clicked (text match)");
          return;
        }
      }
      return;
    }

    userClickedSubmit = true;
    console.log("[ReviseLeet] Submit button clicked (data-e2e-locator)");
  }, true); // Capture phase to catch it early

  const observer = new MutationObserver((mutations) => {
    if (fallbackFired) return;
    if (!userClickedSubmit) return; // ← Only check if user actually submitted

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

  // Reset flags on SPA navigation (URL change)
  let lastUrl = window.location.href;
  const urlObserver = new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      fallbackFired = false;
      userClickedSubmit = false; // Reset submit gate on navigation
      console.log("[ReviseLeet] URL changed, flags reset:", lastUrl);
    }
  });
  urlObserver.observe(document.body || document.documentElement, {
    childList: true,
    subtree: true
  });

})();