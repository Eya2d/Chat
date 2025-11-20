window.onload = () => {
    const messagesDiv = document.getElementById('messages');
    const searchInput = document.getElementById('searchInput');
    const suggestionsDiv = document.getElementById('suggestions');
    const newChatBtn = document.getElementById('newChatBtn');
    let selectedIndex = 0;

    // ======== توليد اقتراحات ديناميكية لكل سورة وآياتها ========
    let dynamicSuggestions = [];

    faq.forEach(item => {
        const ayahParts = item.a.split(/(?=\d+\.\s*)/g);
        ayahParts.forEach(part => {
            const match = part.match(/^(\d+)\./);
            if (match) {
                const ayahNum = match[1];
                dynamicSuggestions.push({
                    q: `${item.q} آية ${ayahNum}`,
                    a: part
                });
            }
        });
    });

    // دمج الاقتراحات الديناميكية مع الاقتراحات الأصلية
    function getAllSuggestions() {
        return [...faq, ...dynamicSuggestions];
    }

    // ======== تحميل الرسائل المحفوظة ========
    function loadMessages() {
        const saved = localStorage.getItem('chatMessages');
        if (saved) {
            messagesDiv.innerHTML = saved;
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }
    }

    // ======== حفظ الرسائل ========
    function saveMessages() {
        localStorage.setItem('chatMessages', messagesDiv.innerHTML);
    }

    // ======== إضافة رسالة ========
    function addMessage(text, sender, isNew = true) {
        const msg = document.createElement('div');
        msg.classList.add('message', sender);
        if (isNew) msg.classList.add('new');
        msg.textContent = text;
        messagesDiv.appendChild(msg);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
        saveMessages();
        return msg;
    }

    // ======== مؤشر الكتابة ========
    function showTypingIndicator() {
        const indicator = document.createElement('div');
        indicator.classList.add('typing-indicator');
        indicator.innerHTML = '<span></span><span></span><span></span>';
        messagesDiv.appendChild(indicator);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
        return indicator;
    }

    // ======== تقسيم النص ========
    function splitTextIntoChunks(text, size = 220) {
        let chunks = [];
        for (let i = 0; i < text.length; i += size) {
            chunks.push(text.substr(i, size));
        }
        return chunks;
    }

    // ======== عرض الإجابة الطويلة ========
    function showLongAnswer(answerText) {
        const chunks = splitTextIntoChunks(answerText, 220);
        let currentIndex = 0;
        let buttonDiv = null;

        function createMoreButton() {
            if (buttonDiv && buttonDiv.parentElement) {
                buttonDiv.remove();
            }
            buttonDiv = document.createElement("div");
            buttonDiv.style.margin = "14px 0 24px 0";
            buttonDiv.style.textAlign = "left";

            const moreBtn = document.createElement("button");
            moreBtn.textContent = "جلب المزيد";
            moreBtn.className = "more-btn";

            moreBtn.onclick = () => {
                if (currentIndex < chunks.length) {
                    addMessage(chunks[currentIndex], "bot");
                    currentIndex++;
                    buttonDiv.remove();

                    if (currentIndex >= chunks.length) {
                        saveMessages();
                        return;
                    }
                    createMoreButton();
                }
            };

            buttonDiv.appendChild(moreBtn);
            messagesDiv.appendChild(buttonDiv);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }

        addMessage(chunks[0], "bot");
        currentIndex = 1;

        if (currentIndex < chunks.length) {
            createMoreButton();
        }
    }

    // ======== تحديث المقترحات ========
    function updateSuggestions(value) {
        suggestionsDiv.innerHTML = '';
        selectedIndex = 0;

        if (!value.trim()) {
            suggestionsDiv.style.display = 'none';
            return;
        }

        let filtered = getAllSuggestions().filter(item =>
            item.q.toLowerCase().includes(value.toLowerCase())
        ).slice(0, 10);

        if (filtered.length === 0) {
            const noResult = document.createElement('div');
            noResult.textContent = "لا توجد نتائج...";
            noResult.className = "no";
            suggestionsDiv.appendChild(noResult);
        } else {
            filtered.forEach((item, index) => {
                const btn = document.createElement('button');
                btn.textContent = item.q;
                btn.classList.add('suggestion-btn');
                btn.style.backgroundColor = index === 0 ? "#dbeafe" : "#f1f5f9";
                btn.addEventListener('click', () => handleQuestion(item));
                suggestionsDiv.appendChild(btn);
            });
        }

        suggestionsDiv.style.display = filtered.length > 0 ? 'block' : 'none';
    }

    // ======== البحث الديناميكي عن تفسير آية ========
    function findAyahTafsir(userText) {
        const regex = /سورة\s*([\u0600-\u06FF]+)\s*(?:آية|اية|رقم)?\s*(\d+)?/;
        const match = userText.match(regex);

        if (!match) return null;

        const surahName = match[1].trim();
        const ayahNumber = match[2] ? Number(match[2]) : null;

        const surahItem = faq.find(item => item.q.includes(surahName));

        if (!surahItem) return "❌ لم يتم العثور على السورة في قاعدة البيانات.";

        if (!ayahNumber) return surahItem.a;

        const parts = surahItem.a.split(/(?=\d+\.\s*)/g);
        const ayahText = parts.find(p => p.startsWith(ayahNumber + "."));

        if (!ayahText) return "❌ لم يتم العثور على تفسير هذه الآية.";

        return ayahText;
    }

    // ======== معالجة السؤال ========
    function handleQuestion(itemOrText) {
        document.querySelectorAll('.more-btn').forEach(btn => {
            const container = btn.closest('div');
            if (container) container.remove();
        });

        let userQuestion = "";
        let answer = "";

        if (typeof itemOrText === "string") {
            userQuestion = itemOrText;
            answer = findAyahTafsir(userQuestion);

            addMessage(userQuestion, 'user');

            if (answer === null) {
                addMessage("لم أجد تفسيراً. حاول كتابة: تفسير سورة البقرة 255", "bot");
                return;
            }

            if (answer.length > 200) {
                showLongAnswer(answer);
            } else {
                addMessage(answer, 'bot');
            }

            return;
        }

        const item = itemOrText;
        addMessage(item.q, 'user');

        const typing = showTypingIndicator();

        setTimeout(() => {
            typing.remove();

            if (!item.a || item.a.trim() === "") {
                addMessage("نحن نعمل على هذا الجزء، سيتم إضافة الإجابة قريباً.", "bot");
                return;
            }

            if (item.a.length > 200) {
                showLongAnswer(item.a);
            } else {
                addMessage(item.a, 'bot');
            }

        }, 800);

        searchInput.value = '';
        suggestionsDiv.innerHTML = '';
        suggestionsDiv.style.display = 'none';
        searchInput.focus();
    }

    // ======== محادثة جديدة ========
    newChatBtn.addEventListener('click', () => {
        if (confirm("هل تريد حقًا بدء محادثة جديدة؟ سيتم حذف جميع الرسائل الحالية.")) {
            messagesDiv.innerHTML = '';
            localStorage.removeItem('chatMessages');
            addMessage("مرحباً! كيف يمكنني مساعدتك اليوم؟", "bot");
        }
    });

    // ======== إدخال وأسهم ========
    searchInput.addEventListener('input', (e) => updateSuggestions(e.target.value));

    searchInput.addEventListener('keydown', (e) => {
        const buttons = suggestionsDiv.querySelectorAll('.suggestion-btn');
        if (buttons.length === 0) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            selectedIndex = (selectedIndex + 1) % buttons.length;
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            selectedIndex = (selectedIndex - 1 + buttons.length) % buttons.length;
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (searchInput.value.trim()) {
                handleQuestion(searchInput.value.trim());
                searchInput.value = "";
                suggestionsDiv.innerHTML = "";
                suggestionsDiv.style.display = "none";
                return;
            }
            const selectedItem = getAllSuggestions().find(item => item.q === buttons[selectedIndex].textContent);
            if (selectedItem) handleQuestion(selectedItem);
        }

        buttons.forEach((btn, i) => {
            btn.style.backgroundColor = i === selectedIndex ? "#dbeafe" : "#f1f5f9";
        });
    });

    // ======== تحميل عند البداية ========
    loadMessages();
    if (!localStorage.getItem('chatMessages')) {
        addMessage("مرحباً! كيف يمكنني مساعدتك اليوم؟", "bot", false);
    }
    searchInput.focus();
};
