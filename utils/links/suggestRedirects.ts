// Pure ranking function — no I/O. Given a broken path and the corpus of
// currently-active public routes, suggests the most likely correct redirect
// destination(s). Simple token-overlap + edit-distance scoring is enough here;
// no need for anything fancier than string similarity against a known-good list.

export type RouteCandidate = { path: string; pageType: string | null };

function normalizePath(path: string): string {
  const withSlash = path.startsWith("/") ? path : `/${path}`;
  const stripped = withSlash.length > 1 ? withSlash.replace(/\/+$/, "") : withSlash;
  return stripped.toLowerCase();
}

function tokenize(path: string): string[] {
  return normalizePath(path)
    .split("/")
    .filter(Boolean)
    .flatMap((segment) => segment.split("-"))
    .filter(Boolean);
}

function citySegment(path: string): string {
  return normalizePath(path).split("/").filter(Boolean)[0] ?? "";
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let prevRow = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const currRow = [i];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      currRow[j] = Math.min(
        currRow[j - 1] + 1,
        prevRow[j] + 1,
        prevRow[j - 1] + cost
      );
    }
    prevRow = currRow;
  }
  return prevRow[n];
}

export function suggestRedirectTargets(
  brokenPath: string,
  corpus: RouteCandidate[],
  limit = 3
): string[] {
  const normalizedBroken = normalizePath(brokenPath);
  const brokenTokens = new Set(tokenize(normalizedBroken));
  const brokenCity = citySegment(normalizedBroken);

  const scored = corpus
    .map((candidate) => {
      const candidatePath = normalizePath(candidate.path);
      const candidateTokens = new Set(tokenize(candidatePath));

      const overlap = [...brokenTokens].filter((t) => candidateTokens.has(t)).length;
      const union = new Set([...brokenTokens, ...candidateTokens]).size;
      const tokenScore = union > 0 ? overlap / union : 0;

      const dist = levenshtein(normalizedBroken, candidatePath);
      const maxLen = Math.max(normalizedBroken.length, candidatePath.length, 1);
      const editScore = 1 - dist / maxLen;

      const cityBonus = brokenCity && citySegment(candidatePath) === brokenCity ? 0.5 : 0;

      return {
        path: candidate.path,
        score: tokenScore * 0.5 + editScore * 0.2 + cityBonus,
      };
    })
    .sort((a, b) => b.score - a.score);

  const top = scored.filter((s) => s.score >= 0.35).slice(0, limit).map((s) => s.path);
  if (top.length > 0) return top;

  // No confident match — fall back to the broken path's city hub, else home.
  const cityHub = corpus.find(
    (c) => citySegment(c.path) === brokenCity && normalizePath(c.path).split("/").filter(Boolean).length === 1
  );
  return [cityHub ? cityHub.path : "/"];
}
