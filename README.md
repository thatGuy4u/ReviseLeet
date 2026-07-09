<div align="center">

# 🧠 ReviseLeet

### *Stop Forgetting. Start Mastering.*

**A Chrome Extension that auto-tracks your LeetCode submissions and schedules spaced repetition reviews — so no solved problem ever slips through the cracks.**

[![Manifest V3](https://img.shields.io/badge/Manifest-V3-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES2021-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![LeetCode](https://img.shields.io/badge/LeetCode-Compatible-FFA116?style=for-the-badge&logo=leetcode&logoColor=black)](https://leetcode.com)
[![License](https://img.shields.io/badge/License-MIT-22c55e?style=for-the-badge)](LICENSE)
[![Chrome Storage](https://img.shields.io/badge/Storage-chrome.storage-FF5722?style=for-the-badge&logo=googlechrome&logoColor=white)](#tech-stack)

---

<img src="icon.png" alt="ReviseLeet Logo" width="120">

<br/>

> *"You solved 200 problems on LeetCode last year.*
> *How many can you solve again today from memory?"*

<br/>

[📦 Installation](#-installation) · [✨ Features](#-features) · [🧪 How It Works](#-how-it-works) · [🏗️ Architecture](#%EF%B8%8F-architecture) · [🤝 Contributing](#-contributing)

</div>

---

## 📌 The Problem

Every competitive programmer and interview-prepper faces the **same frustrating cycle**:

```
😤  You solve a hard LeetCode problem after 2 hours of effort
📅  3 weeks later, you see the same problem in an interview
😶  You stare at the screen... you've completely forgotten the approach
🔁  You re-solve it from scratch as if you never saw it before
```

**The painful truth:** solving a problem once ≠ knowing it. Without a systematic revision strategy, **up to 80% of what you solve fades within a month** (the [Ebbinghaus Forgetting Curve](https://en.wikipedia.org/wiki/Forgetting_curve) is brutally real).

Most people know they *should* revise. But there's **no structured pattern** to follow:

- ❌ No reminders for *when* to revisit a problem
- ❌ No tracking of *which* problems you've already solved
- ❌ No distinction between problems you've *mastered* vs. barely scraped through
- ❌ Manual spreadsheets and Notion tables are tedious and quickly abandoned

### ✅ The Solution: **ReviseLeet**

ReviseLeet is a lightweight Chrome extension that **automatically** detects when you successfully solve a LeetCode problem and builds a personalized **spaced repetition schedule** — no manual input required. Just solve problems. ReviseLeet handles the rest.

---

## ✨ Features

<table>
<tr>
<td width="50%">

### 🤖 Automatic Submission Detection
Zero manual effort. ReviseLeet uses a **dual-layer detection system** — intercepting LeetCode's own submission API *and* monitoring the DOM as a fallback. The moment you see "Accepted", the problem is tracked.

</td>
<td width="50%">

### 📅 Spaced Repetition Schedule
Each solved problem gets a scientifically-backed revision schedule:

```
Day 1 → Day 3 → Day 7 → Day 15 → Day 30
```

Five reviews. That's all it takes to cement a solution in long-term memory.

</td>
</tr>
<tr>
<td>

### 📊 Live Dashboard
A sleek popup UI shows you:
- 🔴 Problems **due for review** right now
- 📈 Total problems being **tracked**
- 🎓 Problems you've fully **mastered**
- 🗓️ **Upcoming** reviews on the horizon

</td>
<td>

### ⚡ Frictionless Workflow
No "Mark Done" buttons. No extra clicks.
1. Click a due problem in the popup
2. Solve it on LeetCode
3. The extension **auto-advances** you to the next step

*That's it.*

</td>
</tr>
<tr>
<td>

### 🎓 Graduation System
After completing all 5 review intervals, a problem is marked as **Mastered** — it's been burned into your memory and leaves your review queue permanently.

</td>
<td>

### 🧠 Smart De-duplication
Solved the same problem twice by accident? Re-submitted during practice? ReviseLeet's 8-second debounce and slug matching ensure no duplicates clutter your queue.

</td>
</tr>
</table>

---

## 🧪 How It Works

### The Spaced Repetition Algorithm

ReviseLeet implements a **fixed-interval spaced repetition** system based on proven cognitive science principles:

```
                    🧠 MEMORY RETENTION vs TIME

  Retention
  100% ┤██
       │  ██
   80% ┤    ██                    ← Without review, memory decays rapidly
       │      ███
   60% ┤         ████
       │             █████
   40% ┤                  ████████
       │
   20% ┤                          ██████████████████████████
       │
    0% ┼──────────────────────────────────────────────────────→ Days
       0    1    3    7     15         30

  ─── With ReviseLeet ───

  Retention
  100% ┤██  ▲██  ▲██    ▲██        ▲██ ──────────────────────→ Mastered!
       │  ██│  ██│  ██   │  ██      │  ██
   80% ┤    ▼    ▼    ██ │    ██    │    ███
       │              ██ │      ██  │       ████
   60% ┤                 ▼        ██▼           ████████████
       │
       ┼──────────────────────────────────────────────────────→ Days
       0    1    3    7     15         30
            ↑    ↑    ↑      ↑          ↑
           Review Review Review  Review  Review
           Step 1 Step 2 Step 3  Step 4  Step 5
```

**Each review boosts your retention back up**, and with progressively longer intervals, the memory gets consolidated into long-term storage.

### Lifecycle of a Tracked Problem

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│   🆕  SOLVE on LeetCode                                         │
│    │                                                             │
│    ▼                                                             │
│   📡  content.js detects "Accepted" (API hook + DOM fallback)    │
│    │                                                             │
│    ▼                                                             │
│   💾  background.js creates schedule [+1d, +3d, +7d, +15d, +30d] │
│    │                                                             │
│    ▼                                                             │
│   ┌──────────────────────────────────────────────┐               │
│   │          REVIEW LOOP (Step 0 → 4)            │               │
│   │                                              │               │
│   │  📋 Problem appears in popup as "Due"        │               │
│   │   │                                          │               │
│   │   ▼                                          │               │
│   │  🔗 User clicks → solves on LeetCode         │               │
│   │   │                                          │               │
│   │   ▼                                          │               │
│   │  ✅ content.js detects → background.js       │               │
│   │     auto-advances currentStep++              │               │
│   │   │                                          │               │
│   │   ▼                                          │               │
│   │  🕐 Wait for next interval...               │               │
│   │   │                                          │               │
│   │   └─── Loop until Step 5 ────────────────────│               │
│   └──────────────────────────────────────────────┘               │
│    │                                                             │
│    ▼                                                             │
│   🎓  GRADUATED — Problem mastered & archived!                   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Grace Period

ReviseLeet includes a **12-hour grace period** before the exact due time. This means if a problem is due at 3 PM, you can review it as early as 3 AM that same day and it will still count. No penalty for being an early bird!

---

## 🏗️ Architecture

The extension follows Chrome's **Manifest V3** architecture with a clean separation of concerns:

```
ReviseLeet/
├── manifest.json          ← Extension config (MV3, permissions, scripts)
├── icon.png               ← Extension icon (all sizes)
│
├── content.js             ← 🔍 Injected into LeetCode pages
│                             • Layer 1: fetch() API interception (MAIN world)
│                             • Layer 2: MutationObserver DOM fallback
│                             • Debounce + anti-spam logic
│
├── background.js          ← 🧠 Service Worker (runs in background)
│                             • Manages chrome.storage.local
│                             • Builds spaced repetition schedules
│                             • Handles step advancement logic
│                             • Grace period calculation
│
├── popup.html             ← 🎨 Dashboard UI
│                             • Dark theme, LeetCode-inspired design
│                             • Stats bar (Due / Tracking / Mastered)
│                             • Problem cards with step badges
│                             • Empty state + upcoming preview
│
├── popup.js               ← ⚙️ Dashboard logic
│                             • Reads from chrome.storage.local
│                             • Classifies problems: due vs upcoming vs graduated
│                             • Renders cards, stats, relative timestamps
│
└── README.md              ← 📖 You are here!
```

### Data Flow

```
 ┌─────────────────┐        postMessage         ┌────────────────────┐
 │   LeetCode DOM  │ ◄────────────────────────── │  Injected fetch()  │
 │   (MAIN world)  │ ─────────────────────────► │   hook (MAIN)      │
 └────────┬────────┘    window.postMessage       └────────────────────┘
          │                                                │
          │ MutationObserver                               │ "Accepted" detected
          ▼                                                ▼
 ┌─────────────────────────────────────────────────────────────────┐
 │                     content.js (ISOLATED world)                 │
 │              Debounce → Deduplicate → Report                    │
 └───────────────────────────┬─────────────────────────────────────┘
                             │
                             │ chrome.runtime.sendMessage
                             ▼
 ┌─────────────────────────────────────────────────────────────────┐
 │                   background.js (Service Worker)                │
 │        New? → buildSchedule()    Existing? → advanceStep()      │
 │                             │                                   │
 │                             ▼                                   │
 │                   chrome.storage.local                          │
 └─────────────────────────────────────────────────────────────────┘
                             │
                             │ chrome.storage.local.get()
                             ▼
 ┌─────────────────────────────────────────────────────────────────┐
 │                  popup.js → popup.html                          │
 │           Render dashboard: Due / Upcoming / Mastered           │
 └─────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

<div align="center">

| Layer | Technology | Purpose |
|:-----:|:----------:|:--------|
| 🧩 | **Chrome Extension (MV3)** | Extension framework with service workers |
| 📜 | **Vanilla JavaScript (ES2021+)** | All logic — zero dependencies, zero bloat |
| 🎨 | **HTML5 + CSS3** | Popup UI with CSS custom properties & animations |
| 💾 | **chrome.storage.local** | Persistent, synced problem storage |
| 🔗 | **Chrome Messaging API** | Communication between content ↔ background ↔ popup |
| 🌐 | **Fetch API Interception** | Monkey-patching `window.fetch` for submission detection |
| 👁️ | **MutationObserver API** | Fallback DOM-based accepted detection |

</div>

> **Zero external dependencies.** No React. No build tools. No npm. Just clean, fast, native browser JavaScript.

---

## 📦 Installation

### From Source (Developer Mode)

```bash
# 1. Clone the repository
git clone https://github.com/thatGuy4u/ReviseLeet.git

# 2. That's it! No build step needed.
```

Then load it into Chrome:

```
1.  Open Chrome and navigate to:    chrome://extensions/
2.  Enable "Developer mode"         (toggle in the top-right corner)
3.  Click "Load unpacked"
4.  Select the ReviseLeet/ folder
5.  ✅ Done! The extension icon appears in your toolbar.
```

> [!TIP]
> **Pin the extension** to your Chrome toolbar for quick access to your revision dashboard. Click the puzzle piece icon 🧩 → Pin ReviseLeet.

---

## 🚀 Usage

<table>
<tr>
<td>

### Step 1: Solve Problems
Just solve LeetCode problems as you normally would. ReviseLeet works silently in the background.

### Step 2: Check Your Dashboard
Click the ReviseLeet icon in your toolbar to see your revision schedule.

### Step 3: Review When Due
When a problem turns "Due", click it to jump straight to the LeetCode problem page and re-solve it.

### Step 4: Master It
After 5 successful reviews across 30 days, the problem is marked as **Mastered** 🎓

</td>
<td>

```
 Day  0 ─── Solve "Two Sum" ──────── 🆕 Tracked!
 Day  1 ─── Review #1 ───────────── ✅ Step 1/5
 Day  3 ─── Review #2 ───────────── ✅ Step 2/5
 Day  7 ─── Review #3 ───────────── ✅ Step 3/5
 Day 15 ─── Review #4 ───────────── ✅ Step 4/5
 Day 30 ─── Review #5 ───────────── 🎓 MASTERED!
```

</td>
</tr>
</table>

---

## 🔐 Permissions

ReviseLeet requests the **bare minimum** permissions:

| Permission | Why |
|:----------:|:----|
| `storage` | To persist your problem schedule locally on your device |
| `*://leetcode.com/*` | To detect accepted submissions on LeetCode pages only |

> [!NOTE]
> **Your data never leaves your browser.** ReviseLeet uses `chrome.storage.local` — everything is stored on your machine. There are no analytics, no telemetry, no external servers.

---

## 📐 Storage Schema

Each tracked problem is stored with the following structure:

```javascript
{
  problemSlug: "two-sum",                          // URL slug identifier
  url: "https://leetcode.com/problems/two-sum/",   // Direct problem link
  schedule: [                                       // 5 review timestamps
    1720612800000,   // Day 1  — first review
    1720785600000,   // Day 3
    1721131200000,   // Day 7
    1721822400000,   // Day 15
    1723118400000    // Day 30
  ],
  currentStep: 0,     // 0–5 (5 = graduated / mastered)
  firstSolvedAt: 1720526400000   // When you first solved it
}
```

---

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

```bash
# Fork and clone
git clone https://github.com/thatGuy4u/ReviseLeet.git

# Make your changes
# No build step needed — just edit and reload the extension

# Test locally
# Go to chrome://extensions/ → click 🔄 on ReviseLeet to reload

# Submit a PR
git add . && git commit -m "feat: your awesome feature"
git push origin your-branch
```

### Ideas for Contribution

- [ ] 🔔 **Browser notifications** when a problem becomes due
- [ ] 📊 **Analytics page** — heatmap of reviews, streaks, problem categories
- [ ] 🔄 **Chrome Sync** — sync schedule across devices via `chrome.storage.sync`
- [ ] 🏷️ **Tags & filters** — categorize problems by topic (DP, Trees, Graphs, etc.)
- [ ] 📱 **Firefox port** — adapt for Firefox's WebExtension APIs
- [ ] 📤 **Export/Import** — backup and restore your revision data as JSON

---

## 👤 Author

<div align="center">

**Aman Kumar**

[![Email](https://img.shields.io/badge/Email-mailtoamandtu%40gmail.com-EA4335?style=for-the-badge&logo=gmail&logoColor=white)](mailto:mailtoamandtu@gmail.com)

</div>

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).

---

<div align="center">

<br/>

**⭐ If ReviseLeet helped you nail an interview, give it a star!**

<br/>

```
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║    "Repetition is the mother of learning,                    ║
║     the father of action,                                    ║
║     which makes it the architect of accomplishment."         ║
║                                                              ║
║                                          — Zig Ziglar        ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```

<sub>Built with ☕ and 💛 for the LeetCode grind</sub>

</div>