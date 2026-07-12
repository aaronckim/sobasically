/* sobasically.com — feed, search, browse. No build step, no dependencies. */
(function () {
  "use strict";

  const TERMS = window.TERMS || [];
  const PAGE = 12;

  const $feed = document.getElementById("feed");
  const $hero = document.getElementById("hero");
  const $search = document.getElementById("search");
  const $cats = document.getElementById("cats");
  const $more = document.getElementById("more");
  const $shuffle = document.getElementById("shuffle");
  const $az = document.getElementById("az");
  const $feedTitle = document.getElementById("feed-title");
  const $count = document.getElementById("count");
  const $toast = document.getElementById("toast");

  const CAT_LABEL = {
    ai: "ai & tech", medicine: "medicine", science: "science",
    finance: "finance", culture: "internet culture"
  };

  let state = { cat: "all", q: "", sort: "shuffle", shown: 0, order: [] };

  const slug = t => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  // Deterministic daily pick: hash today's date onto the repo.
  function dailyIndex() {
    const d = new Date();
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    let h = 0;
    for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
    return h % TERMS.length;
  }

  function seededShuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }

  function entryHTML(t, hero = false) {
    const s = slug(t.term);
    return `
      <article class="entry" id="${hero ? "today-" + s : s}">
        <div class="entry-top">
          <h3 class="term"><a href="#${s}">${esc(t.term)}</a></h3>
          <span class="badge ${t.cat}">${CAT_LABEL[t.cat] || t.cat}</span>
        </div>
        <p class="formal">${esc(t.formal)}</p>
        <p class="basically"><span class="basically-label">so basically:</span>
          <span class="basically-text">${esc(t.basically)}</span></p>
        ${t.hot ? `<p class="hot">${esc(t.hot)}</p>` : ""}
        <div class="entry-actions">
          <button data-copy="${esc(t.term)} = ${esc(t.basically)}">copy</button>
          <button data-link="${s}">link</button>
        </div>
      </article>`;
  }

  function renderHero() {
    const t = TERMS[dailyIndex()];
    $hero.innerHTML = `
      <p class="hero-label">today's so basically</p>
      ${entryHTML(t, true)}`;
  }

  function filtered() {
    const q = state.q.trim().toLowerCase();
    return TERMS.filter(t => {
      if (state.cat !== "all" && t.cat !== state.cat) return false;
      if (!q) return true;
      return (
        t.term.toLowerCase().includes(q) ||
        t.basically.toLowerCase().includes(q) ||
        t.formal.toLowerCase().includes(q) ||
        (t.hot || "").toLowerCase().includes(q)
      );
    });
  }

  function rebuildOrder() {
    let list = filtered();
    if (state.sort === "az") {
      list = list.slice().sort((a, b) => a.term.localeCompare(b.term));
    } else {
      list = seededShuffle(list);
    }
    state.order = list;
    state.shown = 0;
    $feed.innerHTML = "";
    renderMore();
    updateTitle();
  }

  function renderMore() {
    const next = state.order.slice(state.shown, state.shown + PAGE);
    if (state.shown === 0 && next.length === 0) {
      $feed.innerHTML = `<p class="empty">nothing here yet. <strong>“${esc(state.q)}”</strong> is apparently too complicated even for us.</p>`;
    } else {
      $feed.insertAdjacentHTML("beforeend", next.map(t => entryHTML(t)).join(""));
    }
    state.shown += next.length;
    $more.hidden = state.shown >= state.order.length;
  }

  function updateTitle() {
    const n = state.order.length;
    let label = state.cat === "all" ? "the feed" : CAT_LABEL[state.cat];
    if (state.q.trim()) label = `“${state.q.trim()}”`;
    $feedTitle.textContent = `${label} · ${n} term${n === 1 ? "" : "s"}`;
  }

  function toast(msg) {
    $toast.textContent = msg;
    $toast.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => $toast.classList.remove("show"), 1600);
  }

  // ————— events —————

  $search.addEventListener("input", () => { state.q = $search.value; rebuildOrder(); });

  $cats.addEventListener("click", e => {
    const btn = e.target.closest(".cat");
    if (!btn) return;
    $cats.querySelectorAll(".cat").forEach(b => b.classList.toggle("is-active", b === btn));
    state.cat = btn.dataset.cat;
    rebuildOrder();
  });

  $shuffle.addEventListener("click", () => {
    state.sort = "shuffle";
    $az.classList.remove("is-active");
    rebuildOrder();
  });

  $az.addEventListener("click", () => {
    state.sort = state.sort === "az" ? "shuffle" : "az";
    $az.classList.toggle("is-active", state.sort === "az");
    rebuildOrder();
  });

  $more.addEventListener("click", renderMore);

  document.querySelector(".logo").addEventListener("click", e => {
    e.preventDefault();
    $search.value = ""; state.q = ""; state.cat = "all"; state.sort = "shuffle";
    $cats.querySelectorAll(".cat").forEach(b => b.classList.toggle("is-active", b.dataset.cat === "all"));
    $az.classList.remove("is-active");
    rebuildOrder();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  document.addEventListener("click", e => {
    const copyBtn = e.target.closest("[data-copy]");
    if (copyBtn) {
      navigator.clipboard.writeText(copyBtn.dataset.copy).then(
        () => toast("copied. go sound smart."),
        () => toast("couldn't copy, sorry")
      );
    }
    const linkBtn = e.target.closest("[data-link]");
    if (linkBtn) {
      const url = location.origin + location.pathname + "#" + linkBtn.dataset.link;
      navigator.clipboard.writeText(url).then(
        () => toast("link copied"),
        () => toast("couldn't copy, sorry")
      );
    }
  });

  document.addEventListener("keydown", e => {
    if (e.key === "/" && document.activeElement !== $search) {
      e.preventDefault();
      $search.focus();
    }
  });

  // Deep link: #term-slug scrolls to that term (render everything in that case).
  function handleHash() {
    const h = location.hash.replace("#", "");
    if (!h) return;
    const target = TERMS.find(t => slug(t.term) === h);
    if (!target) return;
    while (state.shown < state.order.length && !document.getElementById(h)) renderMore();
    const el = document.getElementById(h);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.style.background = "var(--marker-soft)";
      setTimeout(() => (el.style.background = ""), 1800);
    }
  }
  window.addEventListener("hashchange", handleHash);

  // ————— boot —————
  renderHero();
  rebuildOrder();
  $count.textContent = `${TERMS.length} terms and counting.`;
  handleHash();
})();
