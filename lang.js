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






function enablePullEffect(el) {

  // منع التفعيل المكرر
  if (el._pullEnabled) return;
  el._pullEnabled = true;

  /* =========================
     🔹 إنشاء Wrapper للمحتوى
     ========================= */
  let content = el.querySelector('.pull-content');
  if (!content) {
    content = document.createElement('div');
    content.className = 'pull-content';

    while (el.firstChild) {
      content.appendChild(el.firstChild);
    }
    el.appendChild(content);
  }

  // قراءة البادينج الأصلي
  const style = getComputedStyle(el);
  const basePaddingTop = parseFloat(style.paddingTop) || 0;
  const basePaddingBottom = parseFloat(style.paddingBottom) || 0;

  let startY = 0;
  let pullingTop = false;
  let pullingBottom = false;

  // قيم سلاسة غير ملحوظة
  const MAX_EXTRA = 26;
  const RESISTANCE = 5.5;

  let currentTop = basePaddingTop;
  let currentBottom = basePaddingBottom;
  let currentOffset = 0; // 🔹 transform
  let raf = null;

  el.style.overflowY = 'auto';
  el.style.webkitOverflowScrolling = 'touch';
  content.style.willChange = 'transform';

  function applyEffects() {
    el.style.paddingTop = currentTop + 'px';
    el.style.paddingBottom = currentBottom + 'px';
    content.style.transform = `translateY(${currentOffset}px)`;
  }

  el.addEventListener('touchstart', e => {
    startY = e.touches[0].clientY;
    pullingTop = false;
    pullingBottom = false;
    el.style.transition = 'none';
    content.style.transition = 'none';
    cancelAnimationFrame(raf);
  }, { passive: true });

  el.addEventListener('touchmove', e => {
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY;

    const atTop = el.scrollTop <= 0;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;

    if (atTop && diff > 0) pullingTop = true;
    if (atBottom && diff < 0) pullingBottom = true;

    raf = requestAnimationFrame(() => {

      if (pullingTop && diff > 0) {
        const extra = Math.min(diff / RESISTANCE, MAX_EXTRA);
        currentTop = basePaddingTop + extra;
        currentOffset = extra; // 🔹 دفع المحتوى
      }

      if (pullingBottom && diff < 0) {
        const extra = Math.min(Math.abs(diff) / RESISTANCE, MAX_EXTRA);
        currentBottom = basePaddingBottom + extra;
        currentOffset = -extra; // 🔹 دفع المحتوى
      }

      applyEffects();
    });

  }, { passive: true });

  function reset() {
    el.style.transition =
      'padding 0.45s cubic-bezier(0.22, 0.61, 0.36, 1)';
    content.style.transition =
      'transform 0.45s cubic-bezier(0.22, 0.61, 0.36, 1)';

    currentTop = basePaddingTop;
    currentBottom = basePaddingBottom;
    currentOffset = 0;

    applyEffects();
    pullingTop = false;
    pullingBottom = false;
  }

  el.addEventListener('touchend', reset);
  el.addEventListener('touchcancel', reset);
}

/* =========================
   🔹 التفعيل الحالي (كما هو)
   ========================= */
document.querySelectorAll('.diov').forEach(el => {
  enablePullEffect(el);
});




















document.addEventListener('DOMContentLoaded', () => {

  /* ===== CSS ===== */
  const style = document.createElement('style');
  style.textContent = `
  input[type="checkbox"][sh-te] {
    position: relative;
    z-index: 4;
    transition: ease 0.2s;
    appearance: none;
    -webkit-appearance: none;
    width: 50px;
    height: 26px;
    border-radius: 25px;
    background: #cccccc33;
    box-shadow: 0 0 0 1px #cccccc9c;
    cursor: pointer;
    vertical-align: middle;
    user-select: none;
    outline: none;
    margin: 0;
    --x: 0px;
  }

  input[type="checkbox"][sh-te]::before {
    content: "";
    position: absolute;
    top: 3px;
    left: 3px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #cbcfd666;
    transform: translateX(var(--x));
    transition: transform .2s, background .2s;
    pointer-events: none;
  }

  input[type="checkbox"][sh-te]:checked {
    --x: 24px;
  }

  input[type="checkbox"][sh-te]:checked::before {
    background: #1d87ff;
  }

  input[type="checkbox"][sh-te]:checked {
    background-color: #1d87ff30;
    box-shadow: 0 0 0 1px #1b7ff14f;
  }

  input[type="checkbox"][sh-te].dragging::before {
    transition: none;
  }

  input[type="checkbox"][sh-te]:disabled {
    // opacity: .5;
    cursor: not-allowed;
  }

  input[type="checkbox"][sh-te]:focus-visible {
    box-shadow: 0 0 0 2px #6aa9ff;
  }
  `;
  document.head.appendChild(style);

  /* ===== المنطق ===== */
  document.querySelectorAll('input[type="checkbox"][sh-te]').forEach(input => {

    let dragging = false;
    let startX = 0;
    let startPos = 0;
    let moved = false;
    let startChecked = input.checked;

    const getX = e => e.touches ? e.touches[0].clientX : e.clientX;

    const startDrag = e => {
      if (input.disabled) return;

      dragging = true;
      moved = false;
      startChecked = input.checked;

      startX = getX(e);
      startPos = input.checked ? 24 : 0;

      input.classList.add('dragging');

      document.addEventListener('mousemove', moveDrag);
      document.addEventListener('mouseup', endDrag);
      document.addEventListener('touchmove', moveDrag, { passive: false });
      document.addEventListener('touchend', endDrag);
    };

    const moveDrag = e => {
      if (!dragging) return;
      e.preventDefault();

      const delta = getX(e) - startX;
      if (Math.abs(delta) > 3) moved = true;

      let pos = startPos + delta;
      pos = Math.max(0, Math.min(24, pos));

      input.style.setProperty('--x', pos + 'px');
    };

    const endDrag = () => {
      if (!dragging) return;
      dragging = false;

      const finalPos = parseFloat(getComputedStyle(input).getPropertyValue('--x'));
      const newChecked = finalPos > 12;

      input.style.removeProperty('--x');
      input.classList.remove('dragging');

      if (newChecked !== startChecked) {
        input.checked = newChecked;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }

      document.removeEventListener('mousemove', moveDrag);
      document.removeEventListener('mouseup', endDrag);
      document.removeEventListener('touchmove', moveDrag);
      document.removeEventListener('touchend', endDrag);
    };

    /* السحب */
    input.addEventListener('mousedown', startDrag);
    input.addEventListener('touchstart', startDrag, { passive: true });

    /* منع النقر الوهمي بعد السحب */
    input.addEventListener('click', e => {
      if (moved) {
        e.preventDefault();
        moved = false;
      }
    });

    /* دعم الكيبورد */
    input.addEventListener('keydown', e => {
      if (input.disabled) return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        input.checked = !input.checked;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

  });
});











