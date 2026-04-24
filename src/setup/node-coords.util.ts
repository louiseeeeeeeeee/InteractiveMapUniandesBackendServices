// Approximates lat/lng for each route node from the grid reference of its building.
// Uniandes campus roughly fits in a 600x600m box around (4.6019, -74.0661).
// Grid letter (A..Z) maps to longitude, grid number (1..10) maps to latitude.
// Nodes without a building get the campus center with a deterministic jitter so they don't stack.

const CAMPUS_MIN_LAT = 4.6005;
const CAMPUS_MAX_LAT = 4.6065;
const CAMPUS_MIN_LNG = -74.0685;
const CAMPUS_MAX_LNG = -74.0630;

const CAMPUS_CENTER_LAT = (CAMPUS_MIN_LAT + CAMPUS_MAX_LAT) / 2;
const CAMPUS_CENTER_LNG = (CAMPUS_MIN_LNG + CAMPUS_MAX_LNG) / 2;

export function parseGridReference(grid?: string | null): { col: number; row: number } | null {
  if (!grid) return null;
  const match = /^\s*([A-Za-z])\s*-\s*(\d{1,2})\s*$/.exec(grid); // e.g. "C-5"
  if (!match) return null;
  const letter = match[1].toUpperCase();
  const col = letter.charCodeAt(0) - 'A'.charCodeAt(0); // 0..25
  const row = parseInt(match[2], 10);
  if (row < 1 || row > 10) return null;
  return { col, row };
}

export function gridToLatLng(grid: { col: number; row: number }): { lat: number; lng: number } {
  // Col 0..F roughly west, V..Z east. Use full A..Z range for simplicity.
  const lngRatio = Math.min(1, Math.max(0, grid.col / 25));
  const latRatio = Math.min(1, Math.max(0, (grid.row - 1) / 9));
  const lng = CAMPUS_MIN_LNG + lngRatio * (CAMPUS_MAX_LNG - CAMPUS_MIN_LNG);
  const lat = CAMPUS_MAX_LAT - latRatio * (CAMPUS_MAX_LAT - CAMPUS_MIN_LAT); // Row 1 = north
  return { lat, lng };
}

export function jitterAround(seed: string, lat: number, lng: number) {
  // Tiny deterministic offset so nodes sharing the same building don't stack
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  const dLat = ((hash & 0xff) / 255 - 0.5) * 0.0004; // ~40m spread
  const dLng = (((hash >> 8) & 0xff) / 255 - 0.5) * 0.0004;
  return { lat: lat + dLat, lng: lng + dLng };
}

export function centerFallback(seed: string) {
  return jitterAround(seed, CAMPUS_CENTER_LAT, CAMPUS_CENTER_LNG);
}
