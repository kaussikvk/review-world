import { generateBusinessData, generateSuggestions } from "./demoData.jsx";

/* ------------------------------------------------------------------ */
/*  Live backend integration                                          */
/*                                                                      */
/*  Point this at the review-world-backend server (see its README) to  */
/*  pull real, paginated Google review data via SerpApi. If that       */
/*  request fails for any reason — backend not running, no API key,   */
/*  network error — this falls back to the deterministic demo          */
/*  generator so the dashboard still works end to end.                 */
/* ------------------------------------------------------------------ */
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

export async function fetchBusinessData(query) {
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/reviews?query=${encodeURIComponent(query)}`
    );
    if (!res.ok) throw new Error(`Backend responded ${res.status}`);
    const data = await res.json();
    if (!data.reviews || data.reviews.length === 0) {
      throw new Error("Backend returned no reviews");
    }
    return {
      name: data.name,
      category: data.category,
      address: data.address,
      overallAvg: data.overallAvg,
      reviews: data.reviews.map((r) => ({
        ...r,
        date: new Date(r.date),
      })),
      source: "live",
    };
  } catch (err) {
    const demo = generateBusinessData(query);
    return { ...demo, source: "demo" };
  }
}

/**
 * Autocomplete suggestions for the search box. Tries the backend's
 * /api/suggest first (real candidate places via SerpApi), falls back to
 * the deterministic demo generator if it's unreachable.
 */
export async function fetchSuggestions(query) {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  try {
    const res = await fetch(
      `${API_BASE_URL}/api/suggest?query=${encodeURIComponent(trimmed)}`
    );
    if (!res.ok) throw new Error(`Backend responded ${res.status}`);
    const data = await res.json();
    if (!data.suggestions || data.suggestions.length === 0) {
      throw new Error("Backend returned no suggestions");
    }
    return data.suggestions.map((s) => s.name);
  } catch (err) {
    return generateSuggestions(trimmed);
  }
}
