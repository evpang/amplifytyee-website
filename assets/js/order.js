/* ==========================================================================
   Amplify Tyee — hoodie order form
   --------------------------------------------------------------------------
   Plain browser JavaScript. No build step, no dependencies except the
   PayPal SDK, which is loaded on demand only when a Client ID is configured.

   Flow:  fill form -> live total -> PayPal checkout -> capture payment
          -> record the order to Google Sheets -> show an on-screen receipt.

   All setup values live in config.js. You should not need to edit this file.
   ========================================================================== */
(function () {
  "use strict";

  var CFG = window.AMPLIFY_CONFIG || {};
  var CUR = CFG.CURRENCY || "USD";
  var MAX_QTY = CFG.MAX_QTY || 5;
  var PRODUCTS = CFG.PRODUCTS || [];
  var SIZES = CFG.SIZES || [];

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
        return '<option value="' + i + '">' + esc(s.label) + "</option>";
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
              '<div class="field field-grow">' +
                '<label for="size-' + esc(p.id) + '">Size</label>' +
                '<select id="size-' + esc(p.id) + '" class="size" data-size="' + esc(p.id) + '" disabled>' +
                  '<option value="">Select a size…</option>' + sizeOpts +
                "</select>" +
                '<p class="err" data-err-for="size-' + esc(p.id) + '" hidden></p>' +
              "</div>" +
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
      var sizeIdx = document.querySelector('[data-size="' + p.id + '"]').value;
      var size = sizeIdx === "" ? null : SIZES[Number(sizeIdx)];
      lines.push({
        id: p.id,
        name: p.name,
        qty: qty,
        unitCents: toCents(p.price),
        sizeShort: size ? size.short : null,
        sizeLabel: size ? size.label : null
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
      sizeSel.disabled = !active;
      sizeSel.closest(".product").classList.toggle("is-selected", active);
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
      : '<li class="summary-empty"><span>No hoodies selected yet</span><span></span></li>';

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

    if (!form.querySelector('input[name="grade"]:checked')) fail("grade", "Please select a grade.");
    if (!form.querySelector('input[name="elective"]:checked')) fail("elective", "Please select an elective.");

    var email = document.getElementById("parentEmail").value.trim();
    if (!email) fail("parentEmail", "Please enter a parent email address.");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) fail("parentEmail", "Please enter a valid email address.");

    var lines = getLines();
    if (!lines.length) {
      fail("products", "Please choose a quantity for at least one hoodie.");
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
    return {
      firstName: document.getElementById("firstName").value.trim(),
      lastName: document.getElementById("lastName").value.trim(),
      grade: (form.querySelector('input[name="grade"]:checked') || {}).value || "",
      elective: (form.querySelector('input[name="elective"]:checked') || {}).value || "",
      parentEmail: document.getElementById("parentEmail").value.trim(),
      items: lines.map(function (l) {
        return {
          product: l.name, size: l.sizeLabel, sizeShort: l.sizeShort,
          quantity: l.qty, unitPrice: (l.unitCents / 100).toFixed(2),
          lineTotal: (l.unitCents * l.qty / 100).toFixed(2)
        };
      }),
      total: (totalCents(lines) / 100).toFixed(2),
      currency: CUR,
      pageUrl: location.href
    };
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
      return "<li><span>" + esc(i.product) + ' <em class="sz">' + esc(i.sizeShort) +
             '</em> <span class="qx">&times;' + i.quantity + "</span></span><span>$" +
             esc(i.lineTotal) + "</span></li>";
    }).join("");

    document.getElementById("receipt-body").innerHTML =
      '<ul class="summary-lines">' + rows + "</ul>" +
      '<div class="summary-total"><span>Total paid</span><strong>$' + esc(order.total) + "</strong></div>" +
      '<dl class="receipt-meta">' +
        "<dt>Student</dt><dd>" + esc(order.firstName + " " + order.lastName) + "</dd>" +
        "<dt>Grade</dt><dd>" + esc(order.grade) + "</dd>" +
        "<dt>Elective</dt><dd>" + esc(order.elective) + "</dd>" +
        "<dt>Confirmation</dt><dd><code>" + esc(captureId || "—") + "</code></dd>" +
      "</dl>" +
      (recorded ? "" :
        '<div class="notice notice-warn">We received your payment, but could not automatically ' +
        "log the order. Please forward your PayPal receipt to " +
        '<a href="mailto:' + esc(CFG.CONTACT_EMAIL) + '">' + esc(CFG.CONTACT_EMAIL) + "</a> so we can " +
        "confirm your size.</div>");

    form.hidden = true;
    successEl.hidden = false;
    successEl.focus();
    successEl.scrollIntoView({ behavior: "smooth", block: "start" });
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

  function loadPayPal() {
    var id = (CFG.PAYPAL_CLIENT_ID || "").trim();
    if (!id) {
      payMessage(
        "<strong>Online ordering opens soon.</strong> To reserve a hoodie now, email " +
        '<a href="mailto:' + esc(CFG.CONTACT_EMAIL) + '">' + esc(CFG.CONTACT_EMAIL) + "</a> " +
        "with your student's name, grade, elective, and the colors and sizes you'd like."
      );
      return;
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
        if (!validate(true)) return actions.reject();
        return actions.resolve();
      },

      createOrder: function (data, actions) {
        pendingOrder = buildOrder();
        var student = pendingOrder.firstName + " " + pendingOrder.lastName;
        return actions.order.create({
          intent: "CAPTURE",
          purchase_units: [{
            description: ("Tyee Music Hoodie order — " + student).slice(0, 127),
            custom_id: (pendingOrder.grade + " / " + pendingOrder.elective).slice(0, 127),
            amount: {
              currency_code: CUR,
              value: pendingOrder.total,
              breakdown: { item_total: { currency_code: CUR, value: pendingOrder.total } }
            },
            items: pendingOrder.items.map(function (i) {
              return {
                name: (i.product + " — " + i.sizeShort).slice(0, 127),
                description: ("For " + student + " (" + pendingOrder.grade + ", " + pendingOrder.elective + ")").slice(0, 127),
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

  /* ----------------------------------------------------------------- init */

  renderProducts();
  recompute();

  form.addEventListener("change", function (e) {
    if (e.target.matches(".qty, .size")) recompute();
    if (e.target.name === "grade") hideErr("grade");
    if (e.target.name === "elective") hideErr("elective");
    if (e.target.matches(".size") && e.target.value) hideErr("size-" + e.target.dataset.size);
    if (getLines().length) hideErr("products");
  });

  form.addEventListener("input", function (e) {
    if (e.target.id && e.target.value.trim()) hideErr(e.target.id);
  });

  // The page never does a classic form submit; PayPal drives checkout.
  form.addEventListener("submit", function (e) { e.preventDefault(); validate(true); });

  loadPayPal();
})();
