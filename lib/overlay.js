"use strict";

globalThis.spatnav = globalThis.spatnav || {};

const OVERLAY_STYLE = `
    #focusIndicatorOverlay {
        position: absolute;
        inset: 0;
        container-type: size;
        overflow: hidden;
        pointer-events: none;
    }
    .spatnav-wave {
        position: absolute;
        left: 50%;
        top: 50%;
        width: max(160cqw, 160cqh);
        height: max(160cqw, 160cqh);
        border-radius: 50%;
        pointer-events: none;
        animation:
            spatnav-grow 3.2s linear infinite,
            spatnav-stack 3.2s step-end infinite;
    }
    .spatnav-wave.white {
        background: radial-gradient(
            circle,
            rgba(255, 255, 255, 0.55) 0%,
            rgba(255, 255, 255, 0.55) 70%,
            rgba(255, 255, 255, 0) 71%
        );
    }
    .spatnav-wave.black {
        background: radial-gradient(
            circle,
            rgba(0, 0, 0, 0.28) 0%,
            rgba(0, 0, 0, 0.28) 70%,
            rgba(0, 0, 0, 0) 71%
        );
        animation-delay: -1.6s, -1.6s;
    }
    @keyframes spatnav-grow {
        0% {
            transform: translate(-50%, -50%) scale(0);
            filter: blur(0px);
        }
        12% {
            filter: blur(0px);
        }
        50%, 100% {
            transform: translate(-50%, -50%) scale(1);
            filter: blur(56px);
        }
    }
    @keyframes spatnav-stack {
        0% {
            z-index: 2;
        }
        50%, 100% {
            z-index: 1;
        }
    }
`;

spatnav.createOverlay = function createOverlay(session) {
    const host = document.createElement("div");
    host.id = "focusIndicatorShadowHost";
    document.getElementById(host.id)?.remove();

    const shadow = host.attachShadow({ mode: "closed" });
    const style = document.createElement("style");
    style.textContent = OVERLAY_STYLE;
    const marked = document.createElement("div");
    marked.id = "focusIndicatorOverlay";
    for (const tone of ["white", "black"]) {
        const wave = document.createElement("span");
        wave.className = `spatnav-wave ${tone}`;
        marked.append(wave);
    }
    shadow.append(style, marked);

    session.host = host;
    session.marked = marked;
    spatnav.setStyles(session, host, {
        position: "absolute",
        inset: "0",
        margin: "0",
        padding: "0",
        border: "none",
        overflow: "hidden",
        "pointer-events": "none",
        "z-index": "-1",
        background: "none",
        visibility: "hidden",
    });
};

spatnav.releaseLayer = function releaseLayer(session) {
    if (session.anchor) {
        spatnav.restoreStyles(session.anchor, ["isolation", "position"]);
        session.anchor = null;
    }
    session.host.remove();
    spatnav.setStyles(session, session.host, { visibility: "hidden" });
};

spatnav.paintMarked = function paintMarked(session, element) {
    if (!spatnav.isMarkableFocus(element) || !canHoldLayer(element)) {
        session.hasMarked = false;
        spatnav.releaseLayer(session);
        return;
    }
    if (session.anchor !== element) {
        spatnav.releaseLayer(session);
        const styles = { isolation: "isolate" };
        if (getComputedStyle(element).position === "static") {
            styles.position = "relative";
        }
        spatnav.setStyles(session, element, styles);
        element.appendChild(session.host);
        session.anchor = element;
    }
    const radius = getComputedStyle(element).borderRadius;
    session.hasMarked = true;
    session.lastRadius = radius;
    spatnav.setStyles(session, session.host, {
        visibility: "visible",
        "border-radius": spatnav.cornerRadius(element.getBoundingClientRect(), radius),
    });
};

function canHoldLayer(element) {
    return ![
        "INPUT",
        "TEXTAREA",
        "IMG",
        "SELECT",
        "VIDEO",
        "CANVAS",
        "BR",
        "WBR",
    ].includes(element.tagName);
}

spatnav.rectChanged = function rectChanged(session, element) {
    if (!session.anchor || session.anchor !== element) {
        return false;
    }
    return getComputedStyle(element).borderRadius !== session.lastRadius;
};

