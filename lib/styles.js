"use strict";

globalThis.spatnav = globalThis.spatnav || {};

spatnav.setStyles = function setStyles(session, element, styles) {
    if (!element?.style) {
        return;
    }
    for (const [property, value] of Object.entries(styles)) {
        if (element !== session.host && element !== session.marked) {
            const key = `data-original-${property}`;
            if (element.getAttribute(key) === null) {
                element.setAttribute(key, element.style.getPropertyValue(property));
            }
        }
        element.style.setProperty(property, value, "important");
    }
};

spatnav.restoreStyles = function restoreStyles(element, properties) {
    if (!element?.style) {
        return;
    }
    for (const property of properties) {
        const key = `data-original-${property}`;
        const original = element.getAttribute(key);
        if (original === null) {
            continue;
        }
        if (original) {
            element.style.setProperty(property, original);
        } else {
            element.style.removeProperty(property);
        }
        element.removeAttribute(key);
    }
};
