inject();

async function inject() {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
        if (!tab.id) {
            continue;
        }
        const target = { tabId: tab.id, allFrames: true };
        await chrome.scripting
            .executeScript({
                target,
                func: () => {
                    globalThis.__spatnavMarksStop?.();
                },
            })
            .catch(() => {});
        await chrome.scripting
            .executeScript({
                target,
                files: [
                    "lib/geometry.js",
                    "lib/styles.js",
                    "lib/shadow.js",
                    "lib/overlay.js",
                    "lib/runtime.js",
                    "content.js",
                ],
            })
            .catch(() => {});
    }
}
