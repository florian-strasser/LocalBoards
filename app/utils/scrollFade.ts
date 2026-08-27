import { animate, motionValue } from "motion-v";

// A scrolling area's edges fade out while there is something past them, so a
// card is never chopped in half by the edge of its list. The same idea as Nuxt
// UI's `useScrollShadow`: a `mask-image` whose ends are transparent.
//
// Two differences. The fade is not a fixed height that switches on — it grows
// with the travel, zero when the list is resting against an end and opening to
// `max` over the first `max` pixels away from it, so the edge softens as you
// pull away from it rather than snapping into place.
//
// And the mask goes on the *contents*, not on the scroll container. Masking the
// container fades everything it draws, the scrollbar included, which left the
// scrollbar dimmed at exactly the ends it was pointing at. The cost is that the
// gradient is then positioned in the content's own coordinates rather than the
// window's, so every stop is offset by the scroll position — that is what the
// `scrollTop +` below is doing, and why this redraws on scroll rather than only
// when the fade's height changes.
export function attachScrollFade(scroller: HTMLElement, max = 24) {
    if (scroller.dataset.scrollFade) return () => {};
    const content = scroller.firstElementChild as HTMLElement | null;
    if (!content) return () => {};
    scroller.dataset.scrollFade = "true";

    const top = motionValue(0);
    const bottom = motionValue(0);

    const render = () => {
        const above = top.get();
        const below = bottom.get();
        const start = scroller.scrollTop;
        const end = start + scroller.clientHeight;

        // No mask at all when both ends are flush: masking costs a composited
        // layer, and a list short enough not to scroll should not pay for one.
        const mask =
            above < 0.5 && below < 0.5
                ? ""
                : `linear-gradient(to bottom, transparent ${start}px, #000 ${start + above}px, #000 ${end - below}px, transparent ${end}px)`;
        content.style.maskImage = mask;
        content.style.webkitMaskImage = mask;
    };

    const stopWatching = [top.on("change", render), bottom.on("change", render)];

    let queued = 0;
    let last = [-1, -1];

    const apply = () => {
        queued = 0;
        const room = scroller.scrollHeight - scroller.clientHeight;
        const above = Math.max(0, Math.min(scroller.scrollTop, max));
        const below = Math.max(0, Math.min(room - scroller.scrollTop, max));
        if (above !== last[0] || below !== last[1]) {
            last = [above, below];
            // Short enough to keep up with a finger, long enough to smooth the
            // step when cards are added or the area is resized.
            animate(top, above, { duration: 0.15, ease: "easeOut" });
            animate(bottom, below, { duration: 0.15, ease: "easeOut" });
        }
        // Even when the fade's height is unchanged, the gradient has to be
        // redrawn: it is anchored to the content, which has just moved.
        render();
    };

    // Scroll fires far more often than the screen refreshes; one update per
    // frame is all that can be seen.
    const update = () => {
        if (queued) return;
        queued = requestAnimationFrame(apply);
    };

    scroller.addEventListener("scroll", update, { passive: true });
    // The list resizes when the window does, and its contents change whenever a
    // card is added, removed or dragged in — both change what is past the edge.
    const resize = new ResizeObserver(update);
    resize.observe(scroller);
    resize.observe(content);
    const mutate = new MutationObserver(update);
    mutate.observe(content, { childList: true, subtree: true });
    apply();

    return () => {
        scroller.removeEventListener("scroll", update);
        resize.disconnect();
        mutate.disconnect();
        stopWatching.forEach((stop) => stop());
        if (queued) cancelAnimationFrame(queued);
        delete scroller.dataset.scrollFade;
        content.style.maskImage = "";
        content.style.webkitMaskImage = "";
    };
}
