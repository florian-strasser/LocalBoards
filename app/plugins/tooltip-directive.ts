export default defineNuxtPlugin((nuxtApp) => {
  // The tooltip element is rendered into <body> with position: fixed, NOT as a
  // child of the hovered element. Two reasons:
  //  1. As a child it lived inside whatever `overflow` container the element
  //     was in, so it got clipped by the board's horizontal scroll area, modals,
  //     etc.
  //  2. On WebKit/Safari, an absolutely-positioned child whose opacity animates
  //     inside an `overflow: auto` container makes the container drop its
  //     scrollbar until the next scroll — the "scrollbar vanishes when I hover
  //     the delete button" bug. Out of the subtree, it can't affect the bar.
  const GAP = 8; // px between the element and the tooltip

  nuxtApp.vueApp.directive("tooltip", {
    mounted(el, binding) {
      if (!binding.value) return;

      const tooltip = document.createElement("div");
      tooltip.textContent = binding.value;
      tooltip.className =
        "fixed z-[100] text-xs bg-primary text-white px-2 py-1 rounded-lg pointer-events-none opacity-0 transition-opacity duration-200 whitespace-nowrap";
      tooltip.style.top = "-9999px";
      tooltip.style.left = "-9999px";
      document.body.appendChild(tooltip);
      el._tooltipEl = tooltip;

      const position = () => {
        const rect = el.getBoundingClientRect();
        // Centre horizontally on the element, then clamp to the viewport so a
        // tooltip near the edge isn't cut off.
        const halfW = tooltip.offsetWidth / 2;
        let left = rect.left + rect.width / 2;
        left = Math.min(
          Math.max(left, halfW + 4),
          window.innerWidth - halfW - 4,
        );
        tooltip.style.left = `${left}px`;
        tooltip.style.transform = "translateX(-50%)";

        // Above if there's room, otherwise below — and point the triangle the
        // right way.
        const h = tooltip.offsetHeight;
        const above = rect.top >= h + GAP;
        if (above) {
          tooltip.style.top = `${rect.top - GAP - h}px`;
          tooltip.classList.add("has-triangle-bottom");
          tooltip.classList.remove("has-triangle-top");
        } else {
          tooltip.style.top = `${rect.bottom + GAP}px`;
          tooltip.classList.add("has-triangle-top");
          tooltip.classList.remove("has-triangle-bottom");
        }
      };

      const show = () => {
        if (!tooltip.textContent) return;
        position();
        tooltip.style.opacity = "1";
      };
      const hide = () => {
        tooltip.style.opacity = "0";
      };

      el._tooltipShow = show;
      el._tooltipHide = hide;
      el.addEventListener("mouseenter", show);
      el.addEventListener("mouseleave", hide);
      el.addEventListener("focus", show);
      el.addEventListener("blur", hide);
      // A fixed tooltip would otherwise linger where the element used to be, so
      // hide it as soon as anything scrolls; the next hover repositions it.
      window.addEventListener("scroll", hide, { passive: true, capture: true });
      window.addEventListener("resize", hide, { passive: true });
    },
    updated(el, binding) {
      if (el._tooltipEl) el._tooltipEl.textContent = binding.value || "";
    },
    unmounted(el) {
      // Remove the body tooltip and its listeners so nothing leaks.
      if (el._tooltipHide) {
        window.removeEventListener("scroll", el._tooltipHide, true);
        window.removeEventListener("resize", el._tooltipHide);
      }
      if (el._tooltipShow) el.removeEventListener("mouseenter", el._tooltipShow);
      if (el._tooltipHide) el.removeEventListener("mouseleave", el._tooltipHide);
      if (el._tooltipShow) el.removeEventListener("focus", el._tooltipShow);
      if (el._tooltipHide) el.removeEventListener("blur", el._tooltipHide);
      if (el._tooltipEl?.parentNode)
        el._tooltipEl.parentNode.removeChild(el._tooltipEl);
      el._tooltipEl = null;
    },
  });
});
