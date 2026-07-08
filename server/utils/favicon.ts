// Builds the favicon SVG (the stacked-cards logo) in a single colour.
//
// The colour is an inline `fill` presentation attribute so it renders in every
// browser — including Safari, which ignores a `<style>`/`prefers-color-scheme`
// block inside an SVG favicon. The two back cards are drawn semi-transparently
// to give the stacked look.
export function buildFaviconSvg(
  fill: string,
  backOpacity = 0.33,
  midOpacity = 0.66,
): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -319.5 2481 2481" fill-rule="evenodd" clip-rule="evenodd" stroke-linejoin="round" stroke-miterlimit="2">
  <g transform="matrix(1.003878,0,0,0.876822,668.314961,638.65748)">
    <path fill="${fill}" fill-opacity="${backOpacity}" d="M1472.133,0L1685.165,0C1751.304,0 1805,61.477 1805,137.2L1805,1234.8C1805,1310.523 1751.304,1372 1685.165,1372L119.835,1372C53.696,1372 0,1310.523 0,1234.8L0,1024.831L1352.298,1024.831C1418.437,1024.831 1472.133,963.354 1472.133,887.631L1472.133,0Z"/>
  </g>
  <g transform="matrix(1.003878,0,0,0.876822,334.15748,334.251969)">
    <path fill="${fill}" fill-opacity="${midOpacity}" d="M1472.133,0L1685.165,0C1751.304,0 1805,61.477 1805,137.2L1805,1234.8C1805,1310.523 1751.304,1372 1685.165,1372L119.835,1372C53.696,1372 0,1310.523 0,1234.8L0,990.792L1352.298,990.792C1418.437,990.792 1472.133,929.314 1472.133,853.592L1472.133,0Z"/>
  </g>
  <g transform="matrix(1.003878,0,0,0.876822,0,0)">
    <path fill="${fill}" d="M1805,137.2L1805,1234.8C1805,1310.523 1751.304,1372 1685.165,1372L119.835,1372C53.696,1372 0,1310.523 0,1234.8L0,137.2C0,61.477 53.696,0 119.835,0L1685.165,0C1751.304,0 1805,61.477 1805,137.2Z"/>
  </g>
</svg>`;
}
