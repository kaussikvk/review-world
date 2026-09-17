import { TrendingUp, TrendingDown, Star } from "lucide-react";

export default function DayHighlightCard({ kind, stat, headline, sub }) {
  const isBest = kind === "best";
  const accent = isBest ? "var(--forest)" : "var(--rust)";
  const tint = isBest ? "var(--forest-tint)" : "var(--rust-tint)";
  const Icon = isBest ? TrendingUp : TrendingDown;

  return (
    <div
      className="rounded-xl p-5"
      style={{ background: tint, border: `1px solid ${accent}22` }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Icon width={15} height={15} color={accent} />
        <span className="text-xs font-medium" style={{ color: accent }}>
          {headline}
        </span>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <div className="serif text-3xl" style={{ fontWeight: 600, color: "var(--ink)" }}>
            {stat.dayLong}
          </div>
          <div className="text-xs mt-1" style={{ color: "var(--slate)" }}>
            {sub}
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 justify-end">
            <span className="serif text-2xl" style={{ fontWeight: 600 }}>
              {stat.avg.toFixed(2)}
            </span>
            <Star width={16} height={16} fill={accent} stroke={accent} />
          </div>
          <div className="text-xs" style={{ color: "var(--slate)" }}>
            {stat.count} reviews
          </div>
        </div>
      </div>
    </div>
  );
}
