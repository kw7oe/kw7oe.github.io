// Eight-colour Lake Brienz render for the homepage motif.
// Palette sampled from the photograph in the ASCII Lab; cells map to the
// nearest sampled colour while the glyph follows luminance.

import { LAKE_PANORAMA } from './lake-photo.js';

const CHARS = ['.', ':', ';', 'o', '0', '8', '#', '@'];
const PALETTE = [
  '#c4daf4',
  '#a3c2dc',
  '#83a1bf',
  '#6688ac',
  '#517197',
  '#4e5b67',
  '#384248',
  '#191c1c',
];

const rgbOf = (hex) => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

const luminance = ([r, g, b]) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

const colours = PALETTE.map((hex) => {
  const rgb = rgbOf(hex);
  return {
    hex,
    rgb,
    fg: luminance(rgb) > 0.54 ? '#283138' : '#f8f4ed',
  };
});

function decode(data) {
  const binary =
    typeof atob === 'function' ? atob(data) : Buffer.from(data, 'base64').toString('binary');
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function nearest(r, g, b) {
  let index = 0;
  let best = Infinity;
  for (let i = 0; i < colours.length; i += 1) {
    const [pr, pg, pb] = colours[i].rgb;
    const distance = (r - pr) ** 2 * 0.3 + (g - pg) ** 2 * 0.59 + (b - pb) ** 2 * 0.11;
    if (distance < best) {
      best = distance;
      index = i;
    }
  }
  return index;
}

export function renderLakeAscii() {
  const { width: W, height: H, data } = LAKE_PANORAMA;
  const rgb = decode(data);
  const lum = new Float32Array(W * H);
  for (let i = 0; i < lum.length; i += 1) {
    const p = i * 3;
    lum[i] = luminance([rgb[p], rgb[p + 1], rgb[p + 2]]);
  }
  const sorted = Float32Array.from(lum).sort();
  const min = sorted[Math.floor(lum.length * 0.02)];
  const max = sorted[Math.floor(lum.length * 0.98)];
  const range = Math.max(0.02, max - min);

  const lines = [];
  for (let y = 0; y < H; y += 1) {
    let runClass = null;
    let run = '';
    let line = '';
    const flush = () => {
      if (!run) return;
      line += `<span class="${runClass}">${run}</span>`;
      run = '';
    };
    for (let x = 0; x < W; x += 1) {
      const i = y * W + x;
      const p = i * 3;
      const normalized = Math.min(1, Math.max(0, (lum[i] - min) / range));
      const t = Math.max(0, Math.min(1, (1 - normalized - 0.02) / 0.98));
      const glyph = CHARS[Math.min(CHARS.length - 1, Math.floor(t * CHARS.length))];
      const band = nearest(rgb[p], rgb[p + 1], rgb[p + 2]);
      const cls = `q${band}`;
      if (cls !== runClass) {
        flush();
        runClass = cls;
      }
      run += glyph;
    }
    flush();
    lines.push(line);
  }

  return {
    html: lines.join('\n'),
    palette: colours,
    width: W,
    height: H,
  };
}
