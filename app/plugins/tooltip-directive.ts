export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive("tooltip", {
    mounted(el, binding) {
      const tip = binding.value;
      if (!tip) return;

      // Create the tooltip element
      const tooltip = document.createElement("div");
      tooltip.textContent = tip;
      tooltip.className =
        "absolute text-xs bg-primary text-white px-2 py-1 left-1/2 transform -translate-x-1/2 rounded-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500 whitespace-nowrap";

      // Add the tooltip to the element
      el.classList.add("group", "relative");
      el.appendChild(tooltip);

      // Function to position the tooltip
      const positionTooltip = () => {
        const rect = el.getBoundingClientRect();
        const tooltipRect = tooltip.getBoundingClientRect();

        // Check if there's enough space above the element
        const spaceAbove = rect.top;
        const spaceBelow = window.innerHeight - rect.bottom;

        // Determine the best position
        if (spaceAbove >= tooltipRect.height) {
          // Position above
          tooltip.classList.remove("-bottom-2", "translate-y-full");
          tooltip.classList.add("-top-2", "-translate-y-full");
          tooltip.classList.add("has-triangle-bottom");
          tooltip.classList.remove("has-triangle-top");
        } else if (spaceBelow >= tooltipRect.height) {
          // Position below
          tooltip.classList.remove("-top-2", "-translate-y-full");
          tooltip.classList.add("-bottom-2", "translate-y-full");
          tooltip.classList.add("has-triangle-top");
          tooltip.classList.remove("has-triangle-bottom");
        } else {
          // Default to below if neither has enough space
          tooltip.classList.remove("-top-2", "-translate-y-full");
          tooltip.classList.add("-bottom-2", "translate-y-full");
          tooltip.classList.add("has-triangle-top");
          tooltip.classList.remove("has-triangle-bottom");
        }
      };

      // Position the tooltip on mount, resize, and scroll
      positionTooltip();
      window.addEventListener("resize", positionTooltip);
      window.addEventListener("scroll", positionTooltip, { passive: true });

      // Cleanup
      el._tooltipCleanup = () => {
        window.removeEventListener("resize", positionTooltip);
        window.removeEventListener("scroll", positionTooltip);
      };
    },
    unmounted(el) {
      if (el._tooltipCleanup) {
        el._tooltipCleanup();
      }
    },
  });
});
