console.log("🚀 LeetCode Focus Mode: Initializing hider...");

let activeFocus = {
    difficulty: false,
    tags: false,
    hints: false,
    stats: false
};

function hideDifficulty() {
    const difficultyElements = document.querySelectorAll(
        '.text-difficulty-easy, .text-difficulty-medium, .text-difficulty-hard'
    );

    difficultyElements.forEach(el => {
        el.classList.add('lf-hidden-difficulty'); 
        el.style.display = 'none';
        el.style.opacity = '0';
    });
}

function hideSectionByText(searchText) {
    const allDivs = document.querySelectorAll('div');

    for (const div of allDivs) {
        if (div.textContent.trim().startsWith(searchText) && div.children.length === 0) {
            let parent = div.parentElement;
            if (parent !== null) {
                let grandparent = parent.parentElement;
                if (grandparent !== null) {
                    grandparent.classList.add(`lf-hidden-${searchText.replace(/\s+/g, '-')}`);
                    grandparent.style.display = 'none';

                    let sibling = grandparent.nextElementSibling;
                    if (sibling !== null) {
                        sibling.classList.add(`lf-hidden-${searchText.replace(/\s+/g, '-')}`);
                        sibling.style.display = 'none';
                    }
                }
            }
        }
    }
}

function hideStat(searchText) {
    const allDivs = document.querySelectorAll('div');
    for (const div of allDivs) {
        if (div.textContent.trim() === searchText && div.children.length === 0) {
            let parent = div.parentElement;
            if (parent) {
                parent.classList.add('lf-hidden-stats');
                parent.style.display = 'none';
            }
        }
    }
}

function hideActionButtons() {
    const icons = document.querySelectorAll('svg[data-icon="comment"], svg.fa-comment, svg.fa-thumbs-down');
    icons.forEach(icon => {
        let btn = icon.closest('button') || icon.closest('a');
        if (btn) {
            btn.classList.add('lf-hidden-buttons');
            btn.style.display = 'none';
        }
    });
}

function executeHiding() {
    if (activeFocus.difficulty) hideDifficulty();

    if (activeFocus.tags) {
        hideSectionByText("Topics");
        hideSectionByText("Related Topics"); 
        hideSectionByText("Discussion");
    }

    if (activeFocus.hints) {
        for (let i = 1; i <= 15; i++) {
            hideSectionByText(`Hint ${i}`);
        }
    }

    if (activeFocus.stats) {
        hideStat("Accepted");
        hideStat("Acceptance Rate");
        hideActionButtons();
    }
}

function unhideElements(selector) {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {

        el.style.display = ''; 
        el.style.opacity = '1';
    });
}

function createFocusBadge() {

    if (document.getElementById('lf-focus-badge')) return;

    const badge = document.createElement('div');
    badge.id = 'lf-focus-badge';
    badge.textContent = '🔥 Focus Mode Active';

    badge.style.position = 'fixed';
    badge.style.bottom = '20px';
    badge.style.right = '20px';
    badge.style.backgroundColor = '#9B97B8'; 
    badge.style.color = '#FBFAFF'; 
    badge.style.padding = '8px 16px';
    badge.style.borderRadius = '8px';
    badge.style.fontFamily = 'sans-serif';
    badge.style.fontWeight = 'bold';
    badge.style.zIndex = '99999'; 
    badge.style.boxShadow = '0 4px 6px rgba(0,0,0,0.3)';

    document.body.appendChild(badge);
}

function checkAndRemoveBadge() {
    if (!activeFocus.difficulty && !activeFocus.tags && !activeFocus.hints && !activeFocus.stats) {
        const badge = document.getElementById('lf-focus-badge');
        if (badge) badge.remove();
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("LeetCode Focus Mode received message:", request.action);

    if (request.action === "HIDE_ALL") {
        activeFocus.difficulty = true;
        activeFocus.tags = true;
        activeFocus.hints = true;
        activeFocus.stats = true;
        executeHiding(); 

        createFocusBadge();
    } 
    else if (request.action === "UNHIDE_DIFFICULTY") {
        activeFocus.difficulty = false;
        unhideElements('.lf-hidden-difficulty');
        checkAndRemoveBadge();
    } 
    else if (request.action === "UNHIDE_TAGS") {
        activeFocus.tags = false;
        unhideElements('.lf-hidden-Topics, .lf-hidden-Related-Topics, .lf-hidden-Discussion');
        checkAndRemoveBadge();
    } 
    else if (request.action === "UNHIDE_HINTS") {
        activeFocus.hints = false;
        unhideElements('.lf-hidden-Hint-1, .lf-hidden-Hint-2, .lf-hidden-Hint-3, .lf-hidden-Hint-4, .lf-hidden-Hint-5');
        checkAndRemoveBadge();
    } 
    else if (request.action === "UNHIDE_STATS") {
        activeFocus.stats = false;
        unhideElements('.lf-hidden-stats, .lf-hidden-buttons');
        checkAndRemoveBadge();
    }
    else if (request.action === "UNHIDE_ALL") {
        activeFocus.difficulty = false;
        activeFocus.tags = false;
        activeFocus.hints = false;
        activeFocus.stats = false;

        unhideElements('[class*="lf-hidden-"]');

        checkAndRemoveBadge();
    }
});

let detectedDifficulty = null;

const observer = new MutationObserver(() => {

    let diff = null;
    if (document.querySelector('.text-difficulty-easy')) diff = 'Easy';
    else if (document.querySelector('.text-difficulty-medium')) diff = 'Medium';
    else if (document.querySelector('.text-difficulty-hard')) diff = 'Hard';

    if (diff && diff !== detectedDifficulty) {
        detectedDifficulty = diff;
        if (window.chrome && chrome.storage) {
            chrome.storage.local.set({ currentProblemDifficulty: detectedDifficulty });
        }
    }

    if (activeFocus.difficulty || activeFocus.tags || activeFocus.hints || activeFocus.stats) {
        executeHiding();
        createFocusBadge();
    }
});

observer.observe(document.body, { childList: true, subtree: true });

// Check state on load (for page reloads)
chrome.storage.local.get(['activeFocus']).then((result) => {
    if (result.activeFocus) {
        activeFocus = result.activeFocus;
        executeHiding();
        if (activeFocus.difficulty || activeFocus.tags || activeFocus.hints || activeFocus.stats) {
            createFocusBadge();
        }
    }
});
