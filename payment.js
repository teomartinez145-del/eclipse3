/* =========================================================
   Eclipse Entertainment – Payment page (payment.html)
   DEMO ONLY: nothing is charged, saved or sent.
   Reads the booking from the link:
   payment.html?movie=wonka&date=2026-09-28&time=19:30&format=Standard+2D&seats=E7,E8
   ========================================================= */

/* ---------- SETTINGS ---------- */
const SEAT_PAGE = "seats.html";       // page to go back to for "Change seats"
const TICKETS_PAGE = "tickets.html";  // page shown after "Pay"
const HOLD_MINUTES = 10;              // "Seats held for 10:00" (visual only)
const MAX_SEATS = 8;

/* ---------- STATE ---------- */
const booking = { movie: null, format: null, date: null, time: null, seats: [], price: 0 };

/* ---------- ELEMENTS ---------- */
const $ = (id) => document.getElementById(id);

const monthFmt = new Intl.DateTimeFormat("en-US", { month: "short" });
const weekdayFmt = new Intl.DateTimeFormat("en-US", { weekday: "long" });

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
  booking.price = getPrice(format.name);
  return true;
}

function bookingParams() {
  return new URLSearchParams({
    movie: booking.movie.id,
    date: toISODate(booking.date),
    time: booking.time,
    format: booking.format.name,
    seats: booking.seats.join(",")
  });
}

function showError() {
  $("bookingInner").hidden = true;
  $("mobileBar").hidden = true;
  $("bookingError").hidden = false;
  $("movieTitle").textContent = "Choose a showtime";
}

/* ---------- MOVIE, SHOWTIME AND ORDER SUMMARY ---------- */
function renderInfo() {
  const { movie, format, date, time } = booking;

  document.title = `${movie.title} – Payment | Eclipse Entertainment`;
  $("movieTitle").textContent = movie.title;
  $("movieSub").textContent = `${movie.genre} • ${movie.rating} • ${movie.duration}`;

  $("moviePoster").src = movie.poster;
  $("moviePoster").alt = `${movie.title} poster`;
  $("seatHero").style.setProperty("--backdrop", `url("${encodeURI(movie.poster)}")`);

  $("infoDay").textContent = date.getDate();
  $("infoMonth").textContent = monthFmt.format(date);
  $("infoWeekday").textContent = weekdayFmt.format(date);
  $("infoTime").textContent = formatTime(time);
  $("infoFormat").textContent = format.name;
}

function renderSummary() {
  const list = $("summaryList");
  list.innerHTML = "";

  booking.seats.forEach((id) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span>Row <strong>${id.charAt(0)}</strong> · Seat <strong>${id.slice(1)}</strong></span>
      <span class="summary-price">${formatMoney(booking.price)}</span>
    `;
    list.appendChild(li);
  });

  const count = booking.seats.length;
  const total = count * booking.price;
  const countText = `${count} ${count === 1 ? "ticket" : "tickets"} × ${formatMoney(booking.price)}`;

  $("summaryCount").textContent = countText;
  $("summarySubtotal").textContent = formatMoney(total);
  $("totalPrice").textContent = formatMoney(total);
  $("mobileCount").textContent = `${count} ${count === 1 ? "ticket" : "tickets"}`;
  $("mobileTotal").textContent = formatMoney(total);
  $("payBtn").textContent = `Pay ${formatMoney(total)}`;

  $("changeSeats").href = `${SEAT_PAGE}?${bookingParams().toString()}`;
}

/* ---------- HOLD TIMER (visual only) ---------- */
function startHoldTimer() {
  let remaining = HOLD_MINUTES * 60;
  const timeEl = $("holdTime");
  const box = $("holdTimer");

  const tick = () => {
    const m = Math.floor(remaining / 60);
    const s = String(remaining % 60).padStart(2, "0");
    timeEl.textContent = `${m}:${s}`;
    box.classList.toggle("warning", remaining <= 60);

    if (remaining <= 0) {
      clearInterval(timer);
      $("holdText").textContent = "Hold time is over (demo) – you can still continue.";
      return;
    }
    remaining--;
  };

  const timer = setInterval(tick, 1000);
  tick();
}

/* ---------- PAYMENT METHOD TABS ---------- */
document.querySelectorAll(".pay-method").forEach((btn) => {
  btn.addEventListener("click", () => {
    const method = btn.dataset.method;

    document.querySelectorAll(".pay-method").forEach((b) => {
      const active = b === btn;
      b.classList.toggle("active", active);
      b.setAttribute("aria-selected", String(active));
    });

    document.querySelectorAll(".pay-panel").forEach((panel) => {
      panel.hidden = panel.id !== `panel-${method}`;
    });
  });
});

/* ---------- CARD PREVIEW (updates while typing) ---------- */
const cardEl = $("creditCard");
const numberInput = $("cardNumber");
const nameInput = $("cardName");
const expInput = $("cardExp");
const cvvInput = $("cardCvv");

function detectBrand(digits) {
  if (/^4/.test(digits)) return "VISA";
  if (/^(5[1-5]|2[2-7])/.test(digits)) return "MASTERCARD";
  if (/^3[47]/.test(digits)) return "AMEX";
  if (/^6/.test(digits)) return "DISCOVER";
  return "CARD";
}

numberInput.addEventListener("input", () => {
  const digits = numberInput.value.replace(/\D/g, "").slice(0, 16);
  numberInput.value = digits.replace(/(\d{4})(?=\d)/g, "$1 ");

  const padded = digits.padEnd(16, "•");
  $("cardNumberView").textContent = padded.replace(/(.{4})(?=.)/g, "$1 ");
  $("cardBrand").textContent = detectBrand(digits);
});

nameInput.addEventListener("input", () => {
  $("cardNameView").textContent = nameInput.value.trim().toUpperCase() || "YOUR NAME";
});

expInput.addEventListener("input", () => {
  let digits = expInput.value.replace(/\D/g, "").slice(0, 4);
  if (digits.length >= 3) digits = `${digits.slice(0, 2)}/${digits.slice(2)}`;
  expInput.value = digits;
  $("cardExpView").textContent = digits || "MM/YY";
});

cvvInput.addEventListener("input", () => {
  cvvInput.value = cvvInput.value.replace(/\D/g, "").slice(0, 4);
  $("cardCvvView").textContent = cvvInput.value ? "•".repeat(cvvInput.value.length) : "•••";
});

// Flip the card while typing the CVV
cvvInput.addEventListener("focus", () => cardEl.classList.add("flipped"));
cvvInput.addEventListener("blur", () => cardEl.classList.remove("flipped"));

// Enter inside the form = Pay
$("cardForm").addEventListener("submit", (e) => {
  e.preventDefault();
  goToTickets();
});

/* ---------- PAY → TICKETS (no validation: demo) ---------- */
let paying = false;

function goToTickets() {
  if (paying) return;
  paying = true;

  const payBtn = $("payBtn");
  payBtn.classList.add("loading");
  payBtn.textContent = "Processing…";
  $("mobilePay").textContent = "Processing…";

  // Short fake "processing" moment, then show the tickets
  setTimeout(() => {
    window.location.href = `${TICKETS_PAGE}?${bookingParams().toString()}`;
  }, 1200);
}

// If the user comes back with the browser's Back button, reset the button
window.addEventListener("pageshow", () => {
  if (!paying || !booking.movie) return;
  paying = false;
  $("payBtn").classList.remove("loading");
  renderSummary();
  $("mobilePay").textContent = "Pay";
});

$("payBtn").addEventListener("click", goToTickets);
$("mobilePay").addEventListener("click", goToTickets);

/* ---------- INIT ---------- */
if (loadBooking()) {
  renderInfo();
  renderSummary();
  startHoldTimer();
} else {
  showError();
}