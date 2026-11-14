/* Contact form on the home page. Posts to the trial server's contact endpoint (POST /trial/api/contact, JSON:
   name, company, email, phone, topic, message, lang, website [honeypot]). If that fails, it offers the same text as an email. */
(function () {
  var f = document.getElementById("kontaktform");
  if (!f) return;
  var en = document.documentElement.lang === "en";
  var API = location.hostname === "localhost" || location.hostname === "127.0.0.1" ? "http://localhost:8100" : "https://trial.ai-box.se";
  var T = en ? { fill: "Please fill in your name and a valid email address.", sending: "Sending…",
                 ok: "Thank you. We will reply within one working day.", busy: "Many requests right now. Please try again later.",
                 fail: "It could not be sent from here. ", mail: "Send it as an email instead", subject: "AI Box: " }
             : { fill: "Fyll i namn och en giltig e-postadress.", sending: "Skickar…",
                 ok: "Tack! Vi svarar inom en arbetsdag.", busy: "Många förfrågningar just nu. Försök igen om en stund.",
                 fail: "Det gick inte att skicka härifrån. ", mail: "Skicka det som mejl i stället", subject: "AI Box: " };
  var msg = document.getElementById("kontakt-msg");
  try { var q = new URLSearchParams(location.search).get("arende"); if (q && f.elements.topic.querySelector('option[value="' + q + '"]')) f.elements.topic.value = q; } catch (e) {}
  function say(text, kind, link) {
    msg.textContent = text; msg.className = "msg " + (kind || "");
    if (link) { var a = document.createElement("a"); a.href = link; a.textContent = T.mail; msg.appendChild(a); }
  }
  // Buttons elsewhere on the page that open the form with a topic chosen ("Starta en pilot", "Boka en visning").
  Array.prototype.forEach.call(document.querySelectorAll("[data-arende]"), function (a) {
    a.addEventListener("click", function () { f.elements.topic.value = a.getAttribute("data-arende"); setTimeout(function () { f.elements.name.focus(); }, 400); });
  });
  f.addEventListener("submit", function (e) {
    e.preventDefault();
    var v = function (k) { return (f.elements[k].value || "").trim(); };
    if (v("name").length < 2 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v("email"))) { say(T.fill, "err"); return; }
    var body = { lang: en ? "en" : "sv" };
    ["name", "company", "email", "phone", "topic", "message", "website"].forEach(function (k) { body[k] = v(k); });
    var topicText = f.elements.topic.options[f.elements.topic.selectedIndex].text;
    var mailto = "mailto:info@ai-box.se?subject=" + encodeURIComponent(T.subject + topicText) + "&body=" + encodeURIComponent(
      [topicText, "", body.name, body.company, body.email, body.phone, "", body.message].join("\n"));
    var btn = f.querySelector("button"); btn.disabled = true; say(T.sending);
    fetch(API + "/trial/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return [r.status, d]; }); })
      .then(function (x) {
        btn.disabled = false;
        if (x[1].ok) { say(T.ok, "ok"); f.reset(); return; }
        say(x[0] === 429 ? T.busy : T.fail, "err", x[0] === 429 ? null : mailto);
      })
      .catch(function () { btn.disabled = false; say(T.fail, "err", mailto); });
  });
})();
