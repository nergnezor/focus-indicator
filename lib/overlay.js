"use strict";

globalThis.spatnav = globalThis.spatnav || {};

const OVERLAY_STYLE = `
    #focusIndicatorOverlay {
        --fi-bg: 255 255 255;
        --fi-ink: oklch(from rgb(var(--fi-bg)) calc(1 - l) min(c, 0.08) h);
        container-type: size;
        background: radial-gradient(
            circle,
            color-mix(in oklch, var(--fi-ink) 20%, transparent) 0%,
            color-mix(in oklch, var(--fi-ink) 6%, transparent) 48%,
            transparent 78%
        );
    }
    .spatnav-wave {
        position: absolute;
        left: 50%;
        top: 50%;
        width: max(150cqw, 150cqh);
        height: max(150cqw, 150cqh);
        border-radius: 50%;
        pointer-events: none;
        background: radial-gradient(
            circle,
            color-mix(in oklch, var(--fi-ink) 62%, transparent) 0%,
            color-mix(in oklch, var(--fi-ink) 24%, transparent) 38%,
            transparent 70%
        );
        animation: spatnav-wave 1.8s cubic-bezier(0.33, 1, 0.68, 1) infinite;
    }
    @keyframes spatnav-wave {
        0% {
            transform: translate(-50%, -50%) scale(0.16);
            opacity: 0;
        }
        32% {
            opacity: 1;
        }
        100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0;
        }
    }
`;

spatnav.createOverlay = function createOverlay(session) {
    const host = document.createElement("div");
    host.id = "focusIndicatorShadowHost";
    document.getElementById(host.id)?.remove();
    document.documentElement.appendChild(host);

    const shadow = host.attachShadow({ mode: "closed" });
    const style = document.createElement("style");
    style.textContent = OVERLAY_STYLE;
    const marked = document.createElement("div");
    marked.id = "focusIndicatorOverlay";
    const wave = document.createElement("span");
    wave.className = "spatnav-wave";
    marked.append(wave);
    shadow.append(style, marked);

    session.host = host;
    session.marked = marked;
    spatnav.setStyles(session, marked, {
        position: "fixed",
        visibility: "hidden",
        margin: "0",
        padding: "0",
        border: "none",
        outline: "none",
        overflow: "hidden",
        "pointer-events": "none",
        "z-index": "2147483647",
        transition: "none",
    });
};

spatnav.paintMarked = function paintMarked(session, element, animate) {
    if (!spatnav.isMarkableFocus(element)) {
        session.hasMarked = false;
        spatnav.setStyles(session, session.marked, { visibility: "hidden", transition: "none" });
        return;
    }
    if (!session.host.isConnected) {
        document.documentElement.appendChild(session.host);
    }
    spatnav.setStyles(session, session.marked, { "--fi-bg": surfaceColor(element) });
    const rect = element.getBoundingClientRect();
    const radius = getComputedStyle(element).borderRadius;
    const glide = animate && session.hasMarked;
    session.hasMarked = true;
    session.lastRadius = radius;
    session.lastRect = spatnav.boxOf(rect);
    const geometry = {
        ...session.lastRect,
        visibility: "visible",
        "border-radius": spatnav.cornerRadius(rect, radius),
    };
    const motion = glide
        ? "top 0.27s ease, left 0.27s ease, width 0.27s ease, height 0.27s ease, border-radius 0.27s ease"
        : "none";
    if (!glide) {
        spatnav.setStyles(session, session.marked, { transition: motion, ...geometry });
        return;
    }
    spatnav.setStyles(session, session.marked, { transition: motion });
    requestAnimationFrame(() => spatnav.setStyles(session, session.marked, geometry));
};

spatnav.rectChanged = function rectChanged(session, element) {
    if (!spatnav.isMarkableFocus(element)) {
        spatnav.setStyles(session, session.marked, { visibility: "hidden" });
        return false;
    }
    const radius = getComputedStyle(element).borderRadius;
    if (session.lastRadius && radius !== session.lastRadius) {
        return true;
    }
    const next = spatnav.boxOf(element.getBoundingClientRect());
    if (!session.lastRect) {
        return true;
    }
    return Object.entries(next).some(([key, value]) => session.lastRect[key] !== value);
};

function surfaceColor(element) {
    const { r, g, b } = compositedBackground(element);
    return `${Math.round(r)} ${Math.round(g)} ${Math.round(b)}`;
}

function compositedBackground(element) {
    const layers = [];
    let node = element;
    while (node && node.nodeType === 1) {
        const layer = paintedLayer(getComputedStyle(node));
        if (layer && layer.a > 0) {
            layers.push(layer);
            if (layer.a >= 1) {
                break;
            }
        }
        node = node.parentElement || (node.getRootNode() instanceof ShadowRoot ? node.getRootNode().host : null);
    }
    let r = 255;
    let g = 255;
    let b = 255;
    for (let i = layers.length - 1; i >= 0; i--) {
        const layer = layers[i];
        r = layer.r * layer.a + r * (1 - layer.a);
        g = layer.g * layer.a + g * (1 - layer.a);
        b = layer.b * layer.a + b * (1 - layer.a);
    }
    return { r, g, b };
}

function paintedLayer(style) {
    const image = style.backgroundImage;
    if (image && image.includes("gradient")) {
        const stops = [];
        for (const match of image.matchAll(/rgba?\([^)]+\)/gi)) {
            const color = parseRgb(match[0]);
            if (color && color.a > 0.2) {
                stops.push(color);
            }
        }
        if (stops.length) {
            const count = stops.length;
            return {
                r: stops.reduce((sum, color) => sum + color.r, 0) / count,
                g: stops.reduce((sum, color) => sum + color.g, 0) / count,
                b: stops.reduce((sum, color) => sum + color.b, 0) / count,
                a: 1,
            };
        }
    }
    return parseRgb(style.backgroundColor);
}

function parseRgb(value) {
    if (!value || value === "transparent") {
        return null;
    }
    const match = value.match(/rgba?\(([^)]+)\)/i);
    if (!match) {
        return null;
    }
    const [channels, alphaPart] = match[1].split("/");
    const nums = channels
        .trim()
        .split(/[\s,]+/)
        .map(Number);
    if (nums.length < 3 || nums.slice(0, 3).some((n) => Number.isNaN(n))) {
        return null;
    }
    let alpha = 1;
    if (alphaPart !== undefined) {
        const raw = alphaPart.trim();
        alpha = raw.endsWith("%") ? parseFloat(raw) / 100 : Number(raw);
    } else if (nums.length >= 4 && !Number.isNaN(nums[3])) {
        alpha = nums[3];
    }
    if (Number.isNaN(alpha)) {
        alpha = 1;
    }
    return { r: nums[0], g: nums[1], b: nums[2], a: alpha };
}
