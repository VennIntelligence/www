/**
 * hueTokens — read the site hue tokens (index.css :root, "r g b" triplets) for 2D canvas drawing,
 * so canvases stay in sync with the CSS theme. Call once at setup, never per frame.
 *
 * @param {Element} el  any element inside the themed document
 * @returns {{ blue: number[], bright: number[], gold: number[], rgba: (c: number[], a: number) => string, font: string }}
 */
export function readHueTokens(el) {
  const cs = getComputedStyle(el);
  const triplet = (name, fallback) => {
    const parts = cs.getPropertyValue(name).trim().split(/\s+/).map(Number);
    return parts.length === 3 && !parts.some(Number.isNaN) ? parts : fallback;
  };
  return {
    blue: triplet('--hue-blue', [120, 180, 255]),
    bright: triplet('--hue-blue-bright', [200, 230, 255]),
    gold: triplet('--hue-gold', [255, 200, 80]),
    rgba: (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`,
    font: cs.getPropertyValue('--font-mono').trim() || 'monospace',
  };
}
