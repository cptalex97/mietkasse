"use strict";

/* ===================== Mietkasse — App-Logik ===================== */

const STORAGE_KEY = "mietkasse_v1";
const APP_VERSION = "1.0.0";

/* ---------- Daten-Schicht ---------- */
function blankData() {
  return { version: 1, properties: [], tenants: [], payments: {} };
}
let state = load();

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return blankData();
    const d = JSON.parse(raw);
    return {
      version: 1,
      properties: Array.isArray(d.properties) ? d.properties : [],
      tenants: Array.isArray(d.tenants) ? d.tenants : [],
      payments: d.payments && typeof d.payments === "object" ? d.payments : {},
    };
  } catch (e) {
    console.error("Laden fehlgeschlagen", e);
    return blankData();
  }
}
function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    alert("Speichern fehlgeschlagen — evtl. ist der Gerätespeicher voll.\n\n" + e.message);
  }
}

/* ---------- Helfer ---------- */
function uid() {
  return "x" + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
}
const eurFmt = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });
const fmtEUR = (n) => eurFmt.format(Number(n) || 0);

const MONTHS_DE = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];
function monthKeyOf(date) {
  return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0");
}
function currentMonthKey() { return monthKeyOf(new Date()); }
function monthLabel(key) {
  const [y, m] = key.split("-").map(Number);
  return MONTHS_DE[m - 1] + " " + y;
}
function shiftMonth(key, delta) {
  let [y, m] = key.split("-").map(Number);
  m += delta;
  while (m < 1) { m += 12; y--; }
  while (m > 12) { m -= 12; y++; }
  return y + "-" + String(m).padStart(2, "0");
}

function propertyById(id) { return state.properties.find((p) => p.id === id); }
function tenantById(id) { return state.tenants.find((t) => t.id === id); }
function tenantsOf(propertyId) { return state.tenants.filter((t) => t.propertyId === propertyId); }

function getPayment(monthKey, tenantId) {
  const m = state.payments[monthKey];
  return (m && m[tenantId]) || { paid: false, paidDate: null, note: "" };
}
function setPayment(monthKey, tenantId, patch) {
  if (!state.payments[monthKey]) state.payments[monthKey] = {};
  const cur = getPayment(monthKey, tenantId);
  state.payments[monthKey][tenantId] = Object.assign({ paid: false, paidDate: null, note: "" }, cur, patch);
  save();
}

function monthStats(monthKey, tenantList) {
  const tenants = tenantList || state.tenants;
  let total = tenants.length, paidCount = 0, sumExpected = 0, sumPaid = 0;
  for (const t of tenants) {
    const rent = Number(t.rent) || 0;
    sumExpected += rent;
    if (getPayment(monthKey, t.id).paid) { paidCount++; sumPaid += rent; }
  }
  return { total, paidCount, openCount: total - paidCount, sumExpected, sumPaid, sumOpen: sumExpected - sumPaid };
}

function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* ---------- Icons ---------- */
const ICON = {
  chev: '<svg class="chev" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>',
  circle: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  building: '<svg viewBox="0 0 24 24"><path d="M4 20V8l8-5 8 5v12"/><path d="M9 20v-6h6v6"/></svg>',
  alert: '<svg viewBox="0 0 24 24"><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.8L2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0z"/></svg>',
  party: '<svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="9.5" cy="7" r="4"/><path d="M21 21v-2a4 4 0 0 0-3-3.87"/></svg>',
  phone: '<svg viewBox="0 0 24 24"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .3 1.9.6 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.5 2.8.6a2 2 0 0 1 1.7 2z"/></svg>',
  mail: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>',
  download: '<svg viewBox="0 0 24 24"><path d="M12 3v12M7 11l5 5 5-5"/><path d="M5 21h14"/></svg>',
  upload: '<svg viewBox="0 0 24 24"><path d="M12 21V9M7 13l5-5 5 5"/><path d="M5 3h14"/></svg>',
  share: '<svg viewBox="0 0 24 24"><path d="M12 16V4M8 8l4-4 4 4"/><path d="M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7"/></svg>',
  info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/></svg>',
  pencil: '<svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
  left: '<svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>',
  right: '<svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>',
};

/* ---------- DOM-Refs ---------- */
const $view = document.getElementById("view");
const $hdrTitle = document.getElementById("hdrTitle");
const $hdrBack = document.getElementById("hdrBack");
const $hdrAction = document.getElementById("hdrAction");
const $tabbar = document.getElementById("tabbar");

let monthCursor = currentMonthKey(); // im Speicher gehaltener Monat für die Monatsansicht

/* ---------- Header steuern ---------- */
function setHeader(title, opts = {}) {
  $hdrTitle.textContent = title;
  if (opts.back) {
    $hdrBack.hidden = false;
    $hdrBack.onclick = opts.back;
  } else {
    $hdrBack.hidden = true; $hdrBack.onclick = null;
  }
  if (opts.action) {
    $hdrAction.hidden = false;
    $hdrAction.innerHTML = opts.action.label;
    $hdrAction.onclick = opts.action.onClick;
  } else {
    $hdrAction.hidden = true; $hdrAction.onclick = null;
  }
}

/* ---------- Router ---------- */
function parseHash() {
  const h = location.hash.replace(/^#\/?/, "");
  const parts = h.split("/").filter(Boolean);
  return { route: parts[0] || "uebersicht", id: parts[1] || null };
}
function go(hash) { location.hash = hash; }

function render() {
  const { route, id } = parseHash();
  const tabRoute = ["immobilie", "partei"].includes(route) ? "immobilien" : route;
  [...$tabbar.querySelectorAll(".tab")].forEach((a) =>
    a.classList.toggle("active", a.dataset.route === tabRoute));
  window.scrollTo(0, 0);

  switch (route) {
    case "uebersicht": return viewUebersicht();
    case "monat": return viewMonat();
    case "immobilien": return viewImmobilien();
    case "immobilie": return viewPropertyDetail(id);
    case "partei": return viewTenantDetail(id);
    case "mehr": return viewMehr();
    default: return viewUebersicht();
  }
}

/* ===================== Views ===================== */

function viewUebersicht() {
  setHeader("Übersicht");
  const mk = currentMonthKey();
  const s = monthStats(mk);

  let bannerHtml = "";
  if (s.total === 0) {
    bannerHtml = "";
  } else if (s.openCount === 0) {
    bannerHtml = `<div class="banner ok" role="status">
      ${ICON.check.replace("<svg", '<svg style="stroke-width:2.4"')}
      <div class="banner-text"><strong>Alles bezahlt 🎉</strong>
      <span>Alle ${s.total} Parteien haben im ${esc(monthLabel(mk))} gezahlt.</span></div></div>`;
  } else {
    bannerHtml = `<button class="banner warn" onclick="go('#/monat')">
      ${ICON.alert}
      <div class="banner-text"><strong>${s.openCount} von ${s.total} noch offen</strong>
      <span>Im ${esc(monthLabel(mk))} fehlen noch ${fmtEUR(s.sumOpen)}.</span></div>
      ${ICON.chev}</button>`;
  }

  let propsHtml;
  if (state.properties.length === 0) {
    propsHtml = emptyState(ICON.building, "Noch keine Immobilien",
      "Lege deine erste Immobilie an, um Mietparteien zu erfassen.",
      `<button class="btn" onclick="go('#/immobilien')">${ICON.plus} Erste Immobilie anlegen</button>`);
  } else {
    propsHtml = `<section><div class="section-label">Deine Immobilien · ${esc(monthLabel(mk))}</div>
      <div class="card">` +
      state.properties.map((p) => {
        const ts = tenantsOf(p.id);
        const st = monthStats(mk, ts);
        const sub = ts.length === 0 ? "Keine Parteien" : `${st.paidCount}/${st.total} bezahlt · ${fmtEUR(st.sumPaid)}`;
        return `<button class="row" onclick="go('#/immobilie/${p.id}')">
          <div class="row-main"><div class="row-title">${esc(p.name)}</div>
          <div class="row-sub num">${sub}</div></div>
          <div class="row-end">${ICON.chev}</div></button>`;
      }).join("") + `</div></section>`;
  }

  const statHtml = s.total === 0 ? "" : `<section class="stats">
      <div class="stat good"><div class="k">Erhalten</div><div class="v num">${fmtEUR(s.sumPaid)}</div></div>
      <div class="stat ${s.sumOpen > 0 ? "bad" : ""}"><div class="k">Noch offen</div><div class="v num">${fmtEUR(s.sumOpen)}</div></div>
    </section>`;

  $view.innerHTML = bannerHtml + statHtml + propsHtml;
}

function viewMonat() {
  const mk = monthCursor;
  setHeader("Monat");

  const allT = state.tenants;
  const s = monthStats(mk, allT);

  const nav = `<div class="month-nav">
    <button onclick="changeMonth(-1)" aria-label="Vorheriger Monat">${ICON.left}</button>
    <div class="month-label">${esc(monthLabel(mk))}
      ${mk !== currentMonthKey() ? `<div class="today-link"><a href="#" onclick="jumpToday(event)">Zu diesem Monat</a></div>` : ""}
    </div>
    <button onclick="changeMonth(1)" aria-label="Nächster Monat">${ICON.right}</button>
  </div>`;

  if (allT.length === 0) {
    $view.innerHTML = nav + emptyState(ICON.party, "Noch keine Mietparteien",
      "Lege zuerst eine Immobilie mit Parteien an.",
      `<button class="btn" onclick="go('#/immobilien')">${ICON.plus} Zu den Immobilien</button>`);
    return;
  }

  const summary = `<div id="monthSummary">${monthSummaryHtml(mk, s)}</div>`;

  // nach Immobilie gruppieren
  let groups = "";
  for (const p of state.properties) {
    const ts = tenantsOf(p.id);
    if (ts.length === 0) continue;
    groups += `<section><div class="section-label">${esc(p.name)}</div><div class="card">` +
      ts.map((t) => payRowHtml(mk, t)).join("") + `</div></section>`;
  }

  $view.innerHTML = nav + summary + groups;
}

function monthSummaryHtml(mk, s) {
  const pct = s.total ? Math.round((s.paidCount / s.total) * 100) : 0;
  return `<section class="card card-pad" style="margin-bottom:18px">
    <div style="display:flex;justify-content:space-between;align-items:baseline">
      <strong class="num">${s.paidCount}/${s.total} bezahlt</strong>
      <span class="muted num">${fmtEUR(s.sumPaid)} / ${fmtEUR(s.sumExpected)}</span>
    </div>
    <div class="progress"><i style="width:${pct}%"></i></div>
    ${s.sumOpen > 0 ? `<div class="mt8 num" style="color:var(--danger);font-weight:600">Noch offen: ${fmtEUR(s.sumOpen)}</div>` : `<div class="mt8" style="color:var(--accent);font-weight:600">Vollständig bezahlt</div>`}
  </section>`;
}

function payRowHtml(mk, t) {
  const pay = getPayment(mk, t.id);
  const sub = [t.unit ? esc(t.unit) : "", fmtEUR(t.rent)].filter(Boolean).join(" · ");
  return `<div class="row pay-row">
    <button class="row-main" style="background:none;border:none;cursor:pointer;padding:0" onclick="go('#/partei/${t.id}')">
      <div class="row-title">${esc(t.name)}</div>
      <div class="row-sub num">${sub}</div>
    </button>
    <button class="pay-toggle ${pay.paid ? "paid" : ""}" data-tid="${t.id}" onclick="togglePaid('${t.id}')"
      aria-pressed="${pay.paid}" aria-label="Zahlung ${esc(t.name)} umschalten">
      <span class="ico-open">${ICON.circle}</span><span class="ico-check">${ICON.check}</span>
      <span class="lbl">${pay.paid ? "Bezahlt" : "Offen"}</span>
    </button>
  </div>`;
}

function togglePaid(tenantId) {
  const mk = monthCursor;
  const cur = getPayment(mk, tenantId);
  const paid = !cur.paid;
  setPayment(mk, tenantId, { paid, paidDate: paid ? new Date().toISOString() : null });

  // Button in-place aktualisieren
  const btn = $view.querySelector(`.pay-toggle[data-tid="${tenantId}"]`);
  if (btn) {
    btn.classList.toggle("paid", paid);
    btn.setAttribute("aria-pressed", String(paid));
    btn.querySelector(".lbl").textContent = paid ? "Bezahlt" : "Offen";
  }
  // Summary aktualisieren
  const sum = document.getElementById("monthSummary");
  if (sum) sum.innerHTML = monthSummaryHtml(mk, monthStats(mk, state.tenants));
}

window.changeMonth = function (delta) { monthCursor = shiftMonth(monthCursor, delta); viewMonat(); };
window.jumpToday = function (e) { e.preventDefault(); monthCursor = currentMonthKey(); viewMonat(); };

function viewImmobilien() {
  setHeader("Immobilien", {
    action: { label: ICON.plus, onClick: () => openPropertyForm() },
  });
  if (state.properties.length === 0) {
    $view.innerHTML = emptyState(ICON.building, "Noch keine Immobilien",
      "Hier legst du deine Mietobjekte an. Tippe oben rechts auf Plus, um zu starten.",
      `<button class="btn" onclick="openPropertyForm()">${ICON.plus} Immobilie anlegen</button>`);
    return;
  }
  const list = state.properties.map((p) => {
    const ts = tenantsOf(p.id);
    const sumRent = ts.reduce((a, t) => a + (Number(t.rent) || 0), 0);
    const sub = `${ts.length} ${ts.length === 1 ? "Partei" : "Parteien"}${ts.length ? " · " + fmtEUR(sumRent) + "/Monat" : ""}`;
    return `<button class="row" onclick="go('#/immobilie/${p.id}')">
      <div class="row-main"><div class="row-title">${esc(p.name)}</div>
      <div class="row-sub num">${sub}</div></div>${ICON.chev}</button>`;
  }).join("");
  $view.innerHTML = `<div class="card">${list}</div>
    <div class="fab-row"><button class="btn secondary" onclick="openPropertyForm()">${ICON.plus} Weitere Immobilie</button></div>`;
}

function viewPropertyDetail(id) {
  const p = propertyById(id);
  if (!p) { go("#/immobilien"); return; }
  setHeader(p.name, {
    back: () => go("#/immobilien"),
    action: { label: ICON.pencil, onClick: () => openPropertyForm(p) },
  });
  const ts = tenantsOf(id);

  const head = `<div class="detail-head"><h2>${esc(p.name)}</h2>
    ${p.address ? `<p>${esc(p.address)}</p>` : ""}</div>`;

  let body;
  if (ts.length === 0) {
    body = emptyState(ICON.party, "Noch keine Mietparteien",
      "Füge die erste Partei hinzu, deren Miete du verfolgen willst.",
      `<button class="btn" onclick="openTenantForm(null,'${id}')">${ICON.plus} Partei hinzufügen</button>`);
  } else {
    const mk = currentMonthKey();
    const rows = ts.map((t) => {
      const pay = getPayment(mk, t.id);
      const badge = pay.paid
        ? `<span style="color:var(--accent);font-weight:700;font-size:.85rem">Bezahlt</span>`
        : `<span style="color:var(--text-faint);font-weight:600;font-size:.85rem">Offen</span>`;
      return `<button class="row" onclick="go('#/partei/${t.id}')">
        <div class="row-main"><div class="row-title">${esc(t.name)}</div>
        <div class="row-sub num">${[t.unit ? esc(t.unit) : "", fmtEUR(t.rent)].filter(Boolean).join(" · ")}</div></div>
        <div class="row-end">${badge}${ICON.chev}</div></button>`;
    }).join("");
    body = `<section><div class="section-label">Parteien · Stand ${esc(monthLabel(mk))}</div>
      <div class="card">${rows}</div></section>
      <div class="fab-row"><button class="btn secondary" onclick="openTenantForm(null,'${id}')">${ICON.plus} Partei hinzufügen</button></div>`;
  }

  const danger = `<div class="mt16"><button class="btn ghost" onclick="confirmDeleteProperty('${id}')">${ICON.trash} Immobilie löschen</button></div>`;
  $view.innerHTML = head + body + danger;
}

function viewTenantDetail(id) {
  const t = tenantById(id);
  if (!t) { go("#/immobilien"); return; }
  const p = propertyById(t.propertyId);
  setHeader(t.name, {
    back: () => go("#/immobilie/" + t.propertyId),
    action: { label: ICON.pencil, onClick: () => openTenantForm(t, t.propertyId) },
  });

  const mk = currentMonthKey();
  const pay = getPayment(mk, t.id);

  let contact = "";
  if (t.contact) {
    const c = t.contact.trim();
    const isMail = c.includes("@");
    const href = isMail ? "mailto:" + c : "tel:" + c.replace(/[^+\d]/g, "");
    contact = `<div class="contact-links">
      <a href="${esc(href)}">${isMail ? ICON.mail : ICON.phone} ${esc(c)}</a></div>`;
  }

  const note = t.note ? `<div class="note-block">${esc(t.note)}</div>` : "";

  $view.innerHTML = `
    <div class="detail-head"><h2>${esc(t.name)}</h2>
      <p>${esc(p ? p.name : "")}${t.unit ? " · " + esc(t.unit) : ""}</p></div>

    <section class="card card-pad">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div><div class="muted" style="font-size:.85rem">Monatsmiete</div>
        <div class="num" style="font-size:1.6rem;font-weight:700">${fmtEUR(t.rent)}</div></div>
        <button class="pay-toggle ${pay.paid ? "paid" : ""}" data-tid="${t.id}" onclick="togglePaidDetail('${t.id}')"
          aria-pressed="${pay.paid}">
          <span class="ico-open">${ICON.circle}</span><span class="ico-check">${ICON.check}</span>
          <span class="lbl">${pay.paid ? "Bezahlt" : "Offen"}</span>
        </button>
      </div>
      <div class="muted mt8" style="font-size:.85rem">Status für ${esc(monthLabel(mk))}${pay.paid && pay.paidDate ? " · bezahlt am " + new Date(pay.paidDate).toLocaleDateString("de-DE") : ""}</div>
      ${contact}${note}
    </section>

    <div class="mt16"><button class="btn ghost" onclick="confirmDeleteTenant('${t.id}')">${ICON.trash} Partei löschen</button></div>`;
}

window.togglePaidDetail = function (tenantId) {
  const mk = currentMonthKey();
  const cur = getPayment(mk, tenantId);
  const paid = !cur.paid;
  setPayment(mk, tenantId, { paid, paidDate: paid ? new Date().toISOString() : null });
  viewTenantDetail(tenantId);
};

function viewMehr() {
  setHeader("Mehr");
  const nTen = state.tenants.length, nProp = state.properties.length;
  $view.innerHTML = `
    <section><div class="section-label">Daten sichern</div>
      <div class="card">
        <button class="row list-link" onclick="exportData()">
          <svg class="lead" viewBox="0 0 24 24"><path d="M12 3v12M7 11l5 5 5-5"/><path d="M5 21h14"/></svg>
          <div class="row-main"><div class="row-title">Daten exportieren</div>
          <div class="row-sub">Sicherungsdatei speichern (empfohlen!)</div></div>${ICON.chev}</button>
        <button class="row list-link" onclick="importData()">
          <svg class="lead" viewBox="0 0 24 24"><path d="M12 21V9M7 13l5-5 5 5"/><path d="M5 3h14"/></svg>
          <div class="row-main"><div class="row-title">Daten importieren</div>
          <div class="row-sub">Sicherung wiederherstellen</div></div>${ICON.chev}</button>
      </div>
      <p class="hint" style="padding:8px 6px 0;color:var(--text-muted);font-size:.8rem">
        Alle Daten liegen nur auf diesem Gerät. Mach ab und zu einen Export als Backup.</p>
    </section>

    <section><div class="section-label">Hilfe</div>
      <div class="card">
        <button class="row list-link" onclick="showInstallHelp()">
          <svg class="lead" viewBox="0 0 24 24"><path d="M12 16V4M8 8l4-4 4 4"/><path d="M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7"/></svg>
          <div class="row-main"><div class="row-title">Als App installieren</div>
          <div class="row-sub">Zum Home-Bildschirm hinzufügen</div></div>${ICON.chev}</button>
        <button class="row list-link" onclick="showAbout()">
          <svg class="lead" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>
          <div class="row-main"><div class="row-title">Über Mietkasse</div>
          <div class="row-sub">Version ${APP_VERSION} · ${nProp} Immobilien · ${nTen} Parteien</div></div>${ICON.chev}</button>
      </div>
    </section>`;
}

/* ===================== Formulare (Modal) ===================== */
const $scrim = document.getElementById("modalScrim");
const $modal = document.getElementById("modal");

function openModal(html) {
  $modal.innerHTML = `<div class="grabber"></div>` + html;
  $scrim.hidden = false;
  document.body.style.overflow = "hidden";
  const first = $modal.querySelector("input,textarea,button");
  if (first && first.tagName !== "BUTTON") setTimeout(() => first.focus(), 60);
}
function closeModal() {
  $scrim.hidden = true;
  $modal.innerHTML = "";
  document.body.style.overflow = "";
}
$scrim.addEventListener("click", (e) => { if (e.target === $scrim) closeModal(); });

window.openPropertyForm = function (prop) {
  const edit = !!prop;
  openModal(`
    <h2>${edit ? "Immobilie bearbeiten" : "Neue Immobilie"}</h2>
    <form id="propForm" autocomplete="off">
      <div class="field"><label>Name <span class="req">*</span></label>
        <input name="name" required placeholder="z. B. Hauptstraße 12" value="${edit ? esc(prop.name) : ""}" /></div>
      <div class="field"><label>Adresse</label>
        <input name="address" placeholder="optional" value="${edit ? esc(prop.address || "") : ""}" /></div>
      <div class="modal-actions">
        <button type="submit" class="btn">${edit ? "Speichern" : "Anlegen"}</button>
        <button type="button" class="btn secondary" onclick="closeModal()">Abbrechen</button>
      </div>
    </form>`);
  document.getElementById("propForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = e.target;
    const name = f.elements.name.value.trim();
    if (!name) { f.elements.name.focus(); return; }
    if (edit) {
      prop.name = name; prop.address = f.elements.address.value.trim();
    } else {
      state.properties.push({ id: uid(), name, address: f.elements.address.value.trim(), note: "" });
    }
    save(); closeModal();
    if (!edit) go("#/immobilien");
    render();
    toast(edit ? "Gespeichert" : "Immobilie angelegt");
  });
};

window.openTenantForm = function (tenant, propertyId) {
  const edit = !!tenant;
  const pid = propertyId || (tenant && tenant.propertyId);
  openModal(`
    <h2>${edit ? "Partei bearbeiten" : "Neue Mietpartei"}</h2>
    <form id="tenForm" autocomplete="off">
      <div class="field"><label>Name <span class="req">*</span></label>
        <input name="name" required placeholder="z. B. Familie Müller" value="${edit ? esc(tenant.name) : ""}" /></div>
      <div class="field"><label>Einheit / Wohnung</label>
        <input name="unit" placeholder="z. B. 2. OG links" value="${edit ? esc(tenant.unit || "") : ""}" /></div>
      <div class="field"><label>Monatsmiete <span class="req">*</span></label>
        <div class="input-suffix"><input name="rent" inputmode="decimal" required placeholder="0,00"
          value="${edit ? String(tenant.rent).replace(".", ",") : ""}" /><span class="sfx">€</span></div></div>
      <div class="field"><label>Kontakt (Telefon oder E-Mail)</label>
        <input name="contact" inputmode="email" placeholder="optional" value="${edit ? esc(tenant.contact || "") : ""}" />
        <div class="hint">Zum direkten Anrufen/Schreiben bei offener Miete.</div></div>
      <div class="field"><label>Notiz</label>
        <textarea name="note" placeholder="z. B. zahlt per Dauerauftrag, Kaution …">${edit ? esc(tenant.note || "") : ""}</textarea></div>
      <div class="modal-actions">
        <button type="submit" class="btn">${edit ? "Speichern" : "Hinzufügen"}</button>
        <button type="button" class="btn secondary" onclick="closeModal()">Abbrechen</button>
      </div>
    </form>`);
  document.getElementById("tenForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = e.target;
    const name = f.elements.name.value.trim();
    const rent = parseFloat(String(f.elements.rent.value).replace(/\./g, "").replace(",", "."));
    if (!name) { f.elements.name.focus(); return; }
    if (isNaN(rent) || rent < 0) { alert("Bitte eine gültige Miete eingeben."); f.elements.rent.focus(); return; }
    const data = {
      name, unit: f.elements.unit.value.trim(), rent,
      contact: f.elements.contact.value.trim(), note: f.elements.note.value.trim(),
    };
    if (edit) {
      Object.assign(tenant, data);
    } else {
      state.tenants.push(Object.assign({ id: uid(), propertyId: pid, active: true, since: currentMonthKey() }, data));
    }
    save(); closeModal(); render();
    toast(edit ? "Gespeichert" : "Partei hinzugefügt");
  });
};

/* ===================== Löschen + Undo ===================== */
function confirmModal({ title, message, confirmLabel, onConfirm }) {
  openModal(`<h2>${esc(title)}</h2>
    <p class="muted" style="margin:0 0 4px">${message}</p>
    <div class="modal-actions">
      <button type="button" class="btn danger" id="cfYes">${esc(confirmLabel)}</button>
      <button type="button" class="btn secondary" onclick="closeModal()">Abbrechen</button>
    </div>`);
  document.getElementById("cfYes").onclick = () => { closeModal(); onConfirm(); };
}

window.confirmDeleteProperty = function (id) {
  const p = propertyById(id);
  if (!p) return;
  const ts = tenantsOf(id);
  confirmModal({
    title: "Immobilie löschen?",
    message: `„${esc(p.name)}“ und ${ts.length} ${ts.length === 1 ? "Partei" : "Parteien"} samt Zahlungsverlauf werden entfernt.`,
    confirmLabel: "Löschen",
    onConfirm: () => {
      const removedTenants = ts.slice();
      const removedPayments = {};
      for (const t of ts) for (const mk in state.payments) {
        if (state.payments[mk][t.id]) {
          (removedPayments[mk] = removedPayments[mk] || {})[t.id] = state.payments[mk][t.id];
          delete state.payments[mk][t.id];
        }
      }
      const pIdx = state.properties.findIndex((x) => x.id === id);
      const removedProp = state.properties.splice(pIdx, 1)[0];
      state.tenants = state.tenants.filter((t) => t.propertyId !== id);
      save(); go("#/immobilien"); render();
      toast("Immobilie gelöscht", () => {
        state.properties.push(removedProp);
        state.tenants.push(...removedTenants);
        for (const mk in removedPayments) {
          state.payments[mk] = state.payments[mk] || {};
          Object.assign(state.payments[mk], removedPayments[mk]);
        }
        save(); render();
      });
    },
  });
};

window.confirmDeleteTenant = function (id) {
  const t = tenantById(id);
  if (!t) return;
  confirmModal({
    title: "Partei löschen?",
    message: `„${esc(t.name)}“ samt Zahlungsverlauf wird entfernt.`,
    confirmLabel: "Löschen",
    onConfirm: () => {
      const idx = state.tenants.findIndex((x) => x.id === id);
      const removed = state.tenants.splice(idx, 1)[0];
      const removedPayments = {};
      for (const mk in state.payments) if (state.payments[mk][id]) {
        removedPayments[mk] = state.payments[mk][id];
        delete state.payments[mk][id];
      }
      save(); go("#/immobilie/" + t.propertyId); render();
      toast("Partei gelöscht", () => {
        state.tenants.push(removed);
        for (const mk in removedPayments) {
          state.payments[mk] = state.payments[mk] || {};
          state.payments[mk][id] = removedPayments[mk];
        }
        save(); render();
      });
    },
  });
};

/* ===================== Toast ===================== */
const $toast = document.getElementById("toast");
let toastTimer = null;
function toast(msg, undoFn) {
  clearTimeout(toastTimer);
  $toast.innerHTML = `<span>${esc(msg)}</span>` + (undoFn ? `<button id="toastUndo">Rückgängig</button>` : "");
  $toast.hidden = false;
  if (undoFn) document.getElementById("toastUndo").onclick = () => {
    clearTimeout(toastTimer); $toast.hidden = true; undoFn(); toast("Wiederhergestellt");
  };
  toastTimer = setTimeout(() => { $toast.hidden = true; }, undoFn ? 6000 : 2400);
}

/* ===================== Export / Import ===================== */
window.exportData = function () {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const stamp = new Date().toISOString().slice(0, 10);
  const a = document.createElement("a");
  a.href = url; a.download = `mietkasse-backup-${stamp}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast("Sicherung erstellt");
};

window.importData = function () {
  const input = document.createElement("input");
  input.type = "file"; input.accept = "application/json,.json";
  input.onchange = () => {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const d = JSON.parse(reader.result);
        if (!d || !Array.isArray(d.properties) || !Array.isArray(d.tenants)) throw new Error("Ungültiges Format");
        confirmModal({
          title: "Daten importieren?",
          message: `Die Sicherung enthält ${d.properties.length} Immobilien und ${d.tenants.length} Parteien. Deine aktuellen Daten werden ersetzt.`,
          confirmLabel: "Importieren",
          onConfirm: () => {
            state = { version: 1, properties: d.properties, tenants: d.tenants, payments: d.payments || {} };
            save(); go("#/uebersicht"); render(); toast("Import erfolgreich");
          },
        });
      } catch (err) {
        alert("Datei konnte nicht gelesen werden:\n" + err.message);
      }
    };
    reader.readAsText(file);
  };
  input.click();
};

/* ===================== Hilfe-Dialoge ===================== */
window.showInstallHelp = function () {
  openModal(`<h2>Als App installieren</h2>
    <p class="muted" style="margin-top:0">So landet Mietkasse als Icon auf dem Home-Bildschirm — ganz ohne App Store:</p>
    <ol style="padding-left:20px;line-height:1.9;font-size:.98rem">
      <li>Diese Seite in <strong>Safari</strong> öffnen.</li>
      <li>Unten auf das <strong>Teilen-Symbol</strong> tippen (Quadrat mit Pfeil nach oben).</li>
      <li>„<strong>Zum Home-Bildschirm</strong>“ wählen.</li>
      <li>Mit „<strong>Hinzufügen</strong>“ bestätigen — fertig.</li>
    </ol>
    <p class="hint" style="color:var(--text-muted)">Danach startet die App im Vollbild und funktioniert auch offline.</p>
    <div class="modal-actions"><button class="btn" onclick="closeModal()">Verstanden</button></div>`);
};
window.showAbout = function () {
  openModal(`<h2>Über Mietkasse</h2>
    <p style="margin-top:0">Eine simple Helfer-App, um Mieteingänge pro Monat abzuhaken.</p>
    <p class="muted" style="font-size:.92rem">Alle Daten bleiben ausschließlich auf diesem Gerät — keine Cloud, kein Konto, keine Weitergabe. Sichere sie regelmäßig über „Daten exportieren".</p>
    <p class="muted" style="font-size:.85rem">Version ${APP_VERSION}</p>
    <div class="modal-actions"><button class="btn" onclick="closeModal()">Schließen</button></div>`);
};

/* ===================== Bausteine ===================== */
function emptyState(icon, title, text, action) {
  return `<div class="empty">${icon}<h3>${esc(title)}</h3><p>${esc(text)}</p>${action || ""}</div>`;
}

/* ===================== Start ===================== */
window.go = go;
window.closeModal = closeModal;
window.togglePaid = togglePaid;

window.addEventListener("hashchange", render);
if (!location.hash) location.hash = "#/uebersicht";
render();

/* Service Worker */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("service-worker.js").catch(() => {}));
}
