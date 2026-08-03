# LeetLock Interview Q&A Notes

## 1. The "Big Picture" Architecture (Repository Structure)

A Chrome Extension is not like a normal website. It is actually **three separate programs** running at the same time that talk to each other. Here is how the project folder is structured and what each part does:

### 1. The Configuration (`public/manifest.json`)
Every Chrome extension must have this file. It tells the Chrome browser:
* What your extension is called.
* What permissions it needs (like access to `storage` or `tabs`).
* Where to find the 3 separate programs mentioned below.

### 2. The User Interface (`src/` folder)
This is the popup menu that appears when you click the extension icon in your browser toolbar.
* **Tech Stack:** React 18, Vite, Recharts, and CSS.
* **Key Files:** `App.jsx`, `main.jsx`, `App.css`.
* **What it does:** It provides the UI for the user to set their timers, toggle the AI blocker on/off, and view their analytics dashboard. 
* **Important Note:** This React app *cannot* directly modify LeetCode's webpage. It is completely isolated inside its own little popup bubble.

### 3. The "Brain" / Service Worker (`public/background.js`)
This is a pure, vanilla JavaScript file that runs invisibly in the background of the browser.
* **What it does:** It listens for events. If you click "Start Focus" in the React popup, the popup sends a message to `background.js`. 
* This file is responsible for setting the **Chrome Alarms** (timers) and monitoring the **Chrome Tabs** (to see if you are trying to visit an AI cheating website so it can block you).

### 4. The "Hands" / Content Script (`public/content.js`)
This is also a pure, vanilla JavaScript file, but it is **injected directly into LeetCode.com**.
* **What it does:** Because it lives inside the LeetCode webpage, this is the *only* file that has access to the LeetCode DOM. 
* It uses `MutationObserver` to aggressively hide the difficulty tags, hints, and acceptance rates on the page. 
* When `background.js` says "Time is up for hints!", it sends a message to `content.js`, and `content.js` reveals the hints on the screen.

---

### The Workflow Summary (How they communicate):
1. User clicks "Start Focus" in the React **Popup (`App.jsx`)**.
2. The Popup sends a message to the **Background Script (`background.js`)**.
3. The Background Script starts the invisible timers and sends a message to the **Content Script (`content.js`)**.
4. The Content Script aggressively hides the LeetCode elements.
5. If the user tries to open ChatGPT in a new tab, the **Background Script** catches it and redirects them back to LeetCode.

---

## 2. The Elevator Pitch (30-40 seconds)

> "For my latest project, I built LeetLock, a Manifest V3 Chrome extension designed to enforce distraction-free algorithmic practice.
>
> When I was preparing for technical interviews, I noticed how easy it was to accidentally peek at difficulty tags and hints on LeetCode, or immediately jump to ChatGPT when I got stuck. So, I built a solution to physically stop myself.
>
> The extension has an interactive React frontend that lets you configure focus timers. Behind the scenes, it uses event-driven **Service Workers** to intercept and block web requests to AI platforms like Claude and ChatGPT. It also injects a Content Script that uses a **MutationObserver** to dynamically strip solution-biasing elements straight out of LeetCode's React DOM.
>
> It tracks all of your analytics locally using Chrome Storage, and it's currently being used by over 30 developers."

---

## 3. Interview Q&A: Chrome Extension Fundamentals

### Q1: What is a Chrome extension and how does it work?
**Answer:**
A Chrome extension is a localized software program built with web technologies that modifies the browser experience. It operates in a highly sandboxed environment and communicates across three primary layers:
1. **The Popup/UI (React):** Isolated from the web page, used for configuration.
2. **The Content Script (`content.js`):** Injected directly into the target webpage (e.g., LeetCode). It has access to the DOM but limited access to Chrome APIs.
3. **The Background Script (`background.js`):** Runs invisibly, has full access to Chrome APIs (Tabs, Alarms, Storage), but cannot touch the DOM.

### Q2: What is Manifest V3 and why did you use it over V2?
**Answer:**
Manifest V3 is the current standard for Chrome extensions. The primary architectural shift in V3 is the forced migration away from persistent background pages toward **event-driven Service Workers**. I used it because it drastically improves browser performance, security, and privacy by ensuring background scripts only consume CPU/RAM when an actual event occurs.

### Q3 & Q4: What is a Service Worker and how does it differ from a regular background script (V2)?
**Answer:**
In Manifest V2, a regular background script was a persistent HTML page that ran invisibly in the background from the moment the browser opened until it closed, consuming memory permanently. A **Service Worker** (in Manifest V3) is a pure, event-driven JavaScript environment without a DOM. It is **spawned on demand** by the browser when an event occurs and is forcefully **terminated** by Chrome after a few seconds of inactivity. 

### Follow-up 1: What OS concept does a Service Worker resemble?
**Answer:**
A Service Worker heavily resembles a **Daemon process** in Unix/Linux or a **Serverless Function (AWS Lambda)**. Like a daemon, it runs quietly in the background, waking up only to handle specific system interrupts or events. Like a serverless function, it is ephemeral (short-lived) and stateless by default.

### Follow-up 2: How does a Service Worker communicate with the content script?
**Answer:**
Because they run in completely different sandboxed environments, they must communicate using Chrome's built-in **Message Passing API**. For example, when an alarm fires, the Service Worker cannot unhide the hint itself because it has no access the DOM. Instead, it sends a message (`chrome.tabs.sendMessage`) to the Content Script, which listens for the message (`chrome.runtime.onMessage.addListener`) and modifies the DOM.

### Follow-up 3: What is IPC? Is Chrome's messaging API a form of IPC?
**Answer:**
**IPC** stands for **Inter-Process Communication**. It is an OS mechanism that allows different, isolated processes to share data and synchronize actions safely. **Yes, Chrome's messaging API is a form of IPC.** In Chrome's multi-process architecture, the Background script, the target webpage (LeetCode), and the Popup all run in completely separate OS processes. `chrome.runtime.sendMessage` acts as the IPC pipe, securely serializing JSON data across these OS-level process boundaries.

### Follow-up 4: What happens to Service Worker state between events?
**Answer:**
Because Service Workers are terminated when idle, **all local variables and state in memory are completely destroyed**. This is exactly why you must use `chrome.storage.local` to save state (like `totals` and `activeFocus`) to a persistent database before it dies, and re-hydrate its state when it wakes up for the next event.

### Follow-up 5: If the Service Worker dies completely, how does it know when to wake up for an alarm?
**Answer:**
The Service Worker *doesn't* know. It is completely dead and purged from RAM. Instead, the **underlying Chrome Browser Engine (written in C++)** takes over. When you register an event listener (like `chrome.alarms.onAlarm.addListener`), Chrome's central internal registry remembers that your extension cares about alarms. While your JavaScript thread is dead, the main Chrome browser keeps a native, low-level timer running. When that native timer hits zero, the main Chrome process literally boots up a fresh, brand-new instance of your Service Worker, injects the event into it, and wakes it up.

### Follow-up 6: After waking up, how does it get to know what the time remaining is?
**Answer:**
That is the genius of the **Chrome Alarms API**—your JavaScript doesn't need to calculate or know the time remaining! If you used `setTimeout()`, your script would have to constantly calculate time remaining, but because your script dies, that math gets erased. When you use `chrome.alarms.create`, you are handing the entire stopwatch off to the Chrome browser. Chrome does the math natively. By the time Chrome wakes your Service Worker up and fires the `onAlarm` event, the time remaining is exactly **zero**.
*(Note: If you want to show a live countdown clock to the user inside your React Popup while the timer is running, the popup can call `chrome.alarms.get()` to receive the absolute timestamp of when the alarm will fire, and simply subtract `Date.now()` to render the remaining seconds).*

---

## 4. Interview Q&A: Network Interception & Architecture

### Q1: How did you intercept network requests in the extension?
**Answer:**
We intercepted navigation events at the **Tab level** using the `chrome.tabs` API, rather than intercepting raw network packets. We attached a listener to `chrome.tabs.onUpdated`. Whenever a user navigates to a new URL, Chrome triggers this event. Our Service Worker reads the new URL, and if it matches a restricted domain while Focus Mode is active, we immediately redirect the tab.

```javascript
// background.js snippet
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (isFocusModeActive && shouldBlockAI && changeInfo.url) {
        const targetUrl = changeInfo.url.toLowerCase();
        
        const isAI = targetUrl.includes("chatgpt.com") || 
                     targetUrl.includes("openai.com") || 
                     targetUrl.includes("claude.ai") || 
                     targetUrl.includes("anthropic.com") || 
                     targetUrl.includes("gemini.google.com") ||
                     targetUrl.includes("perplexity.ai") ||
                     targetUrl.includes("copilot.microsoft.com")||
                     targetUrl.includes("blackbox.ai") ||
                     targetUrl.includes("phind.com");

        if (isAI) {
            // Intercept and redirect the tab back to LeetCode
            chrome.tabs.update(tabId, { url: "https://leetcode.com" });
        }
    }
});
```

### Q2: What is `declarativeNetRequest` vs `webRequest`?
**Answer:**
This is a massive change in Manifest V3. 
*   **`webRequest` (Manifest V2):** Allowed extensions to intercept every single HTTP request, pause the browser synchronously, pass the packet data to the JavaScript extension to decide, and then resume. It was terrible for performance and a massive privacy/security risk.
*   **`declarativeNetRequest` (Manifest V3):** You can no longer intercept and read requests in JavaScript. Instead, you must give Chrome a static JSON file of "Rules". The underlying C++ browser engine evaluates these rules natively. It is blazingly fast and secure because your JavaScript never sees the sensitive packet data. *(Note: We used `chrome.tabs.onUpdated` for simplicity to redirect the whole tab, but DNR is the standard for granular ad-blocking).*

### Q3: How did you identify which requests to block?
**Answer:**
We used simple **Application-Layer String Matching**. When the `changeInfo.url` property comes in from the Tab update event, we convert it to lowercase and use `.includes()` to check it against a hardcoded list of 9 known AI domains (like `chatgpt.com`, `claude.ai`, `gemini.google.com`, `perplexity.ai`, `phind.com`, etc.). 

### Q4: What exactly happens when you "intercept" a request?
**Answer:**
As soon as the user hits "Enter" in the URL bar, the `tabs.onUpdated` event fires before the target website has a chance to fully render. When our Service Worker detects the prohibited URL string, it fires `chrome.tabs.update(tabId, { url: "https://leetcode.com" })`. This overrides the browser's navigation stack, forcefully changing the tab's destination before the AI website can load. 

### Follow-up 1: At what layer of the OSI model does request interception happen?
**Answer:**
This interception happens purely at **Layer 7 (The Application Layer)**. The browser is the application generating the HTTP/HTTPS requests, and our extension is reading the Uniform Resource Locator (URL) string, which is an Application Layer construct. We are not touching Layer 4 (Transport/TCP) or Layer 3 (Network/IP).

### Follow-up 2: What is the CN concept of inspecting packet contents to make decisions?
**Answer:**
The general networking concept is **DPI (Deep Packet Inspection)** or **Application Layer Filtering**. DPI is when network equipment doesn't just look at the IP header (Layer 3), but actually opens up the payload to see what website or protocol is being requested (Layer 7) to make a block/allow decision.

### Follow-up 3: What is a firewall? Is your extension doing something similar at the browser level?
**Answer:**
A **Firewall** is a network security device that monitors and filters incoming and outgoing network traffic based on an organization's security policies. **Yes!** My extension acts precisely as a **Client-Side, Application-Layer Firewall** (specifically, a URL Filter). It enforces a strict "outbound security policy" on the client machine, preventing outbound navigation to unauthorized endpoints.

### Follow-up 4: Could a user bypass your extension by using incognito? 
**Answer:**
**Yes.** By design, Chrome completely isolates extensions from Incognito mode to protect user privacy. If a user opens an Incognito window, LeetLock will not run. 
**How to fix it:** You cannot fix this programmatically. Chrome strictly prohibits extensions from forcing their way into Incognito. The only fix is to prompt the user to manually open `chrome://extensions` and toggle the **"Allow in Incognito"** switch. We could build an onboarding screen that begs the user to turn it on for maximum effectiveness.

---

## 5. Interview Q&A: DOM & MutationObserver Architecture

### Prerequisites: What actually is the DOM?
**DOM** stands for **Document Object Model**. When your browser receives an HTML file from a server (like `<div>Hello</div>`), it parses that HTML string and converts it into a giant, living "Tree" of JavaScript Objects in memory. Each HTML tag becomes a "Node" on this tree. This tree is the DOM. JavaScript (and your extension) can't touch the raw HTML file sitting on LeetCode's server, but it *can* interact with the living DOM Tree in the user's browser memory (adding nodes, removing nodes, changing colors) using methods like `document.querySelector()`.

### Q1: What is a MutationObserver and why did you use it?
**Answer:**
A `MutationObserver` is a native Web API provided by the browser that watches the DOM tree for changes (mutations). If a node is added, removed, or changed, the observer fires a callback function.
I had to use it because LeetCode is a **Single Page Application (SPA)** built with React. In an SPA, when you click "Next Problem," the page does not actually refresh. Instead, React dynamically injects new HTML nodes into the DOM (called React Hydration). If I just used a standard `document.querySelector` on page load to hide the hints, it would work for 1 second, but as soon as React re-rendered the page, the hints would pop right back up. The `MutationObserver` aggressively watches the DOM and instantly re-hides the hints the millisecond React tries to render them.

### Q2: Why not just use `setInterval` to check the DOM every 500ms?
**Answer:**
Using `setInterval` to constantly check if the hint is visible every 500ms is terrible for performance and user experience. 
1. **Performance:** It forces the JavaScript engine to wake up and query the DOM twice a second, indefinitely. This burns CPU cycles and drains laptop batteries.
2. **User Experience:** If React renders the hint at 100ms, and the `setInterval` doesn't fire until 500ms, the user will see the hint flash on their screen for 400 milliseconds before it disappears. The `MutationObserver` fires *synchronously* with the browser's rendering engine, so the element is hidden before the user's eye can even perceive it.

### Q3: What did you observe — the entire document or specific nodes?
**Answer:**
In my implementation, I observed the `document.body` and set `subtree: true` so it watches all children deeply. Because LeetCode's React structure is highly dynamic and deeply nested (and class names change frequently), I needed to guarantee that no matter where React injected the Hint or Difficulty tag, my observer would catch it.

### Follow-up 1: What OS concept is polling (`setInterval`) vs `MutationObserver` analogous to?
**Answer:**
This perfectly mirrors the OS concepts of **Polling vs. Interrupts**. Using `setInterval` is identical to **Polling**: the CPU constantly asks a hardware device, "Do you have data yet?" A `MutationObserver` is identical to a **Hardware Interrupt**: the CPU goes to sleep, and the hardware sends an interrupt signal to wake the CPU up *only* when data is actually ready.

### Follow-up 2: What is "busy waiting" in OS?
**Answer:**
Busy waiting (or spinning) is a synchronization technique in Operating Systems where a process repeatedly checks a condition (like a boolean flag in a `while` loop) until it becomes true. It is highly inefficient because it keeps the CPU at 100% utilization while doing absolutely nothing productive, exactly like a poorly optimized `setInterval`.

### Follow-up 3: What is the alternative in OS?
**Answer:**
The alternative to busy waiting is **Blocking / Sleep / Interrupts**. Instead of spinning in a loop, the OS places the thread into a "Sleep" or "Blocked" state, taking it off the CPU entirely. The OS will then use an **Interrupt** (or a semaphore/mutex wake-up signal) to put the thread back on the CPU only when the condition is met.

### Follow-up 4: What is the performance cost of observing the entire document body for all changes?
**Answer:**
The performance cost is technically O(N) relative to the number of DOM mutations. Because I am observing `document.body` with `subtree: true`, every single time React changes *anything* on the page (even a timer ticking down), my callback fires. *(Self-Awareness Note):* I recognize this is not the most perfectly optimized approach. In a strict enterprise environment, it would be better to find a specific container node (like `<div id="leetcode-app">`) and observe *only* that specific container to reduce the number of observer callbacks triggered. However, modern browser engines optimize MutationObservers heavily in C++, so the performance hit is negligible for the user.

---

## 6. Interview Q&A: React, Vite & Bundling

### Q1: Why React for the extension popup — why not plain HTML/JS?
**Answer:**
To be completely honest, the main reason I chose React for the popup was because I was actively learning React at the time and wanted an excuse to practice building a real-world project with it! Additionally, I knew I wanted to build an analytics dashboard to show users their daily focus time. Building interactive graphs in plain HTML/JS is a massive headache, but the React ecosystem has incredible charting libraries like **Recharts**. Using React allowed me to just `npm install recharts` and instantly drop a beautiful data visualization graph into my popup with barely any configuration.

### Q2: What is Vite and why over Create React App (CRA)?
**Answer:**
Vite is a modern, next-generation build tool and development server. **Create React App (CRA)** is heavily outdated and uses Webpack under the hood. Webpack is a "bundler-first" tool—it has to crawl, build, and bundle your *entire* application before it can even start the local server, which becomes incredibly slow as the app grows. **Vite** is "unbundled during development." It serves your source code over native ES Modules (ESM) directly to the browser, so the server starts instantly (in milliseconds). For production, it uses highly-optimized **Rollup**.

### Q3: What is Rollup manual chunking — explain what you did.
**Answer:**
When Vite builds for production, it uses a bundler called **Rollup**. By default, Rollup takes all of your code (React, Recharts, and your custom UI) and smashes it into one giant JavaScript file. I customized `vite.config.js` to use `manualChunks`. I explicitly told Rollup to split the code into separate physical files: 
1. A **`vendor`** chunk (containing `react` and `react-dom`).
2. A **`recharts`** chunk.
3. The remaining chunk for my actual custom extension code.

### Follow-up 1: What is code splitting?
**Answer:**
Code splitting is the practice of breaking down one massive, monolithic JavaScript bundle into smaller, independent files (chunks). This ensures the browser only downloads, parses, and executes the exact code it needs right now.

### Follow-up 2: Why does separating chunks improve caching?
**Answer:**
Browsers cache files based on their names (which include a hash, like `vendor-a1b2.js`). Vendor libraries like React never change unless you upgrade them, but your custom code changes constantly. If everything is bundled into one file, fixing a tiny CSS typo changes the hash of the massive file, forcing the user to re-download React all over again. By isolating chunks, the heavy `vendor` and `recharts` chunks stay permanently cached, and the browser only downloads your tiny updated code.

### Follow-up 3: What is tree shaking?
**Answer:**
Tree shaking is a form of **Dead Code Elimination**. When the bundler analyzes your code's import/export statements, it figures out exactly which functions or modules are actually being used. Any code from a library that you imported but *never actually called* gets completely deleted (shaken off the tree) before the final build, reducing file size.

### Follow-up 4: What is the difference between a bundle and a chunk?
**Answer:**
*   **Bundle**: The abstract result of the entire build process (what happens when you run `npm run build`).
*   **Chunk**: The actual, physical JavaScript file that gets spit out. One bundle is typically split into multiple chunks (e.g., `main.js`, `vendor.js`).

---

## 7. Interview Q&A: Chrome Storage & Analytics

### Q1: Why `chrome.storage.local` instead of `localStorage`?
**Answer:**
There are two major reasons:
1. **Architecture limitations:** `localStorage` is tightly coupled to the browser `window` object (the DOM) of a specific website. Because Manifest V3 Service Workers run in a pure, invisible background thread without a DOM, `window.localStorage` is literally `undefined` inside `background.js`.
2. **Shared State:** `localStorage` is isolated per website (LeetCode's localStorage cannot be read by the Extension Popup). `chrome.storage.local` is an extension-scoped database. It acts as a single, global source of truth that the React Popup, the Background Script, and the Content Script can all read from and write to simultaneously.

### Q2: What data did you store and what was the schema?
**Answer:**
I kept the schema lightweight and NoSQL-like. I stored two primary objects in the database:
1.  **`totals`:** A global object tracking all-time usage: `{ sessions: number, focusTime: number, solved: number, aiBlocked: number }`.
2.  **`dailyStats`:** A dictionary (hash map) where the keys are ISO Date strings (e.g., `"2024-10-25"`) and the values are the stats for that specific day: `{ focusTime: number, aiBlocked: number }`. This schema made it incredibly easy to parse the data into an array for time-series graphing.

### Q3: How did you render the analytics — what charts?
**Answer:**
I used **Recharts**, which is a composable charting library built specifically for React components. When the user opens the popup, a `useEffect` hook fetches the `dailyStats` object from `chrome.storage.local`, converts the dictionary into an array of objects, and passes it directly into a `<BarChart>` or `<AreaChart>` component to render a beautiful time-series graph showing how their focus time and AI cheating attempts fluctuated over the week.

### Follow-up 1: What is the storage limit of `chrome.storage.local`?
**Answer:**
By default, Chrome imposes a strict **5MB** physical storage limit. However, if your extension genuinely needs to store massive amounts of data, you can add the `"unlimitedStorage"` permission to the `manifest.json` to bypass this quota.

### Follow-up 2: Is `chrome.storage.local` synchronous or asynchronous?
**Answer:**
It is **Asynchronous**. Unlike `localStorage` (which is synchronous and blocks the main UI thread while it reads/writes to the hard drive), `chrome.storage` operations return a **Promise**. This is critical for performance because it allows the browser to continue executing other JavaScript while waiting for the hard drive to spin up and retrieve the data.

### Follow-up 3: What happens to the data if the user uninstalls the extension?
**Answer:**
It is **permanently deleted**. Chrome wipes the extension's local sandbox upon uninstall. *(How to fix it):* If we wanted data persistence across uninstalls, we would have to spin up a backend server (e.g., Node.js + Postgres), require the user to log in via OAuth, and sync their local stats to our backend database using the `fetch()` API.

### Follow-up 4: What is `chrome.storage.sync` vs `chrome.storage.local`?
**Answer:**
*   **`chrome.storage.local`**: Data is saved locally on the physical hard drive of the current device. Limit: 5MB.
*   **`chrome.storage.sync`**: Data is automatically synced over the internet to any Chrome browser where the user is logged into their Google account. Limit: **100KB** total (and only 8KB per item). You use `sync` for tiny things like user preferences, and `local` for heavy things like analytics data.

---

## 8. Interview Q&A: Chrome Alarms & OS Scheduling

### Q1: What are Chrome Alarms and why did you use them?
**Answer:**
Chrome Alarms are an API that allows you to schedule code to run periodically or at a specific time in the future. I used them because Manifest V3 Service Workers are strictly ephemeral—they automatically go to sleep (terminate) after a few seconds of inactivity to save RAM. If I had used standard JavaScript `setTimeout` or `setInterval` to handle the 30-minute focus timers, those timers would be instantly destroyed and stop ticking as soon as the Service Worker went to sleep. The `chrome.alarms` API hands the timer off to the underlying Chrome browser engine, which persists the countdown natively and forcefully wakes the Service Worker back up exactly when the alarm fires.

### Q2: What is the minimum interval for Chrome Alarms?
**Answer:**
To prevent extensions from abusing the user's CPU and battery, Chrome enforces a strict minimum interval of **1 minute** for alarms in production. *(Note: During local development of an unpacked extension, Chrome temporarily lifts this restriction so you can test your timers faster without waiting a full minute).*

### Follow-up 1: What OS concept is this similar to?
**Answer:**
This is completely analogous to OS **Scheduled Tasks** or **Cron Jobs**. The OS Scheduler is responsible for waking up a suspended process or executing a script at specified future intervals, just like the Chrome Engine wakes up the Service Worker.

### Follow-up 2: What is a cron job?
**Answer:**
A cron job is a time-based job scheduler found in Unix/Linux operating systems. It runs as a background daemon (`crond`) and allows users to schedule scripts, commands, or software to run automatically at fixed times, dates, or intervals.

### Follow-up 3: What is the difference between a timer and an alarm in an OS context?
**Answer:**
*   A **Timer** simply measures elapsed duration (like a stopwatch counting how long a process has been running).
*   An **Alarm** is an interrupt-driven mechanism. It is set for a specific absolute or relative future time. When an OS alarm triggers, the OS generates a hardware or software interrupt signal (like `SIGALRM` in Unix) that forcefully interrupts the CPU to wake a process from a sleeping state so it can handle the event.

---

## Master List of Chrome APIs Used in LeetLock

1.  **`chrome.runtime.onMessage` & `chrome.tabs.sendMessage`**
    *   **Purpose:** Inter-Process Communication (IPC). Used to securely pass JSON messages between the isolated React Popup, the Background Service Worker, and the LeetCode Content Script.
2.  **`chrome.alarms`**
    *   **Purpose:** Background Scheduling. Used to schedule the unhiding of hints/tags natively so the countdowns survive Service Worker termination.
3.  **`chrome.storage.local`**
    *   **Purpose:** Database. Used as a persistent NoSQL document store for user timer settings and lifetime analytics data (focus time, AI block counts).
4.  **`chrome.tabs.onUpdated`**
    *   **Purpose:** Event Listener. Used to passively monitor navigation events across the browser to detect when a user attempts to visit ChatGPT or Claude.
5.  **`chrome.tabs.update`**
    *   **Purpose:** Navigation Control. Used to forcefully override the browser's navigation stack and redirect the cheating tab back to LeetCode.
6.  **`chrome.tabs.query`**
    *   **Purpose:** Tab Discovery. Used to query the browser for all currently open LeetCode tabs so the background script can broadcast the `HIDE_ALL` command to every open LeetCode window simultaneously.
