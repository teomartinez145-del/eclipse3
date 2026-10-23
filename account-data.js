/* =========================================================
   Eclipse Entertainment – Account data (my-eclipse.html)
   Tiers, rewards, badges, plans + saving everything in the
   browser (localStorage). DEMO ONLY: nothing is sent anywhere.
   ========================================================= */

const ACCOUNT_KEY = "eclipseAccount";   // same key used by tickets.js and food.js
const POINTS_PER_DOLLAR = 10;
const RATING_POINTS = 25;
const MAIN_THEATRE = { name: "Eclipse Downtown Orlando", lat: 28.5421, lng: -81.3790 };

/* ---------- REWARD TIERS (moon phases) ----------
   Based on LIFETIME points earned (redeeming doesn't drop your tier) */
const TIERS = [
  { id: "new", name: "New Moon", icon: "🌑", min: 0, perk: "Earn 10 points per $1" },
  { id: "crescent", name: "Crescent", icon: "🌒", min: 500, perk: "Free size upgrade on popcorn" },
  { id: "half", name: "Half Moon", icon: "🌓", min: 1500, perk: "Skip-the-line concessions" },
  { id: "full", name: "Full Moon", icon: "🌕", min: 3000, perk: "Free ticket on your birthday" },
  { id: "eclipse", name: "Total Eclipse", icon: "🌘", min: 6000, perk: "Early access screenings + 2x points" }
];

/* ---------- REWARDS CATALOG ---------- */
const REWARDS = [
  { id: "drink", name: "Free Fountain Soda", icon: "🥤", cost: 400, desc: "Any size, any flavor." },
  { id: "popcorn", name: "Free Large Popcorn", icon: "🍿", cost: 500, desc: "Butter or any one flavor." },
  { id: "candy", name: "Candy Mix Bag", icon: "🍬", cost: 450, desc: "Build your own bag." },
  { id: "imax", name: "IMAX Upgrade", icon: "🎞️", cost: 800, desc: "Upgrade one Standard ticket to IMAX." },
  { id: "combo", name: "Movie Night Combo", icon: "🍱", cost: 1200, desc: "Large popcorn, 2 drinks and candy." },
  { id: "ticket", name: "Free Movie Ticket", icon: "🎟️", cost: 1500, desc: "Any Standard 2D showtime." }
];

/* ---------- BADGES ----------
   test(account) returns true when the badge is earned */
const BADGES = [
  { id: "first", name: "First Movie", icon: "🎬", hint: "Buy your first ticket", test: (a) => a.tickets.length >= 1 },
  { id: "imax", name: "IMAX Fan", icon: "🎞️", hint: "Buy 2 IMAX tickets", test: (a) => a.tickets.filter((t) => t.format.includes("IMAX")).length >= 2 },
  { id: "owl", name: "Night Owl", icon: "🦉", hint: "Watch a movie after 10pm", test: (a) => a.tickets.some((t) => { const h = Number(t.time.split(":")[0]); return h >= 22 || h < 5; }) },
  { id: "critic", name: "Critic", icon: "⭐", hint: "Rate 3 movies", test: (a) => Object.keys(a.ratings).length >= 3 },
  { id: "snacker", name: "Snack Lover", icon: "🍿", hint: "Order from Snack Studio", test: (a) => a.history.some((h) => h.type === "food") },
  { id: "squad", name: "Squad Goals", icon: "👨‍👩‍👧‍👦", hint: "Buy 4+ seats at once", test: (a) => a.tickets.some((t) => t.seats.length >= 4) },
  { id: "member", name: "Member", icon: "💜", hint: "Join a subscription", test: (a) => !!(a.plan && a.plan.status !== "canceled") }
];

/* ---------- SUBSCRIPTION PLANS ---------- */
const PLANS = [
  {
    id: "go", name: "Eclipse Go", monthly: 9.99, movies: 1,
    features: ["1 movie every month", "Standard 2D showtimes", "Earn 10 pts per $1", "Unused movie rolls over 1 month"]
  },
  {
    id: "plus", name: "Eclipse Plus", monthly: 19.99, movies: 3, popular: true,
    features: ["3 movies every month", "2D, 3D and 4DX showtimes", "10% off food & drinks", "Bring a friend for $8"]
  },
  {
    id: "unlimited", name: "Eclipse Unlimited", monthly: 29.99, movies: Infinity,
    features: ["Unlimited movies", "IMAX & all formats included", "20% off food & drinks", "Free popcorn refills", "2x reward points"]
  }
];
const YEARLY_MONTHS = 10;   // yearly price = 10 months (2 months free)

/* =========================================================
   STORAGE
   ========================================================= */
function emptyAccount() {
  return { profile: null, memberSince: null, tickets: [], history: [], ratings: {}, coupons: [], plan: null };
}

function loadAccount() {
  try {
    const saved = JSON.parse(localStorage.getItem(ACCOUNT_KEY));
    return { ...emptyAccount(), ...(saved || {}) };
  } catch (e) {
    return emptyAccount();
  }
}

function saveAccount(account) {
  try {
    localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
    return true;
  } catch (e) {
    return false;   // storage blocked (private mode, etc.)
  }
}

/* =========================================================
   POINTS + TIERS
   ========================================================= */
function availablePoints(account) {
  return account.history.reduce((sum, h) => sum + h.points, 0);
}

function lifetimePoints(account) {
  return account.history.filter((h) => h.points > 0).reduce((sum, h) => sum + h.points, 0);
}

function tierFor(points) {
  let current = TIERS[0];
  TIERS.forEach((t) => { if (points >= t.min) current = t; });
  const next = TIERS[TIERS.indexOf(current) + 1] || null;
  const progress = next ? (points - current.min) / (next.min - current.min) : 1;
  return { current, next, progress: Math.max(0, Math.min(1, progress)) };
}

function addPoints(account, points, label, type) {
  account.history.unshift({ date: new Date().toISOString(), points, label, type });
}

/* =========================================================
   DEMO DATA (for presentations)
   ========================================================= */
function dayOffset(days) {
  const d = startOfDay(new Date());
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

function demoTicket(movieId, days, time, format, seats) {
  const movie = movies.find((m) => m.id === movieId);
  const fmt = movie.formats.find((f) => f.name === format) || movie.formats[0];
  const t = fmt.times.includes(time) ? time : fmt.times[fmt.times.length - 1];
  const date = dayOffset(days);
  return {
    id: `${movie.id}|${date}|${t}|${fmt.name}|${seats.join(",")}`,
    movie: movie.id, date, time: t, format: fmt.name, seats,
    total: getPrice(fmt.name) * seats.length,
    purchasedAt: new Date(Date.now() - Math.abs(days) * 86400000 - 86400000).toISOString()
  };
}

function buildDemoAccount(profile) {
  const account = emptyAccount();
  account.profile = profile;
  account.memberSince = dayOffset(-190);

  account.tickets = [
    demoTicket("wonka", 1, "19:30", "Standard 2D", ["F7", "F8"]),
    demoTicket("godzilla-x-kong", 3, "20:45", "IMAX 3D", ["E5", "E6", "E7", "E8"]),
    demoTicket("batman", -5, "21:00", "IMAX", ["G9"]),
    demoTicket("mario-bros", -12, "15:00", "Standard 2D", ["C4", "C5"]),
    demoTicket("elemental", -20, "17:15", "Standard 2D", ["D10", "D11"])
  ];

  const daysAgo = (d) => new Date(Date.now() - d * 86400000).toISOString();
  const title = (id) => movies.find((m) => m.id === id).title;

  account.history = [
    { date: daysAgo(1), points: Math.round(account.tickets[0].total * POINTS_PER_DOLLAR), label: `${title("wonka")} tickets`, type: "ticket" },
    { date: daysAgo(2), points: Math.round(account.tickets[1].total * POINTS_PER_DOLLAR), label: `${title("godzilla-x-kong")} tickets`, type: "ticket" },
    { date: daysAgo(4), points: RATING_POINTS, label: `Rated ${title("batman")}`, type: "rating" },
    { date: daysAgo(5), points: 245, label: "Snack Studio order #4821", type: "food" },
    { date: daysAgo(6), points: Math.round(account.tickets[2].total * POINTS_PER_DOLLAR), label: `${title("batman")} tickets`, type: "ticket" },
    { date: daysAgo(9), points: -500, label: "Redeemed: Free Large Popcorn", type: "redeem" },
    { date: daysAgo(13), points: Math.round(account.tickets[3].total * POINTS_PER_DOLLAR), label: `${title("mario-bros")} tickets`, type: "ticket" },
    { date: daysAgo(21), points: Math.round(account.tickets[4].total * POINTS_PER_DOLLAR), label: `${title("elemental")} tickets`, type: "ticket" },
    { date: daysAgo(60), points: 600, label: "Welcome bonus", type: "bonus" }
  ];

  account.ratings = { [account.tickets[2].id]: 5 };
  account.coupons = [];

  const since = new Date(Date.now() - 64 * 86400000);
  const renews = new Date();
  renews.setDate(renews.getDate() + 18);
  account.plan = { id: "plus", billing: "monthly", status: "active", since: since.toISOString(), renews: renews.toISOString(), offer: false };

  return account;
}