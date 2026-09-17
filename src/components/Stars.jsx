import { Star } from "lucide-react";

export default function Stars({ rating, size = 14 }) {
  return (
    <span className="inline-flex items-center gap-0.5" style={{ color: "var(--gold)" }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          width={size}
          height={size}
          fill={n <= Math.round(rating) ? "var(--gold)" : "none"}
          stroke="var(--gold)"
          strokeWidth={1.5}
        />
      ))}
    </span>
  );
}
