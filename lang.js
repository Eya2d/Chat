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

  // قراءة البادينج الأصلي مع fallback
  const style = getComputedStyle(el);
  const basePaddingTop = parseFloat(style.paddingTop) || 0;
  const basePaddingBottom = parseFloat(style.paddingBottom) || 0;

  let startY = 0;
  let pullingTop = false;
  let pullingBottom = false;
  const MAX_EXTRA = 50;

  el.style.transition = 'padding 0.25s ease';
  el.style.overflowY = 'auto';
  el.style.webkitOverflowScrolling = 'touch';

  el.addEventListener('touchstart', e => {
    startY = e.touches[0].clientY;
    pullingTop = false;
    pullingBottom = false;
    el.style.transition = 'none';
  }, { passive: true });

  el.addEventListener('touchmove', e => {
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY;

    const atTop = el.scrollTop <= 0;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;

    if (atTop && diff > 0) pullingTop = true;
    if (atBottom && diff < 0) pullingBottom = true;

    if (pullingTop && diff > 0) {
      const extra = Math.min(diff / 3, MAX_EXTRA);
      el.style.paddingTop = (basePaddingTop + extra) + 'px';
    }

    if (pullingBottom && diff < 0) {
      const extra = Math.min(Math.abs(diff) / 3, MAX_EXTRA);
      el.style.paddingBottom = (basePaddingBottom + extra) + 'px';
    }

  }, { passive: true });

  function reset() {
    el.style.transition = 'padding 0.25s ease';
    el.style.paddingTop = basePaddingTop + 'px';
    el.style.paddingBottom = basePaddingBottom + 'px';
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

/* =========================
   🔹 للاستخدام لاحقًا (ديناميكي)
   =========================
   مثال:
   enablePullEffect(element);
*/


















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





document.addEventListener("contextmenu", function (e) {
  if (e.target.tagName === "IMG") {
    e.preventDefault();
  }
});





(function () {

  /* منع الزوم بالكيبورد */
  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey) {
      const key = e.key.toLowerCase();
      if (key === '+' || key === '-' || key === '=' || key === '0') {
        e.preventDefault();
      }
    }
  });

  /* منع Ctrl + عجلة الماوس */
  document.addEventListener('wheel', function (e) {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
    }
  }, { passive: false });

  /* منع الزوم باللمس (Pinch) */
  document.addEventListener('touchstart', function (e) {
    if (e.touches.length > 1) {
      e.preventDefault();
    }
  }, { passive: false });

  /* منع Double Tap */
  let lastTouch = 0;
  document.addEventListener('touchend', function (e) {
    const now = Date.now();
    if (now - lastTouch < 300) {
      e.preventDefault();
    }
    lastTouch = now;
  }, false);

  /* إجبار الزوم = 100% */
  document.body.style.zoom = "100%";
  document.documentElement.style.zoom = "100%";

})();
