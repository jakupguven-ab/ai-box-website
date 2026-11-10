/* Types the trust section's problem statements one at a time with a blinking caret, erases each with backspace and
   types the next. Starts once the block has scrolled past the lower third of the screen, pauses while it is out of
   view. The list itself stays in the page for screen readers and search engines; without JS (or with reduced motion
   asked for) the list simply shows. */
(function () {
  var root = document.querySelector("[data-typer]");
  if (!root || !("IntersectionObserver" in window) || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var items = [].slice.call(root.querySelectorAll("li")).map(function (li) {
    return { who: li.getAttribute("data-who") || "", text: li.textContent.replace(/\s+/g, " ").trim() };
  });
  if (!items.length) return;

  var stage = document.createElement("div"); stage.className = "probs-stage"; stage.setAttribute("aria-hidden", "true");
  var who = document.createElement("p"); who.className = "probs-who";
  var box = document.createElement("p"); box.className = "probs-text";
  // Every statement sits invisibly in the same grid cell, so the block is as tall as the longest one and never jumps.
  items.forEach(function (it) { var g = document.createElement("span"); g.className = "ghost"; g.textContent = it.text + " "; box.appendChild(g); });
  var live = document.createElement("span"), txt = document.createElement("span"), caret = document.createElement("span");
  caret.className = "probs-caret"; live.appendChild(txt); live.appendChild(caret); box.appendChild(live);
  stage.appendChild(who); stage.appendChild(box);
  root.appendChild(stage); root.classList.add("on");

  var i = 0, n = 0, mode = "type", timer = null, visible = false, started = false;
  who.textContent = items[0].who;

  function step() {
    timer = null;
    if (!visible) return;
    var t = items[i].text, wait;
    if (mode === "type") {
      root.classList.add("typing");
      n++; txt.textContent = t.slice(0, n);
      var ch = t.charAt(n - 1);
      wait = 20 + Math.random() * 28 + (/[,.]/.test(ch) ? 260 : ch === " " ? 25 : 0);
      if (n >= t.length) { mode = "hold"; root.classList.remove("typing"); wait = 2800; }
    } else if (mode === "hold") {
      mode = "erase"; root.classList.add("typing"); wait = 0;
    } else if (mode === "erase") {
      n = Math.max(0, n - 1); txt.textContent = t.slice(0, n);
      wait = 10;
      if (n === 0) { mode = "next"; root.classList.remove("typing"); who.style.opacity = "0"; wait = 450; }
    } else {
      i = (i + 1) % items.length; who.textContent = items[i].who; who.style.opacity = "1";
      mode = "type"; wait = 350;
    }
    timer = setTimeout(step, wait);
  }

  new IntersectionObserver(function (es) {
    visible = es[0].isIntersecting;
    if (visible && !timer) { timer = setTimeout(step, started ? 200 : 300); started = true; }
  }, { rootMargin: "0px 0px -35% 0px", threshold: 0 }).observe(stage);
})();
