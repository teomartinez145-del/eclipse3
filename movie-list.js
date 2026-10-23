/* =========================================================
   Eclipse Entertainment – Shared movie data & helpers
   Used by index.html and asientos.html
   ========================================================= */

/* ---------- MOVIES (edit here) ----------
   - Times use 24-hour format: "19:30" = 7:30pm.
   - Times before 05:00 count as after midnight (late shows).
   - genre, rating, duration, synopsis and times are EXAMPLES: change them to the real ones.
   - trailer: paste a YouTube link, or leave "" to hide the button.
   - Format names must match a name in PRICES below.
*/
const movies = [
  {
    id: "garfield",
    title: "Garfield",
    poster: "images/garfield.jpg",
    genre: "Animation, Comedy",
    rating: "PG",
    duration: "1 hr 41 min",
    synopsis: "The lasagna-loving cat is pulled off his couch and into a wild outdoor heist when his long-lost father suddenly shows up.",
    trailer: "",
    formats: [
      { name: "Standard 2D", times: ["11:30", "13:45", "16:00", "18:15", "20:30"] },
      { name: "RealD 3D", times: ["12:15", "14:30", "17:00"] }
    ]
  },
  {
    id: "wonka",
    title: "Wonka",
    poster: "images/image (1).png",
    genre: "Family, Fantasy, Musical",
    rating: "PG",
    duration: "1 hr 56 min",
    synopsis: "A young Willy Wonka arrives in a city ruled by a chocolate cartel and sets out to open the chocolate shop of his dreams.",
    trailer: "",
    formats: [
      { name: "Standard 2D", times: ["12:00", "14:40", "17:20", "19:30", "22:00"] }
    ]
  },
  {
    id: "spider-man",
    title: "Spider-Man",
    poster: "images/image (2).png",
    genre: "Action, Adventure, Sci-Fi",
    rating: "PG-13",
    duration: "2 hr 28 min",
    synopsis: "Peter Parker tries to balance school, friends and a city that needs Spider-Man more than ever.",
    trailer: "",
    formats: [
      { name: "IMAX", times: ["13:00", "16:15", "19:30", "22:45"] },
      { name: "Standard 2D", times: ["11:45", "15:00", "18:10", "21:20"] }
    ]
  },
  {
    id: "godzilla-x-kong",
    title: "Godzilla x Kong",
    poster: "images/image (3).png",
    genre: "Action, Sci-Fi",
    rating: "PG-13",
    duration: "1 hr 55 min",
    synopsis: "The two titans must team up against a hidden threat rising from deep inside Hollow Earth.",
    trailer: "",
    formats: [
      { name: "IMAX 3D", times: ["12:30", "15:10", "18:00", "20:45"] },
      { name: "Standard 2D", times: ["13:15", "16:00", "19:15", "22:10"] }
    ]
  },
  {
    id: "mario-bros",
    title: "Mario Bros",
    poster: "images/image (4).png",
    genre: "Animation, Adventure, Family",
    rating: "PG",
    duration: "1 hr 32 min",
    synopsis: "A Brooklyn plumber is swept into the Mushroom Kingdom and races to rescue his brother from Bowser.",
    trailer: "",
    formats: [
      { name: "Standard 2D", times: ["10:45", "12:50", "15:00", "17:10", "19:20"] },
      { name: "RealD 3D", times: ["11:30", "14:00", "16:30"] }
    ]
  },
  {
    id: "batman",
    title: "Batman",
    poster: "images/image (5).png",
    genre: "Action, Crime, Drama",
    rating: "PG-13",
    duration: "2 hr 56 min",
    synopsis: "In his second year fighting crime, Batman follows a trail of riddles deep into Gotham's corruption.",
    trailer: "",
    formats: [
      { name: "IMAX", times: ["13:30", "17:15", "21:00", "00:45"] },
      { name: "Standard 2D", times: ["12:00", "15:45", "19:30"] }
    ]
  },
  {
    id: "jaws",
    title: "Jaws",
    poster: "images/image (6).png",
    genre: "Thriller, Adventure",
    rating: "PG",
    duration: "2 hr 4 min",
    synopsis: "A great white shark terrorizes a beach town, and the police chief heads out to sea to stop it.",
    trailer: "",
    formats: [
      { name: "Standard 2D", times: ["14:00", "18:30", "21:45"] }
    ]
  },
  {
    id: "007",
    title: "007",
    poster: "images/007.jpeg",
    genre: "Action, Adventure, Thriller",
    rating: "PG-13",
    duration: "2 hr 43 min",
    synopsis: "James Bond is pulled out of retirement for a mission that puts everything he loves at risk.",
    trailer: "",
    formats: [
      { name: "IMAX", times: ["12:45", "16:30", "20:15"] },
      { name: "Standard 2D", times: ["13:20", "17:00", "20:50"] }
    ]
  },
  {
    id: "pirates-of-the-caribbean",
    title: "Pirates of the Caribbean",
    poster: "images/pirates of the caribbean.jpeg",
    genre: "Action, Adventure, Fantasy",
    rating: "PG-13",
    duration: "2 hr 23 min",
    synopsis: "Captain Jack Sparrow teams up with a young blacksmith to rescue a governor's daughter from a crew of cursed pirates.",
    trailer: "",
    formats: [
      { name: "Standard 2D", times: ["11:15", "14:30", "17:45", "21:00"] }
    ]
  },
  {
    id: "elemental",
    title: "Elemental",
    poster: "images/elemental.jpg",
    genre: "Animation, Comedy, Romance",
    rating: "PG",
    duration: "1 hr 41 min",
    synopsis: "In a city where fire, water, land and air residents live together, a fiery young woman meets a go-with-the-flow guy.",
    trailer: "",
    formats: [
      { name: "Standard 2D", times: ["10:30", "12:45", "15:00", "17:15"] },
      { name: "RealD 3D", times: ["11:45", "14:15", "16:40", "19:00"] }
    ]
  }
];

/* ---------- TICKET PRICES (per seat) ---------- */
const PRICES = {
  "Standard 2D": 12,
  "RealD 3D": 15,
  "IMAX": 18,
  "IMAX 3D": 20
};
const DEFAULT_PRICE = 12;

/* ---------- SHARED HELPERS ---------- */
function getPrice(formatName) {
  return PRICES[formatName] ?? DEFAULT_PRICE;
}

function formatMoney(amount) {
  return "$" + (Number.isInteger(amount) ? amount : amount.toFixed(2));
}

function esc(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Date -> "2026-09-27"
function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// "19:30" -> "7:30pm"
function formatTime(time) {
  let [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, "0")}${suffix}`;
}

// Real date/time of a showtime (times before 5am belong to the next day)
function showtimeDate(day, time) {
  const [h, m] = time.split(":").map(Number);
  const d = new Date(day);
  d.setHours(h, m, 0, 0);
  if (h < 5) d.setDate(d.getDate() + 1);
  return d;
}