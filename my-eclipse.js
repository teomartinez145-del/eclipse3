/* =========================================================
   Eclipse Entertainment – My Eclipse (my-eclipse.html)
   Sign in · Tickets · Rewards · Subscription
   Data + settings live in account-data.js
   DEMO ONLY: nothing is charged or sent anywhere.
   ========================================================= */

/* ---------- STATE ---------- */
let account = loadAccount();
const ui = { tab: "tickets", list: "upcoming", billing: "monthly", shownPoints: 0, historyAll: false };

/* ---------- ELEMENTS ---------- */
const $ = (id) => document.getElementById(id);

/* =========================================================
   SMALL HELPERS
   ========================================================= */
const shortDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const longDate = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" });
const monthYear = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" });
const withYear = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

// "Thu, Oct 8" this year, "Oct 7, 2027" for another year
function planDate(d) {
  return d.getFullYear() === new Date().getFullYear() ? longDate.format(d) : withYear.format(d);
}

function money(n) {
  return "$" + n.toFixed(2);
}

function movieById(id) {
  return movies.find((m) => m.id === id);
}

function parseISO(value) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function ticketStart(t) {
  return showtimeDate(parseISO(t.date), t.time);
}

function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function ticketCode(t) {
  return "ECL-" + String(hashString(t.id)).padStart(10, "0").slice(0, 8);
}

function persist() {
  if (!saveAccount(account) && !persist.warned) {
    persist.warned = true;
    toast("Your browser is blocking saved data. Changes will reset when you leave.", "error");
  }
}

/* ---------- Toasts ---------- */
function toast(text, type = "info") {
  const el = document.createElement("div");
  el.className = `toast toast-${type}`;
  el.innerHTML = `<span>${{ info: "ℹ️", success: "✅", error: "⚠️" }[type]}</span><p>${text}</p>`;
  $("toastStack").appendChild(el);
  setTimeout(() => el.classList.add("leaving"), 3600);
  setTimeout(() => el.remove(), 4000);
}

/* ---------- Confetti ---------- */
function confetti() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const box = $("confetti");
  const colors = ["#ffd700", "#652e8d", "#ffffff", "#b07cff", "#7ee2a8", "#ff8fab"];
  for (let i = 0; i < 70; i++) {
    const piece = document.createElement("span");
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colors[i % colors.length];
    piece.style.animationDelay = `${Math.random() * 0.4}s`;
    piece.style.animationDuration = `${1.6 + Math.random() * 1.2}s`;
    piece.style.setProperty("--drift", `${(Math.random() - 0.5) * 240}px`);
    piece.style.setProperty("--spin", `${Math.random() * 720}deg`);
    box.appendChild(piece);
    setTimeout(() => piece.remove(), 3200);
  }
}

/* ---------- Shared modal ---------- */
let lastFocus = null;

function openModal(html, onMount) {
  lastFocus = document.activeElement;
  $("modalContent").innerHTML = html;
  $("modal").hidden = false;
  document.body.classList.add("modal-open");
  if (onMount) onMount($("modalContent"));
  const first = $("modalContent").querySelector("button, a, input");
  if (first) first.focus();
}

function closeModal() {
  $("modal").hidden = true;
  document.body.classList.remove("modal-open");
  if (lastFocus) lastFocus.focus();
}

$("modal").querySelectorAll("[data-close]").forEach((el) => el.addEventListener("click", closeModal));
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !$("modal").hidden) closeModal();
});

function shake(el) {
  el.classList.remove("shake");
  void el.offsetWidth;
  el.classList.add("shake");
}

/* =========================================================
   SIGN IN – validation with micro-interactions
   ========================================================= */
const nameInput = $("nameInput");
const emailInput = $("emailInput");
const termsInput = $("termsInput");
const touched = { name: false, email: false, terms: false };

const HINTS = {
  name: "First and last name, like <strong>Mateo Martinez</strong>.",
  email: "We'll send your tickets here, like <strong>mateo@gmail.com</strong>."
};

const EMAIL_TYPOS = {
  "gmial.com": "gmail.com", "gmai.com": "gmail.com", "gamil.com": "gmail.com", "gnail.com": "gmail.com",
  "gmail.co": "gmail.com", "gmail.con": "gmail.com", "gmal.com": "gmail.com",
  "hotmial.com": "hotmail.com", "hotmal.com": "hotmail.com", "hotmail.co": "hotmail.com",
  "yaho.com": "yahoo.com", "yahooo.com": "yahoo.com", "yahoo.co": "yahoo.com",
  "outlok.com": "outlook.com", "outllok.com": "outlook.com", "iclod.com": "icloud.com", "icloud.co": "icloud.com"
};

function validateName(value) {
  const v = value.trim().replace(/\s+/g, " ");
  if (!v) return { state: "error", msg: "Please enter your name." };
  if (/\d/.test(v)) return { state: "error", msg: "Names can't have numbers. Try something like <strong>Mateo Martinez</strong>." };
  if (/[^a-zA-ZÀ-ÿñÑ' -]/.test(v)) return { state: "error", msg: "Use only letters, spaces, apostrophes ( ' ) or hyphens ( - )." };
  if (v.replace(/[^a-zA-ZÀ-ÿñÑ]/g, "").length < 2) return { state: "error", msg: "That name is too short." };
  if (v.split(" ").length < 2) return { state: "error", msg: "Please add your last name too (e.g. <strong>" + esc(v) + " Martinez</strong>)." };
  return { state: "valid", msg: `Nice to meet you, ${esc(v.split(" ")[0])}! 👋` };
}

function validateEmail(value) {
  const v = value.trim().toLowerCase();
  if (!v) return { state: "error", msg: "Please enter your email." };
  if (/\s/.test(v)) return { state: "error", msg: "Emails can't have spaces." };
  if (!v.includes("@")) return { state: "error", msg: "Your email is missing an <strong>@</strong> (like mateo<strong>@</strong>gmail.com)." };
  if ((v.match(/@/g) || []).length > 1) return { state: "error", msg: "Your email has more than one <strong>@</strong>." };

  const [local, domain] = v.split("@");
  if (!local) return { state: "error", msg: "Add your username before the @ (like <strong>mateo</strong>@gmail.com)." };
  if (!domain) return { state: "error", msg: "Add a domain after the @, like <strong>gmail.com</strong>." };
  if (!/^[a-z0-9._%+-]+$/.test(local)) return { state: "error", msg: "The part before the @ has characters that aren't allowed." };
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/.test(domain)) {
    const guess = domain.replace(/\.$/, "");
    return { state: "error", msg: `<strong>${esc(domain)}</strong> isn't a complete domain. Did you mean <strong>${esc(guess)}.com</strong>?` };
  }

  const fix = EMAIL_TYPOS[domain];
  if (fix) {
    return {
      state: "warning",
      msg: `Did you mean <button type="button" class="suggest" data-fix="${esc(local)}@${fix}">${esc(local)}@${fix}</button>?`
    };
  }

  return { state: "valid", msg: "Looks good!" };
}

function setField(id, result, hint) {
  const field = $(`field-${id}`);
  const msg = field.querySelector(".field-msg");
  const input = field.querySelector("input");

  field.classList.remove("is-error", "is-valid", "is-warning");
  if (result) field.classList.add(`is-${result.state}`);
  msg.innerHTML = result ? result.msg : (hint || "");
  input.setAttribute("aria-invalid", result && result.state === "error" ? "true" : "false");

  // the "Did you mean…?" button fixes the email in one click
  const suggest = msg.querySelector(".suggest");
  if (suggest) {
    suggest.addEventListener("click", () => {
      emailInput.value = suggest.dataset.fix;
      checkEmail(true);
      emailInput.focus();
    });
  }
}

function checkName(force) {
  if (!touched.name && !force) return null;
  const result = validateName(nameInput.value);
  setField("name", result);
  return result;
}

function checkEmail(force) {
  if (!touched.email && !force) return null;
  const result = validateEmail(emailInput.value);
  setField("email", result);
  return result;
}

function checkTerms(force) {
  if (!touched.terms && !force) return null;
  const ok = termsInput.checked;
  setField("terms", ok ? { state: "valid", msg: "" } : { state: "error", msg: "Please accept the terms to continue." });
  if (!ok && force) shake($("field-terms"));
  return ok;
}

// validate when leaving a field, then live while typing
nameInput.addEventListener("blur", () => { if (nameInput.value) touched.name = true; checkName(); });
emailInput.addEventListener("blur", () => { if (emailInput.value) touched.email = true; checkEmail(); });
nameInput.addEventListener("input", () => { if (touched.name) checkName(); else setField("name", null, HINTS.name); });
emailInput.addEventListener("input", () => { if (touched.email) checkEmail(); else setField("email", null, HINTS.email); });
termsInput.addEventListener("change", () => { touched.terms = true; checkTerms(); });

function resetForm() {
  nameInput.value = "";
  emailInput.value = "";
  termsInput.checked = false;
  touched.name = touched.email = touched.terms = false;
  setField("name", null, HINTS.name);
  setField("email", null, HINTS.email);
  setField("terms", null, "");
  $("formSummary").hidden = true;
}

function validateAll() {
  touched.name = touched.email = touched.terms = true;
  const name = checkName(true);
  const email = checkEmail(true);
  const terms = checkTerms(true);

  const problems = [name.state === "error", email.state === "error", !terms].filter(Boolean).length;
  const summary = $("formSummary");

  if (problems) {
    summary.hidden = false;
    summary.innerHTML = `⚠️ Please fix ${problems === 1 ? "1 thing" : problems + " things"} below.`;
    shake($("authCard"));
    const firstBad = [["name", nameInput], ["email", emailInput], ["terms", termsInput]]
      .find(([id]) => $(`field-${id}`).classList.contains("is-error"));
    if (firstBad) firstBad[1].focus();
    return false;
  }

  summary.hidden = true;
  return true;
}

$("signupForm").addEventListener("submit", (e) => {
  e.preventDefault();
  if (!validateAll()) return;
  createAccount(false);
});

function createAccount(isDemo) {
  const btn = $("signupBtn");
  btn.classList.add("loading");
  btn.querySelector(".btn-label").textContent = "Creating your account…";

  const name = nameInput.value.trim().replace(/\s+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const profile = { name, email: emailInput.value.trim().toLowerCase() };

  setTimeout(() => {
    btn.classList.remove("loading");
    btn.classList.add("done");
    btn.querySelector(".btn-label").textContent = "Account created ✓";

    setTimeout(() => {
      if (isDemo) {
        // demo data + anything you really bought on this browser
        const real = loadAccount();
        account = buildDemoAccount(profile);
        real.tickets.forEach((t) => { if (!account.tickets.some((x) => x.id === t.id)) account.tickets.push(t); });
        account.history = [...real.history, ...account.history];
      } else {
        account.profile = profile;
        account.memberSince = account.memberSince || toISODate(new Date());
        if (!account.history.some((h) => h.type === "bonus")) addPoints(account, 100, "Welcome bonus", "bonus");
      }
      persist();
      showWelcome(name.split(" ")[0]);
    }, 650);
  }, 1100);
}

function showWelcome(firstName) {
  $("authForm").hidden = true;
  $("authWelcome").hidden = false;
  $("welcomeTitle").textContent = `Welcome, ${firstName}!`;

  const phases = ["🌑", "🌒", "🌓", "🌔", "🌕"];
  const moon = $("authWelcome").querySelector(".welcome-moon span");
  let i = 0;
  const timer = setInterval(() => {
    moon.textContent = phases[i % phases.length];
    i++;
    if (i > phases.length) {
      clearInterval(timer);
      confetti();
      setTimeout(showDashboard, 500);
    }
  }, 260);
}

/* Demo account: types the info like a person would */
function typeInto(input, text) {
  return new Promise((resolve) => {
    input.value = "";
    input.focus();
    let i = 0;
    const timer = setInterval(() => {
      input.value += text[i];
      input.dispatchEvent(new Event("input"));
      i++;
      if (i >= text.length) {
        clearInterval(timer);
        resolve();
      }
    }, 45);
  });
}

$("demoAccountBtn").addEventListener("click", async () => {
  resetForm();
  $("demoAccountBtn").disabled = true;
  await typeInto(nameInput, "Mateo Martinez");
  touched.name = true;
  checkName();
  await typeInto(emailInput, "mateo@gmail.com");
  touched.email = true;
  checkEmail();
  termsInput.checked = true;
  touched.terms = true;
  checkTerms();
  $("demoAccountBtn").disabled = false;
  setTimeout(() => createAccount(true), 400);
});

/* "Show me what happens with…" buttons */
const ERROR_DEMOS = {
  empty: ["", "", false],
  short: ["M", "mateo@gmail.com", true],
  numbers: ["Mateo 123", "mateo@gmail.com", true],
  noat: ["Mateo Martinez", "mateo.gmail.com", true],
  nodomain: ["Mateo Martinez", "mateo@", true],
  typo: ["Mateo Martinez", "mateo@gmial.com", true]
};

document.querySelectorAll("[data-demo]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const [name, email, terms] = ERROR_DEMOS[btn.dataset.demo];
    nameInput.value = name;
    emailInput.value = email;
    termsInput.checked = terms;
    validateAll();
  });
});

/* =========================================================
   DASHBOARD
   ========================================================= */
function showDashboard() {
  $("authView").hidden = true;
  $("dashView").hidden = false;
  ui.tab = ["tickets", "rewards", "subscription"].includes(location.hash.slice(1)) ? location.hash.slice(1) : "tickets";
  renderAll();
  toast(`Signed in as <strong>${esc(account.profile.email)}</strong>`, "success");
}

function showAuth() {
  $("dashView").hidden = true;
  $("authView").hidden = false;
  $("authForm").hidden = false;
  $("authWelcome").hidden = true;
  const btn = $("signupBtn");
  btn.classList.remove("loading", "done");
  btn.querySelector(".btn-label").textContent = "Create my account";
  resetForm();
}

function renderAll() {
  renderProfile();
  renderTabs();
  renderTickets();
  renderRewards();
  renderSubscription();
}

/* ---------- Profile ---------- */
function countUp(el, from, to) {
  const start = performance.now();
  const duration = 900;
  const step = (now) => {
    const p = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(from + (to - from) * eased).toLocaleString("en-US");
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function renderProfile() {
  const p = account.profile;
  const initials = p.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const tier = tierFor(lifetimePoints(account)).current;
  const points = availablePoints(account);

  $("avatar").textContent = initials;
  $("helloName").textContent = `Hi, ${p.name.split(" ")[0]} 👋`;
  $("profileEmail").textContent = p.email;
  $("memberSince").textContent = monthYear.format(parseISO(account.memberSince || toISODate(new Date())));
  $("tierPill").textContent = `${tier.icon} ${tier.name}`;

  countUp($("pointsCount"), ui.shownPoints, points);
  ui.shownPoints = points;

  const upcoming = account.tickets.filter((t) => ticketStart(t) > new Date()).length;
  $("ticketCount").textContent = upcoming;
  $("ticketCount").hidden = upcoming === 0;
}

$("loadDemoBtn").addEventListener("click", () => {
  const load = () => {
    const profile = account.profile;
    account = buildDemoAccount(profile);
    persist();
    ui.shownPoints = 0;
    renderAll();
    closeModal();
    confetti();
    toast("Demo data loaded: tickets, points and a plan.", "success");
  };

  if (account.tickets.length || account.history.length > 1) {
    openModal(`
      <h2 id="modalTitle">Load demo data?</h2>
      <p class="modal-text">This replaces your tickets, points and plan on this browser with example data. Your name and email stay the same.</p>
      <div class="modal-actions">
        <button type="button" class="btn-primary" id="confirmDemo">Load demo data</button>
        <button type="button" class="ghost-btn" data-cancel>Cancel</button>
      </div>
    `, (box) => {
      box.querySelector("#confirmDemo").addEventListener("click", load);
      box.querySelector("[data-cancel]").addEventListener("click", closeModal);
    });
  } else {
    load();
  }
});

$("signOutBtn").addEventListener("click", () => {
  openModal(`
    <h2 id="modalTitle">Sign out?</h2>
    <p class="modal-text">Your tickets and points stay saved on this browser for next time.</p>
    <div class="modal-actions">
      <button type="button" class="btn-primary" id="doSignOut">Sign out</button>
      <button type="button" class="danger-btn" id="doErase">Sign out &amp; erase my data</button>
    </div>
  `, (box) => {
    box.querySelector("#doSignOut").addEventListener("click", () => {
      account.profile = null;
      persist();
      closeModal();
      showAuth();
      toast("You signed out. See you at the movies!", "info");
    });
    box.querySelector("#doErase").addEventListener("click", () => {
      account = emptyAccount();
      persist();
      closeModal();
      showAuth();
      toast("Your data was erased from this browser.", "info");
    });
  });
});

/* ---------- Tabs ---------- */
function renderTabs() {
  document.querySelectorAll(".tab").forEach((tab) => {
    const active = tab.dataset.tab === ui.tab;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
    tab.tabIndex = active ? 0 : -1;
    $(`panel-${tab.dataset.tab}`).hidden = !active;
  });
  moveIndicator();
}

function moveIndicator() {
  const active = document.querySelector(".tab.active");
  if (!active) return;
  $("tabIndicator").style.width = `${active.offsetWidth}px`;
  $("tabIndicator").style.transform = `translateX(${active.offsetLeft}px)`;
}

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    ui.tab = tab.dataset.tab;
    history.replaceState(null, "", `#${ui.tab}`);
    renderTabs();
  });
  tab.addEventListener("keydown", (e) => {
    if (!["ArrowRight", "ArrowLeft"].includes(e.key)) return;
    const tabs = [...document.querySelectorAll(".tab")];
    const i = tabs.indexOf(tab) + (e.key === "ArrowRight" ? 1 : -1);
    const next = tabs[(i + tabs.length) % tabs.length];
    next.click();
    next.focus();
  });
});

window.addEventListener("resize", moveIndicator);
window.addEventListener("hashchange", () => {
  const tab = location.hash.slice(1);
  if (["tickets", "rewards", "subscription"].includes(tab) && account.profile) {
    ui.tab = tab;
    renderTabs();
  }
});

/* =========================================================
   TICKETS
   ========================================================= */
document.querySelectorAll(".seg").forEach((seg) => {
  seg.addEventListener("click", () => {
    ui.list = seg.dataset.list;
    document.querySelectorAll(".seg").forEach((s) => s.classList.toggle("active", s === seg));
    renderTickets();
  });
});

function countdownText(ms) {
  if (ms <= 0) return "Now playing 🍿";
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (d > 0) return `Starts in <strong>${d}d ${h}h ${m}m</strong>`;
  if (h > 0) return `Starts in <strong>${h}h ${String(m).padStart(2, "0")}m</strong>`;
  return `Starts in <strong>${m}m ${String(s).padStart(2, "0")}s</strong> – time to head over!`;
}

function renderTickets() {
  const area = $("ticketArea");
  const now = new Date();
  const upcoming = account.tickets.filter((t) => ticketStart(t) > now).sort((a, b) => ticketStart(a) - ticketStart(b));
  const past = account.tickets.filter((t) => ticketStart(t) <= now).sort((a, b) => ticketStart(b) - ticketStart(a));
  const list = ui.list === "upcoming" ? upcoming : past;

  document.querySelector('.seg[data-list="upcoming"]').textContent = `Upcoming (${upcoming.length})`;
  document.querySelector('.seg[data-list="past"]').textContent = `Past (${past.length})`;

  if (!list.length) {
    area.innerHTML = ui.list === "upcoming" ? `
      <div class="empty">
        <div class="reel" aria-hidden="true"></div>
        <h3>No upcoming tickets</h3>
        <p>When you buy tickets they'll show up here with a QR code for the entrance.</p>
        <div class="empty-actions">
          <a class="btn-primary" href="index.html#showtimes">Browse showtimes</a>
          <button type="button" class="ghost-btn" data-load-demo>✨ Load demo data</button>
        </div>
      </div>` : `
      <div class="empty">
        <div class="reel" aria-hidden="true"></div>
        <h3>No past movies yet</h3>
        <p>Movies you've watched will show up here so you can rate them and earn points.</p>
      </div>`;
    const demo = area.querySelector("[data-load-demo]");
    if (demo) demo.addEventListener("click", () => $("loadDemoBtn").click());
    return;
  }

  area.innerHTML = `<div class="ticket-grid">${list.map((t, i) => ticketCard(t, ui.list === "past", i)).join("")}</div>`;

  area.querySelectorAll("[data-qr]").forEach((b) => b.addEventListener("click", () => openQR(b.dataset.qr)));
  area.querySelectorAll("[data-ics]").forEach((b) => b.addEventListener("click", () => downloadICS(b.dataset.ics)));
  area.querySelectorAll(".stars").forEach(setupStars);
  updateCountdowns();
}

function ticketCard(t, isPast, index) {
  const movie = movieById(t.movie);
  if (!movie) return "";
  const start = ticketStart(t);
  const seats = t.seats.join(", ");
  const count = t.seats.length;
  const food = new URLSearchParams({ movie: t.movie, date: t.date, time: t.time, seats: t.seats.join(",") });
  const rating = account.ratings[t.id] || 0;

  return `
    <article class="ticket-card ${isPast ? "is-past" : ""}" style="animation-delay:${index * 70}ms">
      <img class="tc-poster" src="${esc(movie.poster)}" alt="${esc(movie.title)} poster">
      <div class="tc-body">
        <span class="tc-format">${esc(t.format)}</span>
        <h3>${esc(movie.title)}</h3>
        <p class="tc-when">${isPast ? "Watched " : ""}${longDate.format(start)} · ${formatTime(t.time)}</p>
        <p class="tc-where">📍 ${MAIN_THEATRE.name}</p>
        <p class="tc-seats">Seat${count > 1 ? "s" : ""} <strong>${esc(seats)}</strong> · ${count} ticket${count > 1 ? "s" : ""} · ${money(t.total)}</p>

        ${isPast ? `
          <div class="rate">
            <span>${rating ? "You rated it" : `Rate it · +${RATING_POINTS} pts`}</span>
            <div class="stars" data-id="${esc(t.id)}" data-rating="${rating}" role="radiogroup" aria-label="Rate ${esc(movie.title)}">
              ${[1, 2, 3, 4, 5].map((n) => `<button type="button" class="star ${n <= rating ? "on" : ""}" data-n="${n}" role="radio" aria-checked="${n === rating}" aria-label="${n} star${n > 1 ? "s" : ""}">★</button>`).join("")}
            </div>
          </div>` : `
          <p class="countdown" data-start="${start.getTime()}"></p>
          <div class="tc-actions">
            <button type="button" class="btn-primary" data-qr="${esc(t.id)}">Show QR</button>
            <button type="button" class="ghost-btn" data-ics="${esc(t.id)}">📅 Add to calendar</button>
            <a class="ghost-btn" href="food-drinks.html?${food.toString()}">🍿 Order food</a>
            <a class="ghost-btn" href="https://www.google.com/maps/dir/?api=1&destination=${MAIN_THEATRE.lat},${MAIN_THEATRE.lng}" target="_blank" rel="noopener">🧭 Directions</a>
          </div>`}
      </div>
      ${isPast ? "" : `<button type="button" class="tc-qr" data-qr="${esc(t.id)}" aria-label="Show QR code">${qrSVG(ticketCode(t), 21)}</button>`}
    </article>
  `;
}

/* Live countdowns */
function updateCountdowns() {
  let needsRefresh = false;
  document.querySelectorAll(".countdown[data-start]").forEach((el) => {
    const ms = Number(el.dataset.start) - Date.now();
    el.innerHTML = countdownText(ms);
    el.classList.toggle("soon", ms > 0 && ms < 3600000);
    if (ms <= 0) needsRefresh = true;
  });
  if (needsRefresh) setTimeout(() => { renderTickets(); renderProfile(); }, 4000);
}
setInterval(updateCountdowns, 1000);

/* Star rating */
function setupStars(box) {
  const stars = [...box.querySelectorAll(".star")];
  const paint = (n) => stars.forEach((s, i) => s.classList.toggle("on", i < n));

  stars.forEach((star) => {
    star.addEventListener("mouseenter", () => paint(Number(star.dataset.n)));
    star.addEventListener("focus", () => paint(Number(star.dataset.n)));
    star.addEventListener("click", () => {
      const n = Number(star.dataset.n);
      const id = box.dataset.id;
      const firstTime = !account.ratings[id];
      account.ratings[id] = n;

      if (firstTime) {
        const title = movieById(account.tickets.find((t) => t.id === id).movie).title;
        addPoints(account, RATING_POINTS, `Rated ${title}`, "rating");
        toast(`Thanks for rating! <strong>+${RATING_POINTS} pts</strong>`, "success");
      } else {
        toast(`Rating updated to ${n} star${n > 1 ? "s" : ""}.`, "info");
      }

      persist();
      star.classList.add("pop");
      setTimeout(() => { renderTickets(); renderProfile(); renderRewards(); }, 350);
    });
  });

  box.addEventListener("mouseleave", () => paint(Number(box.dataset.rating)));
}

/* QR code (looks like a real QR – for the demo) */
function qrSVG(text, size) {
  const n = 25;
  let seed = hashString(text);
  const rand = () => {
    seed = Math.imul(seed ^ (seed >>> 15), 2246822507) + 3266489909;
    return ((seed ^ (seed >>> 13)) >>> 0) / 4294967296;
  };

  const finder = (x, y) => {
    const inBox = (ox, oy) => x >= ox && x < ox + 7 && y >= oy && y < oy + 7;
    const corner = [[0, 0], [n - 7, 0], [0, n - 7]].find(([ox, oy]) => inBox(ox, oy));
    if (!corner) return null;
    const dx = x - corner[0];
    const dy = y - corner[1];
    const ring = Math.max(Math.abs(dx - 3), Math.abs(dy - 3));
    return ring !== 2;   // dark border, light ring, dark center
  };

  let rects = "";
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const f = finder(x, y);
      const dark = f !== null ? f : (x === 7 || y === 7 || x === n - 8 || y === n - 8) ? false : rand() > 0.52;
      if (dark) rects += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
    }
  }
  return `<svg class="qr" viewBox="-1 -1 ${n + 2} ${n + 2}" width="${size * 4}" height="${size * 4}" aria-hidden="true"><rect x="-1" y="-1" width="${n + 2}" height="${n + 2}" fill="#fff"/>${rects}</svg>`;
}

function openQR(id) {
  const t = account.tickets.find((x) => x.id === id);
  const movie = movieById(t.movie);
  openModal(`
    <div class="qr-modal">
      <p class="modal-eyebrow">${esc(t.format)} · ${MAIN_THEATRE.name}</p>
      <h2 id="modalTitle">${esc(movie.title)}</h2>
      <p class="qr-when">${longDate.format(ticketStart(t))} · ${formatTime(t.time)}</p>
      <div class="qr-big">${qrSVG(ticketCode(t), 60)}<span class="qr-scan" aria-hidden="true"></span></div>
      <p class="qr-code">${ticketCode(t)}</p>
      <p class="qr-seats">Seats <strong>${esc(t.seats.join(", "))}</strong></p>
      <p class="modal-text small">Turn up your screen brightness and show this at the entrance.</p>
    </div>
  `);
}

/* Add to calendar (.ics file) */
function downloadICS(id) {
  const t = account.tickets.find((x) => x.id === id);
  const movie = movieById(t.movie);
  const start = ticketStart(t);
  const end = new Date(start.getTime() + 150 * 60000);
  const fmt = (d) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}00`;

  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Eclipse Entertainment//My Eclipse//EN", "BEGIN:VEVENT",
    `UID:${ticketCode(t)}@eclipse-entertainment`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${movie.title} (${t.format}) – Eclipse`,
    `LOCATION:${MAIN_THEATRE.name}`,
    `DESCRIPTION:Seats ${t.seats.join(" ")} · Ticket ${ticketCode(t)}`,
    "END:VEVENT", "END:VCALENDAR"
  ].join("\r\n");

  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  link.download = `${movie.title.replace(/[^a-z0-9]+/gi, "-")}-eclipse.ics`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  toast("Calendar file downloaded. Open it to add the movie to your calendar.", "success");
}

/* =========================================================
   REWARDS
   ========================================================= */
function renderRewards() {
  const lifetime = lifetimePoints(account);
  const points = availablePoints(account);
  const { current, next, progress } = tierFor(lifetime);

  // Moon fills up on the way to Total Eclipse
  const total = Math.min(1, lifetime / TIERS[TIERS.length - 1].min);
  $("moonFill").style.transform = `translateY(${-104 * total}px)`;

  $("moonTier").textContent = `${current.icon} ${current.name}`;
  $("moonPoints").textContent = points.toLocaleString("en-US");
  $("tierBar").style.width = `${progress * 100}%`;
  $("moonNext").innerHTML = next
    ? `<strong>${(next.min - lifetime).toLocaleString("en-US")} pts</strong> to ${next.icon} ${next.name} – ${next.perk}`
    : "You reached the top tier. Enjoy early screenings and 2x points! 🎉";

  $("tierLadder").innerHTML = TIERS.map((t) => `
    <li class="${lifetime >= t.min ? "reached" : ""} ${t === current ? "current" : ""}">
      <span class="ladder-icon">${t.icon}</span>
      <span class="ladder-name">${t.name}</span>
      <span class="ladder-min">${t.min.toLocaleString("en-US")}</span>
    </li>`).join("");

  // Catalog
  $("rewardGrid").innerHTML = REWARDS.map((r) => {
    const can = points >= r.cost;
    const pct = Math.min(100, (points / r.cost) * 100);
    return `
      <article class="reward ${can ? "can" : "locked"}">
        <span class="reward-icon">${r.icon}</span>
        <h3>${esc(r.name)}</h3>
        <p>${esc(r.desc)}</p>
        <div class="reward-progress"><span style="width:${pct}%"></span></div>
        <div class="reward-foot">
          <strong>${r.cost.toLocaleString("en-US")} pts</strong>
          <button type="button" class="${can ? "btn-primary" : "ghost-btn"}" data-redeem="${r.id}">${can ? "Redeem" : `Need ${(r.cost - points).toLocaleString("en-US")}`}</button>
        </div>
      </article>`;
  }).join("");

  $("rewardGrid").querySelectorAll("[data-redeem]").forEach((b) => b.addEventListener("click", () => redeem(b)));

  // Coupons
  $("couponBox").hidden = account.coupons.length === 0;
  $("couponList").innerHTML = account.coupons.map((c) => {
    const reward = REWARDS.find((r) => r.id === c.reward);
    return `
      <li class="coupon">
        <span class="coupon-icon">${reward.icon}</span>
        <div>
          <strong>${esc(reward.name)}</strong>
          <small>Use by ${shortDate.format(new Date(c.expires))}</small>
        </div>
        <code>${c.code}</code>
        <button type="button" class="ghost-btn" data-copy="${c.code}">Copy</button>
      </li>`;
  }).join("");
  $("couponList").querySelectorAll("[data-copy]").forEach((b) => b.addEventListener("click", () => copyCode(b.dataset.copy, b)));

  // Badges
  $("badgeGrid").innerHTML = BADGES.map((b) => {
    const earned = b.test(account);
    return `
      <div class="badge ${earned ? "earned" : "locked"}" title="${esc(b.hint)}">
        <span class="badge-icon">${b.icon}</span>
        <strong>${esc(b.name)}</strong>
        <small>${earned ? "Unlocked" : esc(b.hint)}</small>
      </div>`;
  }).join("");

  // History
  const items = ui.historyAll ? account.history : account.history.slice(0, 7);
  $("historyList").innerHTML = items.length ? items.map((h) => `
    <li>
      <span class="h-date">${shortDate.format(new Date(h.date))}</span>
      <span class="h-label">${esc(h.label)}</span>
      <strong class="h-points ${h.points < 0 ? "minus" : "plus"}">${h.points > 0 ? "+" : ""}${h.points.toLocaleString("en-US")}</strong>
    </li>`).join("") + (account.history.length > 7 ? `<li class="h-more"><button type="button" id="toggleHistory">${ui.historyAll ? "Show less" : `Show all (${account.history.length})`}</button></li>` : "")
    : `<li class="h-empty">No points yet. Buy tickets or order food to start earning!</li>`;

  const toggle = $("toggleHistory");
  if (toggle) toggle.addEventListener("click", () => { ui.historyAll = !ui.historyAll; renderRewards(); });
}

function redeem(btn) {
  const reward = REWARDS.find((r) => r.id === btn.dataset.redeem);
  const points = availablePoints(account);

  // Not enough points: shake + explain
  if (points < reward.cost) {
    shake(btn.closest(".reward"));
    toast(`You need <strong>${(reward.cost - points).toLocaleString("en-US")} more points</strong> for ${reward.name}.`, "error");
    return;
  }

  openModal(`
    <div class="center">
      <span class="modal-icon">${reward.icon}</span>
      <h2 id="modalTitle">Redeem ${esc(reward.name)}?</h2>
      <p class="modal-text">This uses <strong>${reward.cost.toLocaleString("en-US")} points</strong>. You'll have ${(points - reward.cost).toLocaleString("en-US")} left.</p>
      <div class="modal-actions">
        <button type="button" class="btn-primary" id="confirmRedeem">Redeem now</button>
        <button type="button" class="ghost-btn" data-cancel>Not now</button>
      </div>
    </div>
  `, (box) => {
    box.querySelector("[data-cancel]").addEventListener("click", closeModal);
    box.querySelector("#confirmRedeem").addEventListener("click", () => {
      const code = `${reward.id.toUpperCase().slice(0, 3)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.floor(10 + Math.random() * 89)}`;
      const expires = new Date(Date.now() + 30 * 86400000).toISOString();
      account.coupons.unshift({ reward: reward.id, code, expires });
      addPoints(account, -reward.cost, `Redeemed: ${reward.name}`, "redeem");
      persist();

      box.innerHTML = `
        <div class="center">
          <span class="modal-icon pop">${reward.icon}</span>
          <h2 id="modalTitle">It's yours!</h2>
          <div class="coupon-ticket">
            <small>${esc(reward.name)}</small>
            <code>${code}</code>
            <small>Show this code at the counter · use by ${shortDate.format(new Date(expires))}</small>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn-primary" id="copyNew">Copy code</button>
            <button type="button" class="ghost-btn" data-cancel>Done</button>
          </div>
        </div>`;
      box.querySelector("#copyNew").addEventListener("click", (e) => copyCode(code, e.currentTarget));
      box.querySelector("[data-cancel]").addEventListener("click", closeModal);
      confetti();
      renderRewards();
      renderProfile();
    });
  });
}

function copyCode(code, btn) {
  const done = () => {
    const old = btn.textContent;
    btn.textContent = "Copied ✓";
    setTimeout(() => (btn.textContent = old), 1400);
    toast(`Code <strong>${code}</strong> copied.`, "success");
  };
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(code).then(done, () => toast(`Your code is <strong>${code}</strong>`, "info"));
  } else {
    // older browsers / opened as a file
    const area = document.createElement("textarea");
    area.value = code;
    document.body.appendChild(area);
    area.select();
    try { document.execCommand("copy"); done(); } catch (e) { toast(`Your code is <strong>${code}</strong>`, "info"); }
    area.remove();
  }
}

/* =========================================================
   SUBSCRIPTION
   ========================================================= */
function planPrice(plan, billing) {
  return billing === "yearly" ? plan.monthly * YEARLY_MONTHS : plan.monthly;
}

function renewDate(billing, from = new Date()) {
  const d = new Date(from);
  if (billing === "yearly") d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d;
}

document.querySelectorAll(".bill").forEach((b) => {
  b.addEventListener("click", () => {
    ui.billing = b.dataset.billing;
    document.querySelectorAll(".bill").forEach((x) => {
      x.classList.toggle("active", x === b);
      x.setAttribute("aria-checked", String(x === b));
    });
    document.querySelector(".billing-toggle").classList.toggle("yearly", ui.billing === "yearly");
    renderPlans();
  });
});

function renderSubscription() {
  renderCurrentPlan();
  renderPlans();
}

function renderCurrentPlan() {
  const box = $("currentPlan");
  const p = account.plan;

  if (!p) {
    box.innerHTML = `
      <div class="no-plan">
        <span class="no-plan-icon" aria-hidden="true">💜</span>
        <div>
          <h3>You don't have a plan yet</h3>
          <p>Members watch more and pay less – up to 3 movies for the price of 1.5 tickets.</p>
        </div>
      </div>`;
    return;
  }

  const plan = PLANS.find((x) => x.id === p.id);
  const renews = new Date(p.renews);
  const month = new Date().getMonth();
  const usedThisMonth = account.tickets.filter((t) => parseISO(t.date).getMonth() === month).length;
  const used = plan.movies === Infinity ? usedThisMonth : Math.min(usedThisMonth, plan.movies);
  const pct = plan.movies === Infinity ? 100 : (used / plan.movies) * 100;

  if (p.status === "canceled") {
    box.innerHTML = `
      <div class="current-plan canceled">
        <div>
          <p class="cp-label">Plan canceled</p>
          <h3>${esc(plan.name)}</h3>
          <p>You can keep using it until <strong>${planDate(renews)}</strong>. After that it won't renew.</p>
        </div>
        <button type="button" class="btn-primary" id="resumePlan">Resume plan</button>
      </div>`;
    $("resumePlan").addEventListener("click", () => {
      account.plan.status = "active";
      persist();
      renderSubscription();
      renderRewards();
      confetti();
      toast(`Welcome back! ${plan.name} will renew on ${planDate(renews)}.`, "success");
    });
    return;
  }

  box.innerHTML = `
    <div class="current-plan">
      <div class="cp-main">
        <p class="cp-label">Your plan ${p.offer ? `<span class="offer-tag">50% off next month</span>` : ""}</p>
        <h3>${esc(plan.name)}</h3>
        <p class="cp-price">${money(planPrice(plan, p.billing))} / ${p.billing === "yearly" ? "year" : "month"} · renews ${planDate(renews)}</p>
        <div class="usage">
          <div class="usage-top">
            <span>Movies this month</span>
            <strong>${plan.movies === Infinity ? `${used} watched · unlimited` : `${used} of ${plan.movies} used`}</strong>
          </div>
          <div class="usage-bar ${plan.movies === Infinity ? "unlimited" : ""}"><span style="width:${pct}%"></span></div>
        </div>
      </div>
      <ul class="cp-perks">${plan.features.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>
      <div class="cp-actions">
        <button type="button" class="ghost-btn" id="changePlan">Change plan</button>
        <button type="button" class="danger-link" id="cancelPlan">Cancel plan</button>
      </div>
    </div>`;

  $("changePlan").addEventListener("click", () => {
    $("planGrid").scrollIntoView({ behavior: "smooth", block: "center" });
    $("planGrid").classList.remove("glow");
    void $("planGrid").offsetWidth;
    $("planGrid").classList.add("glow");
  });
  $("cancelPlan").addEventListener("click", startCancel);
}

function renderPlans() {
  const p = account.plan && account.plan.status === "active" ? account.plan : null;
  const currentIndex = p ? PLANS.findIndex((x) => x.id === p.id) : -1;

  $("planGrid").innerHTML = PLANS.map((plan, i) => {
    const price = planPrice(plan, ui.billing);
    const isCurrent = p && p.id === plan.id && p.billing === ui.billing;
    let label = "Choose plan";
    if (isCurrent) label = "Current plan";
    else if (p && p.id === plan.id) label = `Switch to ${ui.billing}`;
    else if (p) label = i > currentIndex ? "Upgrade" : "Downgrade";

    return `
      <article class="plan ${plan.popular ? "popular" : ""} ${isCurrent ? "current" : ""}" style="animation-delay:${i * 80}ms">
        ${plan.popular ? `<span class="plan-flag">Most popular</span>` : ""}
        <h3>${esc(plan.name)}</h3>
        <p class="plan-price"><strong>${money(price)}</strong> / ${ui.billing === "yearly" ? "year" : "month"}</p>
        <p class="plan-sub">${ui.billing === "yearly" ? `That's ${money(price / 12)}/mo – save ${money(plan.monthly * 2)}` : `or ${money(plan.monthly * YEARLY_MONTHS)}/year (2 months free)`}</p>
        <ul>${plan.features.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>
        <button type="button" class="${isCurrent ? "ghost-btn" : "btn-primary"}" data-plan="${plan.id}" ${isCurrent ? "disabled" : ""}>${label}</button>
      </article>`;
  }).join("");

  $("planGrid").querySelectorAll("[data-plan]").forEach((b) => b.addEventListener("click", () => choosePlan(b.dataset.plan, b.textContent)));
}

function choosePlan(id, action) {
  const plan = PLANS.find((x) => x.id === id);
  const price = planPrice(plan, ui.billing);
  const renews = renewDate(ui.billing);

  openModal(`
    <div class="plan-confirm">
      <p class="modal-eyebrow">${esc(action)}</p>
      <h2 id="modalTitle">${esc(plan.name)}</h2>
      <div class="summary-rows">
        <div><span>Billing</span><strong>${ui.billing === "yearly" ? "Yearly" : "Monthly"}</strong></div>
        <div><span>Price</span><strong>${money(price)} / ${ui.billing === "yearly" ? "year" : "month"}</strong></div>
        <div><span>Next renewal</span><strong>${planDate(renews)}</strong></div>
        <div class="total"><span>Charged today</span><strong>$0.00 <small>(demo)</small></strong></div>
      </div>
      <p class="demo-note"><strong>Demo – no real payment.</strong> No card is needed.</p>
      <div class="modal-actions">
        <button type="button" class="btn-primary" id="confirmPlan">Confirm ${esc(plan.name)}</button>
        <button type="button" class="ghost-btn" data-cancel>Cancel</button>
      </div>
    </div>
  `, (box) => {
    box.querySelector("[data-cancel]").addEventListener("click", closeModal);
    box.querySelector("#confirmPlan").addEventListener("click", (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      btn.classList.add("loading");
      btn.textContent = "Activating…";

      setTimeout(() => {
        const since = account.plan && account.plan.status === "active" ? account.plan.since : new Date().toISOString();
        account.plan = { id: plan.id, billing: ui.billing, status: "active", since, renews: renews.toISOString(), offer: false };
        persist();

        box.innerHTML = `
          <div class="center">
            <div class="done-check" aria-hidden="true">✓</div>
            <h2 id="modalTitle">You're on ${esc(plan.name)}!</h2>
            <p class="modal-text">Your plan is active and renews on ${planDate(renews)}.</p>
            <button type="button" class="btn-primary" data-cancel>Awesome</button>
          </div>`;
        box.querySelector("[data-cancel]").addEventListener("click", closeModal);
        confetti();
        renderSubscription();
        renderRewards();
      }, 1100);
    });
  });
}

/* Cancel flow: are you sure? → special offer → canceled */
function startCancel() {
  const plan = PLANS.find((x) => x.id === account.plan.id);
  const renews = new Date(account.plan.renews);

  openModal(`
    <div class="center">
      <span class="modal-icon">😢</span>
      <h2 id="modalTitle">Cancel ${esc(plan.name)}?</h2>
      <p class="modal-text">If you cancel, after <strong>${planDate(renews)}</strong> you'll lose:</p>
      <ul class="lose-list">${plan.features.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>
      <div class="modal-actions">
        <button type="button" class="btn-primary" data-cancel>Keep my plan</button>
        <button type="button" class="danger-btn" id="cancelStep2">Continue to cancel</button>
      </div>
    </div>
  `, (box) => {
    box.querySelector("[data-cancel]").addEventListener("click", () => { closeModal(); toast("Great choice! Your plan stays active.", "success"); });
    box.querySelector("#cancelStep2").addEventListener("click", () => {
      box.innerHTML = `
        <div class="center">
          <span class="modal-icon pop">🎁</span>
          <h2 id="modalTitle">Wait! A special offer</h2>
          <p class="modal-text">Stay with ${esc(plan.name)} and get <strong>50% off your next month</strong>. That's ${money(plan.monthly / 2)} instead of ${money(plan.monthly)}.</p>
          <div class="modal-actions">
            <button type="button" class="btn-primary" id="acceptOffer">Yes, give me 50% off</button>
            <button type="button" class="danger-btn" id="cancelAnyway">Cancel anyway</button>
          </div>
        </div>`;
      box.querySelector("#acceptOffer").addEventListener("click", () => {
        account.plan.offer = true;
        persist();
        closeModal();
        confetti();
        renderSubscription();
        toast("50% off applied to your next month! 🎉", "success");
      });
      box.querySelector("#cancelAnyway").addEventListener("click", () => {
        account.plan.status = "canceled";
        account.plan.offer = false;
        persist();
        box.innerHTML = `
          <div class="center">
            <span class="modal-icon">👋</span>
            <h2 id="modalTitle">Your plan was canceled</h2>
            <p class="modal-text">You can still use ${esc(plan.name)} until ${planDate(renews)}. You can resume anytime before then.</p>
            <button type="button" class="btn-primary" data-cancel>OK</button>
          </div>`;
        box.querySelector("[data-cancel]").addEventListener("click", closeModal);
        renderSubscription();
        renderRewards();
      });
    });
  });
}

/* =========================================================
   INIT
   ========================================================= */
setField("name", null, HINTS.name);
setField("email", null, HINTS.email);

if (account.profile) {
  $("dashView").hidden = false;
  ui.tab = ["tickets", "rewards", "subscription"].includes(location.hash.slice(1)) ? location.hash.slice(1) : "tickets";
  renderAll();
} else {
  $("authView").hidden = false;
}