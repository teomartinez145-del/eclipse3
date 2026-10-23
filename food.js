/* =========================================================
   Eclipse Entertainment – Snack Studio (food-drinks.html)
   Data lives in food-menu.js and movie-list.js
   DEMO ONLY: nothing is charged or sent.
   Orders add reward points to My Eclipse (browser storage).

   Optional link from the tickets page:
   food-drinks.html?movie=wonka&date=2026-09-28&time=19:30&seats=F10,F11
   ========================================================= */

/* ---------- STATE ---------- */
const state = {
  movie: movies[0],
  showtime: null,          // Date of the showtime, if known
  mood: "all",
  popcorn: { size: "L", flavors: ["butter"], toppings: [] },
  minute: 0,               // delivery minute (negative = during trailers)
  tray: [],                // { key, name, icon, price, qty, detail }
  lastAdded: null
};

/* ---------- ELEMENTS ---------- */
const $ = (id) => document.getElementById(id);

/* ---------- HELPERS ---------- */
function parseDuration(text) {
  const h = /(\d+)\s*hr/.exec(text);
  const m = /(\d+)\s*min/.exec(text);
  return (h ? Number(h[1]) * 60 : 0) + (m ? Number(m[1]) : 0) || 120;
}

function clockAt(minute) {
  if (!state.showtime) return "";
  const d = new Date(state.showtime.getTime() + minute * 60000);
  return formatTime(`${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`);
}

function money(value) {
  return "$" + value.toFixed(2);
}

/* ---------- READ OPTIONAL INFO FROM THE LINK ---------- */
function readParams() {
  const params = new URLSearchParams(window.location.search);

  const movie = movies.find((m) => m.id === params.get("movie"));
  if (movie) state.movie = movie;

  const date = params.get("date");
  const time = params.get("time");
  if (movie && /^\d{4}-\d{2}-\d{2}$/.test(date || "") && /^\d{1,2}:\d{2}$/.test(time || "")) {
    const [y, mo, d] = date.split("-").map(Number);
    state.showtime = showtimeDate(new Date(y, mo - 1, d), time);
  }

  const firstSeat = (params.get("seats") || "").split(",")[0].trim().toUpperCase();
  const match = /^([A-J])(1[0-4]|[1-9])$/.exec(firstSeat);

  if (movie && match) {
    $("seatBanner").hidden = false;
    $("seatBanner").innerHTML = `🎟️ Ordering for <strong>${esc(movie.title)}</strong> · Row ${match[1]} · Seat ${match[2]}${time ? ` · ${formatTime(time)}` : ""}`;
  }

  return match ? { row: match[1], seat: match[2] } : null;
}

/* =========================================================
   1. MOVIE PAIRING
   ========================================================= */
function renderMoviePicker() {
  const picker = $("moviePicker");
  picker.innerHTML = "";

  movies.forEach((movie) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "movie-chip";
    btn.setAttribute("role", "radio");
    btn.dataset.id = movie.id;
    btn.innerHTML = `
      <img src="${esc(movie.poster)}" alt="" loading="lazy">
      <span>${esc(movie.title)}</span>
    `;
    btn.addEventListener("click", () => selectMovie(movie));
    picker.appendChild(btn);
  });
}

function selectMovie(movie) {
  state.movie = movie;

  $("moviePicker").querySelectorAll(".movie-chip").forEach((chip) => {
    const active = chip.dataset.id === movie.id;
    chip.classList.toggle("active", active);
    chip.setAttribute("aria-checked", String(active));
    if (active) {
      // keep the chosen movie visible inside the horizontal list
      const picker = $("moviePicker");
      picker.scrollTo({ left: chip.offsetLeft - picker.clientWidth / 2 + chip.clientWidth / 2, behavior: "smooth" });
    }
  });

  renderPairing();
  setupTimeline();
}

function renderPairing() {
  const movie = state.movie;
  const pairing = PAIRINGS[movie.id] || PAIRINGS.default;
  const card = $("pairingCard");

  $("pairingFor").textContent = `Paired with ${movie.title}`;
  $("pairingName").textContent = pairing.name;
  $("pairingNote").textContent = pairing.note;
  $("pairingIcon").textContent = pairing.icon;
  $("pairingPrice").textContent = money(pairing.price);
  $("pairingList").innerHTML = pairing.includes.map((item) => `<li>${esc(item)}</li>`).join("");

  // replay the entrance animation
  card.classList.remove("swap");
  void card.offsetWidth;
  card.classList.add("swap");
}

$("addPairing").addEventListener("click", () => {
  const pairing = PAIRINGS[state.movie.id] || PAIRINGS.default;
  addToTray({
    key: `pairing-${state.movie.id}`,
    name: pairing.name,
    icon: pairing.icon,
    price: pairing.price,
    detail: `${state.movie.title} pairing`
  });
  flashButton($("addPairing"), "Added to tray ✓");
});

/* =========================================================
   2. SNACK MOOD MENU
   ========================================================= */
function renderMoodBar() {
  const bar = $("moodBar");
  bar.innerHTML = "";

  MOODS.forEach((mood) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "mood-btn";
    btn.dataset.mood = mood.id;
    btn.setAttribute("role", "tab");
    btn.innerHTML = `<span class="mood-icon">${mood.icon}</span>${esc(mood.label)}`;
    btn.addEventListener("click", () => {
      state.mood = mood.id;
      updateMoodBar();
      renderMenu();
    });
    bar.appendChild(btn);
  });

  updateMoodBar();
}

function updateMoodBar() {
  $("moodBar").querySelectorAll(".mood-btn").forEach((btn) => {
    const active = btn.dataset.mood === state.mood;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-selected", String(active));
  });
}

function renderMenu() {
  const grid = $("menuGrid");
  grid.innerHTML = "";

  const items = MENU.filter((item) => state.mood === "all" || item.moods.includes(state.mood));

  items.forEach((item, i) => {
    const inTray = state.tray.find((t) => t.key === `menu-${item.id}`);
    const card = document.createElement("article");
    card.className = "menu-card";
    card.style.animationDelay = `${i * 40}ms`;
    card.innerHTML = `
      <div class="menu-photo">
        <img src="${esc(FOOD_IMAGES[item.image])}" alt="" loading="lazy">
        <span class="menu-icon">${item.icon}</span>
        ${item.tag ? `<span class="menu-tag">${esc(item.tag)}</span>` : ""}
        ${inTray ? `<span class="menu-count">×${inTray.qty}</span>` : ""}
      </div>
      <div class="menu-body">
        <h3>${esc(item.name)}</h3>
        <p>${esc(item.desc)}</p>
        <div class="menu-foot">
          <strong class="price">${money(item.price)}</strong>
          <button type="button" class="add-btn" aria-label="Add ${esc(item.name)} to tray">+ Add</button>
        </div>
      </div>
    `;

    card.querySelector(".add-btn").addEventListener("click", (e) => {
      addToTray({ key: `menu-${item.id}`, name: item.name, icon: item.icon, price: item.price });
      flashButton(e.currentTarget, "Added ✓");
    });

    grid.appendChild(card);
  });
}

/* =========================================================
   3. BUILD YOUR POPCORN
   ========================================================= */
function popcornPrice() {
  const size = POPCORN.sizes.find((s) => s.id === state.popcorn.size);
  const extra = Math.max(0, state.popcorn.flavors.length - 1) * POPCORN.extraFlavorPrice;
  const toppings = state.popcorn.toppings
    .map((id) => POPCORN.toppings.find((t) => t.id === id).price)
    .reduce((a, b) => a + b, 0);
  return size.price + extra + toppings;
}

function chip(label, active, disabled, onClick, swatch) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "chip";
  btn.classList.toggle("active", active);
  btn.disabled = disabled;
  btn.setAttribute("aria-pressed", String(active));
  btn.innerHTML = `${swatch ? `<span class="swatch" style="background:${swatch}"></span>` : ""}${label}`;
  btn.addEventListener("click", onClick);
  return btn;
}

function renderPopcorn() {
  const p = state.popcorn;

  // Sizes
  const sizeRow = $("sizeOptions");
  sizeRow.innerHTML = "";
  POPCORN.sizes.forEach((size) => {
    sizeRow.appendChild(chip(
      `${esc(size.name)} <small>${money(size.price)}</small>`,
      p.size === size.id,
      false,
      () => { p.size = size.id; renderPopcorn(); }
    ));
  });

  // Flavors
  const flavorRow = $("flavorOptions");
  flavorRow.innerHTML = "";
  POPCORN.flavors.forEach((flavor) => {
    const active = p.flavors.includes(flavor.id);
    const full = p.flavors.length >= POPCORN.maxFlavors;
    flavorRow.appendChild(chip(
      esc(flavor.name),
      active,
      !active && full,
      () => {
        if (active) {
          if (p.flavors.length > 1) p.flavors = p.flavors.filter((f) => f !== flavor.id);
        } else {
          p.flavors.push(flavor.id);
        }
        renderPopcorn();
      },
      flavor.color
    ));
  });

  // Toppings
  const toppingRow = $("toppingOptions");
  toppingRow.innerHTML = "";
  POPCORN.toppings.forEach((topping) => {
    const active = p.toppings.includes(topping.id);
    toppingRow.appendChild(chip(
      `${esc(topping.name)} <small>${topping.price ? "+" + money(topping.price) : "free"}</small>`,
      active,
      false,
      () => {
        p.toppings = active ? p.toppings.filter((t) => t !== topping.id) : [...p.toppings, topping.id];
        renderPopcorn();
      }
    ));
  });

  renderBucket();
  $("popcornPrice").textContent = money(popcornPrice());
}

function renderBucket() {
  const p = state.popcorn;
  const size = POPCORN.sizes.find((s) => s.id === p.size);
  const flavors = p.flavors.map((id) => POPCORN.flavors.find((f) => f.id === id));

  $("bucket").style.setProperty("--scale", size.scale);

  // One layer per flavor (first flavor at the bottom)
  $("bucketFill").innerHTML = flavors
    .map((f) => `<div class="pop-layer" style="--c:${f.color}"></div>`)
    .join("");

  // Toppings as little pieces on top
  const toppingsEl = $("bucketToppings");
  toppingsEl.innerHTML = "";
  const candyColors = ["#ff4d6d", "#ffd700", "#4dabf7", "#51cf66", "#ff922b"];

  p.toppings.forEach((id, t) => {
    const topping = POPCORN.toppings.find((x) => x.id === id);
    for (let i = 0; i < 9; i++) {
      const piece = document.createElement("span");
      piece.className = `piece piece-${id}`;
      piece.style.left = `${8 + ((i * 37 + t * 13) % 84)}%`;
      piece.style.top = `${4 + ((i * 23 + t * 7) % 30)}%`;
      piece.style.background = topping.color === "multi" ? candyColors[i % candyColors.length] : topping.color;
      piece.style.animationDelay = `${i * 30}ms`;
      toppingsEl.appendChild(piece);
    }
  });

  $("bucketCaption").textContent = `${size.name} · ${flavors.map((f) => f.name).join(" + ")}`;
}

$("addPopcorn").addEventListener("click", () => {
  const p = state.popcorn;
  const size = POPCORN.sizes.find((s) => s.id === p.size);
  const flavorNames = p.flavors.map((id) => POPCORN.flavors.find((f) => f.id === id).name);
  const toppingNames = p.toppings.map((id) => POPCORN.toppings.find((t) => t.id === id).name);

  addToTray({
    key: `popcorn-${p.size}-${p.flavors.join("+")}-${p.toppings.join("+")}`,
    name: `${size.name} Custom Popcorn`,
    icon: "🍿",
    price: popcornPrice(),
    detail: [flavorNames.join(" + "), ...toppingNames].join(" · ")
  });
  flashButton($("addPopcorn"), "Added to tray ✓");
});

/* =========================================================
   4. DELIVER AT MINUTE…
   ========================================================= */
const range = $("deliveryRange");

function setupTimeline() {
  const duration = parseDuration(state.movie.duration);
  range.min = -TRAILERS_MINUTES;
  range.max = duration;

  if (state.minute > duration) state.minute = duration;
  range.value = state.minute;

  $("trailerZone").style.width = `${(TRAILERS_MINUTES / (duration + TRAILERS_MINUTES)) * 100}%`;
  $("scaleHalf").textContent = `${Math.round(duration / 2)}'`;
  $("scaleEnd").textContent = `${duration}'`;
  $("deliveryMovie").textContent = `${state.movie.title} · ${state.movie.duration}${state.showtime ? ` · starts ${clockAt(0)}` : ""}`;

  updateDelivery();
}

function presetMinute(preset) {
  const duration = Number(range.max);
  return {
    trailers: -Math.round(TRAILERS_MINUTES / 2),
    start: 0,
    half: Math.round(duration / 2),
    final: Math.max(0, duration - 30)
  }[preset];
}

function deliveryText() {
  const m = state.minute;
  const clock = clockAt(m);
  const at = clock ? ` · around ${clock}` : "";

  if (m < 0) return `Arrives during the trailers${at}`;
  if (m === 0) return `Arrives when the movie starts${at}`;
  return `Arrives at minute ${m}${at}`;
}

function updateDelivery() {
  const min = Number(range.min);
  const max = Number(range.max);
  const m = state.minute;
  const percent = ((m - min) / (max - min)) * 100;

  $("filmProgress").style.width = `${percent}%`;
  $("filmMarker").style.left = `${percent}%`;
  $("markerLabel").textContent = m < 0 ? "🎬" : `${m}'`;

  const text = deliveryText();
  $("deliveryReadout").textContent = text;
  $("trayDeliveryText").textContent = text;

  $("presetRow").querySelectorAll(".preset").forEach((btn) => {
    btn.classList.toggle("active", presetMinute(btn.dataset.preset) === m);
  });
}

range.addEventListener("input", () => {
  state.minute = Number(range.value);
  updateDelivery();
});

$("presetRow").querySelectorAll(".preset").forEach((btn) => {
  btn.addEventListener("click", () => {
    state.minute = presetMinute(btn.dataset.preset);
    range.value = state.minute;
    updateDelivery();
  });
});

/* Seat picker */
function setupSeatPicker(fromLink) {
  const rowSelect = $("rowSelect");
  const seatSelect = $("seatSelect");

  rowSelect.innerHTML = `<option value="">Row</option>` +
    ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"].map((r) => `<option value="${r}">Row ${r}</option>`).join("");
  seatSelect.innerHTML = `<option value="">Seat</option>` +
    Array.from({ length: 14 }, (_, i) => `<option value="${i + 1}">Seat ${i + 1}</option>`).join("");

  if (fromLink) {
    rowSelect.value = fromLink.row;
    seatSelect.value = fromLink.seat;
  }

  const update = () => {
    const ok = rowSelect.value && seatSelect.value;
    $("seatHint").textContent = ok
      ? `We'll bring it to Row ${rowSelect.value} · Seat ${seatSelect.value}.`
      : "Your seat number is on your ticket.";
  };

  rowSelect.addEventListener("change", update);
  seatSelect.addEventListener("change", update);
  update();
}

function seatText() {
  const row = $("rowSelect").value;
  const seat = $("seatSelect").value;
  return row && seat ? `Row ${row} · Seat ${seat}` : "Seat not selected – we'll ask at the entrance";
}

/* =========================================================
   TRAY
   ========================================================= */
function addToTray(item) {
  const existing = state.tray.find((t) => t.key === item.key);
  if (existing) {
    existing.qty++;
  } else {
    state.tray.push({ ...item, qty: 1 });
  }
  state.lastAdded = item.key;
  renderTray();
  renderMenu();
  bumpToggle();
}

function changeQty(key, delta) {
  const item = state.tray.find((t) => t.key === key);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) state.tray = state.tray.filter((t) => t.key !== key);
  state.lastAdded = delta > 0 ? key : null;
  renderTray();
  renderMenu();
}

function trayTotal() {
  return state.tray.reduce((sum, t) => sum + t.price * t.qty, 0);
}

function trayCount() {
  return state.tray.reduce((sum, t) => sum + t.qty, 0);
}

function renderTray() {
  // Tray drawing (top view)
  const visual = $("trayVisual");
  visual.querySelectorAll(".tray-piece, .tray-more").forEach((el) => el.remove());

  const pieces = [];
  state.tray.forEach((t) => {
    for (let i = 0; i < t.qty; i++) pieces.push({ icon: t.icon, key: t.key, last: i === t.qty - 1 });
  });

  const MAX_PIECES = 11;
  pieces.slice(0, MAX_PIECES).forEach((p, i) => {
    const el = document.createElement("span");
    el.className = "tray-piece";
    if (p.key === state.lastAdded && p.last) el.classList.add("drop");
    el.style.setProperty("--r", `${((i * 47) % 30) - 15}deg`);
    el.textContent = p.icon;
    visual.appendChild(el);
  });

  if (pieces.length > MAX_PIECES) {
    const more = document.createElement("span");
    more.className = "tray-more";
    more.textContent = `+${pieces.length - MAX_PIECES}`;
    visual.appendChild(more);
  }

  $("trayEmpty").hidden = pieces.length > 0;

  // List
  const list = $("trayList");
  list.innerHTML = "";
  state.tray.forEach((t) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <span class="tl-icon">${t.icon}</span>
      <div class="tl-info">
        <strong>${esc(t.name)}</strong>
        ${t.detail ? `<small>${esc(t.detail)}</small>` : ""}
        <span class="tl-price">${money(t.price * t.qty)}</span>
      </div>
      <div class="qty">
        <button type="button" data-d="-1" aria-label="Remove one ${esc(t.name)}">−</button>
        <span>${t.qty}</span>
        <button type="button" data-d="1" aria-label="Add one ${esc(t.name)}">+</button>
      </div>
    `;
    li.querySelectorAll(".qty button").forEach((btn) => {
      btn.addEventListener("click", () => changeQty(t.key, Number(btn.dataset.d)));
    });
    list.appendChild(li);
  });

  // Totals
  const total = money(trayTotal());
  $("trayTotal").textContent = total;
  $("trayToggleTotal").textContent = total;
  $("trayToggleCount").textContent = trayCount();
  $("checkoutBtn").disabled = state.tray.length === 0;
  $("clearTray").hidden = state.tray.length === 0;
}

function bumpToggle() {
  const t = $("trayToggle");
  t.classList.remove("bump");
  void t.offsetWidth;
  t.classList.add("bump");
}

$("clearTray").addEventListener("click", () => {
  state.tray = [];
  state.lastAdded = null;
  renderTray();
  renderMenu();
});

/* Mobile: open / close the tray */
$("trayToggle").addEventListener("click", () => {
  const open = $("trayPanel").classList.toggle("open");
  $("trayToggle").setAttribute("aria-expanded", String(open));
});

/* Little "Added ✓" feedback on buttons */
function flashButton(btn, text) {
  const original = btn.dataset.label || btn.textContent;
  btn.dataset.label = original;
  btn.textContent = text;
  btn.classList.add("added");
  clearTimeout(btn._timer);
  btn._timer = setTimeout(() => {
    btn.textContent = original;
    btn.classList.remove("added");
  }, 1200);
}

/* =========================================================
   CHECKOUT (demo)
   ========================================================= */
const modal = $("checkoutModal");
let lastFocus = null;

function openCheckout() {
  if (state.tray.length === 0) return;
  lastFocus = document.activeElement;

  $("modalList").innerHTML = state.tray.map((t) => `
    <li>
      <span>${t.icon} ${t.qty} × ${esc(t.name)}</span>
      <strong>${money(t.price * t.qty)}</strong>
    </li>
  `).join("");

  $("modalSeat").textContent = seatText();
  $("modalWhen").textContent = deliveryText().replace("Arrives", "").trim();
  $("modalTotal").textContent = money(trayTotal());

  $("stepReview").hidden = false;
  $("stepDone").hidden = true;
  $("placeOrder").disabled = false;
  $("placeOrder").textContent = `Place order · ${money(trayTotal())}`;

  modal.hidden = false;
  document.body.classList.add("modal-open");
  $("placeOrder").focus();
}

function closeCheckout() {
  const finished = !$("stepDone").hidden;
  modal.hidden = true;
  document.body.classList.remove("modal-open");

  if (finished) {
    state.tray = [];
    renderTray();
    renderMenu();
  }
  if (lastFocus) lastFocus.focus();
}

$("checkoutBtn").addEventListener("click", openCheckout);

modal.querySelectorAll("[data-close]").forEach((el) => el.addEventListener("click", closeCheckout));

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !modal.hidden) closeCheckout();
});

$("placeOrder").addEventListener("click", () => {
  const btn = $("placeOrder");
  btn.disabled = true;
  btn.textContent = "Sending to the kitchen…";

  setTimeout(() => {
    const orderNumber = Math.floor(1000 + Math.random() * 9000);
    saveFoodPoints(orderNumber, trayTotal());
    $("orderNumber").textContent = `#${orderNumber}`;
    $("doneText").textContent = `${deliveryText()}. Delivered to ${seatText()}.`;
    $("stepReview").hidden = true;
    $("stepDone").hidden = false;
  }, 1100);
});

/* Food orders earn points in My Eclipse (10 points per $1) */
function saveFoodPoints(orderNumber, total) {
  const KEY = "eclipseAccount";
  try {
    const account = JSON.parse(localStorage.getItem(KEY)) || {};
    account.history = account.history || [];
    account.history.unshift({
      date: new Date().toISOString(), points: Math.round(total * 10),
      label: `Snack Studio order #${orderNumber}`, type: "food"
    });
    localStorage.setItem(KEY, JSON.stringify(account));
  } catch (e) {
    // storage blocked: the order still works, it just isn't saved
  }
}

/* =========================================================
   INIT
   ========================================================= */
const seatFromLink = readParams();

renderMoviePicker();
renderMoodBar();
renderMenu();
renderPopcorn();
setupSeatPicker(seatFromLink);
selectMovie(state.movie);
renderTray();