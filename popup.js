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
    const card = document.createElement("div");
    card.className = isDue ? "problem-card" : "problem-card upcoming-card";

    const stepNum = problem.currentStep + 1;
    const stepClass = `step-${stepNum}`;
    const stepLabel = STEP_LABELS[problem.currentStep];

    const dueTime = problem.schedule[problem.currentStep];
    const timeLabel = isDue ? getRelativeTime(dueTime) : "";
    const upcomingDate = !isDue ? formatFutureDate(dueTime) : "";

    // Clickable link area
    const link = document.createElement("a");
    link.href = problem.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.className = "problem-link";
    link.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:10px;flex:1;min-width:0;text-decoration:none;color:inherit;";
    link.innerHTML = `
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

    card.appendChild(link);

    // Remove button — only available within 24 hours of first solving
    const hoursSinceFirstSolve = (Date.now() - problem.firstSolvedAt) / (1000 * 60 * 60);
    if (hoursSinceFirstSolve < 24) {
      const removeBtn = document.createElement("button");
      removeBtn.className = "remove-btn";
      removeBtn.title = "Remove from tracking (available for 24h)";
      removeBtn.textContent = "×";
      removeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (confirm(`Remove "${formatName(problem.problemSlug)}" from tracking?`)) {
          removeProblem(problem.problemSlug);
        }
      });
      card.appendChild(removeBtn);
    }

    return card;
  }

  /**
   * Remove a problem from storage and re-render.
   */
  function removeProblem(slug) {
    chrome.storage.local.get(["revisions"], (result) => {
      const revisions = (result.revisions || []).filter(p => p.problemSlug !== slug);
      chrome.storage.local.set({ revisions }, () => {
        console.log(`[ReviseLeet] Removed "${slug}" from tracking.`);
        render(revisions);
      });
    });
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

  // ── Export as styled HTML report ───
  const STEP_LABELS_EXPORT = ["1 Day", "3 Days", "7 Days", "15 Days", "30 Days"];

  function buildExportHTML(revisions) {
    const now = Date.now();
    const exportDate = new Date().toLocaleDateString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric"
    });

    let dueCount = 0, activeCount = 0, graduatedCount = 0;
    const rows = [];

    // Sort: graduated last, then by first-solved descending
    const sorted = [...revisions].sort((a, b) => {
      const aDone = a.currentStep >= STEP_LABELS_EXPORT.length;
      const bDone = b.currentStep >= STEP_LABELS_EXPORT.length;
      if (aDone !== bDone) return aDone ? 1 : -1;
      return b.firstSolvedAt - a.firstSolvedAt;
    });

    for (const p of sorted) {
      const isGraduated = p.currentStep >= STEP_LABELS_EXPORT.length;
      if (isGraduated) {
        graduatedCount++;
      } else {
        activeCount++;
        const dueTime = p.schedule[p.currentStep];
        if (now >= dueTime) dueCount++;
      }

      const name = p.problemSlug
        .split("-")
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");

      const firstSolved = new Date(p.firstSolvedAt).toLocaleDateString("en-US", {
        month: "short", day: "numeric", year: "numeric"
      });

      let status, statusClass, nextReview, progressHTML;

      if (isGraduated) {
        status = "Mastered ✅";
        statusClass = "graduated";
        nextReview = "—";
        progressHTML = STEP_LABELS_EXPORT.map(() =>
          `<span class="dot done"></span>`
        ).join("");
      } else {
        const dueTime = p.schedule[p.currentStep];
        const isDue = now >= dueTime;
        status = isDue ? "Due Now 🔴" : "In Progress 🔵";
        statusClass = isDue ? "due" : "active";
        nextReview = new Date(dueTime).toLocaleDateString("en-US", {
          month: "short", day: "numeric", year: "numeric"
        });
        progressHTML = STEP_LABELS_EXPORT.map((_, i) => {
          if (i < p.currentStep) return `<span class="dot done"></span>`;
          if (i === p.currentStep) return `<span class="dot current"></span>`;
          return `<span class="dot"></span>`;
        }).join("");
      }

      const stepLabel = isGraduated
        ? "Complete"
        : `${STEP_LABELS_EXPORT[p.currentStep]} (${p.currentStep + 1}/${STEP_LABELS_EXPORT.length})`;

      rows.push(`
        <tr>
          <td><a href="${p.url}" target="_blank">${name}</a></td>
          <td><span class="status ${statusClass}">${status}</span></td>
          <td>${stepLabel}</td>
          <td><div class="progress">${progressHTML}</div></td>
          <td>${firstSolved}</td>
          <td>${nextReview}</td>
        </tr>
      `);
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>ReviseLeet Export — ${exportDate}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    background: #0f0f0f;
    color: #e0e0e0;
    min-height: 100vh;
    padding: 40px 20px;
    line-height: 1.6;
  }

  .container {
    max-width: 960px;
    margin: 0 auto;
  }

  .header {
    text-align: center;
    margin-bottom: 40px;
    padding-bottom: 30px;
    border-bottom: 1px solid #2a2a2a;
  }

  .header h1 {
    font-size: 28px;
    font-weight: 800;
    background: linear-gradient(135deg, #ffa116, #ff6b35);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin-bottom: 6px;
    letter-spacing: -0.5px;
  }

  .header .date {
    font-size: 13px;
    color: #666;
  }

  .stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    margin-bottom: 36px;
  }

  .stat-card {
    background: #1a1a1a;
    border: 1px solid #2a2a2a;
    border-radius: 12px;
    padding: 20px;
    text-align: center;
    transition: border-color 0.2s;
  }

  .stat-card:hover { border-color: #3a3a3a; }

  .stat-card .value {
    font-size: 32px;
    font-weight: 800;
    line-height: 1.2;
  }

  .stat-card .value.orange { color: #ffa116; }
  .stat-card .value.red { color: #ef4444; }
  .stat-card .value.blue { color: #3b82f6; }
  .stat-card .value.green { color: #22c55e; }

  .stat-card .label {
    font-size: 11px;
    font-weight: 600;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-top: 4px;
  }

  .section-title {
    font-size: 14px;
    font-weight: 700;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    margin-bottom: 16px;
  }

  table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    background: #1a1a1a;
    border: 1px solid #2a2a2a;
    border-radius: 12px;
    overflow: hidden;
  }

  th {
    background: #222;
    font-size: 10px;
    font-weight: 700;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 1px;
    padding: 14px 16px;
    text-align: left;
    border-bottom: 1px solid #2a2a2a;
  }

  td {
    padding: 14px 16px;
    font-size: 13px;
    border-bottom: 1px solid #1f1f1f;
    vertical-align: middle;
  }

  tr:last-child td { border-bottom: none; }

  tr:hover td { background: #1f1f1f; }

  td a {
    color: #e0e0e0;
    text-decoration: none;
    font-weight: 600;
    transition: color 0.2s;
  }

  td a:hover { color: #ffa116; }

  .status {
    display: inline-block;
    font-size: 11px;
    font-weight: 600;
    padding: 3px 10px;
    border-radius: 20px;
    white-space: nowrap;
  }

  .status.due {
    background: rgba(239, 68, 68, 0.15);
    color: #f87171;
  }

  .status.active {
    background: rgba(59, 130, 246, 0.15);
    color: #60a5fa;
  }

  .status.graduated {
    background: rgba(34, 197, 94, 0.15);
    color: #4ade80;
  }

  .progress {
    display: flex;
    gap: 5px;
    align-items: center;
  }

  .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #2a2a2a;
    border: 2px solid #3a3a3a;
  }

  .dot.done {
    background: #22c55e;
    border-color: #22c55e;
  }

  .dot.current {
    background: #ffa116;
    border-color: #ffa116;
    box-shadow: 0 0 8px rgba(255, 161, 22, 0.4);
  }

  .empty {
    text-align: center;
    padding: 60px 20px;
    color: #555;
    font-size: 15px;
  }

  .footer {
    margin-top: 40px;
    padding-top: 20px;
    border-top: 1px solid #2a2a2a;
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: #444;
    font-size: 11px;
  }

  .json-toggle {
    display: inline-block;
    margin-top: 24px;
    background: #1a1a1a;
    color: #888;
    border: 1px solid #2a2a2a;
    border-radius: 8px;
    padding: 8px 16px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .json-toggle:hover {
    border-color: #ffa116;
    color: #ffa116;
  }

  .json-block {
    display: none;
    margin-top: 16px;
    background: #111;
    border: 1px solid #2a2a2a;
    border-radius: 12px;
    padding: 20px;
    overflow-x: auto;
  }

  .json-block pre {
    font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
    font-size: 11px;
    color: #aaa;
    white-space: pre-wrap;
    word-break: break-all;
  }

  @media (max-width: 640px) {
    .stats { grid-template-columns: repeat(2, 1fr); }
    td, th { padding: 10px 12px; font-size: 12px; }
  }

  @media print {
    body { background: #fff; color: #111; padding: 20px; }
    .stat-card { border-color: #ddd; }
    table { border-color: #ddd; }
    th { background: #f5f5f5; color: #333; border-color: #ddd; }
    td { border-color: #eee; }
    td a { color: #111; }
    .dot { border-color: #ccc; background: #eee; }
    .dot.done { background: #22c55e; border-color: #22c55e; }
    .dot.current { background: #ffa116; border-color: #ffa116; }
    .json-toggle, .json-block { display: none !important; }
  }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>📚 ReviseLeet Export</h1>
    <div class="date">${exportDate}</div>
  </div>

  <div class="stats">
    <div class="stat-card">
      <div class="value orange">${revisions.length}</div>
      <div class="label">Total Problems</div>
    </div>
    <div class="stat-card">
      <div class="value red">${dueCount}</div>
      <div class="label">Due Now</div>
    </div>
    <div class="stat-card">
      <div class="value blue">${activeCount}</div>
      <div class="label">In Progress</div>
    </div>
    <div class="stat-card">
      <div class="value green">${graduatedCount}</div>
      <div class="label">Mastered</div>
    </div>
  </div>

  <div class="section-title">All Problems</div>

  ${rows.length > 0 ? `
  <table>
    <thead>
      <tr>
        <th>Problem</th>
        <th>Status</th>
        <th>Current Step</th>
        <th>Progress</th>
        <th>First Solved</th>
        <th>Next Review</th>
      </tr>
    </thead>
    <tbody>${rows.join("")}</tbody>
  </table>
  ` : `<div class="empty">No problems tracked yet. Solve problems on LeetCode to get started!</div>`}

  <button class="json-toggle" onclick="
    const block = document.getElementById('json-data');
    block.style.display = block.style.display === 'none' ? 'block' : 'none';
    this.textContent = block.style.display === 'none' ? '{ } Show Raw JSON' : '{ } Hide Raw JSON';
  ">{ } Show Raw JSON</button>

  <div class="json-block" id="json-data">
    <pre>${JSON.stringify({
      exportedAt: new Date().toISOString(),
      totalProblems: revisions.length,
      revisions: revisions
    }, null, 2).replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
  </div>

  <div class="footer">
    <span>ReviseLeet — Spaced Repetition for LeetCode</span>
    <span>Intervals: 1 · 3 · 7 · 15 · 30 days</span>
    <span>© AMAN</span>
  </div>
</div>
</body>
</html>`;
  }

  const exportBtn = document.getElementById("export-btn");
  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      chrome.storage.local.get(["revisions"], (result) => {
        const revisions = result.revisions || [];
        const html = buildExportHTML(revisions);

        const blob = new Blob([html], { type: "text/html" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = `reviseleet_export_${new Date().toISOString().slice(0, 10)}.html`;
        document.body.appendChild(a);
        a.click();

        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 100);
      });
    });
  }
})();