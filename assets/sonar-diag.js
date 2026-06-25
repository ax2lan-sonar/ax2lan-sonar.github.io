/* ============================================================
   SONAR — Moteur de diagnostic partagé (cibles 01 & 02)
   Piloté par window.SONAR_CONFIG. Garantit que les deux apps
   sont rigoureusement identiques (profilage, parcours,
   jeton, lead) — seul le CONTENU change.
   ARCHITECTURE « TV-scores » : le téléphone NE SCORE PAS — il encode les 15
   RÉPONSES BRUTES dans le QR (SonarToken) ; la TV (stand.html) est l'unique
   autorité de scoring. Rien n'est jamais affiché au prospect.
   ============================================================ */
(function () {
  "use strict";
  var CFG = window.SONAR_CONFIG || {};

  /* ---- Profilage : listes communes (v3 §4) ---- */
  var PRINCIPAUX = [
    "ACD", "Cegid (Loop / Quadra / Expert)", "Sage (Génération Experts)",
    "Fulll", "MyUnisoft", "Pennylane", "Inqom", "EBP", "Tiime", "Autre…"
  ];
  var ANNEXES = [
    ["Paie", ["Silae / MySilae", "Sage Paie", "Cegid Paie", "ACD Paie"]],
    ["Révision / Audit (CAC)", ["RevisAudit Premium", "Auditsoft", "Sigma"]],
    ["Conseil & missions à valeur ajoutée", ["RCA", "EIC"]],
    ["Pré-compta / collecte / GED", ["Dext", "MEG", "Conciliator", "MyCompanyFiles"]],
    ["Reporting / pilotage", ["Finthesis"]],
    ["", ["Autre…"]]
  ];

  /* ---- État ---- */
  var FLAT = [];                  // questions aplaties {t,a,c,axis,axisName,crit}
  (CFG.axes || []).forEach(function (ax, ai) {
    ax.q.forEach(function (q, qi) {
      FLAT.push({ t: q.t, a: q.a, c: q.c, axis: ai, axisName: ax.name });
    });
  });
  var ansIdx = new Array(FLAT.length).fill(-1);  // index de réponse par question (0/1/2)
  function rawAnswers() { return ansIdx.map(function (k) { return k < 0 ? 0 : k; }); }
  var i = 0;
  var profil = { cabinet: "", users: 8, principal: "", annexes: [] };

  var $ = function (s) { return document.querySelector(s); };
  function show(id) {
    document.querySelectorAll(".screen").forEach(function (s) { s.classList.remove("active"); });
    var el = document.getElementById(id); if (el) el.classList.add("active");
    window.scrollTo(0, 0);
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[<>&]/g, function (c) { return { "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]; }); }

  /* ---- Splash (textes injectés depuis CFG) ---- */
  function fillSplash() {
    if ($("#ciblePill")) $("#ciblePill").textContent = CFG.pill || "";
    if ($("#spEyebrow")) $("#spEyebrow").textContent = CFG.splash.eyebrow || "";
    if ($("#spTitle")) $("#spTitle").innerHTML = CFG.splash.title || "";
    if ($("#spSub")) $("#spSub").textContent = CFG.splash.subtitle || "";
    if ($("#spHint")) $("#spHint").textContent = CFG.splash.hint || "";
    document.title = CFG.docTitle || document.title;
  }

  /* ---- Profilage ---- */
  function buildProfil() {
    // logiciel principal (sélection unique)
    var box = $("#p-principal"); box.innerHTML = "";
    PRINCIPAUX.forEach(function (name) {
      var b = document.createElement("button");
      b.className = "chip"; b.type = "button"; b.textContent = name;
      b.onclick = function () {
        profil.principal = (profil.principal === name) ? "" : name;
        box.querySelectorAll(".chip").forEach(function (c) { c.classList.remove("sel"); });
        if (profil.principal) b.classList.add("sel");
      };
      box.appendChild(b);
    });
    // logiciels annexes (multi-sélection, regroupés)
    var wrap = $("#p-annexes"); wrap.innerHTML = "";
    ANNEXES.forEach(function (g) {
      if (g[0]) { var lab = document.createElement("div"); lab.className = "group-label"; lab.textContent = g[0]; wrap.appendChild(lab); }
      var chips = document.createElement("div"); chips.className = "chips"; chips.style.marginBottom = "12px";
      g[1].forEach(function (name) {
        var b = document.createElement("button");
        b.className = "chip"; b.type = "button"; b.textContent = name;
        b.onclick = function () {
          var k = profil.annexes.indexOf(name);
          if (k < 0) { profil.annexes.push(name); b.classList.add("sel"); }
          else { profil.annexes.splice(k, 1); b.classList.remove("sel"); }
        };
        chips.appendChild(b);
      });
      wrap.appendChild(chips);
    });
    // curseur utilisateurs
    var r = $("#p-users");
    function up() { profil.users = +r.value; $("#p-usersVal").textContent = r.value; r.style.setProperty("--fill", ((r.value - r.min) / (r.max - r.min) * 100) + "%"); }
    r.oninput = up; up();
    $("#p-cabinet").oninput = function () { profil.cabinet = this.value.trim(); };
  }

  /* ---- Quiz ---- */
  function start() { i = 0; renderQ(); show("s-quiz"); }
  function renderQ() {
    var q = FLAT[i];
    $("#qAxis").textContent = "Axe " + (q.axis + 1) + " · " + q.axisName;
    $("#qNum").textContent = (i + 1) + " / " + FLAT.length;
    $("#qBar").style.width = (i / FLAT.length * 100) + "%";
    $("#qText").textContent = q.t;
    $("#qBack").hidden = i === 0;
    var box = $("#qAns"); box.innerHTML = "";
    q.a.forEach(function (opt, k) {
      var b = document.createElement("button");
      b.className = "answer" + (ansIdx[i] === k ? " sel" : "");
      b.type = "button";
      b.innerHTML = '<span class="dot"></span><span>' + esc(opt[0]) + "</span>";
      b.onclick = function () { pick(k, b); };
      box.appendChild(b);
    });
    var c = $("#qComment");
    if (ansIdx[i] >= 0) { c.textContent = q.c; c.classList.add("on"); } else { c.textContent = ""; c.classList.remove("on"); }
    var n = $("#qNext");
    n.disabled = ansIdx[i] < 0;
    n.textContent = (i === FLAT.length - 1) ? "Voir mon résultat →" : "Question suivante →";
  }
  function pick(k, btn) {
    ansIdx[i] = k;
    document.querySelectorAll("#qAns .answer").forEach(function (a) { a.classList.remove("sel"); });
    btn.classList.add("sel");
    var c = $("#qComment"); c.textContent = FLAT[i].c; c.classList.add("on");
    $("#qNext").disabled = false;
  }
  function nextQ() {
    if (ansIdx[i] < 0) return;
    if (i < FLAT.length - 1) { i++; renderQ(); }
    else { $("#qBar").style.width = "100%"; show("s-lead"); }
  }
  function prevQ() { if (i > 0) { i--; renderQ(); } }

  /* Scoring : déplacé sur la TV (stand.html). Le téléphone n'encode que les réponses brutes. */

  /* ---- Jeton + QR ---- */
  function toQR() {
    var token = window.SonarToken.encode(CFG.flag, rawAnswers());
    $("#qrcode").innerHTML = "";
    new QRCode($("#qrcode"), { text: token, width: 228, height: 228, colorDark: "#0B0C36", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.M });
    $("#tokenTxt").textContent = token;
    show("s-qr");
  }

  /* ---- Lead (Web3Forms, APRÈS la valeur ; ne révèle rien au prospect) ---- */
  function submitLead() {
    var fn = $("#fn").value.trim(), ln = $("#ln").value.trim(), em = $("#em").value.trim();
    var ok = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em);
    if (!ok) { $("#leadErr").classList.add("on"); $("#em").focus(); return; }
    $("#leadErr").classList.remove("on");
    var key = CFG.web3formsKey || "";
    if (key && key !== "VOTRE_CLE_WEB3FORMS_ICI") {
      fetch("https://api.web3forms.com/submit", {
        method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          access_key: key,
          subject: "Lead Sonar — " + (CFG.leadSubject || CFG.src),
          from_name: "Dispositif Sonar AX2LAN",
          src: CFG.src,
          prenom: fn, nom: ln, email: em,
          cabinet: profil.cabinet, utilisateurs: profil.users,
          logiciel_principal: profil.principal, logiciels_annexes: profil.annexes.join(", "),
          reponses: rawAnswers().join(""), jeton: window.SonarToken.encode(CFG.flag, rawAnswers())
        })
      }).catch(function () { });
    }
    toQR();
  }
  function skipLead() { toQR(); }

  /* ---- Câblage ---- */
  function bind() {
    fillSplash();
    document.body.classList.add(CFG.accentClass || "accent-gold");
    buildProfil();
    $("#btnStart").onclick = function () { show("s-prof1"); };
    $("#btnProf1").onclick = function () { show("s-prof2"); };
    $("#btnProf2").onclick = start;
    if ($("#btnProf2Skip")) $("#btnProf2Skip").onclick = start;
    $("#qNext").onclick = nextQ;
    $("#qBack").onclick = prevQ;
    $("#btnLead").onclick = submitLead;
    if ($("#btnLeadSkip")) $("#btnLeadSkip").onclick = skipLead;

    // Debug QA : ?screen=quiz|lead|qr
    var p = new URLSearchParams(location.search).get("screen");
    if (p === "quiz") start();
    else if (p === "lead") show("s-lead");
    else if (p === "qr") { for (var k = 0; k < ansIdx.length; k++) { ansIdx[k] = [0, 1, 2][k % 3]; } toQR(); }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind);
  else bind();
})();
