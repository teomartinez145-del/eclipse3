/* =========================================================
   Eclipse Entertainment – Tickets page (tickets.html)
   Reads the booking from the link:
   tickets.html?movie=wonka&date=2026-09-28&time=19:30&format=Standard+2D&seats=E7,E8
   Also saves the purchase for My Eclipse (my-eclipse.html)
   ========================================================= */

/* ---------- SETTINGS ---------- */
const MAX_SEATS = 8;
const THEATRE_NAME = "Eclipse Entertainment";

/* ---------- STATE ---------- */
const booking = { movie: null, format: null, date: null, time: null, seats: [] };

/* ---------- ELEMENTS ---------- */
const $ = (id) => document.getElementById(id);

const longDateFmt = new Intl.DateTimeFormat("en-US", { day: "numeric", month: "long", year: "numeric" });
const monthFmt = new Intl.DateTimeFormat("en-US", { month: "short" });

/* ---------- READ THE BOOKING FROM THE LINK ---------- */
function parseISODate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return isNaN(date) ? null : date;
}

function parseSeats(value) {
  const seats = [];
  (value || "").split(",").forEach((raw) => {
    const id = raw.trim().toUpperCase();
    if (/^[A-J](1[0-4]|[1-9])$/.test(id) && !seats.includes(id) && seats.length < MAX_SEATS) {
      seats.push(id);
    }
  });
  return seats;
}

function loadBooking() {
  const params = new URLSearchParams(window.location.search);

  const movie = movies.find((m) => m.id === params.get("movie"));
  if (!movie) return false;

  const format = movie.formats.find((f) => f.name === params.get("format"));
  const date = parseISODate(params.get("date") || "");
  const time = params.get("time");
  const seats = parseSeats(params.get("seats"));

  if (!format || !date || !time || !format.times.includes(time) || seats.length === 0) return false;

  booking.movie = movie;
  booking.format = format;
  booking.date = date;
  booking.time = time;
  booking.seats = seats;
  return true;
}

function showError() {
  $("bookingInner").hidden = true;
  $("bookingError").hidden = false;
  $("movieTitle").textContent = "Choose a showtime";
}

/* ---------- HELPERS ---------- */
function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// "19:30" -> { clock: "7:30", suffix: "pm" }
function splitTime(time) {
  const label = formatTime(time);
  return { clock: label.slice(0, -2), suffix: label.slice(-2) };
}

// Ticket number that is always the same for the same seat and showtime
function ticketNumber(seatId) {
  const key = `${booking.movie.id}|${toISODate(booking.date)}|${booking.time}|${seatId}`;
  const a = String(hashString(key)).padStart(10, "0");
  const b = String(hashString(key + "#")).padStart(10, "0");
  return `${a.slice(0, 3)} ${a.slice(3, 4)} ${a.slice(4, 7)} ${a.slice(7)} ${b.slice(0, 3)} ${b.slice(3, 5)} ${b.slice(5, 9)} ${b.slice(9)}`;
}

// Barcode drawn as an SVG (bars depend on the ticket number)
function barcodeSVG(seed) {
  let x = 0;
  let n = hashString(seed);
  let bars = "";

  while (x < 196) {
    n = Math.imul(n ^ (n >>> 13), 1103515245) + 12345;
    const width = 1 + ((n >>> 8) % 3);
    const gap = 1 + ((n >>> 16) % 2);
    bars += `<rect x="${x}" y="0" width="${width}" height="44"/>`;
    x += width + gap;
  }

  return `<svg class="barcode" viewBox="0 0 196 44" preserveAspectRatio="none" aria-hidden="true">${bars}</svg>`;
}

/* ---------- PAGE INFO ---------- */
function renderInfo() {
  const { movie, seats } = booking;

  document.title = `${movie.title} – Your Tickets | Eclipse Entertainment`;
  $("movieTitle").textContent = movie.title;
  $("movieSub").textContent = `${movie.genre} • ${movie.rating} • ${movie.duration}`;

  $("moviePoster").src = movie.poster;
  $("moviePoster").alt = `${movie.title} poster`;
  $("seatHero").style.setProperty("--backdrop", `url("${encodeURI(movie.poster)}")`);

  const count = seats.length;
  $("successText").textContent = `Your ${count} ${count === 1 ? "ticket is" : "tickets are"} ready. Show ${count === 1 ? "it" : "them"} at the entrance.`;
}

/* ---------- TICKETS ---------- */
function createTicket(seatId, index) {
  const { movie, format, date, time } = booking;
  const row = seatId.charAt(0);
  const seat = seatId.slice(1);
  const { clock, suffix } = splitTime(time);
  const number = ticketNumber(seatId);

  const ticket = document.createElement("article");
  ticket.className = "ticket";
  ticket.style.animationDelay = `${index * 90}ms`;
  ticket.setAttribute("aria-label", `${movie.title} ticket, row ${row}, seat ${seat}`);

  ticket.innerHTML = `
    <div class="ticket-stub">
      <div class="stub-top">
        <p>ROW: ${row}<br>SEAT: ${seat}</p>
        <p>${longDateFmt.format(date).toUpperCase()}<br>${formatTime(time).toUpperCase()}</p>
      </div>
      ${barcodeSVG(number)}
      <p class="stub-number">${number}</p>
      <p class="stub-name">${THEATRE_NAME.toUpperCase()}</p>
    </div>

    <div class="ticket-main">
      <div class="ticket-bg" style="background-image: url('${encodeURI(movie.poster)}')"></div>
      <img class="ticket-logo" src="images/logo.png" alt="">
      <p class="ticket-format">${esc(format.name)}</p>
      <h3 class="ticket-title">${esc(movie.title)}</h3>

      <div class="ticket-details">
        <div><span>Row</span><strong>${row}</strong></div>
        <div><span>Seat</span><strong>${seat}</strong></div>
        <div><span>Date</span><strong>${date.getDate()}<small>${monthFmt.format(date).toLowerCase()}</small></strong></div>
        <div><span>Time</span><strong>${clock}<small>${suffix}</small></strong></div>
      </div>
    </div>
  `;

  return ticket;
}

function renderTickets() {
  const stack = $("ticketStack");
  stack.innerHTML = "";
  booking.seats.forEach((id, i) => stack.appendChild(createTicket(id, i)));
}

/* ---------- SEND BY EMAIL (demo: nothing is sent) ---------- */
$("emailForm").addEventListener("submit", (e) => {
  e.preventDefault();

  const input = $("emailInput");
  const message = $("emailMessage");
  const email = input.value.trim();

  message.classList.remove("ok", "error");

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    message.textContent = "Please enter a valid email.";
    message.classList.add("error");
    input.focus();
    return;
  }

  message.textContent = `Tickets sent to ${email} ✓ (demo)`;
  message.classList.add("ok");
  input.value = "";
});

/* ---------- PRINT ---------- */
$("printBtn").addEventListener("click", () => window.print());

/* ---------- SAVE TO MY ECLIPSE (browser storage) ---------- */
// Saves the purchase so it shows up in my-eclipse.html and earns points
// (10 points per $1). Reloading this page never saves it twice.
function saveToMyEclipse() {
  const KEY = "eclipseAccount";
  try {
    const account = JSON.parse(localStorage.getItem(KEY)) || {};
    account.tickets = account.tickets || [];
    account.history = account.history || [];
    account.ratings = account.ratings || {};
    account.coupons = account.coupons || [];

    const date = toISODate(booking.date);
    const id = `${booking.movie.id}|${date}|${booking.time}|${booking.format.name}|${booking.seats.join(",")}`;
    if (account.tickets.some((t) => t.id === id)) return;

    const total = getPrice(booking.format.name) * booking.seats.length;
    account.tickets.push({
      id, movie: booking.movie.id, date, time: booking.time, format: booking.format.name,
      seats: booking.seats, total, purchasedAt: new Date().toISOString()
    });
    account.history.unshift({
      date: new Date().toISOString(), points: Math.round(total * 10),
      label: `${booking.movie.title} tickets`, type: "ticket"
    });

    localStorage.setItem(KEY, JSON.stringify(account));
  } catch (e) {
    // storage blocked: the tickets page still works, it just isn't saved
  }
}

/* ---------- INIT ---------- */
if (loadBooking()) {
  renderInfo();
  renderTickets();
  saveToMyEclipse();
} else {
  showError();
}