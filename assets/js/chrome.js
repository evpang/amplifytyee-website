/* ==========================================================================
   Amplify Tyee — shared page chrome (the header menu and the footer)
   --------------------------------------------------------------------------
   Every page used to carry its own copy of the menu and the footer, and they
   drifted: thank-you.html never got the Winter Concert link. They now live
   here once, and each page pulls them in with two script tags:

     <script src="assets/js/chrome.js?v=1" data-chrome="header"></script>
       ...the page...
     <script src="assets/js/chrome.js?v=1" data-chrome="footer"></script>

   The tag renders in its own place while the page is still parsing, so the
   header is there before the first paint — no flash, no jump.

   TO ADD OR RENAME A MENU ITEM, edit NAV_LINKS and FOOTER_PAGES below; every
   page picks it up. A page is highlighted in the menu by matching its file
   name (the "page" key), so a new page needs its file name in the link.

   Bump the ?v= number in all four pages when you edit this file, or browsers
   will keep the copy they already have (same rule as the CSS).
   ========================================================================== */

(function () {
  "use strict";

  var EMAIL = "amplifytyee@gmail.com";
  var FACEBOOK = "https://www.facebook.com/profile.php?id=61572966548657";
  var YOUTUBE = "https://www.youtube.com/@AMPLIFYTyee";

  /* The menu, in order. "page" is the file this link leads to, used to mark
     the current page; links to a section of the home page have none. */
  var NAV_LINKS = [
    { href: "./",                  text: "Home",           page: "index.html" },
    { href: "./#donate",           text: "Donate" },
    { href: "sweatshirts.html",    text: "Buy a Hoodie",   page: "sweatshirts.html" },
    /* Winter Concert is hidden from the menu (2026-11-24). The page is still
       live and still listed in the footer; put this line back to show it. */
    /* { href: "WinterConcert.html",  text: "Winter Concert", page: "winterconcert.html" }, */
    { href: "./#connect",          text: "Connect" }
  ];

  var FOOTER_PAGES = [
    { href: "./",                 text: "Home" },
    { href: "sweatshirts.html",   text: "Buy a Music Hoodie" },
    { href: "WinterConcert.html", text: "Winter Concert" },
    { href: "./#donate",          text: "Donate" }
  ];

  /* Inline brand icons: Simple Icons paths, kept here so no page repeats them. */
  var FACEBOOK_SVG =
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="#0866FF" ' +
    'd="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 ' +
    '.955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 ' +
    '26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42' +
    '-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 ' +
    '18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 ' +
    '11.647Z"/></svg>';

  var YOUTUBE_SVG =
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="#FF0000" ' +
    'd="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 ' +
    '0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 ' +
    '0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 ' +
    '2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 ' +
    '12l-6.273 3.568z"/></svg>';

  /* Which page is being viewed, as a lower-case file name. "/" is the home page. */
  function currentPage() {
    var last = location.pathname.split("/").pop().toLowerCase();
    return last === "" ? "index.html" : last;
  }

  function headerHtml() {
    var here = currentPage();
    var items = NAV_LINKS.map(function (l) {
      var current = l.page && l.page === here ? ' aria-current="page"' : "";
      return '      <a href="' + l.href + '"' + current + ">" + l.text + "</a>";
    }).join("\n");

    return (
      '<a class="skip-link" href="#main">Skip to main content</a>\n' +
      '<header class="site-header">\n' +
      '  <div class="wrap">\n' +
      '    <a class="brand" href="./">\n' +
      '      <img class="brand-logo" src="assets/img/logo.png" alt="" width="52" height="52">\n' +
      "      <span>\n" +
      '        <span class="brand-name">Amplify Tyee</span>\n' +
      '        <span class="brand-sub">Music Booster Club</span>\n' +
      "      </span>\n" +
      "    </a>\n" +
      '    <nav class="site-nav" aria-label="Main">\n' +
      items + "\n" +
      '      <a class="nav-icon" href="' + FACEBOOK + '" target="_blank" rel="noopener" ' +
      'aria-label="Amplify Tyee on Facebook (opens in a new tab)" ' +
      'title="Amplify Tyee on Facebook">' + FACEBOOK_SVG + "</a>\n" +
      '      <a class="nav-icon" href="' + YOUTUBE + '" target="_blank" rel="noopener" ' +
      'aria-label="Amplify Tyee on YouTube (opens in a new tab)" ' +
      'title="Amplify Tyee on YouTube">' + YOUTUBE_SVG + "</a>\n" +
      "    </nav>\n" +
      "  </div>\n" +
      "</header>"
    );
  }

  function footerHtml() {
    var pages = FOOTER_PAGES.map(function (l) {
      return '          <li><a href="' + l.href + '">' + l.text + "</a></li>";
    }).join("\n");

    return (
      '<footer class="site-footer">\n' +
      '  <div class="wrap">\n' +
      '    <div class="foot-grid">\n' +
      "      <div>\n" +
      "        <h4>Amplify Tyee</h4>\n" +
      '        <p style="margin:0;">Advancing Music Programs, Learning, and Inspiration for Youth.\n' +
      "           Supporting band, orchestra, choir, and theater at Tyee Middle School.</p>\n" +
      "      </div>\n" +
      "      <div>\n" +
      "        <h4>Pages</h4>\n" +
      "        <ul>\n" + pages + "\n        </ul>\n" +
      "      </div>\n" +
      "      <div>\n" +
      "        <h4>Connect</h4>\n" +
      "        <ul>\n" +
      '          <li><a href="mailto:' + EMAIL + '">' + EMAIL + "</a></li>\n" +
      '          <li><a href="' + FACEBOOK + '" target="_blank" rel="noopener">Facebook</a></li>\n' +
      '          <li><a href="' + YOUTUBE + '" target="_blank" rel="noopener">YouTube</a></li>\n' +
      "        </ul>\n" +
      "      </div>\n" +
      "    </div>\n" +
      '    <div class="foot-bottom">\n' +
      "      &copy; " + new Date().getFullYear() + " Amplify Tyee &middot; A nonprofit booster " +
      "club supporting the Tyee Middle School music department.\n" +
      "    </div>\n" +
      "  </div>\n" +
      "</footer>"
    );
  }

  /* Each tag writes its own part where it sits. The script is not deferred, so
     this runs during parsing and the markup lands in document order. */
  var tag = document.currentScript;
  if (!tag) return;                                  // only in very old browsers
  var part = tag.getAttribute("data-chrome");
  if (part !== "header" && part !== "footer") {
    console.error('[Amplify Tyee] chrome.js needs data-chrome="header" or "footer".');
    return;
  }
  tag.insertAdjacentHTML("beforebegin", part === "header" ? headerHtml() : footerHtml());
})();
