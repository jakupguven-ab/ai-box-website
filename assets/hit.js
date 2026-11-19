/* Visit counter: tells our own server (trial.ai-box.se, in Sweden) which page was opened and which site the
   visitor came from (its name only). No cookie, no storage, no identifier. See /integritet/. */
(function () {
  try {
    if (!navigator.sendBeacon || navigator.webdriver) return;
    var local = location.hostname === "localhost" || location.hostname === "127.0.0.1";
    var api = local ? "http://localhost:8100" : "https://trial.ai-box.se";
    var data = JSON.stringify({ p: location.pathname, r: document.referrer || "" });
    navigator.sendBeacon(api + "/trial/api/hit", new Blob([data], { type: "text/plain" }));
  } catch (e) { /* counting must never break the page */ }
})();
