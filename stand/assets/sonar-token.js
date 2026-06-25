/* ============================================================
   SONAR — Jeton QR opaque, HID-safe  (SOURCE UNIQUE du codec)
   Utilisé à l'identique par : apps mobiles (01/02) ET stand.html (TV).
   ------------------------------------------------------------
   ARCHITECTURE « TV-scores » (décision actée 2026-06-24) :
     le TÉLÉPHONE n'émet AUCUN score — il encode les 15 RÉPONSES BRUTES.
     la TV (stand.html) est l'UNIQUE autorité de scoring.

   Format :  AX2 + V + BASE32(payload) + "-" + CHK
     AX2     préfixe fixe (filtre les scans parasites)
     V       version (1 caractère) — vaut "2" (v2 = réponses brutes)
     payload 16 octets :  [flag, r0, r1, …, r14]
               flag : 1 = Sécurité (01) · 2 = Sauvegarde (02)
               r0..r14 : index de réponse à chaque question = 0 / 1 / 2
                         (0 = idéale, 1 = partielle, 2 = absente)
     BASE32  alphabet Crockford (sans I L O U) → A–Z + 2–9 + 0/1
     CHK     somme(octets payload) % 1024 → 2 caractères Base32

   Pourquoi Base32 Crockford et pas base64url :
     - MAJUSCULES + chiffres uniquement → la douchette NETUM (clavier HID)
       les tape sans souci de casse, de "-"/"_" ni de disposition AZERTY.
     - checksum + bornage strict (flag∈{1,2}, réponses∈{0,1,2}) → un scan
       parasite ou tronqué est rejeté silencieusement.
   ============================================================ */
window.SonarToken = (function () {
  "use strict";
  var VERSION = "2";
  var NQ = 15;                                        // 15 questions / diagnostic
  var ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";  // Crockford, 32 symboles
  var MAP = (function () {
    var m = {};
    for (var i = 0; i < ALPHABET.length; i++) m[ALPHABET[i]] = i;
    return m;
  })();

  /* octets -> Base32 (paquets de 5 bits, big-endian) */
  function b32enc(bytes) {
    var bits = 0, val = 0, out = "";
    for (var i = 0; i < bytes.length; i++) {
      val = (val << 8) | (bytes[i] & 0xff);
      bits += 8;
      while (bits >= 5) { out += ALPHABET[(val >>> (bits - 5)) & 31]; bits -= 5; }
    }
    if (bits > 0) out += ALPHABET[(val << (5 - bits)) & 31];
    return out;
  }

  /* Base32 -> octets (tolère les confusions Crockford : I/L→1, O→0) */
  function b32dec(str) {
    str = String(str).toUpperCase().replace(/[IL]/g, "1").replace(/O/g, "0");
    var bits = 0, val = 0, out = [];
    for (var i = 0; i < str.length; i++) {
      var v = MAP[str[i]];
      if (v === undefined) return null;
      val = (val << 5) | v;
      bits += 5;
      if (bits >= 8) { out.push((val >>> (bits - 8)) & 0xff); bits -= 8; }
    }
    return out;
  }

  function checksum(bytes) {
    var s = 0;
    for (var i = 0; i < bytes.length; i++) s += bytes[i];
    s = s % 1024;
    return ALPHABET[(s >>> 5) & 31] + ALPHABET[s & 31];
  }

  function normFlag(flag) {
    if (flag === 1 || flag === "1" || flag === "01" || flag === "S" || flag === "s") return 1;
    if (flag === 2 || flag === "2" || flag === "02" || flag === "B" || flag === "b") return 2;
    return Number(flag) || 0;
  }
  function flagToDomain(flag) { return flag === 2 ? "B" : "S"; }

  function clampAns(n) {
    n = Math.round(Number(n));
    if (!isFinite(n) || n < 0) return 0;
    if (n > 2) return 2;
    return n;
  }

  /* encode(flag, answers[15]) -> "AX2…"   (answers = index choisi 0/1/2) */
  function encode(flag, answers) {
    var f = normFlag(flag);
    var bytes = [f];
    for (var i = 0; i < NQ; i++) bytes.push(clampAns(answers && answers[i]));
    return "AX2" + VERSION + b32enc(bytes) + "-" + checksum(bytes);
  }

  /* decode("AX2…") -> {version, flag, domain, answers:[15]} | null */
  function decode(token) {
    if (!token) return null;
    token = String(token).trim().replace(/\s+/g, "").toUpperCase();
    if (token.slice(0, 3) !== "AX2") return null;
    var version = token[3];
    var rest = token.slice(4);
    var dash = rest.lastIndexOf("-");
    if (dash < 0) return null;
    var body = rest.slice(0, dash);
    var chk = rest.slice(dash + 1).toUpperCase();
    var bytes = b32dec(body);
    if (!bytes || bytes.length < 1 + NQ) return null;      // flag + 15 réponses mini
    bytes = bytes.slice(0, 1 + NQ);                        // ignore le bourrage Base32
    if (checksum(bytes) !== chk) return null;              // intégrité KO → ignoré
    var flag = bytes[0];
    if (flag !== 1 && flag !== 2) return null;             // drapeau inconnu → ignoré
    var answers = bytes.slice(1);
    for (var i = 0; i < NQ; i++) { if (answers[i] > 2) return null; } // hors borne → parasite
    return {
      version: version,
      flag: flag,
      domain: flagToDomain(flag),
      answers: answers
    };
  }

  return { encode: encode, decode: decode, VERSION: VERSION, _b32enc: b32enc, _b32dec: b32dec };
})();
