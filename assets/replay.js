/* AI Box speed replay. Simulated: pre-written answers played back at the boxes' rates. Used on / and /hastighet/.
   Markup: an element with data-replay (optional data-qs="id,id,..." to pick prompts), holding [data-r=...] parts. */
(function () {
  var root = document.querySelector("[data-replay]");
  if (!root) return;
  var EN = document.documentElement.lang === "en";
  function L(sv, en) { return EN ? en : sv; }

  var BOXES = {
    s: { name: "AI Box S", who: L("En person åt gången", "One person at a time"), rate: 96, wait: { doc: 15100, follow: 560, short: 390 } },
    m: { name: "AI Box M", who: L("Upp till åtta samtidigt", "Up to eight at once"), rate: 223, wait: { doc: 5300, follow: 460, short: 260 },
      many: { n: 8, rate: 76, first: function (i) { return 300 + 120 * i; } } }
  };
  var TPW = 1.8;
  var QS = [
    { id: "doc", wait: "doc", think: 180, kind: "Dokument · ett avtal på 15–20 sidor",
      q: "Sammanfatta det här avtalet.",
      t: "Användaren vill ha en sammanfattning av avtalet. Jag går igenom löptid, förlängning, ansvar, pris, personuppgifter och tvistlösning, och letar efter oklara punkter. Punkt 7.3 om förtida uppsägning hänvisar till väsentligt avtalsbrott utan att definiera det. Det bör nämnas.",
      a: "Avtalet gäller i 24 månader från tillträdesdagen och förlängs automatiskt med 12 månader om det inte sägs upp senast tre månader före utgången. Leverantören ansvarar för underhåll och svarar på felanmälan inom två arbetsdagar. Priset justeras årligen enligt konsumentprisindex. Ansvarsbegränsningen motsvarar tolv månaders avgift. Personuppgifter behandlas enligt ett separat biträdesavtal. Tvister avgörs av allmän domstol med Malmö tingsrätt som första instans. Punkt 7.3 om förtida uppsägning är otydlig och bör ses över innan ni skriver under." },
    { id: "follow", wait: "follow", think: 40, kind: "Följdfråga · samma avtal, redan läst",
      q: "Vad gäller vid uppsägning?",
      t: "Uppsägning: punkt 12.1 och 7.3.",
      a: "Uppsägningstiden är tre månader före avtalsperiodens slut, enligt punkt 12.1, och uppsägningen ska vara skriftlig. Förtida uppsägning är bara möjlig vid väsentligt avtalsbrott enligt punkt 7.3, men avtalet säger inte vem som avgör vad som är väsentligt. Det är den punkt jag skulle fråga motparten om." },
    { id: "mail", wait: "short", think: 120, many: true, kind: "Kort fråga · mejl",
      q: "Svara en kund som vill flytta sin tid.",
      t: "Ett vänligt och kort svar. Tacka, bekräfta att det går bra, föreslå två tider och be kunden svara med den som passar. Nämn att den gamla tiden avbokas.",
      a: "Hej Anna,\nTack för att du hörde av dig. Vi flyttar gärna din tid. Vi har lediga tider på tisdag klockan 10.30 och på torsdag klockan 14.00. Svara på det här mejlet med den tid som passar dig bäst, så bekräftar vi direkt. Din nuvarande tid avbokas när du har valt en ny.\nVänliga hälsningar\nReceptionen" },
    { id: "sql", wait: "short", think: 220, many: true, code: true, kind: "Teknisk · SQL",
      q: "Skriv en SQL-fråga som visar de tio kunder som handlat mest i år.",
      t: "Tabellerna heter troligen kunder och ordrar. Summera belopp per kund från årets början, sortera fallande, ta tio. Nämn skillnaden för SQL Server.",
      a: "SELECT k.namn, SUM(o.belopp) AS summa\nFROM ordrar o\nJOIN kunder k ON k.id = o.kund_id\nWHERE o.datum >= DATE_TRUNC('year', CURRENT_DATE)\nGROUP BY k.namn\nORDER BY summa DESC\nLIMIT 10;\n\nFrågan summerar beloppen per kund från årets början och visar de tio största. Kör ni SQL Server, byt villkoret mot YEAR(o.datum) = YEAR(GETDATE()) och LIMIT 10 mot SELECT TOP 10." },
    { id: "csv", wait: "short", think: 200, many: true, code: true, kind: "Teknisk · felsökning",
      q: "Varför får jag KeyError: 'datum' när jag läser min CSV-fil i Python?",
      t: "KeyError betyder att kolumnen inte finns med just det namnet. Vanligast i Sverige: semikolon som avgränsare från Excel, eller en BOM först i filen som gör att första kolumnen heter något annat. Visa hur man ser kolumnnamnen.",
      a: "Kolumnen finns inte med exakt det namnet. Två vanliga orsaker: filen kommer från Excel och har semikolon som avgränsare, så hela raden blir en enda kolumn, eller så börjar filen med ett osynligt BOM-tecken som hamnar i första kolumnnamnet.\n\nimport pandas as pd\ndf = pd.read_csv(\"export.csv\", sep=\";\", encoding=\"utf-8-sig\")\nprint(df.columns.tolist())\n\nSkriv ut kolumnnamnen först, så ser du vad den faktiskt heter." },
    { id: "excel", wait: "short", think: 160, many: true, code: true, kind: "Teknisk · Excel",
      q: "Skriv en Excel-formel för förfallodag 30 dagar efter fakturadatum, men aldrig på en helg.",
      t: "Fakturadatum i A2. Räkna 30 dagar fram; landar det på en helg ska det flyttas till nästa vardag. ARBETSDAG från dagen innan med 1 ger nästa vardag, eller samma dag om den redan är en vardag.",
      a: "=ARBETSDAG(A2+30-1;1)\n\nFormeln räknar 30 dagar från fakturadatumet i A2. Faller dagen på en lördag eller söndag flyttas den till måndagen efter. Vill ni hoppa över helgdagar också, lägg en lista med röda dagar i till exempel H2:H20 och skriv =ARBETSDAG(A2+30-1;1;H2:H20)." },
    { id: "ps", wait: "short", think: 140, many: true, code: true, kind: "Teknisk · skript",
      q: "Skriv ett PowerShell-skript som tar bort loggfiler äldre än 30 dagar.",
      t: "Hämta .log-filer rekursivt, filtrera på LastWriteTime, ta bort. Börja med -WhatIf så att inget tas bort av misstag.",
      a: "Get-ChildItem \"C:\\Loggar\" -Filter *.log -Recurse |\n  Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } |\n  Remove-Item -WhatIf\n\nKör det först som det står: -WhatIf visar vilka filer som skulle tas bort utan att röra dem. Ser listan rätt ut, ta bort -WhatIf och kör igen." },
    { id: "raid", wait: "short", think: 150, many: true, kind: "Teknisk · förklaring",
      q: "Förklara skillnaden mellan RAID 1 och RAID 5 för någon som inte är tekniker.",
      t: "Undvik jargong. RAID 1: två likadana kopior. RAID 5: utspritt med kontrolldata, tål en disk. Nämn att inget av dem är en säkerhetskopia.",
      a: "RAID 1 är som att skriva allt i två likadana anteckningsböcker samtidigt: går den ena sönder har ni den andra. Det är enkelt och säkert, men ni får bara hälften av utrymmet.\nRAID 5 sprider ut uppgifterna på minst tre diskar och sparar lite extra kontrolldata. Går en disk sönder kan innehållet räknas fram från de andra. Ni får mer utrymme, men det tar tid att bygga upp igen.\nInget av dem är en säkerhetskopia: raderar någon en fil försvinner den från alla diskar på en gång." },
    { id: "list", wait: "short", think: 140, many: true, kind: "Kort fråga · planering",
      q: "Gör en checklista inför semesterstängningen.",
      t: "En checklista i ordning: kommunikation först, sedan jour, ekonomi, säkerhetskopior, utrustning och till sist lås och larm.",
      a: "Checklista inför semesterstängning:\n1. Sätt autosvar på mejl och telefon med datum för återöppning.\n2. Meddela kunder med pågående ärenden senast två veckor innan.\n3. Bestäm vem som har jour och hur den nås.\n4. Betala fakturor som förfaller under stängningen.\n5. Säkerhetskopiera och kontrollera att återställningen fungerar.\n6. Stäng av utrustning som inte behöver vara på.\n7. Lås, larma och lämna en nyckel till den som har jour." },
    { id: "en", wait: "short", think: 80, many: true, kind: "Kort fråga · översättning",
      q: "Översätt det här till engelska: Besökare anmäler sig i receptionen och bär besöksbricka synligt.",
      t: "Kort, formell instruktion. Behåll tonen.",
      a: "Visitors must sign in at reception and wear their visitor badge where it can be seen." }
  ];


  // English text for the same replays; timings, rates and token counts stay as measured.
  var QS_EN = {
    doc: { kind: "Document · a contract of 15–20 pages", q: "Summarise this contract.",
      t: "The user wants a summary of the contract. I'll go through term, renewal, liability, price, personal data and dispute resolution, and look for unclear points. Clause 7.3 on early termination refers to a material breach without defining it. That should be mentioned.",
      a: "The contract runs for 24 months from the start date and renews automatically for 12 months unless it is terminated no later than three months before it expires. The supplier is responsible for maintenance and responds to fault reports within two working days. The price is adjusted annually by the consumer price index. Liability is capped at twelve months' fees. Personal data is processed under a separate processor agreement. Disputes are settled in the general courts, with Malmö District Court as the first instance. Clause 7.3 on early termination is unclear and should be reviewed before you sign." },
    follow: { kind: "Follow-up · same contract, already read", q: "What applies on termination?",
      t: "Termination: clauses 12.1 and 7.3.",
      a: "The notice period is three months before the end of the contract period, under clause 12.1, and notice must be given in writing. Early termination is only possible for a material breach under clause 7.3, but the contract does not say who decides what counts as material. That is the point I would raise with the other side." },
    mail: { kind: "Short question · email", q: "Reply to a customer who wants to move their appointment.",
      t: "A friendly, short reply. Thank them, confirm it's fine, suggest two times and ask the customer to reply with the one that suits. Mention that the old appointment is cancelled.",
      a: "Hi Anna,\nThank you for getting in touch. We're happy to move your appointment. We have free slots on Tuesday at 10.30 and on Thursday at 14.00. Reply to this email with the time that suits you best, and we'll confirm right away. Your current appointment is cancelled once you have chosen a new one.\nKind regards\nReception" },
    sql: { kind: "Technical · SQL", q: "Write an SQL query showing the ten customers who have bought the most this year.",
      t: "The tables are probably called customers and orders. Sum the amounts per customer from the start of the year, sort descending, take ten. Mention the difference for SQL Server.",
      a: "SELECT c.name, SUM(o.amount) AS total\nFROM orders o\nJOIN customers c ON c.id = o.customer_id\nWHERE o.order_date >= DATE_TRUNC('year', CURRENT_DATE)\nGROUP BY c.name\nORDER BY total DESC\nLIMIT 10;\n\nThe query sums the amounts per customer from the start of the year and shows the ten largest. On SQL Server, replace the condition with YEAR(o.order_date) = YEAR(GETDATE()) and LIMIT 10 with SELECT TOP 10." },
    csv: { kind: "Technical · troubleshooting", q: "Why do I get KeyError: 'date' when I read my CSV file in Python?",
      t: "KeyError means the column doesn't exist under exactly that name. Most common: semicolons as the separator from Excel, or a BOM at the start of the file that makes the first column called something else. Show how to see the column names.",
      a: "The column doesn't exist under exactly that name. Two common causes: the file comes from Excel and uses semicolons as the separator, so the whole row becomes a single column, or the file starts with an invisible BOM character that ends up in the first column name.\n\nimport pandas as pd\ndf = pd.read_csv(\"export.csv\", sep=\";\", encoding=\"utf-8-sig\")\nprint(df.columns.tolist())\n\nPrint the column names first, and you'll see what it is actually called." },
    excel: { kind: "Technical · Excel", q: "Write an Excel formula for a due date 30 days after the invoice date, but never on a weekend.",
      t: "Invoice date in A2. Count 30 days ahead; if it lands on a weekend it should move to the next weekday. WORKDAY from the day before with 1 gives the next weekday, or the same day if it already is one.",
      a: "=WORKDAY(A2+30-1,1)\n\nThe formula counts 30 days from the invoice date in A2. If the day falls on a Saturday or Sunday, it moves to the following Monday. To skip public holidays too, put a list of holidays in, say, H2:H20 and write =WORKDAY(A2+30-1,1,H2:H20)." },
    ps: { kind: "Technical · script", q: "Write a PowerShell script that deletes log files older than 30 days.",
      t: "Get .log files recursively, filter on LastWriteTime, delete. Start with -WhatIf so nothing is deleted by mistake.",
      a: "Get-ChildItem \"C:\\Logs\" -Filter *.log -Recurse |\n  Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } |\n  Remove-Item -WhatIf\n\nRun it as it stands first: -WhatIf shows which files would be deleted without touching them. If the list looks right, remove -WhatIf and run it again." },
    raid: { kind: "Technical · explanation", q: "Explain the difference between RAID 1 and RAID 5 to someone who isn't technical.",
      t: "Avoid jargon. RAID 1: two identical copies. RAID 5: spread out with check data, survives one disk. Mention that neither is a backup.",
      a: "RAID 1 is like writing everything in two identical notebooks at once: if one is lost, you still have the other. It is simple and safe, but you only get half the space.\nRAID 5 spreads the data over at least three disks and keeps a little extra check data. If one disk fails, its contents can be worked out from the others. You get more space, but it takes time to rebuild.\nNeither is a backup: if someone deletes a file, it disappears from every disk at once." },
    list: { kind: "Short question · planning", q: "Make a checklist for closing for the holidays.",
      t: "A checklist in order: communication first, then on-call, finances, backups, equipment and finally locks and alarm.",
      a: "Checklist before closing for the holidays:\n1. Set auto-replies on email and phone with the reopening date.\n2. Tell customers with open cases at least two weeks ahead.\n3. Decide who is on call and how to reach them.\n4. Pay invoices that fall due during the closure.\n5. Back up, and check that restoring works.\n6. Switch off equipment that doesn't need to be on.\n7. Lock up, set the alarm and leave a key with whoever is on call." },
    en: { kind: "Short question · translation", q: "Translate this into Swedish: Visitors must sign in at reception and wear their visitor badge where it can be seen.",
      t: "Short, formal instruction. Keep the tone.",
      a: "Besökare anmäler sig i receptionen och bär besöksbricka synligt." }
  };
  if (EN) QS.forEach(function (x) { var e = QS_EN[x.id]; if (e) { x.kind = e.kind; x.q = e.q; x.t = e.t; x.a = e.a; } });

  var pickIds = (root.getAttribute("data-qs") || "").split(",").filter(Boolean);
  var SHOWN = pickIds.length ? QS.filter(function (x) { return pickIds.indexOf(x.id) >= 0; }) : QS;
  var MANY = QS.filter(function (x) { return x.many; }); // eight-at-once always uses the full set

  var url = new URLSearchParams(location.search);
  var S = { box: url.get("box") === "s" ? "s" : "m", q: root.getAttribute("data-first") || SHOWN[0].id, n: url.get("n") === "8" ? 8 : 1, sel: 0 };
  var plans = [], end = 0, timer = null, t0 = 0, playing = false;
  function $(name) { return root.querySelector('[data-r="' + name + '"]'); }

  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function clock(ms) { var s = ms / 1000, m = Math.floor(s / 60), r = s - m * 60; var x = (m < 10 ? "0" : "") + m + ":" + (r < 10 ? "0" : "") + r.toFixed(1); return EN ? x : x.replace(".", ","); }
  function secs(ms) { var x = (ms / 1000).toFixed(ms < 1000 ? 2 : 1); return (EN ? x : x.replace(".", ",")) + " s"; }
  function byId(id) { return QS.filter(function (x) { return x.id === id; })[0]; }
  function split(text) { var w = text.split(/(\s+)/); return { w: w, n: w.filter(function (x) { return /\S/.test(x); }).length }; }
  function stream(start, tokens, rate, seed) { // token arrival times, in small uneven bursts
    var r = rng(seed), t = start, c = 0, times = [], cum = [];
    while (c < tokens) { var gap = 20 + r() * 20, n = Math.max(1, Math.floor(rate * gap / 1000 + r())); t += gap; c = Math.min(tokens, c + n); times.push(t); cum.push(c); }
    return { times: times, cum: cum, end: t };
  }
  function makePlan(q, read, rate, seed) {
    var A = split(q.a), Th = split(q.t), ansTok = Math.ceil(A.n * TPW);
    var th = stream(read, q.think, rate, seed * 31 + Th.n), an = stream(th.end, ansTok, rate, seed * 7919 + A.n);
    return { q: q, A: A, Th: Th, read: read, think: th, ans: an, ansTok: ansTok, end: an.end };
  }
  function many() { return S.n > 1 && BOXES[S.box].many; }
  function build() {
    var box = BOXES[S.box], mm = many(), seed = S.box === "s" ? 1 : 2;
    if (mm) return MANY.slice(0, mm.n).map(function (q, i) { return makePlan(q, mm.first(i), mm.rate, seed + i * 13); });
    var q = byId(S.q);
    return [makePlan(q, box.wait[q.wait], box.rate, seed)];
  }

  function upTo(s, t) { var k = 0; for (var i = 0; i < s.times.length && s.times[i] <= t; i++) k = s.cum[i]; return k; }
  function words(W, k) { var out = "", c = 0; for (var j = 0; j < W.w.length && c < k; j++) { out += W.w[j]; if (/\S/.test(W.w[j])) c++; } return out; }
  var SHOWST = { "läser": L("läser", "reading"), "tänker": L("tänker", "thinking"), "skriver": L("skriver", "writing"), "klar": L("klar", "done") };
  function state(p, t) { return t < 0 ? "" : t < p.read ? "läser" : t < p.think.end ? "tänker" : t < p.end ? "skriver" : "klar"; }

  function show(t) { // t < 0 = idle
    var p = plans[S.sel], idle = t < 0, done = !idle && t >= p.end, all = !idle && t >= end;
    var thTok = idle ? 0 : done ? p.q.think : upTo(p.think, t), anTok = idle ? 0 : done ? p.ansTok : upTo(p.ans, t);
    var thW = thTok >= p.q.think ? p.Th.n : Math.floor(thTok / p.q.think * p.Th.n);
    var anW = anTok >= p.ansTok ? p.A.n : Math.floor(anTok / TPW);
    $("think").textContent = words(p.Th, thW); $("think").hidden = thW === 0;
    $("ans").textContent = words(p.A, anW);
    $("answer").className = "answer" + (p.q.code ? " code" : "");
    if (!idle && !done && t >= p.read) { var c = document.createElement("span"); c.className = "cur"; (t < p.think.end ? $("think") : $("ans")).appendChild(c); }
    $("clock").textContent = clock(idle ? 0 : Math.min(t, end));
    var pr = idle ? 0 : Math.min(1, t / p.read),
        pk = idle || t < p.read ? 0 : Math.min(1, (t - p.read) / (p.think.end - p.read)),
        pw = idle || t < p.think.end ? 0 : Math.min(1, (t - p.think.end) / (p.end - p.think.end));
    $("bar-read").style.width = pr * 100 + "%"; $("bar-think").style.width = pk * 100 + "%"; $("bar-write").style.width = pw * 100 + "%";
    var st = state(p, t);
    $("st-read").className = "st" + (st === "läser" ? " on" : "");
    $("st-think").className = "st" + (st === "tänker" ? " on" : "");
    $("st-write").className = "st" + (st === "skriver" ? " on" : "");
    $("st-write-l").textContent = L("Skriver", "Writing") + (idle ? "" : " · " + anW + L(" ord", " words"));
    $("s-first").textContent = !idle && t >= p.read ? secs(p.read) : "–";
    $("s-write").textContent = done ? secs(p.end - p.think.end) : "–";
    $("s-total-l").textContent = plans.length > 1 ? L("Alla åtta klara", "All eight done") : L("Totalt", "Total");
    $("s-total").textContent = all ? secs(end) : "–";
    $("play").textContent = all ? L("Spela igen", "Play again") : plans.length > 1 ? L("Ställ alla åtta frågorna", "Ask all eight questions") : L("Ställ frågan", "Ask the question");
    $("play").disabled = playing && !all; $("skip").disabled = !playing || all;
    $("skip").textContent = plans.length > 1 ? L("Visa alla svar", "Show all answers") : L("Visa hela svaret", "Show the whole answer");
    showLanes(t);
  }
  function showLanes(t) {
    if (plans.length < 2) return;
    plans.forEach(function (p, i) {
      var el = $("lanes").children[i], now = t < 0 ? 0 : Math.min(t, p.end), st = state(p, t);
      el.querySelector("i.r").style.width = Math.min(now, p.read) / end * 100 + "%";
      var k = el.querySelector("i.k"); k.style.left = p.read / end * 100 + "%"; k.style.width = Math.max(0, Math.min(now, p.think.end) - p.read) / end * 100 + "%";
      var w = el.querySelector("i.w"); w.style.left = p.think.end / end * 100 + "%"; w.style.width = Math.max(0, now - p.think.end) / end * 100 + "%";
      el.querySelector(".t").textContent = st === "klar" ? secs(p.end) : (SHOWST[st] || st);
      el.className = "lane" + (i === S.sel ? " sel" : "") + (st && st !== "klar" ? " on" : "");
    });
  }
  function select(i) {
    S.sel = i; var q = plans[i].q;
    $("qwho").textContent = plans.length > 1 ? "Person " + (i + 1) : L("Fråga", "Question");
    $("qtext").textContent = q.q;
    $("st-read-l").textContent = q.wait === "doc" ? L("Läser dokumentet", "Reading the document") : q.wait === "follow" ? L("Läser frågan (avtalet redan läst)", "Reading the question (contract already read)") : L("Läser frågan", "Reading the question");
  }
  function buildLanes() {
    var box = $("lanes"); box.innerHTML = ""; box.hidden = plans.length < 2;
    plans.forEach(function (p, i) {
      var b = document.createElement("button"); b.type = "button";
      b.innerHTML = '<span class="who"></span><span class="track"><i class="r"></i><i class="k"></i><i class="w"></i></span><span class="t"></span>';
      b.querySelector(".who").textContent = "Person " + (i + 1);
      b.title = p.q.q; b.setAttribute("aria-label", "Person " + (i + 1) + ": " + p.q.q);
      b.addEventListener("click", function () { select(i); show(playing ? performance.now() - t0 : -1); });
      box.appendChild(b);
    });
  }

  function stop() { if (timer) { cancelAnimationFrame(timer); timer = null; } }
  function tick() { var t = performance.now() - t0; show(t); timer = t < end ? requestAnimationFrame(tick) : null; }
  function reset() {
    stop(); playing = false;
    if (!BOXES[S.box].many) S.n = 1;
    plans = build(); end = Math.max.apply(null, plans.map(function (p) { return p.end; }));
    if (S.sel >= plans.length) S.sel = 0;
    select(S.sel); buildLanes(); render();
    $("fine").textContent = S.n > 1
      ? L("Simulerad uppspelning. Åtta personer ställer var sin fråga i samma ögonblick på AI Box M; klicka på en person för att se svaret. Siffrorna för åtta samtidigt är uppskattade utifrån våra mätningar med flera användare.",
          "Simulated replay. Eight people each ask a question at the same moment on AI Box M; click a person to see the answer. The figures for eight at once are estimated from our measurements with several users.")
      : L("Simulerad uppspelning: svaren är skrivna i förväg och spelas upp i den takt boxen har i våra bästa mätningar, en person åt gången. Första ordet räknas från när AI:n börjar tänka högt i chatten. Hur länge den tänker är uppskattat.",
          "Simulated replay: the answers are written in advance and played back at the rate the box reaches in our best measurements, one person at a time. The first word is counted from when the AI starts thinking aloud in the chat. How long it thinks is estimated.");
    show(-1);
  }
  function pill(group, value, label, sub, on, pick) {
    var l = document.createElement("label"); l.className = "choice";
    var i = document.createElement("input"); i.type = "radio"; i.name = "rp-" + group; i.value = value; i.checked = on;
    i.addEventListener("change", pick);
    var s = document.createElement("span"), b = document.createElement("b"); b.textContent = label; s.appendChild(b);
    if (sub) { var sm = document.createElement("small"); sm.textContent = sub; s.appendChild(sm); }
    l.appendChild(i); l.appendChild(s); return l;
  }
  function render() {
    var bx = $("boxes"), qs = $("qs"), ns = $("ns");
    bx.innerHTML = ""; qs.innerHTML = ""; ns.innerHTML = "";
    Object.keys(BOXES).forEach(function (k) {
      bx.appendChild(pill("box", k, BOXES[k].name, BOXES[k].who, S.box === k, function () { S.box = k; S.sel = 0; reset(); }));
    });
    var mm = BOXES[S.box].many;
    $("fs-n").hidden = !mm;
    if (mm) [1, mm.n].forEach(function (n) {
      ns.appendChild(pill("n", n, n === 1 ? L("En person", "One person") : n + L(" samtidigt", " at once"), n === 1 ? L("Välj en fråga", "Pick a question") : L("Var sin fråga", "A question each"), S.n === n,
        function () { S.n = n; S.sel = 0; reset(); }));
    });
    $("fs-q").hidden = S.n > 1;
    SHOWN.forEach(function (x) {
      qs.appendChild(pill("q", x.id, x.q, x.kind, S.q === x.id, function () { S.q = x.id; reset(); }));
    });
  }

  $("play").addEventListener("click", function () { stop(); playing = true; t0 = performance.now(); tick(); });
  $("skip").addEventListener("click", function () { stop(); t0 = performance.now() - end; show(end); });
  reset();

  // data-autoplay: play once, when the answer box has scrolled up to the middle of the screen
  if (root.hasAttribute("data-autoplay") && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return;
      io.disconnect();
      if (playing) return;
      playing = true;
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) { t0 = performance.now() - end; show(end); return; }
      t0 = performance.now(); tick();
    }, { rootMargin: "0px 0px -50% 0px", threshold: 0 });
    io.observe($("answer"));
  }
})();
