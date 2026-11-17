// Deterministic ASCII landscape studies.
// Everything is computed from scene definitions: no randomness at runtime,
// so the same scene always renders the same characters.

import { LAKE_PANORAMA } from './lake-photo.js';

const clamp = (n, min = 0, max = 1) => Math.min(max, Math.max(min, n));
const fract = (n) => n - Math.floor(n);

function hash1(n, seed = 0) {
  return fract(Math.sin(n * 127.1 + seed * 311.7) * 43758.5453123);
}

function noise1(x, seed = 0) {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return hash1(i, seed) * (1 - u) + hash1(i + 1, seed) * u;
}

function fbm1(x, seed = 0, octaves = 3) {
  let sum = 0;
  let norm = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < octaves; i += 1) {
    sum += noise1(x * freq, seed + i * 17.3) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}

function noise2(x, y, seed = 0) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const n00 = hash1(xi + yi * 57, seed);
  const n10 = hash1(xi + 1 + yi * 57, seed);
  const n01 = hash1(xi + (yi + 1) * 57, seed);
  const n11 = hash1(xi + 1 + (yi + 1) * 57, seed);
  return (n00 * (1 - u) + n10 * u) * (1 - v) + (n01 * (1 - u) + n11 * u) * v;
}

function fbm2(x, y, seed = 0, octaves = 3) {
  let sum = 0;
  let norm = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < octaves; i += 1) {
    sum += noise2(x * freq, y * freq, seed + i * 19.7) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}

function sampleProfile(points, x) {
  if (x <= points[0][0]) return points[0][1];
  for (let i = 0; i < points.length - 1; i += 1) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    if (x <= x1) {
      const t = (x - x0) / (x1 - x0 || 1);
      const eased = t * t * (3 - 2 * t);
      return y0 + (y1 - y0) * eased;
    }
  }
  return points[points.length - 1][1];
}

function ridgeHeight(range, x) {
  const base = sampleProfile(range.points, x);
  const rough = range.rough ?? 0.02;
  const freq = range.freq ?? 13;
  const detail = (fbm1(x * freq, range.seed) - 0.5) * rough;
  const fine = (fbm1(x * freq * 3.4, range.seed + 5) - 0.5) * rough * 0.55;
  return clamp(base + detail + fine, 0.02, 0.985);
}

export const SCENES = [
  {
    id: 'forest',
    title: 'Forest',
    place: 'Hoh Rainforest, Washington',
    caption: 'Three canopies of conifers, no horizon line — only mist between the layers.',
    accent: '#3f6350',
    width: 142,
    height: 30,
    seed: 11,
    stars: 0.022,
    moon: { x: 0.79, y: 0.16, r: 2.6 },
    ranges: [
      { points: [[0, 0.48], [0.12, 0.56], [0.24, 0.5], [0.36, 0.59], [0.48, 0.52], [0.6, 0.6], [0.74, 0.53], [0.88, 0.58], [1, 0.52]], rough: 0.06, freq: 26, base: 0.3, texture: 0.4, seed: 2 },
      { points: [[0, 0.34], [0.18, 0.43], [0.34, 0.34], [0.52, 0.44], [0.7, 0.35], [0.86, 0.41], [1, 0.36]], rough: 0.085, freq: 33, base: 0.44, texture: 0.45, stripes: true, seed: 7 },
      { points: [[0, 0.15], [0.2, 0.25], [0.4, 0.16], [0.62, 0.27], [0.82, 0.17], [1, 0.23]], rough: 0.1, freq: 41, base: 0.56, texture: 0.4, stripes: true, seed: 13 },
    ],
  },
  {
    id: 'alps',
    title: 'Alps',
    place: 'Chamonix, France',
    caption: 'A low sun behind serrated ridges; the snow line holds the last of the light.',
    accent: '#4c5b7d',
    width: 142,
    height: 30,
    seed: 23,
    stars: 0.012,
    sun: { x: 0.68, y: 0.26, r: 3.1 },
    ranges: [
      { points: [[0, 0.58], [0.07, 0.66], [0.13, 0.6], [0.22, 0.88], [0.28, 0.68], [0.35, 0.78], [0.42, 0.62], [0.5, 0.84], [0.57, 0.66], [0.65, 0.72], [0.73, 0.62], [0.8, 0.8], [0.87, 0.63], [0.94, 0.7], [1, 0.6]], rough: 0.026, freq: 20, base: 0.22, texture: 0.3, snow: 0.7, seed: 3 },
      { points: [[0, 0.38], [0.08, 0.5], [0.16, 0.4], [0.26, 0.54], [0.34, 0.42], [0.45, 0.52], [0.56, 0.38], [0.68, 0.5], [0.78, 0.4], [0.9, 0.46], [1, 0.38]], rough: 0.04, freq: 24, base: 0.4, texture: 0.36, snow: 0.62, seed: 9 },
      { points: [[0, 0.16], [0.12, 0.24], [0.26, 0.18], [0.4, 0.26], [0.55, 0.16], [0.7, 0.24], [0.85, 0.17], [1, 0.22]], rough: 0.03, freq: 17, base: 0.6, texture: 0.3, seed: 15 },
    ],
  },
  {
    id: 'mountains',
    title: 'Mountains',
    place: 'Sangre de Cristo, Colorado',
    caption: 'Broad shoulders, a bowl of valley fog, and a sky that has been emptied out.',
    accent: '#5c5068',
    width: 142,
    height: 30,
    seed: 31,
    stars: 0.03,
    moon: { x: 0.22, y: 0.17, r: 2.4 },
    ranges: [
      { points: [[0, 0.5], [0.12, 0.64], [0.24, 0.56], [0.36, 0.78], [0.44, 0.85], [0.52, 0.66], [0.6, 0.74], [0.7, 0.58], [0.8, 0.68], [0.9, 0.54], [1, 0.6]], rough: 0.03, freq: 13, base: 0.24, texture: 0.3, seed: 4 },
      { points: [[0, 0.3], [0.14, 0.46], [0.28, 0.32], [0.42, 0.5], [0.56, 0.34], [0.7, 0.46], [0.84, 0.32], [1, 0.4]], rough: 0.04, freq: 17, base: 0.42, texture: 0.34, seed: 10 },
      { points: [[0, 0.12], [0.2, 0.2], [0.4, 0.13], [0.6, 0.22], [0.8, 0.14], [1, 0.19]], rough: 0.03, freq: 19, base: 0.6, texture: 0.26, seed: 16 },
    ],
  },
  {
    id: 'autumn',
    title: 'Autumn',
    place: 'Ginkgo avenue, Jeonju',
    caption: 'Ginkgo yellow gathers in the low hills and drifts down the foreground.',
    accent: '#a3741f',
    width: 142,
    height: 30,
    seed: 41,
    stars: 0.006,
    blossom: 0.04,
    ranges: [
      { points: [[0, 0.38], [0.14, 0.5], [0.28, 0.42], [0.44, 0.55], [0.6, 0.44], [0.76, 0.52], [1, 0.45]], rough: 0.05, freq: 21, base: 0.26, texture: 0.34, seed: 5 },
      { points: [[0, 0.22], [0.16, 0.34], [0.34, 0.24], [0.5, 0.36], [0.66, 0.25], [0.84, 0.33], [1, 0.27]], rough: 0.06, freq: 26, base: 0.4, texture: 0.38, stripes: true, seed: 11 },
      { points: [[0, 0.08], [0.2, 0.16], [0.4, 0.09], [0.6, 0.18], [0.8, 0.1], [1, 0.15]], rough: 0.05, freq: 30, base: 0.54, texture: 0.36, seed: 17 },
    ],
  },
  {
    id: 'spring',
    title: 'Spring',
    place: 'Philosopher’s Path, Kyoto',
    caption: 'Sakura as static: pale clusters held against a soft, overcast ridge.',
    accent: '#b25f7d',
    width: 142,
    height: 30,
    seed: 53,
    stars: 0.004,
    blossom: 0.07,
    ranges: [
      { points: [[0, 0.42], [0.12, 0.52], [0.26, 0.44], [0.4, 0.55], [0.54, 0.45], [0.68, 0.53], [0.84, 0.44], [1, 0.5]], rough: 0.03, freq: 14, base: 0.2, texture: 0.26, seed: 6 },
      { points: [[0, 0.26], [0.16, 0.36], [0.3, 0.28], [0.46, 0.38], [0.6, 0.29], [0.76, 0.37], [1, 0.3]], rough: 0.04, freq: 19, base: 0.34, texture: 0.32, seed: 12 },
      { points: [[0, 0.1], [0.2, 0.18], [0.4, 0.11], [0.6, 0.19], [0.8, 0.12], [1, 0.16]], rough: 0.04, freq: 23, base: 0.48, texture: 0.34, seed: 18 },
    ],
  },
  {
    id: 'lake',
    title: 'Lake',
    place: 'Lake Brienz, Interlaken',
    caption: 'The Brienzersee shoreline, sampled from a photograph and reduced to five colours: cloud on the ridge, village on the shore, one long run of water.',
    accent: '#3c6d84',
    width: LAKE_PANORAMA.width,
    height: LAKE_PANORAMA.height,
    photo: LAKE_PANORAMA,
    credit: LAKE_PANORAMA.credit,
  },
  {
    id: 'coast',
    title: 'Coast',
    place: 'Big Sur, California',
    caption: 'Cliffs give out to a sea that carries the moon all the way to the frame.',
    accent: '#356673',
    width: 142,
    height: 30,
    seed: 71,
    stars: 0.02,
    moon: { x: 0.76, y: 0.16, r: 2.2 },
    water: 0.3,
    ranges: [
      { points: [[0, 0.7], [0.03, 0.78], [0.07, 0.55], [0.12, 0.62], [0.16, 0.4], [0.22, 0.48], [0.28, 0.34], [0.36, 0.4], [0.43, 0.31], [0.5, 0.32], [0.56, 0.3], [0.62, 0.34], [0.66, 0.31], [0.7, 0.3], [1, 0.3]], rough: 0.02, freq: 24, base: 0.3, texture: 0.36, seed: 1 },
    ],
  },
];

const SPARSE_RAMP = ['.', ':', '*', '+', '#', '%', '@'];
const GRID_RAMP = ['.', ':', ';', 'o', '0', '8', '#', '@'];

function ridgeSet(scene) {
  const W = scene.width ?? 126;
  return scene.ranges.map((range) =>
    Float32Array.from({ length: W }, (_, col) => ridgeHeight(range, (col + 0.5) / W)),
  );
}

const photoCache = new Map();

function photoRgb(photo) {
  let bytes = photoCache.get(photo.data);
  if (!bytes) {
    const binary =
      typeof atob === 'function'
        ? atob(photo.data)
        : Buffer.from(photo.data, 'base64').toString('binary');
    bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    photoCache.set(photo.data, bytes);
  }
  return bytes;
}

// Five-colour lake palette: paper, mist, water, accent, ink.
const PHOTO_PALETTE = [
  [246, 241, 234],
  [211, 225, 221],
  [150, 185, 183],
  [60, 109, 132],
  [38, 42, 51],
];

function nearestPalette(r, g, b) {
  let best = 0;
  let bestDistance = Infinity;
  for (let i = 0; i < PHOTO_PALETTE.length; i += 1) {
    const [pr, pg, pb] = PHOTO_PALETTE[i];
    const distance =
      (r - pr) ** 2 * 0.3 + (g - pg) ** 2 * 0.59 + (b - pb) ** 2 * 0.11;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = i;
    }
  }
  return best;
}

function renderPhotoScene(scene, style, density) {
  const isGrid = style !== 'sparse';
  const { width: W, height: H } = scene.photo;
  const rgb = photoRgb(scene.photo);
  const ramp = isGrid ? GRID_RAMP : SPARSE_RAMP;
  const threshold = isGrid ? 0.02 : 0.3;
  const lines = [];

  for (let y = 0; y < H; y += 1) {
    const cells = [];
    for (let col = 0; col < W; col += 1) {
      const offset = (y * W + col) * 3;
      const r = rgb[offset];
      const g = rgb[offset + 1];
      const b = rgb[offset + 2];
      const l = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      const value = (style === 'sparse' ? Math.pow(1 - l, 0.72) : 1 - l) * density;
      const t = clamp((value - threshold) / (1 - threshold));
      let char = ' ';
      let cls = null;

      if (style === 'color') {
        const index = Math.min(GRID_RAMP.length - 1, Math.floor(t * GRID_RAMP.length));
        char = GRID_RAMP[index];
        cls = `p${nearestPalette(r, g, b)}`;
      } else if (t > 0) {
        const index = Math.min(ramp.length - 1, Math.floor(t * ramp.length));
        char = ramp[index];
        const level = Math.min(4, Math.max(1, Math.floor(t * 4) + 1));
        cls = isGrid ? `g${level}` : level === 1 ? 'a' : `s${level}`;
      }

      cells.push({ char, tone: cls });
    }
    lines.push(cells);
  }

  return lines;
}


/**
 * Render one scene to a grid of { char, tone } cells.
 * tone: 'a' for the lightest ink, 's2'..'s4' for the sparse ramp,
 * 'g1'..'g4' for the grid ramp, 'hi' for moons/stars/blossom.
 */
export function renderScene(scene, options = {}) {
  const style = ['grid', 'color'].includes(options.style) ? options.style : 'sparse';
  const isGrid = style !== 'sparse';
  const density = clamp(options.density ?? 1, 0.5, 1.8);
  if (scene.photo) return renderPhotoScene(scene, style, density);
  const W = scene.width ?? 126;
  const H = scene.height ?? 30;
  const heights = ridgeSet(scene);
  const skyline = Array.from({ length: W }, (_, col) =>
    Math.max(...heights.map((row) => row[col])),
  );
  const ink = Array.from({ length: H }, () => new Float64Array(W));
  const tone = Array.from({ length: H }, () => new Array(W).fill(null));
  const glyph = Array.from({ length: H }, () => new Array(W).fill(' '));
  const snowline = scene.ranges.map((range) => range.snow ?? null);
  const seed = scene.seed ?? 1;

  const mark = (col, y, value, cls) => {
    ink[y][col] = clamp(value);
    tone[y][col] = cls;
  };

  for (let col = 0; col < W; col += 1) {
    for (let y = 0; y < H; y += 1) {
      const v = 1 - (y + 0.5) / H;
      let layerIndex = -1;
      for (let li = scene.ranges.length - 1; li >= 0; li -= 1) {
        if (v <= heights[li][col]) {
          layerIndex = li;
          break;
        }
      }

      if (layerIndex === -1) {
        // Sky.
        let value = isGrid ? 0.06 + 0.09 * (1 - v) : 0.02 + 0.04 * (1 - v);
        let cls = null;

        const body = scene.moon ?? scene.sun;
        if (body) {
          const dx = col - body.x * W;
          const dy = (y - body.y * H) * 2.05;
          const dist = Math.hypot(dx, dy);
          if (dist < body.r) {
            value = 0.06;
            cls = 'hi';
          } else if (dist < body.r + 0.75) {
            value = 0.85;
            cls = 'hi';
          }
        }

        if (!cls && v > skyline[col] + 0.015 && hash1(col * 5.1 + y * 13.7, seed) < (scene.stars ?? 0)) {
          value = 0.6;
          cls = 'hi';
        }

        mark(col, y, value, cls);
        continue;
      }

      const range = scene.ranges[layerIndex];
      const surface = heights[layerIndex][col];
      const d = clamp((surface - v) / Math.max(surface, 0.001));
      const foot = layerIndex + 1 < heights.length ? heights[layerIndex + 1][col] : 0;
      const band = Math.max(surface - foot, 0.02);
      const t = clamp((surface - v) / band);

      let value = 0.1 + range.base * 0.18;
      const patch = fbm2(col * 0.055, y * 0.15, seed + layerIndex * 7.1);
      value += patch * (range.texture ?? 0.4) * 0.55;
      value += 0.66 * Math.exp(-t * 2.1);

      if (range.stripes) {
        const stripe = 0.5 + 0.5 * Math.sin(col * 1.1 + y * 0.21 + fbm1(y * 0.26, layerIndex + 3) * 3.4);
        const patchMask = clamp((fbm2(col * 0.04, y * 0.1, seed + 9.1) - 0.3) * 2);
        value += (stripe - 0.5) * 0.2 * patchMask;
      }

      const edge = clamp(1 - t / 0.06);
      value += edge * 0.16;
      const clearing = fbm2(col * 0.05, y * 0.13, seed + 33.1);
      if (clearing < 0.3) value = 0;
      else if (clearing < 0.4) value *= 0.45;
      value = clamp(value, 0, 0.96);

      let cls = null;

      if (snowline[layerIndex] && surface > snowline[layerIndex] && d < 0.2) {
        value = 0.02 + fbm2(col * 0.3, y * 0.7, seed + 3.3) * 0.05;
        if (d < 0.035) value = 0.58;
        cls = 'hi';
      }

      if (scene.blossom && d < 0.5 && hash1(col * 7.7 + y * 17.9, seed + 5) < scene.blossom) {
        value = 0.18;
        cls = 'hi';
      }

      mark(col, y, value, cls);
    }
  }

  if (scene.water) {
    const line = scene.water;
    for (let col = 0; col < W; col += 1) {
      for (let y = 0; y < H; y += 1) {
        const v = 1 - (y + 0.5) / H;
        if (v > line) continue;

        const depth = clamp((line - v) / line);
        const mirrorV = line + (line - v);
        const srcY = clamp(Math.round((1 - mirrorV) * H - 0.5), 0, H - 1);
        const fade = clamp(depth / 0.14);
        let value = (ink[srcY][col] * 0.82 + 0.06) * (0.3 + 0.7 * fade);
        const ripple = Math.sin(depth * H * 2.8 + fbm1(col * 0.11, 4.2) * 3.2);
        value += Math.max(0, ripple) * 0.16;
        if (ripple < -0.35) value *= 0.62;
        value = Math.max(value, 0.4 + 0.16 * fbm2(col * 0.08, y * 0.3, seed + 2));
        value *= 1 - depth * 0.1;

        if (line - v < 0.75 / H) {
          const broken = hash1(col * 3.1, 8.2);
          value = broken > 0.42 ? 0.76 : 0.24;
        }

        ink[y][col] = clamp(value);
        tone[y][col] = 'w';
      }
    }
  }

  const ramp = isGrid ? GRID_RAMP : SPARSE_RAMP;
  const threshold = isGrid ? 0.02 : 0.46;
  const lines = [];

  for (let y = 0; y < H; y += 1) {
    const cells = [];
    for (let col = 0; col < W; col += 1) {
      const value = ink[y][col] * density;
      const t = clamp((value - threshold) / (1 - threshold));
      let char = ' ';
      let cls = null;

      if (t > 0) {
        const index = Math.min(ramp.length - 1, Math.floor(t * ramp.length));
        char = ramp[index];
        const level = Math.min(4, Math.max(1, Math.floor(t * 4) + 1));
        cls = isGrid ? `g${level}` : level === 1 ? 'a' : `s${level}`;
      }

      if (t > 0 && tone[y][col] === 'hi') cls = 'hi';
      if (t > 0 && tone[y][col] === 'w' && style !== 'color') cls = 'w';
      if (t <= 0 && style === 'color') cls = 'g0';
      cells.push({ char, tone: cls });
    }
    lines.push(cells);
  }

  return lines;
}

function escapeHtml(char) {
  if (char === '&') return '&amp;';
  if (char === '<') return '&lt;';
  if (char === '>') return '&gt;';
  return char;
}

export function linesToHtml(lines) {
  return lines
    .map((cells) => {
      let out = '';
      let runClass = null;
      let run = '';
      const flush = () => {
        if (!run) return;
        out += runClass ? `<span class="${runClass}">${run}</span>` : run;
        run = '';
      };
      for (const cell of cells) {
        if (cell.tone !== runClass) {
          flush();
          runClass = cell.tone;
        }
        run += escapeHtml(cell.char);
      }
      flush();
      return out;
    })
    .join('\n');
}
