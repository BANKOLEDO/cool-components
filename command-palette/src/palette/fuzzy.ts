const BOUNDARY = new Set([" ", "-", "_", "/", ".", "·", ":", "→"]);

export interface FuzzyHit {
  score: number;
  indices: number[];
}

function scoreAt(text: string, pos: number, prev: number): number {
  if (prev === -2) {
    return pos === 0 ? 24 : 10;
  }

  if (pos === prev + 1) {
    return 15;
  }

  const gap = pos - prev - 1;
  let value = 7 - gap * 1.1;

  if (BOUNDARY.has(text[pos - 1])) {
    value += 9;
  } else if (pos > 0 && text[pos - 1] === text[pos - 1].toLowerCase() && text[pos] === text[pos].toUpperCase()) {
    value += 9;
  }

  return value;
}

export function fuzzyScore(text: string, query: string): FuzzyHit | null {
  const clean = query.toLowerCase().replace(/[\s·]+/g, "");

  if (!clean) {
    return { score: 0, indices: [] };
  }

  const lower = text.toLowerCase();
  const indices: number[] = [];
  let score = 0;
  let prev = -2;

  for (const ch of clean) {
    const pos = lower.indexOf(ch, prev + 1);

    if (pos === -1) {
      return null;
    }

    score += scoreAt(lower, pos, prev);
    indices.push(pos);
    prev = pos;
  }

  return { score, indices };
}

export function editDistance(a: string, b: string): number {
  const s = a.toLowerCase();
  const t = b.toLowerCase();

  if (s === t) {
    return 0;
  }

  let prevRow = new Array(t.length + 1)
    .fill(0)
    .map((_, index) => index);

  for (let i = 1; i <= s.length; i += 1) {
    const row = [i];

    for (let j = 1; j <= t.length; j += 1) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      row[j] = Math.min(
        prevRow[j] + 1,
        row[j - 1] + 1,
        prevRow[j - 1] + cost,
      );
    }

    prevRow = row;
  }

  return prevRow[t.length];
}
