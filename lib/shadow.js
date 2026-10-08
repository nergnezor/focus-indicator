"use strict";

globalThis.spatnav = globalThis.spatnav || {};

spatnav.shadowOf = function shadowOf(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) {
        return null;
    }
    try {
        if (chrome.dom?.openOrClosedShadowRoot) {
            return chrome.dom.openOrClosedShadowRoot(element);
        }
    } catch (err) {
        // Closed roots stay unreachable without the extension API.
    }
    return element.shadowRoot || null;
};
