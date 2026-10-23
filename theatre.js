/* =========================================================
   Eclipse Entertainment – Find a Theatre (find-theatre.html)
   Data lives in theatre-list.js (theatres, places, ZIPs)
   Map: Leaflet + CARTO/OpenStreetMap tiles (free, no key)
   ========================================================= */

/* ---------- STATE ---------- */
const state = {
  origin: null,          // { lat, lng, label } – where distances are measured from
  wanted: [],            // amenity ids picked in the Experience Matcher
  strict: false,         // only show 100% matches
  sort: "match",
  openCard: null,        // id of the card showing "Tonight at this theatre"
  selected: null         // id of the highlighted theatre
};

let map = null;
const markers = {};      // theatre id -> Leaflet marker
let originMarker = null;
let pendingView = null;  // map move waiting until the map is visible (mobile)

/* ---------- ELEMENTS ---------- */
const $ = (id) => document.getElementById(id);

/* =========================================================
   HELPERS
   ========================================================= */

// Distance in miles between two points (Haversine formula)
function milesBetween(a, b) {
  const R = 3958.8;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function distanceTo(theatre) {
  return state.origin ? milesBetween(state.origin, theatre) : null;
}

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

// Is the theatre open right now? Handles closing times after midnight.
function openStatus(theatre, now = new Date()) {
  const day = now.getDay();
  const minutes = now.getHours() * 60 + now.getMinutes();

  const check = (d, offset) => {
    const [open, close] = theatre.hours[d];
    const o = toMinutes(open);
    let c = toMinutes(close);
    if (c <= o) c += 24 * 60;            // closes after midnight
    const t = minutes + offset;
    return t >= o && t < c ? { open: true, close } : null;
  };

  // today's hours, or yesterday's late-night hours that run past midnight
  const today = check(day, 0);
  if (today) return today;
  const yesterday = check((day + 6) % 7, 24 * 60);
  if (yesterday) return yesterday;

  return { open: false, opens: theatre.hours[day][0] };
}

function labelTime(hhmm) {
  return formatTime(hhmm);   // from movie-list.js: "23:30" -> "11:30pm"
}

// Demo "how busy" level (0–100) that changes with the time of day
function busyLevel(theatre, now = new Date()) {
  const hour = now.getHours() + now.getMinutes() / 60;
  const curve = Math.max(0, Math.sin(((hour - 10) / 14) * Math.PI));   // peaks around 5pm
  const weekend = [0, 5, 6].includes(now.getDay()) ? 15 : 0;
  const seed = theatre.id.length * 7 % 20;
  return Math.min(100, Math.round(curve * 70 + weekend + seed));
}

function busyLabel(level) {
  if (level < 30) return "Quiet";
  if (level < 55) return "Moderate";
  if (level < 80) return "Busy";
  return "Packed";
}

function matchScore(theatre) {
  if (state.wanted.length === 0) return null;
  const hits = state.wanted.filter((a) => theatre.amenities.includes(a)).length;
  return Math.round((hits / state.wanted.length) * 100);
}

function normalize(text) {
  return text.toLowerCase().replace(/[.,]/g, "").replace(/\s+/g, " ").trim();
}

/* =========================================================
   TOASTS + MESSAGES (micro-interactions)
   ========================================================= */
function toast(text, type = "info") {
  const el = document.createElement("div");
  el.className = `toast toast-${type}`;
  el.innerHTML = `<span class="toast-icon">${{ info: "ℹ️", success: "✅", error: "⚠️" }[type]}</span><p>${esc(text)}</p>`;
  $("toastStack").appendChild(el);

  setTimeout(() => el.classList.add("leaving"), 3600);
  setTimeout(() => el.remove(), 4000);
}

function fieldError(text) {
  const field = $("finderField");
  $("finderMessage").textContent = text;
  field.classList.remove("shake");
  void field.offsetWidth;            // restart the animation
  field.classList.add("shake", "invalid");
  $("placeInput").setAttribute("aria-invalid", "true");
  $("placeInput").focus();
}

function clearFieldError() {
  $("finderMessage").textContent = "";
  $("finderField").classList.remove("invalid");
  $("placeInput").removeAttribute("aria-invalid");
}

function showSkeletons(ms) {
  return new Promise((resolve) => {
    $("skeletons").hidden = false;
    $("theatreList").hidden = true;
    $("emptyState").hidden = true;
    setTimeout(() => {
      $("skeletons").hidden = true;
      $("theatreList").hidden = false;
      resolve();
    }, ms);
  });
}

/* Empty / error state block */
function showEmpty({ title, text, art = "lost", actions = [] }) {
  $("emptyState").hidden = false;
  $("emptyArt").className = `empty-art art-${art}`;
  $("emptyTitle").textContent = title;
  $("emptyText").innerHTML = text;

  const box = $("emptyActions");
  box.innerHTML = "";
  actions.forEach(({ label, onClick, primary }) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = primary ? "btn-primary" : "chip-btn";
    btn.textContent = label;
    btn.addEventListener("click", onClick);
    box.appendChild(btn);
  });
}

function hideEmpty() {
  $("emptyState").hidden = true;
}

/* =========================================================
   SEARCH BY CITY / ZIP
   ========================================================= */
function suggestionsFor(query) {
  const q = normalize(query);
  const names = Object.keys(PLACES).filter((p) => !["downtown", "mco", "i-drive"].includes(p));
  // simple "did you mean": places that share the first letters
  const close = names.filter((p) => p.startsWith(q.slice(0, 3)) || p.includes(q));
  const picks = (close.length ? close : ["orlando", "winter park", "kissimmee", "lake nona"]).slice(0, 4);
  return picks.map((p) => p.replace(/\b\w/g, (c) => c.toUpperCase()));
}

async function handleSearch(e) {
  if (e) e.preventDefault();
  const raw = $("placeInput").value;
  const query = normalize(raw);

  clearFieldError();

  // 1. Nothing typed
  if (!query) {
    fieldError("Type a city or a ZIP code first.");
    return;
  }

  // 2. Looks like a ZIP but wrong length
  if (/^\d+$/.test(query) && query.length !== 5) {
    fieldError(`ZIP codes have 5 digits. "${raw.trim()}" has ${query.length}.`);
    return;
  }

  // 3. Too short to be a city
  if (!/^\d+$/.test(query) && query.length < 3) {
    fieldError("Type at least 3 letters of the city name.");
    return;
  }

  $("searchBtn").classList.add("loading");
  await showSkeletons(650);
  $("searchBtn").classList.remove("loading");

  const coords = /^\d{5}$/.test(query) ? ZIPS[query] : PLACES[query];

  // 4. Not found
  if (!coords) {
    state.origin = null;
    updateOriginUI();
    render();
    $("theatreList").hidden = true;
    $("resultsCount").textContent = "No results";
    $("finderField").classList.add("invalid");
    showEmpty({
      art: "lost",
      title: "We couldn't find that place",
      text: /^\d{5}$/.test(query)
        ? `The ZIP <strong>${esc(query)}</strong> isn't in our Orlando area. Try one like 32801 or 34741.`
        : `We couldn't find <strong>"${esc(raw.trim())}"</strong>. Check the spelling or try one of these:`,
      actions: suggestionsFor(query).map((name) => ({
        label: name,
        onClick: () => { $("placeInput").value = name; handleSearch(); }
      })).concat([{ label: "Show all theatres", primary: true, onClick: resetSearch }])
    });
    toast("Place not found", "error");
    return;
  }

  const label = raw.trim().replace(/\b\w/g, (c) => c.toUpperCase());
  setOrigin({ lat: coords[0], lng: coords[1], label });
}

function setOrigin(origin) {
  state.origin = origin;
  if (state.sort === "name" || state.wanted.length === 0) state.sort = "distance";
  $("sortSelect").value = state.sort;
  updateOriginUI();
  render();

  const nearest = THEATRES.map((t) => ({ t, d: distanceTo(t) })).sort((a, b) => a.d - b.d)[0];

  // 5. Found the place, but it's too far from every theatre
  if (nearest.d > NEARBY_MILES) {
    $("theatreList").hidden = true;
    $("resultsCount").textContent = `0 theatres near ${origin.label}`;
    showEmpty({
      art: "far",
      title: `No Eclipse theatres near ${origin.label}`,
      text: `Our closest theatre is <strong>${esc(nearest.t.name)}</strong>, about <strong>${Math.round(nearest.d)} miles</strong> away. We're only in the Orlando area for now.`,
      actions: [
        { label: `See ${nearest.t.area}`, primary: true, onClick: () => { render(); selectTheatre(nearest.t.id, true); } },
        { label: "Show all theatres", onClick: resetSearch }
      ]
    });
    toast(`${origin.label} is outside our area`, "error");
    fitMapTo([origin, nearest.t]);
    return;
  }

  toast(`Sorted by distance from ${origin.label}`, "success");
  fitMapTo([origin, ...THEATRES.filter((t) => distanceTo(t) <= NEARBY_MILES)]);
}

function updateOriginUI() {
  const box = $("finderOrigin");
  if (state.origin) {
    box.hidden = false;
    box.innerHTML = `Showing distances from <strong>${esc(state.origin.label)}</strong> · <button type="button" id="clearOrigin">clear</button>`;
    $("clearOrigin").addEventListener("click", resetSearch);
  } else {
    box.hidden = true;
  }
  $("clearSearch").hidden = !$("placeInput").value;
  drawOriginMarker();
}

function resetSearch() {
  state.origin = null;
  $("placeInput").value = "";
  clearFieldError();
  hideEmpty();
  if (state.sort === "distance") state.sort = "match";
  $("sortSelect").value = state.sort;
  updateOriginUI();
  render();
  fitMapTo(THEATRES);
}

/* =========================================================
   USE MY LOCATION
   ========================================================= */
function useMyLocation() {
  const btn = $("locateBtn");
  clearFieldError();

  if (!("geolocation" in navigator)) {
    toast("Your browser can't share location. Search a city instead.", "error");
    fieldError("Location isn't available here. Type your city or ZIP.");
    return;
  }

  btn.classList.add("locating");
  btn.disabled = true;

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      btn.classList.remove("locating");
      btn.disabled = false;
      $("placeInput").value = "";
      setOrigin({ lat: pos.coords.latitude, lng: pos.coords.longitude, label: "your location" });
    },
    (err) => {
      btn.classList.remove("locating");
      btn.disabled = false;

      const messages = {
        1: "You blocked location access. Allow it in your browser, or type your city.",
        2: "We couldn't detect your location. Try typing your city or ZIP.",
        3: "Finding your location took too long. Try again or type your city."
      };
      toast(messages[err.code] || messages[2], "error");
      fieldError(err.code === 1 ? "Location blocked – type your city or ZIP instead." : "Couldn't get your location – type your city or ZIP.");
    },
    { enableHighAccuracy: false, timeout: 9000, maximumAge: 300000 }
  );
}

/* =========================================================
   EXPERIENCE MATCHER
   ========================================================= */
function renderMatcher() {
  const box = $("matcherChips");
  box.innerHTML = "";

  AMENITIES.forEach((a) => {
    const active = state.wanted.includes(a.id);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "amenity-chip";
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-pressed", String(active));
    btn.innerHTML = `<span>${a.icon}</span>${esc(a.label)}`;
    btn.addEventListener("click", () => {
      state.wanted = active ? state.wanted.filter((x) => x !== a.id) : [...state.wanted, a.id];
      if (state.wanted.length && state.sort === "name") state.sort = "match";
      $("sortSelect").value = state.sort;
      renderMatcher();
      render();
    });
    box.appendChild(btn);
  });
}

$("strictToggle").addEventListener("change", (e) => {
  state.strict = e.target.checked;
  render();
});

$("sortSelect").addEventListener("change", (e) => {
  if (e.target.value === "distance" && !state.origin) {
    e.target.value = state.sort;
    toast("Search a city or use your location to sort by distance.", "info");
    $("locateBtn").classList.remove("pulse");
    void $("locateBtn").offsetWidth;
    $("locateBtn").classList.add("pulse");
    return;
  }
  state.sort = e.target.value;
  render();
});

/* =========================================================
   TONIGHT AT THIS THEATRE
   ========================================================= */
function tonightAt(theatre) {
  const now = new Date();
  const today = startOfDay(now);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  // each theatre shows a different selection of 4 movies
  const start = THEATRES.indexOf(theatre) * 3;
  const picks = Array.from({ length: 4 }, (_, i) => movies[(start + i) % movies.length]);

  return picks.map((movie) => {
    const format = movie.formats[0];
    const next = format.times.find((t) => showtimeDate(today, t) > now);
    const day = next ? today : tomorrow;
    const time = next || format.times[0];

    const params = new URLSearchParams({ movie: movie.id, date: toISODate(day), time, format: format.name });
    return { movie, format, time, isTomorrow: !next, href: `seating.html?${params.toString()}` };
  });
}

/* =========================================================
   RENDER THE LIST
   ========================================================= */
function sortedTheatres() {
  let list = THEATRES.map((t) => ({ t, d: distanceTo(t), score: matchScore(t) }));

  if (state.strict && state.wanted.length) list = list.filter((x) => x.score === 100);

  const byName = (a, b) => a.t.name.localeCompare(b.t.name);
  const byDistance = (a, b) => (a.d ?? 0) - (b.d ?? 0);

  if (state.sort === "name") list.sort(byName);
  else if (state.sort === "distance") list.sort((a, b) => byDistance(a, b) || (b.score ?? 0) - (a.score ?? 0));
  else list.sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || (state.origin ? byDistance(a, b) : byName(a, b)));

  return list;
}

function render(quiet = false) {
  const list = sortedTheatres();
  const container = $("theatreList");
  container.innerHTML = "";
  hideEmpty();
  container.hidden = false;

  // 6. Matcher in "everything" mode with no theatre matching
  if (list.length === 0) {
    $("resultsCount").textContent = "0 theatres";
    showEmpty({
      art: "empty",
      title: "No theatre has all of that (yet!)",
      text: "Try turning off a couple of options, or switch off “everything I picked” to see the closest matches.",
      actions: [
        { label: "Show closest matches", primary: true, onClick: () => { state.strict = false; $("strictToggle").checked = false; render(); } },
        { label: "Clear my picks", onClick: () => { state.wanted = []; renderMatcher(); render(); } }
      ]
    });
    updateMarkers([]);
    return;
  }

  $("resultsCount").textContent = `${list.length} ${list.length === 1 ? "theatre" : "theatres"}${state.origin ? ` near ${state.origin.label}` : ""}`;

  const bestScore = state.wanted.length ? list[0].score : null;

  list.forEach(({ t, d, score }, i) => {
    const status = openStatus(t);
    const busy = busyLevel(t);
    const isBest = bestScore !== null && score === bestScore && score > 0 && i === 0;
    const card = document.createElement("article");
    card.className = "theatre-card";
    card.id = `card-${t.id}`;
    card.dataset.id = t.id;
    if (quiet) card.style.animation = "none";
    else card.style.animationDelay = `${i * 60}ms`;
    card.classList.toggle("selected", state.selected === t.id);

    const amenityIcons = AMENITIES.map((a) => {
      const has = t.amenities.includes(a.id);
      const wanted = state.wanted.includes(a.id);
      return `<li class="${has ? "has" : "no"}${wanted ? " wanted" : ""}" title="${esc(a.label)}${has ? "" : " (not available)"}"><span>${a.icon}</span>${esc(a.label)}</li>`;
    }).join("");

    card.innerHTML = `
      <div class="theatre-photo">
        ${t.image ? `<img src="${esc(t.image)}" alt="${esc(t.name)}">` : `<div class="photo-placeholder"><span>🎬</span><small>Photo coming soon</small></div>`}
        ${isBest ? `<span class="best-badge">★ Best for you</span>` : ""}
        ${score !== null ? `<span class="match-badge" style="--p:${score}"><strong>${score}%</strong><small>match</small></span>` : ""}
      </div>

      <div class="theatre-body">
        <div class="theatre-top">
          <div>
            <p class="theatre-area">${esc(t.area)} · ${t.screens} screens</p>
            <h3>${esc(t.name)}</h3>
          </div>
          ${d !== null ? `<span class="distance">${d < 10 ? d.toFixed(1) : Math.round(d)} mi</span>` : ""}
        </div>

        <p class="theatre-address">${esc(t.address)}</p>
        <a class="theatre-phone" href="tel:${t.phone.replace(/\D/g, "")}">${esc(t.phone)}</a>

        <div class="theatre-status">
          <span class="status ${status.open ? "open" : "closed"}">
            <span class="status-dot"></span>${status.open ? `Open now · until ${labelTime(status.close)}` : `Closed · opens ${labelTime(status.opens)}`}
          </span>
          ${status.open ? `
            <span class="busy" title="Demo estimate">
              <span class="busy-bar"><span style="width:${busy}%"></span></span>${busyLabel(busy)} right now
            </span>` : ""}
        </div>

        <ul class="amenity-list">${amenityIcons}</ul>

        <div class="theatre-actions">
          <a class="btn-primary" href="index.html#showtimes">See showtimes</a>
          <a class="btn-outline" href="https://www.google.com/maps/dir/?api=1&destination=${t.lat},${t.lng}" target="_blank" rel="noopener">Get directions</a>
          <a class="text-link" href="food-drinks.html">🍿 Order food here</a>
        </div>

        <button type="button" class="tonight-toggle" aria-expanded="${state.openCard === t.id}">
          <span>🎬 Tonight at this theatre</span><span class="chev" aria-hidden="true">▾</span>
        </button>
        <div class="tonight ${state.openCard === t.id ? "open" : ""}">
          <div class="tonight-inner">
            <ul class="tonight-list">
              ${tonightAt(t).map((s) => `
                <li>
                  <img src="${esc(s.movie.poster)}" alt="" loading="lazy">
                  <div>
                    <strong>${esc(s.movie.title)}</strong>
                    <small>${esc(s.format.name)} · ${esc(s.movie.rating)}</small>
                  </div>
                  <a class="time-chip" href="${s.href}">${s.isTomorrow ? "Tmrw " : ""}${formatTime(s.time)}</a>
                </li>`).join("")}
            </ul>
          </div>
        </div>
      </div>
    `;

    card.querySelector(".tonight-toggle").addEventListener("click", (e) => {
      const open = state.openCard !== t.id;
      state.openCard = open ? t.id : null;
      e.currentTarget.setAttribute("aria-expanded", String(open));
      card.querySelector(".tonight").classList.toggle("open", open);
    });

    // clicking the card (not its links/buttons) shows it on the map
    card.addEventListener("click", (e) => {
      if (e.target.closest("a, button")) return;
      selectTheatre(t.id, false);
    });

    container.appendChild(card);
  });

  updateMarkers(list.map((x) => x.t.id));
}

/* =========================================================
   MAP
   ========================================================= */
function pinIcon(theatre, active) {
  return L.divIcon({
    className: "pin-wrap",
    html: `<span class="pin${active ? " active" : ""}"><span>E</span></span>`,
    iconSize: [36, 46],
    iconAnchor: [18, 44],
    popupAnchor: [0, -40]
  });
}

function initMap() {
  if (typeof L === "undefined") {
    showMapFallback();
    return;
  }

  $("mapFallback").hidden = true;
  $("map").hidden = false;

  map = L.map("map", { scrollWheelZoom: false, zoomControl: true }).setView([28.54, -81.38], 10);

  const tiles = L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: "abcd",
    maxZoom: 19
  }).addTo(map);

  let tileErrors = 0;
  tiles.on("tileerror", () => {
    tileErrors++;
    if (tileErrors === 6) toast("The map is having trouble loading. Check your connection.", "error");
  });

  THEATRES.forEach((t) => {
    const marker = L.marker([t.lat, t.lng], { icon: pinIcon(t, false), title: t.name, keyboard: true })
      .addTo(map)
      .bindPopup(`<strong>${esc(t.name)}</strong><br>${esc(t.address)}`);
    marker.on("click", () => selectTheatre(t.id, false, true));
    markers[t.id] = marker;
  });

  // enable scroll-zoom only after the user clicks the map (so the page scrolls normally)
  map.once("click", () => map.scrollWheelZoom.enable());

  fitMapTo(THEATRES);
  drawOriginMarker();
}

function showMapFallback() {
  $("map").hidden = true;
  $("mapFallback").hidden = false;
}

$("retryMap").addEventListener("click", () => {
  if (typeof L === "undefined") {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
    script.onload = () => { initMap(); render(); toast("Map loaded!", "success"); };
    script.onerror = () => toast("Still no connection to the map.", "error");
    document.body.appendChild(script);
  } else {
    initMap();
  }
});

function mapIsVisible() {
  return map && $("map").offsetWidth > 0;
}

function fitMapTo(points) {
  if (!map || !points.length) return;
  if (!mapIsVisible()) {
    pendingView = () => fitMapTo(points);   // do it when the map is shown
    return;
  }
  const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
  map.flyToBounds(bounds, { padding: [50, 50], maxZoom: 12, duration: 0.8 });
}

function updateMarkers(visibleIds) {
  if (!map) return;
  THEATRES.forEach((t) => {
    const marker = markers[t.id];
    const visible = visibleIds.includes(t.id);
    marker.setIcon(pinIcon(t, state.selected === t.id));
    marker.setOpacity(visible ? 1 : 0.25);
  });
}

function drawOriginMarker() {
  if (!map) return;
  if (originMarker) {
    originMarker.remove();
    originMarker = null;
  }
  if (!state.origin) return;
  originMarker = L.marker([state.origin.lat, state.origin.lng], {
    icon: L.divIcon({ className: "pin-wrap", html: `<span class="you-dot"></span>`, iconSize: [22, 22], iconAnchor: [11, 11] }),
    interactive: false
  }).addTo(map);
}

function selectTheatre(id, scrollList, fromMap) {
  state.selected = id;
  const theatre = THEATRES.find((t) => t.id === id);

  document.querySelectorAll(".theatre-card").forEach((c) => c.classList.toggle("selected", c.dataset.id === id));
  THEATRES.forEach((t) => markers[t.id] && markers[t.id].setIcon(pinIcon(t, t.id === id)));

  if (map && !fromMap) {
    const fly = () => {
      map.flyTo([theatre.lat, theatre.lng], 13, { duration: 0.7 });
      markers[id].openPopup();
    };
    if (mapIsVisible()) fly();
    else pendingView = fly;
  }

  const card = $(`card-${id}`);
  if (card && (scrollList || fromMap)) {
    if (fromMap && window.matchMedia("(max-width: 900px)").matches) switchView("list");
    card.scrollIntoView({ behavior: "smooth", block: "center" });
    card.classList.remove("flash");
    void card.offsetWidth;
    card.classList.add("flash");
  }
}

/* Mobile: list / map switch */
function switchView(view) {
  document.body.dataset.view = view;
  document.querySelectorAll(".view-btn").forEach((b) => {
    const active = b.dataset.view === view;
    b.classList.toggle("active", active);
    b.setAttribute("aria-selected", String(active));
  });
  if (view === "map" && map) {
    setTimeout(() => {
      map.invalidateSize();
      if (pendingView) {
        const run = pendingView;
        pendingView = null;
        run();
      }
    }, 60);
  }
}

document.querySelectorAll(".view-btn").forEach((b) => b.addEventListener("click", () => switchView(b.dataset.view)));

/* =========================================================
   EVENTS + INIT
   ========================================================= */
$("finderForm").addEventListener("submit", handleSearch);
$("locateBtn").addEventListener("click", useMyLocation);
$("clearSearch").addEventListener("click", resetSearch);

$("placeInput").addEventListener("input", () => {
  $("clearSearch").hidden = !$("placeInput").value;
  if ($("finderField").classList.contains("invalid")) clearFieldError();
});

switchView("list");
renderMatcher();
initMap();
render();

// Keep "Open now" and "how busy" up to date (skip while a message is showing)
setInterval(() => {
  if ($("emptyState").hidden) render(true);
}, 60 * 1000);