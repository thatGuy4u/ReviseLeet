
"use strict";

// Revision intervals in days 
const REVISION_INTERVALS_DAYS = [1, 3, 7, 15, 30];
const GRACE_PERIOD_MS = 12 * 60 * 60 * 1000; // 12 hours before exact due time
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Build the initial schedule array from a base timestamp.
 * Only the first review date is set (base + 1 day).
 * Subsequent dates are set dynamically when each review is completed,
 * so that each interval is relative to the actual completion date.
 */
function buildSchedule(baseTimestamp) {
  const schedule = new Array(REVISION_INTERVALS_DAYS.length).fill(null);
  schedule[0] = baseTimestamp + (REVISION_INTERVALS_DAYS[0] * DAY_MS);
  return schedule;
}

//  slug formatting 
function formatSlugToName(slug) {
  return slug
    .split("-")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

//  Message Listener 
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action !== "trackSubmission") return;

  const { problemSlug, url, timestamp } = message;

  chrome.storage.local.get(["revisions"], (result) => {
    const revisions = result.revisions || [];
    const now = Date.now();

    const existingIndex = revisions.findIndex(p => p.problemSlug === problemSlug);

    if (existingIndex !== -1) {
      // Existing problem: attempt auto-advance 
      const problem = revisions[existingIndex];

      if (problem.currentStep >= REVISION_INTERVALS_DAYS.length) {
        // Already graduated — all 5 reviews completed
        console.log(`[ReviseLeet] "${formatSlugToName(problemSlug)}" is fully graduated. No action needed.`);
        sendResponse({ status: "already_graduated" });
        return;
      }

      const currentDueTime = problem.schedule[problem.currentStep];

      // Check if the problem is currently due (with 12-hour grace period)
      if (now >= currentDueTime - GRACE_PERIOD_MS) {
        problem.currentStep++;

        // Set the NEXT due date relative to NOW (when this revision was completed)
        if (problem.currentStep < REVISION_INTERVALS_DAYS.length) {
          problem.schedule[problem.currentStep] = now + (REVISION_INTERVALS_DAYS[problem.currentStep] * DAY_MS);
        }

        revisions[existingIndex] = problem;

        const stepLabel = problem.currentStep >= REVISION_INTERVALS_DAYS.length
          ? "GRADUATED 🎓"
          : `Step ${problem.currentStep + 1}/5 (${REVISION_INTERVALS_DAYS[problem.currentStep]} days)`;

        console.log(`[ReviseLeet] ✅ "${formatSlugToName(problemSlug)}" advanced → ${stepLabel}`);
        sendResponse({ status: "advanced", newStep: problem.currentStep });
      } else {
        // Solved too early — not yet due
        console.log(`[ReviseLeet] "${formatSlugToName(problemSlug)}" solved early. Not due until ${new Date(currentDueTime).toLocaleDateString()}.`);
        sendResponse({ status: "not_due_yet" });
      }

    } else {
      //  New problem: create schedule 
      const schedule = buildSchedule(timestamp);

      revisions.push({
        problemSlug,
        url,
        schedule,
        currentStep: 0,
        firstSolvedAt: timestamp
      });

      console.log(`[ReviseLeet] 🆕 Tracking "${formatSlugToName(problemSlug)}". First review: ${new Date(schedule[0]).toLocaleDateString()}`);
      sendResponse({ status: "new_tracking", nextReview: new Date(schedule[0]).toLocaleDateString() });
    }

    chrome.storage.local.set({ revisions }, () => {
      if (chrome.runtime.lastError) {
        console.error("[ReviseLeet] Storage error:", chrome.runtime.lastError);
      }
    });
  });

  // Return true to indicate async sendResponse
  return true;
});