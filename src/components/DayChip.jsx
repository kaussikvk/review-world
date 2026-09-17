export default function DayChip({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      className="rd-chip text-xs rounded-full px-3 py-1.5 flex-shrink-0"
      style={{
        background: active ? "var(--ink)" : "transparent",
        color: active ? "#fff" : "var(--slate)",
        border: `1px solid ${active ? "var(--ink)" : "var(--line)"}`,
      }}
    >
      {label}
    </button>
  );
}
