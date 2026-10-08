"use strict";

globalThis.__spatnavMarksStop?.();

const session = {
    shadowListeners: new Map(),
    seenShadows: new WeakSet(),
    running: false,
    lastRect: null,
    lastRadius: null,
    hasMarked: false,
};

spatnav.createOverlay(session);

spatnav.bindSession(session);
globalThis.__spatnavMarksStop = function stopMarks() {
    spatnav.stop(session);
};
spatnav.start(session);
