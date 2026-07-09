/*
  No "Mark Done" button — the workflow is frictionless:
  Click a link → solve on LeetCode → content.js auto-advances.
 */

(() => {
  "use strict";

  // ── Constants ───
  const STEP_LABELS = ["1 Day", "3 Days", "7 Days", "15 Days", "30 Days"];
  const TOTAL_STEPS = STEP_LABELS.length;

  const subtitleEl     = document.getElementById("header-subtitle");
  const statDueEl      = document.getElementById("stat-due");
  const statTrackingEl = document.getElementById("stat-tracking");
  const statGraduatedEl = document.getElementById("stat-graduated");
  const dueSectionEl   = document.getElementById("due-section");
  const upcomingSectionEl = document.getElementById("upcoming-section");

  
  function formatName(slug) {
    return slug
      .split("-")
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  function getRelativeTime(timestamp) {
    const now = Date.now();
    const diff = timestamp - now;

    if (diff <= 0) {
      const pastMs = Math.abs(diff);
      const pastHours = Math.floor(pastMs / (1000 * 60 * 60));
      if (pastHours < 1) return "Due now";
      if (pastHours < 24) return `${pastHours}h overdue`;
      const pastDays = Math.floor(pastHours / 24);
      return `${pastDays}d overdue`;
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return "Due in < 1h";
    if (hours < 24) return `Due in ${hours}h`;
    const days = Math.floor(hours / 24);
    return `Due in ${days}d`;
  }

   // Create a problem card element.
   
  function createProblemCard(problem, isDue) {
    const card = document.createElement("a");
    card.href = problem.url;
    card.target = "_blank";
    card.rel = "noopener noreferrer";
    card.className = isDue ? "problem-card" : "problem-card upcoming-card";

    const stepNum = problem.currentStep + 1;
    const stepClass = `step-${stepNum}`;
    const stepLabel = STEP_LABELS[problem.currentStep];

    const dueTime = problem.schedule[problem.currentStep];
    const timeLabel = isDue ? getRelativeTime(dueTime) : "";
    const upcomingDate = !isDue ? formatFutureDate(dueTime) : "";

    card.innerHTML = `
      <div class="problem-info">
        <span class="problem-name">${formatName(problem.problemSlug)}</span>
        <span class="problem-meta">${isDue ? timeLabel : `Due ${upcomingDate}`}</span>
      </div>
      ${isDue
        ? `<span class="step-badge ${stepClass}">
            <span class="step-dot"></span>
            ${stepLabel} · ${stepNum}/${TOTAL_STEPS}
          </span>`
        : `<span class="upcoming-date">${upcomingDate}</span>`
      }
    `;

    return card;
  }

  /*
    Format a future timestamp into a short date string.
  */
  function formatFutureDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === now.toDateString()) return "Today";
    if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";

    const options = { month: "short", day: "numeric" };
    return date.toLocaleDateString("en-US", options);
  }

  /*
    Render the full popup dashboard.
  */
  function render(revisions) {
    const now = Date.now();

    // Classify problems
    const dueProblems = [];
    const upcomingProblems = [];
    let graduatedCount = 0;
    let activeCount = 0;

    for (const problem of revisions) {
      if (problem.currentStep >= TOTAL_STEPS) {
        graduatedCount++;
        continue;
      }

      activeCount++;
      const dueTime = problem.schedule[problem.currentStep];

      if (now >= dueTime) {
        dueProblems.push(problem);
      } else {
        upcomingProblems.push(problem);
      }
    }

    // Sort: due problems by urgency (most overdue first)
    dueProblems.sort((a, b) => a.schedule[a.currentStep] - b.schedule[b.currentStep]);

    // Sort upcoming by nearest due date
    upcomingProblems.sort((a, b) => a.schedule[a.currentStep] - b.schedule[b.currentStep]);

    // ── Update Stats ───
    statDueEl.textContent = dueProblems.length;
    statTrackingEl.textContent = activeCount;
    statGraduatedEl.textContent = graduatedCount;

    // ── Update Header ──
    if (dueProblems.length > 0) {
      subtitleEl.textContent = `${dueProblems.length} problem${dueProblems.length > 1 ? "s" : ""} waiting for review`;
    } else {
      subtitleEl.textContent = "No reviews pending right now";
    }

    // ── Render Due Problems ───
    dueSectionEl.innerHTML = "";

    if (dueProblems.length > 0) {
      const sectionTitle = document.createElement("div");
      sectionTitle.className = "section-title";
      sectionTitle.textContent = "Due for Review";
      dueSectionEl.appendChild(sectionTitle);

      const list = document.createElement("div");
      list.className = "problem-list";

      for (const problem of dueProblems) {
        list.appendChild(createProblemCard(problem, true));
      }

      dueSectionEl.appendChild(list);

    } else {
      // ── Empty State ──
      dueSectionEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🎉</div>
          <div class="empty-title">All caught up!</div>
          <div class="empty-subtitle">
            No problems due for review right now. Keep solving on LeetCode — they'll appear here automatically.
          </div>
          ${activeCount > 0
            ? `<div class="empty-streak">
                <span>📚</span>
                <span>${activeCount} problem${activeCount > 1 ? "s" : ""} in your queue</span>
              </div>`
            : `<div class="empty-streak">
                <span>🚀</span>
                <span>Solve a problem on LeetCode to start</span>
              </div>`
          }
        </div>
      `;
    }

    // ── Render Upcoming Preview ──
    upcomingSectionEl.innerHTML = "";

    if (upcomingProblems.length > 0) {
      upcomingSectionEl.innerHTML = `
        <div class="upcoming-divider">
          <span class="upcoming-label">Coming Up</span>
        </div>
      `;

      const list = document.createElement("div");
      list.className = "problem-list";

      for (const problem of upcomingProblems) {
        list.appendChild(createProblemCard(problem, false));
      }

      upcomingSectionEl.appendChild(list);
    }
  }

  chrome.storage.local.get(["revisions"], (result) => {
    const revisions = result.revisions || [];
    render(revisions);
  });
})();