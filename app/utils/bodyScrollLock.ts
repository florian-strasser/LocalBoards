// Locking the page behind a dialog hides the window's scrollbar. Where
// scrollbars take up layout space — Windows, Linux, and macOS whenever a mouse
// is connected — removing it widens the page by the scrollbar's width, so
// everything jumps sideways as a dialog opens and back as it closes.
//
// `scrollbar-gutter: stable` would also fix that, but the reserved gutter sits
// outside all layout: a full-screen overlay (even at 100vw) stops short of it,
// leaving an undimmed strip beside the dialog's own scrollbar. So instead the
// scrollbar's width is measured at lock time and re-added as padding, which
// keeps the layout still while letting overlays reach the window edge.
export function setBodyScrollLock(locked: boolean) {
  if (!import.meta.client) return;
  const body = document.body;

  if (locked) {
    // Measure only on the first lock — a second call while already locked would
    // read a gap of 0 (the scrollbar is gone) and wipe the compensation.
    if (body.style.overflowY !== "hidden") {
      const gap = window.innerWidth - document.documentElement.clientWidth;
      body.style.paddingRight = gap > 0 ? `${gap}px` : "";
    }
    body.style.overflowY = "hidden";
  } else {
    body.style.overflowY = "auto";
    body.style.paddingRight = "";
  }
}
