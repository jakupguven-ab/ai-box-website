/* Menu button for narrow screens: shows the header links as a list under the bar. */
(function () {
  var btn = document.querySelector(".menu-btn"), nav = document.getElementById("nav");
  if (!btn || !nav) return;
  function set(open) { nav.classList.toggle("open", open); btn.setAttribute("aria-expanded", open); }
  btn.addEventListener("click", function () { set(!nav.classList.contains("open")); });
  nav.addEventListener("click", function (e) { if (e.target.tagName === "A") set(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") set(false); });
})();
