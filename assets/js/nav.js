/* ==========================================================================
   Amplify Tyee — menu highlight on the home page
   --------------------------------------------------------------------------
   Donate and Connect are sections of the home page, not separate pages, so
   the highlight has to follow where you are: Home at the top, Donate once the
   "Support Our Students" section reaches the header, Connect for "Stay
   Connected". It updates on scroll, on load (e.g. arriving at #support from
   the hoodie page), and immediately when a menu item is clicked.

   Pages whose menu has no links to sections of that same page keep their
   static aria-current (e.g. "Buy a Hoodie" on sweatshirts.html).

   Links to the home page are written as "./" and "./#support" (not
   "index.html#support") so that a visitor on amplifytyee.org/ stays on the
   same URL and the browser scrolls instead of reloading the page.
   ========================================================================== */
(function () {
  "use strict";

  var nav = document.querySelector(".site-nav");
  var header = document.querySelector(".site-header");
  if (!nav) return;

  // "/", "/index.html" and "index.html" all mean the home page.
  function pagePath(url) { return url.pathname.replace(/index\.html$/, ""); }
  function isThisPage(url) {
    return url.origin === location.origin && pagePath(url) === pagePath(location);
  }

  var home = null;     // menu link to the top of this page
  var sections = [];   // { link, el } in page order
  Array.prototype.forEach.call(nav.querySelectorAll("a[href]"), function (link) {
    var url = new URL(link.getAttribute("href"), location.href);
    if (!isThisPage(url)) return;
    if (!url.hash) { home = link; return; }
    var el = document.getElementById(decodeURIComponent(url.hash.slice(1)));
    if (el) sections.push({ link: link, el: el });
  });
  if (!sections.length) return;
  sections.sort(function (a, b) {
    return a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
  });

  var navLinks = nav.querySelectorAll("a");
  var current = null;

  function setActive(link) {
    if (link === current) return;
    current = link;
    Array.prototype.forEach.call(navLinks, function (a) { a.removeAttribute("aria-current"); });
    if (link) link.setAttribute("aria-current", link === home ? "page" : "location");
  }

  var locked = false;   // true while scrolling to a clicked menu item (see below)

  function update() {
    // Don't let a hashchange/resize mid-scroll overwrite the item that was just clicked.
    if (locked) return;
    // A section counts as reached once its top is just below the sticky header.
    // (The header is taller on phones, where the menu wraps.)
    var line = (header ? header.getBoundingClientRect().bottom : 0) + 60;
    var active = home;
    sections.forEach(function (s) {
      if (s.el.getBoundingClientRect().top <= line) active = s.link;
    });
    // At the very bottom the last sections may never reach the line (the page
    // can't scroll further), so pick the last one that is on screen.
    var atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
    if (atBottom) {
      sections.forEach(function (s) {
        if (s.el.getBoundingClientRect().top < window.innerHeight) active = s.link;
      });
    }
    setActive(active);
  }

  // After a menu click, show that item straight away and hold it while the page
  // scrolls there, instead of flickering through the sections in between.
  var unlockTimer = null;
  function unlockSoon(ms) {
    clearTimeout(unlockTimer);
    unlockTimer = setTimeout(function () { locked = false; update(); }, ms);
  }

  sections.forEach(function (s) {
    s.link.addEventListener("click", function () {
      setActive(s.link);
      locked = true;
      unlockSoon(700);   // covers a click that needs no scrolling
    });
  });

  // Home and the logo, clicked while already on the home page: scroll back to the top
  // instead of reloading. Ctrl/Cmd/Shift/middle-click keep their usual new-tab behaviour.
  Array.prototype.forEach.call(document.querySelectorAll(".site-header a[href]"), function (link) {
    var url = new URL(link.getAttribute("href"), location.href);
    if (!isThisPage(url) || url.hash) return;
    link.addEventListener("click", function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      if (location.hash) history.pushState(null, "", location.pathname + location.search);
      setActive(home);
      locked = true;
      unlockSoon(700);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

  // update() is only a few getBoundingClientRect calls, so it runs directly on scroll.
  window.addEventListener("scroll", function () {
    if (locked) { unlockSoon(150); return; }   // wait until scrolling stops
    update();
  }, { passive: true });
  window.addEventListener("resize", update);
  window.addEventListener("hashchange", update);
  window.addEventListener("load", update);
  update();
})();
