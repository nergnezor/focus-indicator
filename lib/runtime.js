"use strict";

globalThis.spatnav = globalThis.spatnav || {};

spatnav.start = function start(session) {
    if (session.running) {
        return;
    }
    session.running = true;
    document.addEventListener("focusin", session.onFocusIn);
    document.addEventListener("focusout", session.onFocusOut);
    document.addEventListener("shadow-focusin", session.onShadowFocusIn);
    document.addEventListener("shadow-focusout", session.onShadowFocusOut);
    window.addEventListener("message", session.onWindowMessage);
    session.onFocusIn({ target: document.activeElement });
    window.focusIndicatorRAF = requestAnimationFrame(session.tick);
};

spatnav.stop = function stop(session) {
    session.running = false;
    document.removeEventListener("focusin", session.onFocusIn);
    document.removeEventListener("focusout", session.onFocusOut);
    document.removeEventListener("shadow-focusin", session.onShadowFocusIn);
    document.removeEventListener("shadow-focusout", session.onShadowFocusOut);
    window.removeEventListener("message", session.onWindowMessage);
    for (const root of session.shadowListeners.keys()) {
        const handlers = session.shadowListeners.get(root);
        root.removeEventListener("focusin", handlers.focusIn);
        root.removeEventListener("focusout", handlers.focusOut);
    }
    session.shadowListeners.clear();
    cancelAnimationFrame(window.focusIndicatorRAF);
    session.host?.remove();
};

spatnav.bindSession = function bindSession(session) {
    session.onWindowMessage = function onWindowMessage(event) {
        if (event.data?.type !== "CLEANUP_FOCUS_INDICATOR") {
            return;
        }
        spatnav.stop(session);
    };

    session.tick = function tick() {
        if (!session.running) {
            return;
        }
        try {
            const focused = spatnav.deepestFocus(session, document.activeElement);
            if (spatnav.rectChanged(session, focused)) {
                spatnav.paintMarked(session, focused);
            }
            window.focusIndicatorRAF = requestAnimationFrame(session.tick);
        } catch (err) {
            if (!String(err?.message).includes("Extension context invalidated")) {
                console.error(err);
            }
        }
    };

    session.onFocusIn = function onFocusIn(event) {
        const target = event?.target;
        if (!spatnav.isMarkableFocus(target)) {
            session.hasMarked = false;
            spatnav.setStyles(session, session.marked, { visibility: "hidden", transition: "none" });
            return;
        }
        const root = spatnav.shadowOf(target);
        if (root && session.seenShadows.has(root)) {
            return;
        }
        const focused = spatnav.deepestFocus(session, target);
        spatnav.paintMarked(session, focused, true);
    };

    session.onFocusOut = function onFocusOut(event) {
        const target = event.target;
        const root = spatnav.shadowOf(target);
        if (root && session.seenShadows.has(root)) {
            return;
        }
        spatnav.restoreStyles(target, ["outline"]);
    };

    session.onShadowFocusIn = function onShadowFocusIn(event) {
        session.onFocusIn(event.detail);
    };

    session.onShadowFocusOut = function onShadowFocusOut(event) {
        session.onFocusOut(event.detail);
    };
};

spatnav.deepestFocus = function deepestFocus(session, element) {
    if (!element || element === document) {
        return document.documentElement;
    }
    const root = spatnav.shadowOf(element);
    if (!root) {
        return element;
    }
    watchShadow(session, root);
    return root.activeElement ? spatnav.deepestFocus(session, root.activeElement) : element;
};

function watchShadow(session, root) {
    if (session.seenShadows.has(root)) {
        return;
    }
    session.seenShadows.add(root);
    const focusIn = function (event) {
        root.host.dispatchEvent(
            new CustomEvent("shadow-focusin", {
                bubbles: true,
                composed: true,
                detail: event,
            }),
        );
    };
    const focusOut = function (event) {
        root.host.dispatchEvent(
            new CustomEvent("shadow-focusout", {
                bubbles: true,
                composed: true,
                detail: event,
            }),
        );
    };
    root.addEventListener("focusin", focusIn);
    root.addEventListener("focusout", focusOut);
    session.shadowListeners.set(root, { focusIn, focusOut });
}
