/* AX2LAN Sonar — accessibilite auto : labels curseurs + alt du QR (robuste, idempotent) */
(function () {
  function labelRanges(root) {
    (root || document).querySelectorAll("input[type=range]").forEach(function (rg) {
      if (rg.getAttribute("aria-label")) return;
      var c = rg.closest(".ctrl") || rg.parentElement;
      var lb = c && c.querySelector(".ctrl-label, label");
      rg.setAttribute("aria-label", (lb && lb.textContent.trim()) || "Curseur");
    });
  }
  function labelQR() {
    var box = document.getElementById("qrcode");
    if (!box) return;
    var img = box.querySelector("img");
    if (img && !img.getAttribute("alt")) img.setAttribute("alt", "Code Sonar à présenter à l’équipe AX2LAN");
    var cv = box.querySelector("canvas");
    if (cv && !cv.getAttribute("aria-label")) { cv.setAttribute("role", "img"); cv.setAttribute("aria-label", "Code Sonar à présenter à l’équipe AX2LAN"); }
  }
  function run() { try { labelRanges(); labelQR(); } catch (e) {} }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run); else run();
  try { new MutationObserver(run).observe(document.body || document.documentElement, { childList: true, subtree: true }); } catch (e) {}
})();
