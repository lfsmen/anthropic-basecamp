(function () {
  "use strict";

  var UI = window.BASECAMP_UI;
  var ACTIVITIES = window.BASECAMP_ACTIVITIES;
  var LANGS = ["en", "pt", "de"];
  var STORE_PROGRESS = "basecamp.progress.v1";
  var STORE_LANG = "basecamp.lang";

  var lang = detectLang();
  var filter = "all";
  var progress = load(STORE_PROGRESS, {});

  // ---------- storage (fails soft in private mode) ----------
  function load(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }
  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignore */ }
  }

  function detectLang() {
    var fromUrl = new URLSearchParams(location.search).get("lang");
    if (LANGS.indexOf(fromUrl) > -1) return fromUrl;
    var stored = load(STORE_LANG, null);
    if (LANGS.indexOf(stored) > -1) return stored;
    var nav = (navigator.language || "en").slice(0, 2).toLowerCase();
    return LANGS.indexOf(nav) > -1 ? nav : "en";
  }

  // ---------- helpers ----------
  function t(key, vars) {
    var str = (UI[lang] && UI[lang][key]) || UI.en[key] || key;
    if (vars) Object.keys(vars).forEach(function (k) { str = str.replace("{" + k + "}", vars[k]); });
    return str;
  }
  function key(activity, challenge) { return activity.id + "/" + challenge.id; }
  function isDone(activity, challenge) { return Boolean(progress[key(activity, challenge)]); }
  function doneCount(activity) {
    return activity.challenges.filter(function (c) { return isDone(activity, c); }).length;
  }
  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  // ---------- static copy ----------
  function applyStaticCopy() {
    document.documentElement.lang = lang === "pt" ? "pt" : lang;
    document.querySelectorAll("[data-i18n]").forEach(function (node) {
      node.textContent = t(node.getAttribute("data-i18n"));
    });
    document.querySelectorAll("[data-i18n-attr]").forEach(function (node) {
      var parts = node.getAttribute("data-i18n-attr").split(":");
      node.setAttribute(parts[0], t(parts[1]));
    });
    document.querySelectorAll("[data-lang]").forEach(function (btn) {
      btn.setAttribute("aria-pressed", String(btn.getAttribute("data-lang") === lang));
    });
    document.querySelectorAll("[data-filter]").forEach(function (btn) {
      btn.setAttribute("aria-pressed", String(btn.getAttribute("data-filter") === filter));
    });
  }

  // ---------- activities ----------
  function renderActivities() {
    var list = document.getElementById("activity-list");
    list.textContent = "";
    var visibleCards = 0;

    ACTIVITIES.forEach(function (activity, index) {
      var done = doneCount(activity);
      var total = activity.challenges.length;
      var complete = done === total;

      var card = el("article", "activity" + (complete ? " is-complete" : ""));
      card.id = "activity-" + activity.id;

      var head = el("header", "activity__head");
      var num = el("span", "activity__num", String(index + 1).padStart(2, "0"));
      num.setAttribute("aria-hidden", "true");
      var titles = el("div", "activity__titles");
      var meta = el("p", "activity__meta", t("activity.day", { n: activity.day }) + " · " + activity.time);
      var h3 = el("h3", "activity__title", activity.title[lang] || activity.title.en);
      var summary = el("p", "activity__summary", activity.summary[lang] || activity.summary.en);
      titles.append(meta, h3, summary);

      var status = el("div", "activity__status");
      if (complete) status.append(el("span", "badge", t("activity.complete")));
      status.append(el("span", "activity__count", t("activity.count", { done: done, total: total })));
      var bar = el("div", "bar bar--small");
      bar.setAttribute("aria-hidden", "true");
      var fill = el("span", "bar__fill");
      fill.style.width = (done / total) * 100 + "%";
      bar.append(fill);
      status.append(bar);

      head.append(num, titles, status);
      card.append(head);

      var ul = el("ul", "challenges");
      activity.challenges.forEach(function (challenge) {
        var checked = isDone(activity, challenge);
        if ((filter === "open" && checked) || (filter === "done" && !checked)) return;

        var li = el("li", "challenge" + (checked ? " is-done" : ""));
        var label = el("label", "challenge__label");
        var input = document.createElement("input");
        input.type = "checkbox";
        input.className = "challenge__input";
        input.checked = checked;
        input.addEventListener("change", function () { toggle(activity, challenge, input.checked); });
        var box = el("span", "challenge__box");
        box.setAttribute("aria-hidden", "true");
        var text = el("span", "challenge__text", challenge[lang] || challenge.en);
        label.append(input, box, text);
        li.append(label);
        ul.append(li);
      });

      if (ul.children.length) {
        card.append(ul);
        list.append(card);
        visibleCards++;
      }
    });

    document.getElementById("empty").hidden = visibleCards > 0;
  }

  function renderSummary() {
    var total = 0, done = 0, activitiesDone = 0;
    ACTIVITIES.forEach(function (a) {
      var d = doneCount(a);
      total += a.challenges.length;
      done += d;
      if (d === a.challenges.length) activitiesDone++;
    });
    var pct = total ? Math.round((done / total) * 100) : 0;

    document.getElementById("overall-pct").textContent = pct;
    var bar = document.getElementById("overall-bar");
    bar.setAttribute("aria-valuenow", String(pct));
    bar.querySelector(".bar__fill").style.width = pct + "%";
    document.getElementById("overall-meta").textContent = t("progress.meta", { done: done, total: total });
    document.getElementById("stat-activities").textContent = ACTIVITIES.length;
    document.getElementById("stat-challenges").textContent = total;
    document.getElementById("stat-done").textContent = activitiesDone;
    return { done: done, total: total };
  }

  function render() {
    applyStaticCopy();
    renderActivities();
    renderSummary();
  }

  // ---------- actions ----------
  function toggle(activity, challenge, checked) {
    var k = key(activity, challenge);
    var wasComplete = doneCount(activity) === activity.challenges.length;
    if (checked) progress[k] = new Date().toISOString();
    else delete progress[k];
    save(STORE_PROGRESS, progress);

    renderActivities();
    var totals = renderSummary();
    restoreFocus(activity, challenge);

    var nowComplete = doneCount(activity) === activity.challenges.length;
    if (totals.done === totals.total) toast(t("toast.allDone"));
    else if (nowComplete && !wasComplete) toast(t("toast.activityDone", { name: activity.title[lang] || activity.title.en }));
  }

  // Re-rendering replaces the DOM, so put keyboard focus back on the same checkbox.
  function restoreFocus(activity, challenge) {
    var card = document.getElementById("activity-" + activity.id);
    if (!card) return;
    var index = activity.challenges.indexOf(challenge);
    var inputs = card.querySelectorAll(".challenge__input");
    var target = filter === "all" ? inputs[index] : inputs[0];
    if (target) target.focus({ preventScroll: true });
  }

  var toastTimer;
  function toast(message) {
    var node = document.getElementById("toast");
    node.textContent = message;
    node.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { node.classList.remove("is-visible"); }, 3200);
  }

  document.querySelectorAll("[data-lang]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      lang = btn.getAttribute("data-lang");
      render();
      save(STORE_LANG, lang);
      // Keep ?lang= in the address bar for sharing; some embedded viewers forbid this.
      try {
        var url = new URL(location.href);
        url.searchParams.set("lang", lang);
        history.replaceState(null, "", url);
      } catch (e) { /* ignore */ }
    });
  });

  document.querySelectorAll("[data-filter]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      filter = btn.getAttribute("data-filter");
      render();
    });
  });

  document.getElementById("reset").addEventListener("click", function () {
    if (!confirm(t("actions.resetConfirm"))) return;
    progress = {};
    save(STORE_PROGRESS, progress);
    render();
    toast(t("toast.reset"));
  });

  render();
})();
