const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
const openBtn = document.getElementById('openBtn');
const closeBtn = document.getElementById('closeBtn');

let startX = 0;
let isDragging = false;

/* ===========================
   التحقق من حالة body
   =========================== */
function isBlocked() {
    return document.body.classList.contains('joo');
}

/* ===========================
   إظهار القائمة
   =========================== */
function openSidebar() {
    if (isBlocked()) return; // ❌ ممنوع الفتح

    sidebar.classList.add("show");
    overlay.style.display = "block";
}

/* ===========================
   إخفاء القائمة
   =========================== */
function closeSidebar() {
    sidebar.classList.remove("show");
    overlay.style.display = "none";
}

/* ===========================
   أزرار التحكم
   =========================== */
openBtn.onclick = () => {
    if (!isBlocked()) openSidebar();
};

closeBtn.onclick = closeSidebar;
overlay.onclick = closeSidebar;

/* ===========================
   السحب من اليسار لإظهار القائمة
   =========================== */
document.addEventListener("touchstart", (e) => {
    if (window.innerWidth > 480) return;
    if (isBlocked()) return; // ❌ تعطيل السحب

    startX = e.touches[0].clientX;

    if (startX < 50 && !sidebar.classList.contains("show")) {
        isDragging = true;
    }
});

document.addEventListener("touchmove", (e) => {
    if (!isDragging || isBlocked()) return;

    let currentX = e.touches[0].clientX;

    if (currentX > 120) {
        openSidebar();
        isDragging = false;
    }
});

document.addEventListener("touchend", () => {
    isDragging = false;
});

/* ===========================
   السحب لليسار لإخفاء القائمة
   =========================== */
sidebar.addEventListener("touchstart", (e) => {
    startX = e.touches[0].clientX;
});

sidebar.addEventListener("touchmove", (e) => {
    if (isBlocked()) return;

    let currentX = e.touches[0].clientX;
    let diff = currentX - startX;

    if (diff < -80) {
        closeSidebar();
    }
});

/* ===========================
   مراقبة body (MutationObserver)
   =========================== */
const observer = new MutationObserver(() => {
    if (isBlocked() && sidebar.classList.contains('show')) {
        closeSidebar(); // ❌ إغلاق فوري
    }
});

observer.observe(document.body, {
    attributes: true,
    attributeFilter: ['class']
});








let currentBox = null;
let pendingBoxId = null;

function openBox(id) {
  if (currentBox) {
    pendingBoxId = id;
    closeBox();
    return;
  }
  createBox(id);
}

function createBox(id) {
  const template = document.getElementById(`${id}-content`);
  if (!template) return;

  const clone = template.cloneNode(true);

  clone.style.display = 'flex';
  clone.className = 'box popup-enter';
  clone.id = id;

  document.body.appendChild(clone);

  // ✅ إضافة كلاس body
  document.body.classList.add('joo');

  // 🔥 تفعيل Pull Effect لكل عنصر diov داخل الـ box
  clone.querySelectorAll('.diov').forEach(el => {
    enablePullEffect(el);
  });

  // إعادة تشغيل الأنيميشن
  clone.getBoundingClientRect();
  requestAnimationFrame(() => {
    clone.classList.add('popup-enter-active');
  });

  currentBox = clone;
}

function closeBox() {
  if (!currentBox) return;

  currentBox.classList.remove('popup-enter-active');
  currentBox.classList.remove('popup-enter');

  // Reflow لإعادة الأنيميشن
  currentBox.getBoundingClientRect();

  currentBox.classList.add('popup-exit');

  currentBox.addEventListener('transitionend', () => {
    currentBox.remove();
    currentBox = null;

    if (pendingBoxId) {
      const next = pendingBoxId;
      pendingBoxId = null;
      createBox(next);
    } else {
      // ✅ إزالة الكلاس من body عند اختفاء آخر ديف
      document.body.classList.remove('joo');
    }
  }, { once: true });
}

/* ==============================
   Enable Pull Effect for diov
   ============================== */
function enablePullEffect(el) {
  const style = getComputedStyle(el);
  const basePaddingTop = parseFloat(style.paddingTop) || 0;
  const basePaddingBottom = parseFloat(style.paddingBottom) || 0;

  let startY = 0;
  let pullingTop = false;
  let pullingBottom = false;
  let extraPadding = 0;
  let animationFrame = null;

  function resetPadding() {
    if (animationFrame) cancelAnimationFrame(animationFrame);
    function step() {
      if (extraPadding > 0) {
        extraPadding -= 2; // سرعة التراجع
        if (extraPadding < 0) extraPadding = 0;
        el.style.paddingTop = (basePaddingTop + (pullingTop ? extraPadding : 0)) + 'px';
        el.style.paddingBottom = (basePaddingBottom + (pullingBottom ? extraPadding : 0)) + 'px';
        animationFrame = requestAnimationFrame(step);
      } else {
        el.style.paddingTop = basePaddingTop + 'px';
        el.style.paddingBottom = basePaddingBottom + 'px';
        pullingTop = false;
        pullingBottom = false;
      }
    }
    step();
  }

  el.addEventListener('touchstart', e => {
    startY = e.touches[0].clientY;
    pullingTop = false;
    pullingBottom = false;
  });

  el.addEventListener('touchmove', e => {
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - startY;

    const scrollTop = el.scrollTop;
    const scrollHeight = el.scrollHeight;
    const clientHeight = el.clientHeight;

    if (scrollTop === 0 && deltaY > 0) {
      pullingTop = true;
      pullingBottom = false;
      extraPadding = Math.min(30, deltaY / 2);
      el.style.paddingTop = (basePaddingTop + extraPadding) + 'px';
    } else if (scrollTop + clientHeight >= scrollHeight && deltaY < 0) {
      pullingTop = false;
      pullingBottom = true;
      extraPadding = Math.min(30, -deltaY / 2);
      el.style.paddingBottom = (basePaddingBottom + extraPadding) + 'px';
    }
  });

  el.addEventListener('touchend', resetPadding);
  el.addEventListener('touchcancel', resetPadding);
}


