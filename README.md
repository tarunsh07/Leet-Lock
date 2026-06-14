<div align="center">
  <img src="public/logo.png" alt="LeetLock Logo" width="250" />
  <h1>LeetLock - Ultimate Focus Mode for LeetCode</h1>
  <p><strong>A robust Chrome Extension that enforces distraction-free coding, hides solution-biasing UI elements, and blocks AI cheating tools.</strong></p>

  <p>
    <img src="https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React">
    <img src="https://img.shields.io/badge/Vite-6.0-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite">
    <img src="https://img.shields.io/badge/Manifest_V3-Chrome-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Chrome MV3">
    <img src="https://img.shields.io/badge/Recharts-2.15-22B5BF?style=for-the-badge&logo=react&logoColor=white" alt="Recharts">
    <img src="https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript">
  </p>

  <h3>🚀 <a href="https://leetlock.netlify.app/">Download Extension Here</a></h3>

  <p>
    <a href="#getting-started">Getting Started</a>
    &nbsp;&middot;&nbsp;
    <a href="#key-features">Features</a>
    &nbsp;&middot;&nbsp;
    <a href="#architecture">Architecture</a>
  </p>
</div>

---

## Table of Contents

- [About the Project](#about-the-project)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Data Models](#data-models)
- [Getting Started](#getting-started)
- [Screenshots](#screenshots)
- [Future Enhancements](#future-enhancements)
- [License](#license)
- [Author](#author)

---

## About the Project

**LeetLock** is a developer-focused Chrome Extension built to solve a specific problem: the temptation to look at hints, tags, or AI chatbots while practicing Data Structures and Algorithms on LeetCode. 

This extension provides a strict, distraction-free environment. By programmatically hiding meta-information (like difficulty or acceptance rate) and actively intercepting navigation to AI assistance platforms (ChatGPT, Claude, Gemini), LeetLock forces users to rely entirely on their own problem-solving skills. It also tracks your deep work sessions and visualizes your progress via a beautifully designed React-powered analytics dashboard.

---

## Key Features

| Feature | Description |
|---|---|
| **Granular Focus Timers** | Set specific countdown timers to hide specific LeetCode UI elements (Difficulty, Topic Tags, Hints, Acceptance Rates) |
| **AI Cheating Interceptor** | Automatically detects and blocks navigation to AI chat platforms (ChatGPT, Claude, etc.), redirecting you back to LeetCode |
| **Real-Time DOM Observation** | Uses `MutationObserver` to aggressively re-apply DOM manipulation, outsmarting React's dynamic rendering on LeetCode |
| **Comprehensive Dashboard** | View lifetime sessions, total focus time, and problems solved inside a React-powered popup |
| **Interactive Analytics** | Beautiful data visualizations using Recharts, including Bar Charts (Focus Trend), Line Charts (AI Attempts), and Pie Charts (Difficulty) |
| **Persistent Storage** | Leverages Chrome's `storage.local` API to persistently track and compile analytics across all browser sessions |
| **State Synchronization** | Service Workers use asynchronous message passing to guarantee focus state persists across page reloads and isolated DOM environments |
| **Theme System** | Global CSS Variables architecture featuring a clean, modern Light Mode design system |
| **Manual Code Splitting** | Custom Rollup manual chunking isolates vendor libraries, optimizing browser caching and parallel load times |

---

## Tech Stack

### Frontend UI & Dashboard
| Technology | Purpose |
|---|---|
| **React (v18)** | Component-based UI rendering for the extension popup |
| **Vite** | Lightning-fast build tool and bundler |
| **Recharts** | Rendering interactive SVG charts for the Analytics Dashboard |
| **Google Fonts & Material Symbols** | Typography (`Plus Jakarta Sans`) and iconography |

### Chrome Extension APIs
| Technology | Purpose |
|---|---|
| **Manifest V3** | The modern Chrome Extension architecture |
| **Service Workers** | Background script (`background.js`) to manage state and intercept web requests |
| **Content Scripts** | Injected JavaScript (`content.js`) to read and modify the LeetCode DOM |
| **Storage API** | Persistent local database for analytics and settings |
| **Tabs API** | URL monitoring and tab redirection for the AI Blocker |

---

## Architecture

The extension follows the standard **Manifest V3 Architecture** with a clear separation of concerns:

```text
Client Browser
      |
      v
+------------------+       +-------------------+       +------------------+
|                  |       |                   |       |                  |
|  Content Script  |<----->| Background Worker |<----->|   React Popup    |
|  (content.js)    |       | (background.js)   |       |  (App.jsx)       |
|                  |       |                   |       |                  |
+---------+--------+       +---------+---------+       +---------+--------+
          |                          |                           |
          v                          v                           v
+------------------+       +-------------------+       +------------------+
|                  |       |                   |       |                  |
|  LeetCode DOM    |       |  Chrome Tabs API  |       |  Chrome Storage  |
|  (Mutation Obs.) |       |  (AI Blocker)     |       |  (Analytics DB)  |
|                  |       |                   |       |                  |
+------------------+       +-------------------+       +------------------+
```

---

## Project Structure

```text
extension-project/
|-- vite.config.js            # Vite configuration and manual chunking
|-- package.json              # Dependencies and build scripts
|-- index.html                # Entry point for the React popup
|
|-- public/                   # Extension core files (copied to /dist)
|   |-- manifest.json         # Extension permissions and configurations
|   |-- background.js         # Background Service Worker logic
|   +-- content.js            # Content script for DOM manipulation
|
|-- src/                      # React application
|   |-- main.jsx              # React DOM mounting
|   |-- App.jsx               # Main UI component (Settings & Dashboard)
|   |-- App.css               # Component-specific styles
|   +-- theme.css             # Global CSS Variables and color palette
```

---

## Data Models

The extension uses `chrome.storage.local` to act as a lightweight NoSQL database.

### `totals` (Lifetime Statistics)
```javascript
{
  sessions: Number,      // Total focus sessions initiated
  focusTime: Number,     // Total minutes spent in focus mode
  solved: Number,        // Total problems marked as solved
  aiBlocked: Number,     // Total number of intercepted AI cheating attempts
  difficulty: {          // Breakdown of solved problems
    Easy: Number,
    Medium: Number,
    Hard: Number
  }
}
```

### `dailyStats` (Time-Series Data)
```javascript
{
  "YYYY-MM-DD": {
    focusTime: Number,   // Minutes focused on this specific date
    aiBlocked: Number    // AI attempts blocked on this specific date
  }
}
```

---

## Getting Started

**The easiest way to install LeetLock is to download the compiled ZIP file directly from the [official website](https://leetlock.netlify.app/) and skip the build steps.**

### Prerequisites (For Developers)
- **Node.js** (v18 or higher)
- **Google Chrome** or any Chromium-based browser (Edge, Brave, Arc)

### Manual Build & Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/tarunsh07/leetlock.git
   cd extension-project
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the extension**
   ```bash
   npm run build
   ```
   *This will generate a `dist/` folder containing the compiled extension.*

4. **Load into Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable **Developer mode** in the top right corner.
   - Click **Load unpacked** in the top left corner.
   - Select the `dist` folder generated in step 3.

---

## Screenshots

<img width="1920" height="1080" alt="1" src="https://github.com/user-attachments/assets/0c21e6cd-ccf3-4bc9-b0e1-10e58b6c75ee" />
<img width="1920" height="1080" alt="2" src="https://github.com/user-attachments/assets/04d22477-b307-4069-916f-38259f69605d" />


---

## Future Enhancements

- [ ] Sync storage across multiple devices using `chrome.storage.sync`
- [ ] Export analytics data to CSV
- [ ] Customizable "Punishment" features when attempting to cheat
- [ ] White-listing specific non-cheating AI prompts
- [ ] Allow users to customize the exact color theme

---

## License

This project is licensed under the [ISC License](https://opensource.org/licenses/ISC).

---

## Author

**Tarun Sharma**

[![LinkedIn](https://img.shields.io/badge/LinkedIn-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/tarunsh07/)
[![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/tarunsh07)

---

<div align="center">
  <p>If you found this project helpful, please consider giving it a star.</p>
</div>
