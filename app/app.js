// FridayList render + filter + sort logic. One job: take the deal list from
// deals.js and show the deals the shopper asked for, with honest numbers.
import { CHECKED_DATE, CATEGORIES, DEALS, STORES } from "./deals.js";

// Store search pages: the "View at" link for a deal opens the store's own
// search for that exact product, so the link always shows the matching item.
const STORE_SEARCH = {
  Amazon: "https://www.amazon.com/s?k=",
  "Best Buy": "https://www.bestbuy.com/site/searchpage.jsp?st=",
  Lenovo: "https://www.lenovo.com/us/en/search?query=",
};

const grid = document.getElementById("dealGrid");
const countLine = document.getElementById("countLine");
const searchBox = document.getElementById("searchBox");
const categoryPick = document.getElementById("categoryPick");
const storePick = document.getElementById("storePick");
const discountPick = document.getElementById("discountPick");
const sortPick = document.getElementById("sortPick");

function money(n) {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function wholeMoney(n) {
  return "$" + Math.round(n).toLocaleString("en-US");
}

function discountPct(deal) {
  return Math.round((1 - deal.sale / deal.usual) * 100);
}

function saving(deal) {
  return deal.usual - deal.sale;
}

// Deal score: discount % plus cash saved (capped), plus a bonus when a
// source calls the price a new low. Used only for the default sort.
function dealScore(deal) {
  let score = discountPct(deal) + Math.min(saving(deal) / 20, 25);
  if (deal.signal === "NEW LOW") score += 10;
  else if (deal.signal === "STRONG PRICE") score += 5;
  return score;
}

function storeLink(deal) {
  return STORE_SEARCH[deal.store] + encodeURIComponent(deal.q);
}

function escapeHtml(text) {
  return text.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[c]);
}

function signalClass(signal) {
  if (signal === "NEW LOW") return "sig-new";
  if (signal === "STRONG PRICE") return "sig-strong";
  return "sig-routine";
}

// Deals for the same product at another store, for the compare line.
const byGroup = new Map();
for (const deal of DEALS) {
  if (!deal.group) continue;
  if (!byGroup.has(deal.group)) byGroup.set(deal.group, []);
  byGroup.get(deal.group).push(deal);
}

function compareLine(deal) {
  const siblings = (byGroup.get(deal.group) || []).filter((d) => d.id !== deal.id);
  if (siblings.length === 0) return "";
  const parts = siblings.map(
    (d) => `Also at ${d.store} for ${money(d.sale)} (${discountPct(d)}% off)`
  );
  return `<p class="compare">${parts.join(" · ")}</p>`;
}

function cardHtml(deal) {
  const pct = discountPct(deal);
  return `<article class="card">
    <div class="card-top">
      <span class="cat-tag">${deal.cat}</span>
      <span class="signal ${signalClass(deal.signal)}">${deal.signal}</span>
    </div>
    <h3>${deal.name}</h3>
    <p class="store">${deal.store}</p>
    <p class="prices"><span class="sale">${money(deal.sale)}</span>
      <span class="usual">${money(deal.usual)}</span>
      <span class="pct">−${pct}%</span></p>
    <p class="save">You save ${money(saving(deal))}</p>
    <p class="evidence">${deal.evidence}</p>
    ${compareLine(deal)}
    <p class="meta">Checked ${CHECKED_DATE} · Source: ${deal.source}</p>
    <a class="buy" href="${storeLink(deal)}" target="_blank" rel="noopener">View at ${deal.store} ↗</a>
  </article>`;
}

function readState() {
  return {
    q: searchBox.value.trim().toLowerCase(),
    cat: categoryPick.value,
    store: storePick.value,
    min: Number(discountPick.value),
    sort: sortPick.value,
  };
}

function visibleDeals(state) {
  let list = DEALS.filter((deal) => {
    if (state.cat !== "all" && deal.cat !== state.cat) return false;
    if (state.store !== "all" && deal.store !== state.store) return false;
    if (discountPct(deal) < state.min) return false;
    if (state.q) {
      const hay = (deal.name + " " + deal.store + " " + deal.cat).toLowerCase();
      if (!hay.includes(state.q)) return false;
    }
    return true;
  });
  const sorts = {
    score: (a, b) => dealScore(b) - dealScore(a),
    pct: (a, b) => discountPct(b) - discountPct(a),
    saving: (a, b) => saving(b) - saving(a),
    low: (a, b) => a.sale - b.sale,
    high: (a, b) => b.sale - a.sale,
  };
  return list.sort(sorts[state.sort] || sorts.score);
}

function render() {
  const state = readState();
  const list = visibleDeals(state);
  grid.innerHTML = list.map(cardHtml).join("");
  if (list.length === 0) {
    grid.innerHTML = `<p class="empty">No deals match those filters. Try clearing the search or lowering the discount.</p>`;
  }
  const shown = list.length;
  const total = DEALS.length;
  const bits = [];
  if (state.q) bits.push(`matching “${state.q}”`);
  if (state.cat !== "all") bits.push(state.cat);
  if (state.store !== "all") bits.push(state.store);
  if (state.min > 0) bits.push(`${state.min}% off or more`);
  countLine.textContent =
    `Showing ${shown} of ${total} deals` + (bits.length ? ` — ${bits.join(" · ")}` : "");
}

function fillOptions() {
  for (const cat of CATEGORIES) {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    categoryPick.appendChild(opt);
  }
  for (const store of STORES) {
    const opt = document.createElement("option");
    opt.value = store;
    opt.textContent = store;
    storePick.appendChild(opt);
  }
}

// Filters can be preset from the address bar, e.g. ?cat=TVs&min=50&q=airpods,
// so a shared link opens the same filtered view.
function applyAddressBar() {
  const params = new URLSearchParams(window.location.search);
  const cat = params.get("cat");
  if (cat && CATEGORIES.includes(cat)) categoryPick.value = cat;
  const store = params.get("store");
  if (store && STORES.includes(store)) storePick.value = store;
  const min = params.get("min");
  if (min && ["0", "20", "30", "40", "50"].includes(min)) discountPick.value = min;
  const q = params.get("q");
  if (q) searchBox.value = q;
  const sort = params.get("sort");
  if (sort && ["score", "pct", "saving", "low", "high"].includes(sort)) sortPick.value = sort;
}

for (const el of [searchBox, categoryPick, storePick, discountPick, sortPick]) {
  el.addEventListener("input", render);
  el.addEventListener("change", render);
}

fillOptions();
applyAddressBar();
render();
