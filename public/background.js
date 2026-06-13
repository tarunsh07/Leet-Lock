
let isFocusModeActive = false;
let shouldBlockAI = false;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

    if (request.action === "START_FOCUS") {
        isFocusModeActive = true;
        shouldBlockAI = request.blockAI; 
        chrome.storage.local.set({ activeFocus: { difficulty: true, tags: true, hints: true, stats: true } });

        const timers = request.timers;

        chrome.tabs.query({ url: "*://leetcode.com/*" }, (tabs) => {
            tabs.forEach(tab => chrome.tabs.sendMessage(tab.id, { action: "HIDE_ALL" }));
        });

        if (Number(timers.difficulty) > 0) chrome.alarms.create("UNHIDE_DIFFICULTY", { delayInMinutes: Number(timers.difficulty) });
        if (Number(timers.tags) > 0) chrome.alarms.create("UNHIDE_TAGS", { delayInMinutes: Number(timers.tags) });
        if (Number(timers.hints) > 0) chrome.alarms.create("UNHIDE_HINTS", { delayInMinutes: Number(timers.hints) });
        if (Number(timers.acceptanceRate) > 0) chrome.alarms.create("UNHIDE_STATS", { delayInMinutes: Number(timers.acceptanceRate) });
    }
    else if (request.action === "END_FOCUS") {
        isFocusModeActive = false;
        chrome.storage.local.set({ activeFocus: { difficulty: false, tags: false, hints: false, stats: false } });

        chrome.alarms.clearAll();

        chrome.tabs.query({ url: "*://leetcode.com/*" }, (tabs) => {
            tabs.forEach(tab => chrome.tabs.sendMessage(tab.id, { action: "UNHIDE_ALL" }));
        });
    }
});

chrome.alarms.onAlarm.addListener((alarm) => {
    chrome.storage.local.get(['activeFocus']).then((result) => {
        let activeFocus = result.activeFocus || { difficulty: true, tags: true, hints: true, stats: true };
        if (alarm.name === "UNHIDE_DIFFICULTY") activeFocus.difficulty = false;
        if (alarm.name === "UNHIDE_TAGS") activeFocus.tags = false;
        if (alarm.name === "UNHIDE_HINTS") activeFocus.hints = false;
        if (alarm.name === "UNHIDE_STATS") activeFocus.stats = false;
        chrome.storage.local.set({ activeFocus: activeFocus });
    });

    chrome.tabs.query({ url: "*://leetcode.com/*" }, (tabs) => {
        tabs.forEach(tab => chrome.tabs.sendMessage(tab.id, { action: alarm.name }));
    });
});

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
            console.log("AI Cheating Attempt Blocked!");

            chrome.tabs.update(tabId, { url: "https://leetcode.com" });

            chrome.storage.local.get(['totals', 'dailyStats']).then((result) => {
                let currentTotals = result.totals || { sessions: 0, focusTime: 0, solved: 0, aiBlocked: 0 };
                let dailyStats = result.dailyStats || {};

                currentTotals.aiBlocked += 1;

                const todayString = new Date().toISOString().split('T')[0];
                if (dailyStats[todayString] === undefined) {
                    dailyStats[todayString] = { focusTime: 0, aiBlocked: 0 };
                }
                dailyStats[todayString].aiBlocked += 1;

                chrome.storage.local.set({ totals: currentTotals, dailyStats: dailyStats });
            });
        }
    }
});
