"use strict";

globalThis.spatnav = globalThis.spatnav || {};

spatnav.cornerRadius = function cornerRadius(rect, computedRadius) {
    const value = String(computedRadius || "").trim();
    const first = parseFloat(value);
    if (value && Number.isFinite(first) && first > 0) {
        return value;
    }
    const cap = Math.min(rect.width, rect.height) / 2;
    if (!(cap > 0)) {
        return "0px";
    }
    return `${Math.min(10, cap)}px`;
};

spatnav.boxOf = function boxOf(rect) {
    return {
        top: `${Math.round(rect.top)}px`,
        left: `${Math.round(rect.left)}px`,
        width: `${Math.round(rect.width)}px`,
        height: `${Math.round(rect.height)}px`,
    };
};

spatnav.isMarkableFocus = function isMarkableFocus(element) {
    return (
        element &&
        element !== document.body &&
        element !== document.documentElement &&
        element.tagName !== "IFRAME"
    );
};
