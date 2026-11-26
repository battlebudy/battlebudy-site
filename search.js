// Search box for the Stremio addons and Trakt lists pages.
// Filters the buttons on the page as you type. Optional extras, set on the <input>:
//   data-more-url="https://example.com/?q="  -> "search further" link when nothing matches
//   data-more-label="..."                     -> text for that link
//   data-trakt-search="https://.../api/search-lists?q="  -> also show matching public Trakt lists
(function () {
  "use strict";
  var input = document.getElementById("q");
  if (!input) return;
  var items = Array.prototype.slice.call(document.querySelectorAll("ul.apps > li"));
  var status = document.getElementById("q-status");
  var moreBox = document.getElementById("q-more");
  var timer = null, lastRemote = "";

  function text(el) { return (el.textContent || "").toLowerCase().replace(/\s+/g, " "); }
  var haystack = items.map(text);

  // a heading (h2/h3.sub) hides when every button in the lists that follow it (until the next heading of same or higher level) is hidden
  function syncHeadings() {
    var heads = document.querySelectorAll("h2, h3.sub");
    Array.prototype.forEach.call(heads, function (h) {
      if (h.closest && h.closest("#q-more")) return;
      var level = h.tagName === "H2" ? 2 : 3, el = h.nextElementSibling, any = false, seenList = false;
      while (el) {
        if (el.tagName === "H2" || (el.tagName === "H3" && level === 3)) break;
        if (el.matches && el.matches("ul.apps")) {
          seenList = true;
          if (el.querySelector("li:not([hidden])")) any = true;
        }
        el = el.nextElementSibling;
      }
      if (seenList) h.hidden = !any;
      var note = h.nextElementSibling;
      if (note && note.classList && note.classList.contains("note")) note.hidden = h.hidden;
    });
  }

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  function remoteSearch(q) {
    var api = input.getAttribute("data-trakt-search");
    if (!api || !moreBox) return;
    if (q.length < 3) { moreBox.innerHTML = ""; lastRemote = ""; return; }
    if (q === lastRemote) return;
    lastRemote = q;
    moreBox.innerHTML = '<p class="note">Searching Trakt…</p>';
    fetch(api + encodeURIComponent(q)).then(function (r) { return r.json(); }).then(function (lists) {
      if (q !== lastRemote) return;
      var onPage = {};
      items.forEach(function (li) { var a = li.querySelector("a"); if (a) onPage[a.getAttribute("href")] = 1; });
      lists = (lists || []).filter(function (l) { return !onPage["https://trakt.tv/users/" + l.user + "/lists/" + l.slug]; });
      if (!lists.length) { moreBox.innerHTML = '<p class="note">No other public Trakt lists found for "' + esc(q) + '".</p>'; return; }
      moreBox.innerHTML = '<h3 class="sub">More lists on Trakt</h3><ul class="apps">' + lists.map(function (l) {
        var href = "https://trakt.tv/users/" + encodeURIComponent(l.user) + "/lists/" + encodeURIComponent(l.slug);
        return '<li><a class="app" href="' + href + '"><span><span class="name">' + esc(l.name) + '</span>' +
          '<span class="desc">' + l.items + ' titles · ' + l.likes + ' likes</span>' +
          '<span class="hash">trakt.tv/users/' + esc(l.user) + '</span></span><span class="action">View</span></a></li>';
      }).join("") + "</ul>";
    }).catch(function () { moreBox.innerHTML = '<p class="note">Couldn\'t reach Trakt right now. Try again in a moment.</p>'; });
  }

  function run() {
    var q = input.value.trim().toLowerCase();
    var words = q.split(/\s+/).filter(Boolean);
    var shown = 0;
    items.forEach(function (li, i) {
      var ok = words.every(function (w) { return haystack[i].indexOf(w) !== -1; });
      li.hidden = !ok;
      if (ok) shown++;
    });
    syncHeadings();
    if (status) {
      if (!q) status.textContent = "";
      else if (shown) status.textContent = shown + (shown === 1 ? " match" : " matches") + " on this page";
      else {
        var url = input.getAttribute("data-more-url"), label = input.getAttribute("data-more-label");
        status.innerHTML = "Nothing on this page matches." + (url ? ' <a href="' + url + encodeURIComponent(q) + '">' + esc(label || "Search further") + "</a>" : "");
      }
    }
    clearTimeout(timer);
    timer = setTimeout(function () { remoteSearch(q); }, 450);
  }

  input.addEventListener("input", run);
  input.addEventListener("keydown", function (e) { if (e.key === "Escape") { input.value = ""; run(); } });
})();
