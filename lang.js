(function () {
  "use strict";

  /* =========================
     Keyboard Maps
  ========================= */

  const engToAr = {
    q: "ض", w: "ص", e: "ث", r: "ق", t: "ف",
    y: "غ", u: "ع", i: "ه", o: "خ", p: "ح",
    "[": "ج", "]": "د",

    a: "ش", s: "س", d: "ي", f: "ب", g: "ل",
    h: "ا", j: "ت", k: "ن", l: "م", ";": "ك", "'": "ط",

    z: "ئ", x: "ء", c: "ؤ", v: "ر", b: "لا",
    n: "ى", m: "ة", ",": "و", ".": "ز", "/": "ظ",

    Q: "َ", W: "ً", E: "ُ", R: "ٌ", T: "لإ",
    Y: "إ", U: "‘", I: "÷", O: "×", P: "؛",

    A: "ِ", S: "ٍ", D: "]", F: "[", G: "لأ",
    H: "أ", J: "ـ", K: "،", L: "/", ":": ":", "\"": "\""
  };

  const arToEng = {};
  for (const key in engToAr) {
    arToEng[engToAr[key]] = key;
  }

  /* =========================
     Convert Text
  ========================= */

  function convertText(text, map) {
    return text
      .split("")
      .map(char => map[char] || char)
      .join("");
  }

  /* =========================
     Input Handler
  ========================= */

  function handleInput(e) {
    const el = e.target;
    const value = el.value;
    let newValue = value;

    if (el.classList.contains("abc>eng")) {
      newValue = convertText(value, engToAr);
    }

    if (el.classList.contains("eng>abc")) {
      newValue = convertText(value, arToEng);
    }

    if (newValue !== value) {
      const pos = el.selectionStart;
      el.value = newValue;
      el.setSelectionRange(pos, pos);
    }
  }

  /* =========================
     Observe Inputs
  ========================= */

  function bind(el) {
    if (!el.dataset.keyboardBinded) {
      el.addEventListener("input", handleInput);
      el.dataset.keyboardBinded = "1";
    }
  }

  document.querySelectorAll("input, textarea").forEach(bind);

  const observer = new MutationObserver(() => {
    document.querySelectorAll("input, textarea").forEach(bind);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

})();