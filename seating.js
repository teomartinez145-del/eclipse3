/* =========================================================
   Eclipse Entertainment – Seat selection (seats.html)
   Reads the showtime from the link:
   seats.html?movie=wonka&date=2026-09-28&time=19:30&format=Standard+2D
   Optional: &seats=E7,E8 re-selects seats (used by "Change seats" on payment.html)
   ========================================================= */

/* ---------- SETTINGS ---------- */
const ROWS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
const SECTIONS = [3, 8, 3];          // seats per block (aisles go between blocks) = 14 per row
const CROSS_AISLE_BEFORE = "F";      // extra walkway before this row
const MAX_SEATS = 8;                 // max tickets per order
const TAKEN_RATIO = 0.3;             // ~30% of seats already sold (example)
const PAYMENT_PAGE = "payment.html";

/* ---------- STATE ---------- */
const booking = { movie: null, format: null, date: null, time: null, price: 0 };
const selected = new Set();          // seat ids like "E7"
let takenSeats = new Set();

/* ---------- ELEMENTS ---------- */
const $ = (id) => document.getElementById(id);

const seatHero = $("seatHero");
const movieTitle = $("movieTitle");
const movieSub = $("movieSub");
const moviePoster = $("moviePoster");
const bookingInner = $("bookingInner");
const bookingError = $("bookingError");
const errorTitle = $("errorTitle");
const errorText = $("errorText");
const seatMap = $("seatMap");
const seatMapScroll = $("seatMapScroll");
const seatMessage = $("seatMessage");
const ticketList = $("ticketList");
const ticketEmpty = $("ticketEmpty");
const totalPrice = $("totalPrice");
const nextBtn = $("nextBtn");
const mobileBar = $("mobileBar");
const mobileCount = $("mobileCount");
const mobileTotal = $("mobileTotal");
const mobileNext = $("mobileNext");
const mapHint = $("mapHint");

const monthFmt = new Intl.DateTimeFormat("en-US", { month: "short" });
const weekdayFmt = new Intl.DateTimeFormat("en-US", { weekday: "long" });

/* ---------- READ THE SHOWTIME FROM THE LINK ---------- */
function parseISODate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return isNaN(date) ? null : date;
}

function loadBooking() {
  const params = new URLSearchParams(window.location.search);

  const movie = movies.find((m) => m.id === params.get("movie"));
  if (!movie) return "missing";

  const format = movie.formats.find((f) => f.name === params.get("format"));
  const date = parseISODate(params.get("date") || "");
  const time = params.get("time");

  if (!format || !date || !time || !format.times.includes(time)) return "missing";
  if (showtimeDate(date, time) < new Date()) return "past";

  booking.movie = movie;
  booking.format = format;
  booking.date = date;
  booking.time = time;
  booking.price = getPrice(format.name);
  return "ok";
}

function showError(type) {
  bookingInner.hidden = true;
  mobileBar.hidden = true;
  bookingError.hidden = false;
  movieTitle.textContent = "Choose a showtime";

  if (type === "past") {
    errorTitle.textContent = "This showtime has already started";
    errorText.textContent = "Please pick another time or another day to choose your seats.";
  }
}

/* ---------- MOVIE + SHOWTIME INFO ---------- */
function renderInfo() {
  const { movie, format, date, time, price } = booking;

  document.title = `${movie.title} – Choose Your Seats | Eclipse Entertainment`;
  movieTitle.textContent = movie.title;
  movieSub.textContent = `${movie.genre} • ${movie.rating} • ${movie.duration}`;

  moviePoster.src = movie.poster;
  moviePoster.alt = `${movie.title} poster`;
  seatHero.style.setProperty("--backdrop", `url("${encodeURI(movie.poster)}")`);

  $("infoDay").textContent = date.getDate();
  $("infoMonth").textContent = monthFmt.format(date);
  $("infoWeekday").textContent = weekdayFmt.format(date);
  $("infoTime").textContent = formatTime(time);
  $("infoFormat").textContent = format.name;
  $("infoPrice").textContent = `${formatMoney(price)} / seat`;
}

/* ---------- TAKEN SEATS (same result for the same showtime) ---------- */
function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededRandom(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildTakenSeats() {
  const key = `${booking.movie.id}|${toISODate(booking.date)}|${booking.time}|${booking.format.name}`;
  const random = seededRandom(hashString(key));
  const seatsPerRow = SECTIONS.reduce((a, b) => a + b, 0);
  const taken = new Set();

  ROWS.forEach((row) => {
    for (let n = 1; n <= seatsPerRow; n++) {
      if (random() < TAKEN_RATIO) taken.add(`${row}${n}`);
    }
  });

  return taken;
}

/* ---------- SEAT MAP ---------- */
function createLabel(row) {
  const span = document.createElement("span");
  span.className = "row-label";
  span.textContent = row;
  return span;
}

function createSeat(row, number) {
  const id = `${row}${number}`;
  const seat = document.createElement("button");
  seat.type = "button";
  seat.className = "seat";
  seat.dataset.id = id;
  seat.title = id;

  if (takenSeats.has(id)) {
    seat.classList.add("taken");
    seat.disabled = true;
    seat.setAttribute("aria-label", `Row ${row}, seat ${number}, taken`);
  } else {
    seat.setAttribute("aria-label", `Row ${row}, seat ${number}, available`);
    seat.setAttribute("aria-pressed", "false");
    seat.addEventListener("click", () => toggleSeat(id));
  }

  return seat;
}

function renderSeatMap() {
  seatMap.innerHTML = "";

  ROWS.forEach((row) => {
    const rowEl = document.createElement("div");
    rowEl.className = "seat-row";
    if (row === CROSS_AISLE_BEFORE) rowEl.classList.add("cross-aisle");

    rowEl.appendChild(createLabel(row));

    let number = 1;
    SECTIONS.forEach((count, sectionIndex) => {
      if (sectionIndex > 0) {
        const aisle = document.createElement("span");
        aisle.className = "aisle";
        rowEl.appendChild(aisle);
      }
      for (let i = 0; i < count; i++) {
        rowEl.appendChild(createSeat(row, number));
        number++;
      }
    });

    rowEl.appendChild(createLabel(row));
    seatMap.appendChild(rowEl);
  });

  // On small screens, start with the center of the map visible
  requestAnimationFrame(() => {
    centerSeatMap();
    updateMapHint();
  });
}

/* ---------- SMALL SCREENS: map wider than the screen ---------- */
function centerSeatMap() {
  seatMapScroll.scrollLeft = (seatMapScroll.scrollWidth - seatMapScroll.clientWidth) / 2;
}

// Shows "Swipe to see all the seats" only when the map doesn't fit
function updateMapHint() {
  const scrolls = seatMapScroll.scrollWidth > seatMapScroll.clientWidth + 2;
  mapHint.classList.toggle("show", scrolls);
}

window.addEventListener("resize", updateMapHint);

/* ---------- SELECTING SEATS ---------- */
function splitId(id) {
  return { row: id.charAt(0), number: Number(id.slice(1)) };
}

function compareSeats(a, b) {
  const A = splitId(a);
  const B = splitId(b);
  return ROWS.indexOf(A.row) - ROWS.indexOf(B.row) || A.number - B.number;
}

function showMessage(text) {
  seatMessage.textContent = text;
}

function updateSeatButton(id) {
  const seat = seatMap.querySelector(`[data-id="${id}"]`);
  if (!seat) return;
  const { row, number } = splitId(id);
  const isSelected = selected.has(id);
  seat.classList.toggle("selected", isSelected);
  seat.setAttribute("aria-pressed", String(isSelected));
  seat.setAttribute("aria-label", `Row ${row}, seat ${number}, ${isSelected ? "selected" : "available"}`);
}

function toggleSeat(id) {
  if (selected.has(id)) {
    selected.delete(id);
  } else {
    if (selected.size >= MAX_SEATS) {
      showMessage(`You can select up to ${MAX_SEATS} seats per order.`);
      return;
    }
    selected.add(id);
  }

  showMessage("");
  updateSeatButton(id);
  renderSummary();
}

function removeSeat(id) {
  selected.delete(id);
  showMessage("");
  updateSeatButton(id);
  renderSummary();
}

/* ---------- SUMMARY (left list + total) ---------- */
function renderSummary() {
  const list = [...selected].sort(compareSeats);
  ticketList.innerHTML = "";

  list.forEach((id) => {
    const { row, number } = splitId(id);
    const item = document.createElement("div");
    item.className = "ticket-item";
    item.innerHTML = `
      <span class="t-big">${row}</span><span class="t-small">row</span>
      <span class="t-big">${number}</span><span class="t-small">seat</span>
      <span class="t-price">${formatMoney(booking.price)}</span>
      <button type="button" class="t-remove" aria-label="Remove row ${row} seat ${number}">&times;</button>
    `;
    item.querySelector(".t-remove").addEventListener("click", () => removeSeat(id));
    ticketList.appendChild(item);
  });

  const count = list.length;
  const total = count * booking.price;

  ticketEmpty.hidden = count > 0;
  totalPrice.textContent = formatMoney(total);
  mobileTotal.textContent = formatMoney(total);
  mobileCount.textContent = `${count} ${count === 1 ? "seat" : "seats"}`;
  nextBtn.disabled = count === 0;
  mobileNext.disabled = count === 0;
}

/* ---------- RE-SELECT SEATS COMING BACK FROM PAYMENT ---------- */
function preselectSeats() {
  const raw = new URLSearchParams(window.location.search).get("seats");
  if (!raw) return;

  raw.split(",").forEach((value) => {
    const id = value.trim().toUpperCase();
    if (selected.size >= MAX_SEATS || selected.has(id)) return;
    const exists = seatMap.querySelector(`[data-id="${id}"]`);
    if (exists && !takenSeats.has(id)) {
      selected.add(id);
      updateSeatButton(id);
    }
  });
}

/* ---------- NEXT → PAYMENT ---------- */
function goToPayment() {
  if (selected.size === 0) return;

  const params = new URLSearchParams({
    movie: booking.movie.id,
    date: toISODate(booking.date),
    time: booking.time,
    format: booking.format.name,
    seats: [...selected].sort(compareSeats).join(",")
  });

  window.location.href = `${PAYMENT_PAGE}?${params.toString()}`;
}

nextBtn.addEventListener("click", goToPayment);
mobileNext.addEventListener("click", goToPayment);

/* ---------- INIT ---------- */
const status = loadBooking();

if (status === "ok") {
  renderInfo();
  takenSeats = buildTakenSeats();
  renderSeatMap();
  preselectSeats();
  renderSummary();
} else {
  showError(status);
}