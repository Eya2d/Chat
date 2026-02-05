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
let isAnimating = false;

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
  const clone = template.cloneNode(true);

  clone.style.display = 'flex';
  clone.className = 'box popup-enter';
  clone.id = id;

  document.body.appendChild(clone);

  // ✅ إضافة كلاس للـ body عند الظهور
  document.body.classList.add('joo');

  // 🔥 إعادة تشغيل الأنيميشن بالقوة
  clone.getBoundingClientRect();

  requestAnimationFrame(() => {
    clone.classList.add('popup-enter-active');
  });

  currentBox = clone;
  isAnimating = true;

  clone.addEventListener('transitionend', () => {
    isAnimating = false;
  }, { once: true });
}

function closeBox() {
  if (!currentBox) return;

  // إذا كان ما زال في الدخول → أوقفه
  currentBox.classList.remove('popup-enter-active');
  currentBox.classList.remove('popup-enter');

  // 🔥 Reflow
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




