/* ==========================================================================
   Amplify Tyee — order form
   --------------------------------------------------------------------------
   Plain browser JavaScript. No build step, no dependencies except the
   PayPal SDK, which is loaded on demand only when a Client ID is configured.

   Flow:  fill form -> live total -> PayPal checkout -> capture payment
          -> record the order to Google Sheets -> show an on-screen receipt.

   This one script drives every ordering page. A page says which store it is
   with <body data-store="sweatshirts">; the settings come from that block of
   AMPLIFY_CONFIG.STORES, on top of ACCOUNT and DEFAULTS. Everything is in
   config.js - you should not need to edit this file to add a store.
   ========================================================================== */
(function () {
  "use strict";

  var ALL = window.AMPLIFY_CONFIG || {};
  var STORES = ALL.STORES || {};

  /* Which store is this page? The <body data-store> attribute names it; with
     only one store configured we use that one, so a page can skip the
     attribute. An unknown name is worth shouting about: every order on the
     page depends on it. */
  function pickStore() {
    var keys = Object.keys(STORES);
    var named = (document.body && document.body.getAttribute("data-store") || "").trim();
    if (named && STORES[named]) return STORES[named];
    if (named) {
      console.error('[Amplify Tyee] No store named "' + named + '" in config.js STORES.');
      return null;
    }
    return keys.length === 1 ? STORES[keys[0]] : null;
  }

  var STORE = pickStore();
  if (!STORE) return;

  /* One flat object: the store's own settings win, then DEFAULTS, then the
     account-wide ones. The rest of this file just reads CFG, as before. */
  var CFG = {};
  (function merge() {
    var sources = [ALL, ALL.DEFAULTS || {}, STORE];
    for (var i = 0; i < sources.length; i++) {
      for (var k in sources[i]) {
        if (Object.prototype.hasOwnProperty.call(sources[i], k)) CFG[k] = sources[i][k];
      }
    }
    delete CFG.STORES;
    delete CFG.DEFAULTS;
  })();

  var CUR = CFG.CURRENCY || "USD";
  var MAX_QTY = CFG.MAX_QTY || 5;
  /* available: false takes an item off sale. It never reaches the page, so
     nothing can select it, nothing can be paid for and no totals include it.
     Leave the entry in config.js and flip the flag back when it returns.
     An item with no "available" key is on sale, so older stores need no edit. */
  var PRODUCTS = (CFG.PRODUCTS || []).filter(function (p) { return p.available !== false; });
  var SIZES = CFG.SIZES || [];
  var HAS_SIZES = SIZES.length > 0;          // gift cards and combos have none
  var NOUN = CFG.ITEM_NOUN || "item";        // used in the "pick something" error

  var form = document.getElementById("order-form");
  if (!form) return;

  var productsEl = document.getElementById("products");
  var summaryLinesEl = document.getElementById("summary-lines");
  var totalEl = document.getElementById("total-amount");
  var payArea = document.getElementById("pay-area");
  var payStatus = document.getElementById("pay-status");
  var payIntro = document.getElementById("pay-intro");
  var btnContainer = document.getElementById("paypal-button-container");
  var successEl = document.getElementById("order-success");

  document.getElementById("delivery-note").textContent = CFG.THANK_YOU || "";

  /* The form's radio groups (grade, elective, level, ...) are read off the
     page rather than hard-coded, so each ordering page can ask what it needs.
     Each group is a fieldset.choice-group whose radios share a name. */
  function choiceGroups() {
    var out = [];
    var groups = form.querySelectorAll("fieldset.choice-group");
    for (var i = 0; i < groups.length; i++) {
      var radio = groups[i].querySelector('input[type="radio"]');
      if (!radio || !radio.name) continue;
      // The legend may hold a required marker and a help bubble; neither is part
      // of the field's name. An explicit data-choice-label wins over both.
      var label = groups[i].getAttribute("data-choice-label") || "";
      var legend = groups[i].querySelector("legend");
      if (!label && legend) {
        var copy = legend.cloneNode(true);
        var drop = copy.querySelectorAll(".help, [aria-hidden='true']");
        for (var d = 0; d < drop.length; d++) drop[d].parentNode.removeChild(drop[d]);
        label = copy.textContent.replace(/[:*]/g, "").trim();
      }
      if (!label) label = radio.name;
      out.push({ name: radio.name, label: label });
    }
    return out;
  }

  function choiceValue(name) {
    return (form.querySelector('input[name="' + name + '"]:checked') || {}).value || "";
  }

  /* ---------------------------------------------------------------- utils */

  // Money is tracked in whole cents so repeated addition never drifts.
  function toCents(dollars) { return Math.round(Number(dollars) * 100); }
  function money(cents) {
    return "$" + (cents / 100).toFixed(2);
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ------------------------------------------------------------- products */

  function renderProducts() {
    productsEl.innerHTML = PRODUCTS.map(function (p) {
      var qtyOpts = "";
      for (var i = 0; i <= MAX_QTY; i++) {
        qtyOpts += '<option value="' + i + '">' + i + "</option>";
      }
      var sizeOpts = SIZES.map(function (s, i) {
        return '<option value="' + i + '">' + esc(s.name) + "</option>";
      }).join("");

      return (
        '<div class="product" data-product="' + esc(p.id) + '">' +
          '<div class="product-img">' +
            '<img src="' + esc(p.image) + '" alt="' + esc(p.name) + '" loading="lazy" width="368" height="392">' +
          "</div>" +
          '<div class="product-body">' +
            '<h3 class="product-name">' + esc(p.name) + "</h3>" +
            '<p class="product-price">' + money(toCents(p.price)) + "</p>" +
            '<div class="product-controls">' +
              '<div class="field">' +
                '<label for="qty-' + esc(p.id) + '">Quantity</label>' +
                '<select id="qty-' + esc(p.id) + '" class="qty" data-qty="' + esc(p.id) + '">' + qtyOpts + "</select>" +
              "</div>" +
              (HAS_SIZES ?
              '<div class="field field-grow">' +
                '<div class="label-row">' +
                  '<label for="size-' + esc(p.id) + '">Size</label>' +
                  '<button type="button" class="link-button size-chart-link" aria-haspopup="dialog">' +
                    '<span aria-hidden="true">&#128207;</span> Size chart</button>' +
                "</div>" +
                '<select id="size-' + esc(p.id) + '" class="size" data-size="' + esc(p.id) + '" disabled>' +
                  '<option value="">Select a size…</option>' + sizeOpts +
                "</select>" +
                '<p class="err" data-err-for="size-' + esc(p.id) + '" hidden></p>' +
              "</div>" : "") +
            "</div>" +
          "</div>" +
        "</div>"
      );
    }).join("");
  }

  /* ---------------------------------------------------------------- state */

  // Reads the current selections into an order-line list.
  function getLines() {
    var lines = [];
    PRODUCTS.forEach(function (p) {
      var qty = parseInt(document.querySelector('[data-qty="' + p.id + '"]').value, 10) || 0;
      if (qty <= 0) return;
      var sizeSel = document.querySelector('[data-size="' + p.id + '"]');
      var sizeIdx = sizeSel ? sizeSel.value : "";
      var size = sizeIdx === "" ? null : SIZES[Number(sizeIdx)];
      lines.push({
        id: p.id,
        name: p.name,
        qty: qty,
        unitCents: toCents(p.price),
        sizeShort: size ? size.name : null
      });
    });
    return lines;
  }

  function totalCents(lines) {
    return lines.reduce(function (sum, l) { return sum + l.unitCents * l.qty; }, 0);
  }

  /* ------------------------------------------------------------ recompute */

  function recompute() {
    // A size selector only becomes usable once that color has a quantity.
    PRODUCTS.forEach(function (p) {
      var qtySel = document.querySelector('[data-qty="' + p.id + '"]');
      var sizeSel = document.querySelector('[data-size="' + p.id + '"]');
      var active = (parseInt(qtySel.value, 10) || 0) > 0;
      qtySel.closest(".product").classList.toggle("is-selected", active);
      if (!sizeSel) return;
      sizeSel.disabled = !active;
      if (!active) {
        sizeSel.value = "";
        hideErr("size-" + p.id);
      }
    });

    var lines = getLines();
    var cents = totalCents(lines);

    summaryLinesEl.innerHTML = lines.length
      ? lines.map(function (l) {
          return (
            "<li>" +
              "<span>" + esc(l.name) +
                (l.sizeShort ? ' <em class="sz">' + esc(l.sizeShort) + "</em>" : "") +
                ' <span class="qx">&times;' + l.qty + "</span>" +
              "</span>" +
              "<span>" + money(l.unitCents * l.qty) + "</span>" +
            "</li>"
          );
        }).join("")
      : '<li class="summary-empty"><span>Nothing selected yet</span><span></span></li>';

    totalEl.textContent = money(cents);
    return cents;
  }

  /* ----------------------------------------------------------- validation */

  function showErr(key, msg) {
    var el = document.querySelector('[data-err-for="' + key + '"]');
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
    var input = document.getElementById(key);
    if (input) input.setAttribute("aria-invalid", "true");
  }
  function hideErr(key) {
    var el = document.querySelector('[data-err-for="' + key + '"]');
    if (el) { el.hidden = true; el.textContent = ""; }
    var input = document.getElementById(key);
    if (input) input.removeAttribute("aria-invalid");
  }
  function clearErrors() {
    form.querySelectorAll(".err").forEach(function (e) { e.hidden = true; e.textContent = ""; });
    form.querySelectorAll("[aria-invalid]").forEach(function (e) { e.removeAttribute("aria-invalid"); });
  }

  function validate(focusFirst) {
    clearErrors();
    var firstBad = null;
    function fail(key, msg) {
      showErr(key, msg);
      if (!firstBad) firstBad = document.getElementById(key) || document.querySelector('[data-err-for="' + key + '"]');
    }

    ["firstName", "lastName"].forEach(function (k) {
      if (!document.getElementById(k).value.trim()) {
        fail(k, "Please enter the student's " + (k === "firstName" ? "first" : "last") + " name.");
      }
    });

    choiceGroups().forEach(function (g) {
      if (!choiceValue(g.name)) fail(g.name, "Please select " + (/^[aeiou]/i.test(g.label) ? "an " : "a ") + g.label.toLowerCase() + ".");
    });

    var email = document.getElementById("parentEmail").value.trim();
    if (!email) fail("parentEmail", "Please enter a parent email address.");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) fail("parentEmail", "Please enter a valid email address.");

    var lines = getLines();
    if (!lines.length) {
      fail("products", "Please choose a quantity for at least one " + NOUN + ".");
    } else {
      lines.forEach(function (l) {
        if (!l.sizeShort) fail("size-" + l.id, "Please choose a size for the " + l.name.toLowerCase() + ".");
      });
    }

    if (firstBad && focusFirst) {
      firstBad.scrollIntoView({ behavior: "smooth", block: "center" });
      if (typeof firstBad.focus === "function") firstBad.focus({ preventScroll: true });
    }
    return !firstBad;
  }

  /* -------------------------------------------------------- order payload */

  function buildOrder() {
    var lines = getLines();
    var order = {
      // Which ordering page this came from, so the Sheet and the board email
      // can tell the stores apart.
      store: CFG.LABEL || "",
      // How this store's goods reach the student. The parent's confirmation
      // email prints it, so hoodies say "delivered in class" and the winter
      // concert says "ready for pickup at the concert".
      thankYou: CFG.THANK_YOU || "",
      firstName: document.getElementById("firstName").value.trim(),
      lastName: document.getElementById("lastName").value.trim(),
      parentEmail: document.getElementById("parentEmail").value.trim(),
      items: lines.map(function (l) {
        // Code.gs writes "size" to the Sheet and uses "sizeShort" in emails; both are the
        // size name (e.g. "Adult M"). Keep both keys so the deployed script needs no change.
        return {
          product: l.name, size: l.sizeShort || "", sizeShort: l.sizeShort || "",
          quantity: l.qty, unitPrice: (l.unitCents / 100).toFixed(2),
          lineTotal: (l.unitCents * l.qty / 100).toFixed(2)
        };
      }),
      total: (totalCents(lines) / 100).toFixed(2),
      currency: CUR,
      pageUrl: location.href
    };

    // grade / elective / level ... exactly as this page asked for them.
    choiceGroups().forEach(function (g) { order[g.name] = choiceValue(g.name); });
    return order;
  }

  /* ------------------------------------------------- record to the sheet */

  // Fire-and-forget. Payment has already succeeded by the time this runs, so
  // a logging failure must never surface as a payment failure.
  function recordOrder(payload) {
    var url = CFG.APPS_SCRIPT_URL;
    if (!url) {
      console.warn("[Amplify Tyee] APPS_SCRIPT_URL is not set — order was NOT recorded to the sheet.");
      return Promise.resolve(false);
    }
    var body = JSON.stringify(payload);
    // text/plain keeps this a CORS-"simple" request, so no preflight is needed.
    var opts = { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: body };

    return fetch(url, opts)
      .then(function (r) { return r.ok; })
      .catch(function () {
        // Opaque retry: we cannot read the response, but the write still lands.
        return fetch(url, { method: "POST", mode: "no-cors", body: body })
          .then(function () { return true; })
          .catch(function (e) { console.error("[Amplify Tyee] Could not record order:", e); return false; });
      });
  }

  /* -------------------------------------------------------------- receipt */

  function showReceipt(order, captureId, recorded) {
    document.getElementById("receipt-thanks").textContent = CFG.THANK_YOU || "";

    var rows = order.items.map(function (i) {
      return "<li><span>" + esc(i.product) +
             (i.sizeShort ? ' <em class="sz">' + esc(i.sizeShort) + "</em>" : "") +
             ' <span class="qx">&times;' + i.quantity + "</span></span><span>$" +
             esc(i.lineTotal) + "</span></li>";
    }).join("");

    var details = choiceGroups().map(function (g) {
      return "<dt>" + esc(g.label) + "</dt><dd>" + esc(order[g.name] || "") + "</dd>";
    }).join("");

    document.getElementById("receipt-body").innerHTML =
      '<ul class="summary-lines">' + rows + "</ul>" +
      '<div class="summary-total"><span>Total paid</span><strong>$' + esc(order.total) + "</strong></div>" +
      '<dl class="receipt-meta">' +
        "<dt>Student</dt><dd>" + esc(order.firstName + " " + order.lastName) + "</dd>" +
        details +
        "<dt>Confirmation</dt><dd><code>" + esc(captureId || "—") + "</code></dd>" +
      "</dl>" +
      (recorded ? "" :
        '<div class="notice notice-warn">We received your payment, but could not automatically ' +
        "log the order. Please forward your PayPal receipt to " +
        '<a href="mailto:' + esc(CFG.CONTACT_EMAIL) + '">' + esc(CFG.CONTACT_EMAIL) + "</a> so we can " +
        "confirm your order.</div>");

    form.hidden = true;
    successEl.hidden = false;
    successEl.focus();
    successEl.scrollIntoView({ behavior: "smooth", block: "start" });

    sendOnward(recorded);
  }

  /* After a paid order, move the parent to the thank-you page. The receipt is
     shown first so they can note the confirmation ID. When the order did not
     reach the Sheet we never navigate away on our own: that receipt carries the
     "forward your PayPal receipt" instruction. */
  function sendOnward(recorded) {
    var next = String(CFG.AFTER_ORDER_URL || "").trim();
    if (!next) return;

    var note = document.createElement("p");
    note.className = "receipt-note";

    if (!recorded) {
      note.innerHTML = '<a href="' + esc(next) + '">Continue to our thank-you page &rarr;</a>';
      successEl.appendChild(note);
      return;
    }

    var secs = Number(CFG.AFTER_ORDER_DELAY);
    if (!isFinite(secs) || secs < 1) secs = 8;

    note.innerHTML = 'Taking you to our thank-you page in <strong class="count">' + secs +
                     '</strong> seconds. <a href="' + esc(next) + '">Go now</a>';
    successEl.appendChild(note);

    var count = note.querySelector(".count");
    var timer = setInterval(function () {
      secs -= 1;
      count.textContent = secs > 0 ? secs : 0;
      if (secs <= 0) {
        clearInterval(timer);
        window.location.href = next;
      }
    }, 1000);
  }

  /* --------------------------------------------------------------- PayPal */

  function payMessage(html, kind) {
    btnContainer.innerHTML = "";
    if (payIntro) payIntro.hidden = true;
    var d = document.createElement("div");
    d.className = "notice " + (kind || "notice-info");
    d.innerHTML = html;
    btnContainer.appendChild(d);
  }

  /* ------------------------------------------------------- ordering window */

  /* The deadline as a Date at the very end of that day, or null when no date
     is set. Parsed by hand: new Date("2026-10-18") is UTC midnight, which is
     the day before here. */
  function closeMoment() {
    var raw = String(CFG.ORDER_CLOSE_DATE || "").trim();
    var m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    return new Date(+m[1], +m[2] - 1, +m[3], 23, 59, 59, 999);
  }

  function deadlineText() {
    var d = closeMoment();
    if (!d) return "";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  /* "" while ordering is open, otherwise why it is closed. */
  function closedBecause() {
    if (CFG.ORDERING_OPEN === false) return "closed";
    var d = closeMoment();
    if (d && new Date() > d) return "past";
    if (!PRODUCTS.length) return "empty";     // every item switched off
    return "";
  }

  /* Print the deadline anywhere the page asks for it. */
  function showDeadline() {
    var text = deadlineText();
    if (!text) return;
    var spots = document.querySelectorAll("[data-order-deadline]");
    for (var i = 0; i < spots.length; i++) spots[i].textContent = text;
  }

  /* Ordering closed: the whole form goes away - student fields, hoodies,
     payment - and a single notice sits directly under the hero instead. */
  function showClosed(why) {
    var when = deadlineText();
    var mail = '<a href="mailto:' + esc(CFG.CONTACT_EMAIL) + '">' + esc(CFG.CONTACT_EMAIL) + "</a>";
    var note = document.createElement("div");
    note.className = "notice notice-warn order-closed";

    if (why === "empty") {
      // Nothing is on sale: every item in this store has available: false.
      note.innerHTML =
        "<strong>Ordering is not open right now.</strong> There is nothing available to order " +
        "on this page at the moment. Please check back soon, or email " + mail + " if you have " +
        "a question.";
    } else {
      // CLOSED_NOTE is this store's own line for the closed page. THANK_YOU is
      // not used here: it is written to a buyer who has just paid.
      var note_line = CFG.CLOSED_NOTE ? " " + esc(CFG.CLOSED_NOTE) : "";
      note.innerHTML =
        "<strong>Ordering is closed" + (why === "past" && when ? " as of " + esc(when) : "") +
        ".</strong> Thank you to everyone who ordered!" + note_line +
        " If you missed the deadline, email " + mail +
        " and we will let you know whether we can still take your order.";
    }

    form.hidden = true;
    var wrap = form.parentNode;              // .store-wrap, straight under the hero
    wrap.insertBefore(note, wrap.firstChild);
  }

  function loadPayPal() {
    var id = (CFG.PAYPAL_CLIENT_ID || "").trim();
    if (!id) {
      payMessage(
        "<strong>Online ordering opens soon.</strong> To reserve a hoodie now, email " +
        '<a href="mailto:' + esc(CFG.CONTACT_EMAIL) + '">' + esc(CFG.CONTACT_EMAIL) + "</a> " +
        "with your student's details and what you'd like to order."
      );
      return;
    }

    if (CFG.PAYPAL_SANDBOX) {
      var t = document.createElement("div");
      t.className = "notice notice-warn notice-test";
      t.innerHTML =
        "<strong>Test mode &mdash; no real payments.</strong> Checkout is connected to PayPal&rsquo;s " +
        "sandbox for testing. Real orders open soon; until then, email " +
        '<a href="mailto:' + esc(CFG.CONTACT_EMAIL) + '">' + esc(CFG.CONTACT_EMAIL) + "</a>.";
      payArea.insertBefore(t, payArea.firstChild);
    }

    var s = document.createElement("script");
    s.src = "https://www.paypal.com/sdk/js?client-id=" + encodeURIComponent(id) +
            "&currency=" + encodeURIComponent(CUR) +
            "&intent=capture&disable-funding=credit";
    s.onerror = function () {
      payMessage(
        "<strong>We couldn&rsquo;t load PayPal.</strong> Please check your connection and reload, " +
        'or email <a href="mailto:' + esc(CFG.CONTACT_EMAIL) + '">' + esc(CFG.CONTACT_EMAIL) + "</a>.",
        "notice-warn"
      );
    };
    s.onload = renderButtons;
    document.head.appendChild(s);
  }

  function renderButtons() {
    if (!window.paypal || !window.paypal.Buttons) return;

    var pendingOrder = null;

    window.paypal.Buttons({
      style: { layout: "vertical", shape: "rect", color: "gold", label: "paypal", height: 48 },

      // Blocks checkout until the form is complete.
      onClick: function (data, actions) {
        payStatus.textContent = "";
        payStatus.className = "pay-status";
        if (!validate(true)) return actions.reject();
        return actions.resolve();
      },

      createOrder: function (data, actions) {
        pendingOrder = buildOrder();
        var student = pendingOrder.firstName + " " + pendingOrder.lastName;
        var about = choiceGroups().map(function (g) { return pendingOrder[g.name]; })
                                  .filter(Boolean).join(" / ");
        return actions.order.create({
          intent: "CAPTURE",
          purchase_units: [{
            description: ((CFG.LABEL || "Amplify Tyee") + " order — " + student).slice(0, 127),
            custom_id: about.slice(0, 127),
            amount: {
              currency_code: CUR,
              value: pendingOrder.total,
              breakdown: { item_total: { currency_code: CUR, value: pendingOrder.total } }
            },
            items: pendingOrder.items.map(function (i) {
              return {
                name: (i.sizeShort ? i.product + " — " + i.sizeShort : i.product).slice(0, 127),
                description: ("For " + student + (about ? " (" + about + ")" : "")).slice(0, 127),
                quantity: String(i.quantity),
                unit_amount: { currency_code: CUR, value: i.unitPrice },
                category: "PHYSICAL_GOODS"
              };
            })
          }],
          application_context: {
            brand_name: "Amplify Tyee",
            shipping_preference: "NO_SHIPPING",
            user_action: "PAY_NOW"
          }
        });
      },

      onApprove: function (data, actions) {
        payStatus.textContent = "Completing your payment…";
        return actions.order.capture().then(function (details) {
          var capture = {};
          try { capture = details.purchase_units[0].payments.captures[0] || {}; } catch (e) {}

          var payload = pendingOrder || buildOrder();
          payload.paypalOrderId = data.orderID || details.id || "";
          payload.paypalCaptureId = capture.id || "";
          payload.paypalStatus = capture.status || details.status || "";
          payload.paypalAmount = capture.amount ? capture.amount.value : "";
          try { payload.payerEmail = details.payer.email_address || ""; } catch (e) { payload.payerEmail = ""; }
          try { payload.payerName = (details.payer.name.given_name || "") + " " + (details.payer.name.surname || ""); } catch (e) { payload.payerName = ""; }

          return recordOrder(payload).then(function (recorded) {
            payStatus.textContent = "";
            showReceipt(payload, payload.paypalCaptureId, recorded);
          });
        }).catch(function (err) {
          console.error("[Amplify Tyee] Capture failed:", err);
          payStatus.className = "pay-status is-error";
          payStatus.innerHTML =
            "Something went wrong finishing your payment. <strong>Do not pay twice.</strong> " +
            'Please email <a href="mailto:' + esc(CFG.CONTACT_EMAIL) + '">' + esc(CFG.CONTACT_EMAIL) +
            "</a> and we&rsquo;ll sort it out.";
        });
      },

      onCancel: function () {
        payStatus.className = "pay-status";
        payStatus.textContent = "Payment cancelled — your selections are still here whenever you're ready.";
      },

      onError: function (err) {
        console.error("[Amplify Tyee] PayPal error:", err);
        payStatus.className = "pay-status is-error";
        payStatus.innerHTML =
          'PayPal reported a problem. Please try again, or email <a href="mailto:' +
          esc(CFG.CONTACT_EMAIL) + '">' + esc(CFG.CONTACT_EMAIL) + "</a>.";
      }
    }).render("#paypal-button-container");
  }

  /* ----------------------------------------------------------- size chart */

  // Each color's "Size" label has a "Size chart" link that opens one shared popup
  // table built from SIZES, so config.js stays the only place sizes are defined.
  // Closes with the × button, Esc, or a click outside.
  function setupSizeChart() {
    var dialog = document.getElementById("size-chart");
    if (!dialog) return;
    var opener = null;   // the link that opened the chart, to return focus to

    dialog.querySelector("tbody").innerHTML = SIZES.map(function (s) {
      return "<tr><th scope=\"row\">" + esc(s.name) + "</th><td>" + esc(s.waist || "") +
             "</td><td>" + esc(s.height || "") + "</td></tr>";
    }).join("");

    function open() {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    }
    function close() {
      if (typeof dialog.close === "function") dialog.close();
      else dialog.removeAttribute("open");
    }

    productsEl.addEventListener("click", function (e) {
      var link = e.target.closest(".size-chart-link");
      if (!link) return;
      opener = link;
      open();
    });
    dialog.querySelector(".dialog-close").addEventListener("click", close);
    // Browsers are supposed to close a modal dialog on Esc themselves, but not every
    // browser does it reliably, so handle Esc explicitly.
    dialog.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { e.preventDefault(); close(); }
    });
    // Put keyboard focus back on the link that was used (Safari doesn't do this on its own).
    dialog.addEventListener("close", function () { if (opener) opener.focus(); });
    // The dialog's content fills it edge to edge, so a click whose target is the
    // dialog element itself landed on the dimmed backdrop.
    dialog.addEventListener("click", function (e) { if (e.target === dialog) close(); });
  }

  /* ----------------------------------------------------------------- init */

  renderProducts();
  recompute();
  if (HAS_SIZES) setupSizeChart();

  form.addEventListener("change", function (e) {
    if (e.target.matches(".qty, .size")) recompute();
    if (e.target.type === "radio" && e.target.name) hideErr(e.target.name);
    if (e.target.matches(".size") && e.target.value) hideErr("size-" + e.target.dataset.size);
    if (getLines().length) hideErr("products");
  });

  form.addEventListener("input", function (e) {
    if (e.target.id && e.target.value.trim()) hideErr(e.target.id);
  });

  // The page never does a classic form submit; PayPal drives checkout.
  form.addEventListener("submit", function (e) { e.preventDefault(); validate(true); });

  showDeadline();

  var closed = closedBecause();
  if (closed) {
    showClosed(closed);                      // no products, no checkout
  } else {
    loadPayPal();
  }
})();
