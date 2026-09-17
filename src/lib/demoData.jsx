/* ------------------------------------------------------------------ */
/*  Deterministic pseudo-random demo data generator.                  */
/*  Used as the fallback when the live backend (review-world-backend) */
/*  is unreachable — see lib/api.jsx.                                 */
/* ------------------------------------------------------------------ */

function hashString(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeRng(seedStr) {
  const seedFn = hashString(seedStr);
  return mulberry32(seedFn());
}

function gaussian(rng, mean, sd) {
  const u1 = Math.max(rng(), 1e-6);
  const u2 = rng();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * sd;
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const WEEKDAYS_LONG = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export const SUGGESTIONS = [
  "The Copper Kettle",
  "Sunset Yoga Collective",
  "Marchetti's Trattoria",
  "Ridgeline Auto Care",
];

const CATEGORIES = [
  "Coffee Shop",
  "Italian Restaurant",
  "Yoga Studio",
  "Bakery",
  "Auto Repair Shop",
  "Dental Clinic",
  "Boutique Hotel",
  "Independent Bookstore",
  "Gym & Fitness Center",
  "Day Spa",
  "Ramen Bar",
  "Craft Brewery",
];

const AUTHORS = [
  "Priya Nair", "Daniel Osei", "Marta Kowalski", "James Whitfield", "Aiko Tanaka",
  "Lucas Ferreira", "Fatima Al-Sayed", "Noah Bergström", "Chidinma Eze", "Elena Petrova",
  "Ravi Subramaniam", "Grace Kim", "Tomás Reyes", "Sofia Marchetti", "Ben Carter",
  "Yuki Sato", "Amara Okafor", "Liam O'Connell", "Hana Kobayashi", "Diego Alvarez",
  "Ingrid Larsen", "Samuel Osborne", "Meera Pillai", "Owen Fitzgerald", "Zara Ahmed",
  "Carlos Mendes", "Nadia Petrov", "Ethan Brooks", "Leilani Kahale", "Arjun Mehta",
];

const TEXT_POOL = {
  5: [
    "Everything about this visit was excellent — attentive staff and a spotless space.",
    "Genuinely one of the best experiences I've had here in years. Will be back.",
    "The whole team clearly cares about quality. Worth every minute of the wait.",
    "Exceeded expectations from the moment I walked in. Highly recommend to anyone nearby.",
    "Consistently great. I've never had a bad visit here, and today was no exception.",
    "Small details made the difference — friendly greeting, quick service, great result.",
  ],
  4: [
    "Really solid visit overall, just a touch slower than I'd like during peak hours.",
    "Good quality and friendly staff. A couple of minor things could be tightened up.",
    "Enjoyed it — would come back, though it was busier than expected.",
    "Above average experience. Nothing to complain about, just not quite five-star.",
    "Reliable and pleasant. My go-to when I don't want to think too hard about it.",
  ],
  3: [
    "It was fine. Nothing stood out as particularly good or bad.",
    "Average experience. Staff were polite but the wait felt longer than it should.",
    "Decent option but I've had better nearby for a similar price.",
    "Mixed feelings — part of the visit was great, part was underwhelming.",
  ],
  2: [
    "Service was slow and a bit disorganized. Expected more given the reviews.",
    "Disappointed with how rushed the whole thing felt. Might give it one more try.",
    "Not terrible, but enough small issues that I probably won't return soon.",
    "The staff seemed overwhelmed. Long wait for something that should be quick.",
  ],
  1: [
    "Frustrating experience from start to finish. Would not recommend at this time.",
    "Waited far too long and the outcome still didn't match what was promised.",
    "Poor communication and no real apology when things went wrong.",
    "Not what I expected at all. Won't be going back after today.",
  ],
};

const STREET_NAMES = ["Elm", "Harbor", "Willow", "5th", "Maple", "Cedar", "Park", "Union"];
const CITIES = ["Riverton", "Brookhaven", "Fairview", "Millbrook", "Ashford", "Clearwater"];

function toTitleCase(s) {
  if (!s) return "Unknown Location";
  return s.replace(/\w\S*/g, (t) => t[0].toUpperCase() + t.slice(1));
}

function fakeAddress(rng) {
  const num = Math.floor(20 + rng() * 900);
  const street = pick(rng, STREET_NAMES);
  const city = pick(rng, CITIES);
  return `${num} ${street} St, ${city}`;
}

export function generateBusinessData(query) {
  const rng = makeRng(query.trim().toLowerCase());

  const category = pick(rng, CATEGORIES);
  const baseAvg = 3.4 + rng() * 1.3; // business's "true" underlying quality, 3.4–4.7
  const dayBias = WEEKDAYS.map(() => (rng() - 0.5) * 1.6); // per-weekday rating shift
  const totalReviews = Math.floor(80 + rng() * 260);

  const now = new Date();
  const reviews = [];

  for (let i = 0; i < totalReviews; i++) {
    const daysAgo = Math.floor(rng() * 270);
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    const dow = date.getDay();

    const raw = gaussian(rng, baseAvg + dayBias[dow], 0.85);
    const rating = Math.round(Math.min(5, Math.max(1, raw)));

    const author = pick(rng, AUTHORS);
    const text = pick(rng, TEXT_POOL[rating]);
    const helpful = Math.floor(rng() * rng() * 40);

    reviews.push({
      id: `${query}-${i}`,
      author,
      rating,
      date,
      day: dow,
      text,
      helpful,
    });
  }

  reviews.sort((a, b) => b.date - a.date);

  const overallAvg =
    reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;

  return {
    name: toTitleCase(query.trim()),
    category,
    address: fakeAddress(rng),
    overallAvg,
    reviews,
  };
}
