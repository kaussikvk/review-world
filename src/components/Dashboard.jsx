import { useState, useMemo, useRef, useEffect } from "react";
import {
  Search,
  Star,
  MapPin,
  ThumbsUp,
  Loader2,
  ChevronDown,
  X,
  Sparkles,
  Globe,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from "recharts";

import { WEEKDAYS, WEEKDAYS_LONG, SUGGESTIONS } from "../lib/demoData.jsx";
import { fetchBusinessData, fetchSuggestions } from "../lib/api.jsx";
import Stars from "./Stars.jsx";
import DayChip from "./DayChip.jsx";
import DayHighlightCard from "./DayHighlightCard.jsx";

/* ------------------------------------------------------------------ */
/*  Analytics                                                          */
/* ------------------------------------------------------------------ */

function computeWeekdayStats(reviews) {
  const buckets = WEEKDAYS.map(() => ({ sum: 0, count: 0 }));
  reviews.forEach((r) => {
    buckets[r.day].sum += r.rating;
    buckets[r.day].count += 1;
  });
  return buckets.map((b, i) => ({
    day: WEEKDAYS[i],
    dayLong: WEEKDAYS_LONG[i],
    avg: b.count ? b.sum / b.count : 0,
    count: b.count,
  }));
}

function getBestWorstDay(stats) {
  const withData = stats.filter((s) => s.count > 0);
  if (withData.length === 0) return { best: null, worst: null };

  const best = [...withData].sort((a, b) => {
    if (b.avg !== a.avg) return b.avg - a.avg;
    return b.count - a.count; // tie-break: more reviews wins
  })[0];

  const worst = [...withData].sort((a, b) => {
    if (a.avg !== b.avg) return a.avg - b.avg;
    return b.count - a.count; // tie-break: more reviews = higher impact
  })[0];

  return { best, worst };
}

/* ------------------------------------------------------------------ */
/*  Small local helpers                                                */
/* ------------------------------------------------------------------ */

function initials(name) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function avatarColor(name) {
  const palette = ["#2F6D4F", "#C89B3C", "#3D5A80", "#B3452F", "#6B4E71"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h += name.charCodeAt(i);
  return palette[h % palette.length];
}

function formatDate(d) {
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function Dashboard() {
  const [query, setQuery] = useState("");
  const [committedQuery, setCommittedQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [business, setBusiness] = useState(null);

  const [dayFilter, setDayFilter] = useState(null); // 0-6 or null
  const [sortBy, setSortBy] = useState("recent");
  const [reviewSearch, setReviewSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(10);

  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);

  const inputRef = useRef(null);

  // Debounced autocomplete: wait 250ms after typing stops before asking
  // for suggestions, and ignore stale responses if the query changed
  // again in the meantime.
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setSuggestionsLoading(false);
      return;
    }
    let cancelled = false;
    setSuggestionsLoading(true);
    const handle = setTimeout(async () => {
      const results = await fetchSuggestions(trimmed);
      if (!cancelled) {
        setSuggestions(results);
        setSuggestionsLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query]);

  function selectSuggestion(s) {
    setQuery(s);
    setSuggestions([]);
    setInputFocused(false);
    runSearch(s);
  }

  const showDropdown =
    inputFocused && !loading && query.trim().length >= 2 &&
    (suggestions.length > 0 || suggestionsLoading);

  async function runSearch(q) {
    const trimmed = q.trim();
    if (!trimmed) return;
    setLoading(true);
    setCommittedQuery(trimmed);
    setDayFilter(null);
    setReviewSearch("");
    setSortBy("recent");
    setVisibleCount(10);
    setSuggestions([]);
    setInputFocused(false);
    const data = await fetchBusinessData(trimmed);
    setBusiness(data);
    setLoading(false);
  }

  const weekdayStats = useMemo(
    () => (business ? computeWeekdayStats(business.reviews) : []),
    [business]
  );
  const { best, worst } = useMemo(
    () => getBestWorstDay(weekdayStats),
    [weekdayStats]
  );

  const ratingDistribution = useMemo(() => {
    if (!business) return [];
    const counts = [0, 0, 0, 0, 0];
    business.reviews.forEach((r) => (counts[r.rating - 1] += 1));
    const total = business.reviews.length;
    return [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: counts[star - 1],
      pct: total ? (counts[star - 1] / total) * 100 : 0,
    }));
  }, [business]);

  const filteredReviews = useMemo(() => {
    if (!business) return [];
    let list = business.reviews;
    if (dayFilter !== null) list = list.filter((r) => r.day === dayFilter);
    if (reviewSearch.trim()) {
      const q = reviewSearch.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.text.toLowerCase().includes(q) ||
          r.author.toLowerCase().includes(q)
      );
    }
    const sorted = [...list];
    if (sortBy === "recent") sorted.sort((a, b) => b.date - a.date);
    else if (sortBy === "highest") sorted.sort((a, b) => b.rating - a.rating);
    else if (sortBy === "lowest") sorted.sort((a, b) => a.rating - b.rating);
    else if (sortBy === "helpful") sorted.sort((a, b) => b.helpful - a.helpful);
    return sorted;
  }, [business, dayFilter, reviewSearch, sortBy]);

  const visibleReviews = filteredReviews.slice(0, visibleCount);
  const fiveStarPct = ratingDistribution.find((d) => d.star === 5)?.pct ?? 0;

  return (
    <div className="w-full min-h-screen">
      <div className="max-w-5xl mx-auto px-5 sm:px-8 py-10">
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-8">
          <div
            className="flex items-center justify-center rounded-full"
            style={{ width: 36, height: 36, background: "var(--ink)" }}
          >
            <Globe width={19} height={19} color="var(--gold)" strokeWidth={1.75} />
          </div>
          <div>
            <div className="serif text-xl leading-none" style={{ fontWeight: 600 }}>
              Review World
            </div>
            <div className="text-xs mt-0.5" style={{ color: "var(--slate)" }}>
              Daily rating patterns for any location
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-3 relative">
          <div
            className="flex items-center gap-2 rounded-xl px-4 py-3"
            style={{
              background: "var(--paper-raised)",
              border: "1px solid var(--line)",
              boxShadow: "0 1px 2px rgba(28,35,33,0.04)",
            }}
          >
            <Search width={18} height={18} color="var(--slate)" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setTimeout(() => setInputFocused(false), 120)}
              onKeyDown={(e) => e.key === "Enter" && runSearch(query)}
              placeholder="Search a business or location — e.g. The Copper Kettle"
              className="flex-1 outline-none bg-transparent text-sm"
              style={{ color: "var(--ink)" }}
              autoComplete="off"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="opacity-60 hover:opacity-100"
              >
                <X width={15} height={15} />
              </button>
            )}
            <button
              onClick={() => runSearch(query)}
              disabled={!query.trim()}
              className="text-sm rounded-lg px-4 py-2 font-medium"
              style={{
                background: query.trim() ? "var(--ink)" : "var(--line)",
                color: query.trim() ? "#fff" : "var(--slate)",
                cursor: query.trim() ? "pointer" : "default",
              }}
            >
              Load reviews
            </button>
          </div>

          {showDropdown && (
            <div
              className="absolute left-0 right-0 mt-1.5 rounded-xl overflow-hidden z-10"
              style={{
                background: "var(--paper-raised)",
                border: "1px solid var(--line)",
                boxShadow: "0 8px 20px rgba(28,35,33,0.08)",
              }}
            >
              {suggestionsLoading && suggestions.length === 0 ? (
                <div
                  className="flex items-center gap-2 px-4 py-3 text-sm"
                  style={{ color: "var(--slate)" }}
                >
                  <Loader2 className="animate-spin" width={14} height={14} />
                  Searching…
                </div>
              ) : (
                suggestions.map((s, i) => (
                  <button
                    key={`${s}-${i}`}
                    onMouseDown={(e) => {
                      e.preventDefault(); // keep focus so blur doesn't close before click
                      selectSuggestion(s);
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-sm"
                    style={{
                      borderTop: i === 0 ? "none" : "1px solid var(--line)",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#F3F3EE")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <Search width={13} height={13} color="var(--slate)" style={{ flexShrink: 0 }} />
                    <span>{s}</span>
                  </button>
                ))
              )}
            </div>
          )}

          {!business && !loading && !query.trim() && (
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span className="text-xs" style={{ color: "var(--slate)" }}>
                Try:
              </span>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setQuery(s);
                    runSearch(s);
                  }}
                  className="rd-chip text-xs rounded-full px-3 py-1.5"
                  style={{
                    background: "var(--paper-raised)",
                    border: "1px solid var(--line)",
                    color: "var(--ink)",
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {business && !loading && (
          <div
            className="flex items-start gap-2 text-xs rounded-lg px-3 py-2 mb-8"
            style={{
              background: business.source === "live" ? "var(--forest-tint)" : "#EFEEE6",
              color: business.source === "live" ? "var(--forest)" : "var(--slate)",
            }}
          >
            <Sparkles width={13} height={13} style={{ marginTop: 1, flexShrink: 0 }} />
            {business.source === "live" ? (
              <span>
                <strong>Live data</strong> — pulled through the review-world-backend
                server from SerpApi's Google Maps Reviews API.
              </span>
            ) : (
              <span>
                <strong>Demo data</strong> — generated consistently per search, not
                live. Start review-world-backend (see its README) with a valid
                SERPAPI_KEY to switch this to real reviews.
              </span>
            )}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="animate-spin" width={26} height={26} color="var(--slate)" />
            <div className="text-sm" style={{ color: "var(--slate)" }}>
              Gathering reviews for "{committedQuery}"…
            </div>
          </div>
        )}

        {/* Empty state */}
        {!business && !loading && (
          <div
            className="rounded-xl py-20 px-6 text-center"
            style={{ border: "1px dashed var(--line)" }}
          >
            <div className="serif text-xl mb-2">Search a location to begin</div>
            <div className="text-sm max-w-sm mx-auto" style={{ color: "var(--slate)" }}>
              Load a business's reviews to see its best and worst days, weekly rating
              patterns, and every review in one place.
            </div>
          </div>
        )}

        {/* Dashboard */}
        {business && !loading && (
          <div className="rd-fade-in">
            {/* Business header */}
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
              <div>
                <div className="text-xs mb-1" style={{ color: "var(--slate)" }}>
                  {business.category}
                </div>
                <h1 className="serif text-3xl sm:text-4xl mb-2" style={{ fontWeight: 600 }}>
                  {business.name}
                </h1>
                <div className="flex items-center gap-1.5 text-sm" style={{ color: "var(--slate)" }}>
                  <MapPin width={14} height={14} />
                  {business.address}
                </div>
              </div>
              <div className="flex items-end gap-2">
                <div className="serif text-5xl leading-none" style={{ fontWeight: 600 }}>
                  {business.overallAvg.toFixed(1)}
                </div>
                <div className="pb-1">
                  <Stars rating={business.overallAvg} size={16} />
                  <div className="text-xs mt-0.5" style={{ color: "var(--slate)" }}>
                    {business.reviews.length.toLocaleString()} reviews
                  </div>
                </div>
              </div>
            </div>

            {/* Daily rating highlights — the dashboard's headline read */}
            <div className="mb-3 flex items-center justify-between">
              <div className="serif text-lg" style={{ fontWeight: 600 }}>
                Daily rating highlights
              </div>
              <div className="text-xs" style={{ color: "var(--slate)" }}>
                Based on {business.reviews.length.toLocaleString()} reviews
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              {best && (
                <DayHighlightCard
                  kind="best"
                  stat={best}
                  headline="Most positive day"
                  sub="Best day to visit — highest average rating"
                />
              )}
              {worst && (
                <DayHighlightCard
                  kind="worst"
                  stat={worst}
                  headline="Most negative day"
                  sub="Worst day to visit — lowest average rating"
                />
              )}
            </div>

            {/* Overview stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              {[
                { label: "Total reviews", value: business.reviews.length.toLocaleString() },
                { label: "Average rating", value: business.overallAvg.toFixed(2) },
                { label: "5-star share", value: `${fiveStarPct.toFixed(0)}%` },
                {
                  label: "Most reviewed day",
                  value: [...weekdayStats].sort((a, b) => b.count - a.count)[0]?.day ?? "—",
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl px-4 py-3"
                  style={{ background: "var(--paper-raised)", border: "1px solid var(--line)" }}
                >
                  <div className="text-xs mb-1" style={{ color: "var(--slate)" }}>
                    {stat.label}
                  </div>
                  <div className="serif text-2xl" style={{ fontWeight: 600 }}>
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Weekly pattern chart */}
            <div
              className="rounded-xl p-5 mb-8"
              style={{ background: "var(--paper-raised)", border: "1px solid var(--line)" }}
            >
              <div className="flex items-baseline justify-between mb-4">
                <div className="serif text-lg" style={{ fontWeight: 600 }}>
                  Rating by day of week
                </div>
                <div className="text-xs" style={{ color: "var(--slate)" }}>
                  Average star rating, all-time
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={weekdayStats} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--line)" />
                  <XAxis
                    dataKey="day"
                    tick={{ fill: "var(--slate)", fontSize: 12 }}
                    axisLine={{ stroke: "var(--line)" }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 5]}
                    tick={{ fill: "var(--slate)", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(28,35,33,0.04)" }}
                    contentStyle={{
                      borderRadius: 8,
                      border: "1px solid var(--line)",
                      fontSize: 12,
                    }}
                    formatter={(value, name, props) => [
                      `${value.toFixed(2)} ★  (${props.payload.count} reviews)`,
                      props.payload.dayLong,
                    ]}
                    labelFormatter={() => ""}
                  />
                  <Bar dataKey="avg" radius={[5, 5, 0, 0]} maxBarSize={44}>
                    {weekdayStats.map((entry, idx) => (
                      <Cell
                        key={idx}
                        fill={
                          best && entry.day === best.day
                            ? "var(--forest)"
                            : worst && entry.day === worst.day
                            ? "var(--rust)"
                            : "#CFD3CB"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="grid lg:grid-cols-[1fr_260px] gap-4 items-start">
              {/* Reviews list */}
              <div
                className="rounded-xl p-5"
                style={{ background: "var(--paper-raised)", border: "1px solid var(--line)" }}
              >
                <div className="serif text-lg mb-4" style={{ fontWeight: 600 }}>
                  Reviews
                </div>

                {/* Controls */}
                <div className="flex flex-col gap-3 mb-4">
                  <div
                    className="flex items-center gap-2 rounded-lg px-3 py-2"
                    style={{ border: "1px solid var(--line)" }}
                  >
                    <Search width={14} height={14} color="var(--slate)" />
                    <input
                      value={reviewSearch}
                      onChange={(e) => {
                        setReviewSearch(e.target.value);
                        setVisibleCount(10);
                      }}
                      placeholder="Search within reviews"
                      className="flex-1 outline-none bg-transparent text-sm"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex gap-1.5 overflow-x-auto rd-scroll pb-1">
                      <DayChip
                        active={dayFilter === null}
                        onClick={() => {
                          setDayFilter(null);
                          setVisibleCount(10);
                        }}
                        label="All days"
                      />
                      {WEEKDAYS.map((d, i) => (
                        <DayChip
                          key={d}
                          active={dayFilter === i}
                          onClick={() => {
                            setDayFilter(i);
                            setVisibleCount(10);
                          }}
                          label={d}
                        />
                      ))}
                    </div>

                    <div className="relative">
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="text-xs rounded-lg pl-3 pr-7 py-2 appearance-none"
                        style={{ border: "1px solid var(--line)", background: "var(--paper-raised)" }}
                      >
                        <option value="recent">Most recent</option>
                        <option value="highest">Highest rated</option>
                        <option value="lowest">Lowest rated</option>
                        <option value="helpful">Most helpful</option>
                      </select>
                      <ChevronDown
                        width={13}
                        height={13}
                        style={{ position: "absolute", right: 8, top: 8, pointerEvents: "none" }}
                        color="var(--slate)"
                      />
                    </div>
                  </div>
                </div>

                <div className="text-xs mb-3" style={{ color: "var(--slate)" }}>
                  {filteredReviews.length.toLocaleString()} review
                  {filteredReviews.length === 1 ? "" : "s"}
                  {dayFilter !== null ? ` on ${WEEKDAYS_LONG[dayFilter]}s` : ""}
                </div>

                {/* List */}
                <div className="flex flex-col divide-y" style={{ borderColor: "var(--line)" }}>
                  {visibleReviews.map((r) => (
                    <div key={r.id} className="py-4 first:pt-0">
                      <div className="flex items-start gap-3">
                        <div
                          className="flex items-center justify-center rounded-full text-xs font-semibold flex-shrink-0"
                          style={{
                            width: 34,
                            height: 34,
                            background: avatarColor(r.author),
                            color: "#fff",
                          }}
                        >
                          {initials(r.author)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="text-sm font-medium">{r.author}</div>
                            <div className="text-xs" style={{ color: "var(--slate)" }}>
                              {formatDate(r.date)}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 my-1">
                            <Stars rating={r.rating} size={12} />
                            <span
                              className="text-[11px] rounded-full px-2 py-0.5"
                              style={{ background: "#EFEEE6", color: "var(--slate)" }}
                            >
                              {WEEKDAYS_LONG[r.day]}
                            </span>
                          </div>
                          <p className="text-sm leading-relaxed" style={{ color: "#3A3F3B" }}>
                            {r.text}
                          </p>
                          {r.helpful > 0 && (
                            <div
                              className="flex items-center gap-1 mt-2 text-xs"
                              style={{ color: "var(--slate)" }}
                            >
                              <ThumbsUp width={12} height={12} />
                              {r.helpful} found this helpful
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {filteredReviews.length === 0 && (
                    <div className="py-10 text-center text-sm" style={{ color: "var(--slate)" }}>
                      No reviews match this filter. Try a different day or search term.
                    </div>
                  )}
                </div>

                {visibleCount < filteredReviews.length && (
                  <button
                    onClick={() => setVisibleCount((v) => v + 10)}
                    className="w-full mt-4 text-sm rounded-lg py-2.5 font-medium"
                    style={{ border: "1px solid var(--line)", color: "var(--ink)" }}
                  >
                    Show more reviews
                  </button>
                )}
              </div>

              {/* Sidebar: distribution */}
              <div
                className="rounded-xl p-5"
                style={{ background: "var(--paper-raised)", border: "1px solid var(--line)" }}
              >
                <div className="serif text-base mb-4" style={{ fontWeight: 600 }}>
                  Rating distribution
                </div>
                <div className="flex flex-col gap-2.5">
                  {ratingDistribution.map((d) => (
                    <div key={d.star} className="flex items-center gap-2">
                      <div className="text-xs w-3" style={{ color: "var(--slate)" }}>
                        {d.star}
                      </div>
                      <Star width={11} height={11} fill="var(--gold)" stroke="var(--gold)" />
                      <div
                        className="flex-1 rounded-full overflow-hidden"
                        style={{ height: 7, background: "#EFEEE6" }}
                      >
                        <div
                          style={{
                            width: `${d.pct}%`,
                            height: "100%",
                            background: "var(--gold)",
                            borderRadius: 999,
                          }}
                        />
                      </div>
                      <div className="text-xs w-9 text-right" style={{ color: "var(--slate)" }}>
                        {d.count}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 pt-4" style={{ borderTop: "1px solid var(--line)" }}>
                  <div className="text-xs mb-2" style={{ color: "var(--slate)" }}>
                    Reviews per day
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {weekdayStats.map((s) => (
                      <div key={s.day} className="flex items-center justify-between text-xs">
                        <span>{s.day}</span>
                        <span style={{ color: "var(--slate)" }}>{s.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
