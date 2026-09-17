import { generateBusinessData } from "./demoData.jsx";

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
