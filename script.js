window.onload = () => {
    const messagesDiv = document.getElementById('messages');
    const searchInput = document.getElementById('searchInput');
    const suggestionsDiv = document.getElementById('suggestions');
    const newChatBtn = document.getElementById('newChatBtn');
    const shareBtn = document.getElementById('shareBtn');
    let selectedIndex = 0;
    let isNavigatingWithArrows = false;

    // ======== زر مشاركة الرابط ========
    shareBtn.addEventListener('click', async () => {
        const currentUrl = window.location.href;
        
        try {
            if (navigator.share) {
                await navigator.share({
                    title: 'تفسير القرآن الكريم',
                    text: 'استمع إلى تفسير القرآن الكريم',
                    url: currentUrl
                });
            } else if (navigator.clipboard) {
                await navigator.clipboard.writeText(currentUrl);
                alert('✓ تم نسخ الرابط إلى الحافظة');
            } else {
                const textArea = document.createElement('textarea');
                textArea.value = currentUrl;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                alert('✓ تم نسخ الرابط إلى الحافظة');
            }
        } catch (error) {
            console.error('Error sharing:', error);
            const textArea = document.createElement('textarea');
            textArea.value = currentUrl;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            alert('✓ تم نسخ الرابط إلى الحافظة');
        }
    });

    // ======== توليد اقتراحات ديناميكية لكل سورة وآياتها ========
    let dynamicSuggestions = [];

    // دالة محسنة لتقسيم الآيات - تضمن جلب النص الكامل للآية
    function generateAyahSuggestions() {
        dynamicSuggestions = [];
        
        faq.forEach(item => {
            // تقسيم النص إلى آيات باستخدام regex محسن يضمن جلب النص الكامل
            const ayahMatches = item.a.match(/\d+\.\s*[^]*?(?=\d+\.|$)/g);
            
            if (ayahMatches) {
                ayahMatches.forEach(part => {
                    const match = part.match(/^(\d+)\./);
                    if (match) {
                        const ayahNum = match[1];
                        dynamicSuggestions.push({
                            q: `${item.q} آية ${ayahNum}`,
                            a: part.trim(),
                            surah: item.q,
                            ayah: parseInt(ayahNum),
                            fullText: part.trim()
                        });
                    }
                });
            }
        });
        
        console.log('تم توليد اقتراحات لـ:', dynamicSuggestions.length, 'آية');
    }

    // توليد الاقتراحات عند التحميل
    generateAyahSuggestions();

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

    // ======== البحث النصي المتقدم في جميع الإجابات ========
    function searchInAllAnswers(searchText) {
        const results = [];
        const searchWords = searchText.toLowerCase().split(/\s+/).filter(word => word.length > 1);
        
        if (searchWords.length === 0) return results;

        // البحث في جميع السور والآيات
        faq.forEach(surah => {
            // تقسيم السورة إلى آيات
            const ayahMatches = surah.a.match(/\d+\.\s*[^]*?(?=\d+\.|$)/g) || [];
            
            ayahMatches.forEach(ayahPart => {
                const ayahText = ayahPart.toLowerCase();
                let matchScore = 0;
                
                // حساب درجة المطابقة لكل كلمة بحث
                searchWords.forEach(word => {
                    if (ayahText.includes(word)) {
                        matchScore += word.length; // كلمات أطول تعطي وزن أعلى
                        
                        // زيادة الوزن إذا كانت الكلمة في بداية التفسير
                        if (ayahText.indexOf(word) < 100) {
                            matchScore += 10;
                        }
                    }
                });
                
                if (matchScore > 0) {
                    const ayahMatch = ayahPart.match(/^(\d+)\./);
                    const ayahNumber = ayahMatch ? ayahMatch[1] : '1';
                    
                    results.push({
                        q: `${surah.q} آية ${ayahNumber}`,
                        a: ayahPart.trim(),
                        surah: surah.q,
                        ayah: parseInt(ayahNumber),
                        score: matchScore,
                        matchedText: ayahPart.trim()
                    });
                }
            });
        });

        // ترتيب النتائج حسب درجة المطابقة
        return results.sort((a, b) => b.score - a.score).slice(0, 5);
    }

    // ======== تحديث المقترحات مع البحث النصي المتقدم ========
    function updateSuggestions(value) {
        suggestionsDiv.innerHTML = '';
        selectedIndex = 0;

        if (!value.trim()) {
            suggestionsDiv.style.display = 'none';
            return;
        }

        let filtered = [];

        // البحث التقليدي في الأسئلة أولاً
        const traditionalResults = getAllSuggestions().filter(item =>
            item.q.toLowerCase().includes(value.toLowerCase())
        ).slice(0, 5);

        filtered.push(...traditionalResults);

        // إذا لم تكن هناك نتائج كافية، البحث النصي في المحتوى
        if (filtered.length < 5) {
            const textSearchResults = searchInAllAnswers(value);
            textSearchResults.forEach(result => {
                if (!filtered.some(item => item.q === result.q)) {
                    filtered.push(result);
                }
            });
        }

        // إزالة التكرارات والحد إلى 10 نتائج
        filtered = filtered.slice(0, 10);

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
                if (index === 0) {
                    btn.style.backgroundColor = "#dbeafe";
                }
                btn.addEventListener('click', () => {
                    searchInput.value = item.q;
                    handleQuestion(item);
                });
                suggestionsDiv.appendChild(btn);
            });
        }

        suggestionsDiv.style.display = filtered.length > 0 ? 'block' : 'none';
    }

    // ======== تحديث خلفية الأزرار المختارة ========
    function updateSelectedSuggestion() {
        const buttons = suggestionsDiv.querySelectorAll('.suggestion-btn');
        buttons.forEach((btn, i) => {
            btn.style.backgroundColor = i === selectedIndex ? "#dbeafe" : "#f1f5f9";
        });
        
        // تحديث خانة الكتابة بالاقتراح المحدد
        if (buttons.length > 0 && isNavigatingWithArrows) {
            const selectedText = buttons[selectedIndex].textContent;
            searchInput.value = selectedText;
        }
    }

    // ======== البحث الدقيق عن تفسير آية - محسن ========
    function findAyahTafsir(userText) {
        // أنماط متعددة للبحث عن الآيات
        const patterns = [
            /سورة\s*([\u0600-\u06FF\s]+)\s*(?:آية|اية|رقم)?\s*(\d+)/i,
            /تفسير\s*سورة\s*([\u0600-\u06FF\s]+)\s*(?:آية|اية)?\s*(\d+)/i,
            /سورة\s*([\u0600-\u06FF\s]+)\s*(\d+)/i,
            /([\u0600-\u06FF\s]+)\s*(?:آية|اية)\s*(\d+)/i,
            /سوره\s*([\u0600-\u06FF\s]+)\s*(\d+)/i
        ];

        let surahName = null;
        let ayahNumber = null;

        // تجربة جميع الأنماط
        for (let pattern of patterns) {
            const match = userText.match(pattern);
            if (match) {
                surahName = match[1].trim();
                ayahNumber = parseInt(match[2]);
                break;
            }
        }

        if (surahName && ayahNumber) {
            console.log('البحث عن:', surahName, 'آية:', ayahNumber);

            // البحث عن السورة
            const surahItem = faq.find(item => {
                const itemName = item.q.replace('تفسير ', '').trim();
                const cleanSurahName = surahName.replace('سورة', '').replace('سوره', '').trim();
                return itemName.includes(cleanSurahName) || cleanSurahName.includes(itemName) || item.q.includes(surahName);
            });

            if (!surahItem) {
                return "❌ لم يتم العثور على السورة في قاعدة البيانات.";
            }

            console.log('تم العثور على السورة:', surahItem.q);

            // البحث في الاقتراحات الديناميكية أولاً (أكثر دقة)
            const exactMatch = dynamicSuggestions.find(suggestion => 
                suggestion.surah === surahItem.q && suggestion.ayah === ayahNumber
            );

            if (exactMatch) {
                console.log('تم العثور على الآية في الاقتراحات الديناميكية');
                return exactMatch.a;
            }

            // إذا لم يتم العثور في الاقتراحات، البحث في النص الأصلي باستخدام regex محسن
            console.log('البحث في النص الأصلي للسورة...');
            
            // regex محسن لجلب النص الكامل للآية من بداية الرقم إلى الرقم التالي
            const ayahRegex = new RegExp(`(${ayahNumber}\\.\\s*[^]*?)(?=\\d+\\.|$)`, 'g');
            const ayahMatch = surahItem.a.match(ayahRegex);
            
            if (ayahMatch && ayahMatch[0]) {
                console.log('تم العثور على الآية في النص الأصلي باستخدام regex محسن');
                return ayahMatch[0].trim();
            }

            return `❌ لم يتم العثور على تفسير الآية ${ayahNumber} من ${surahItem.q}.`;
        }

        // إذا لم يكن البحث عن آية محددة، البحث النصي في المحتوى
        console.log('البحث النصي عن:', userText);
        const textSearchResults = searchInAllAnswers(userText);
        
        if (textSearchResults.length > 0) {
            let resultText = `🔍 نتائج البحث عن: "${userText}"\n\n`;
            
            textSearchResults.forEach((result, index) => {
                resultText += `${index + 1}. ${result.q}:\n${result.matchedText}\n\n`;
            });
            
            return resultText;
        }

        return null;
    }

    // ======== دالة مساعدة لاستخراج جميع آيات السورة ========
    function getAllAyahsForSurah(surahName) {
        const surahItem = faq.find(item => {
            const itemName = item.q.replace('تفسير ', '').trim();
            return itemName.includes(surahName) || surahName.includes(itemName);
        });

        if (!surahItem) return [];

        const ayahMatches = surahItem.a.match(/\d+\.\s*[^]*?(?=\d+\.|$)/g) || [];
        return ayahMatches.map(part => {
            const match = part.match(/^(\d+)\./);
            return {
                number: match ? parseInt(match[1]) : 0,
                text: part.trim()
            };
        }).filter(ayah => ayah.number > 0);
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
                addMessage(`لم أجد تفسيراً يتطابق مع "${userQuestion}". حاول البحث بكلمات أخرى أو اكتب: تفسير سورة البقرة آية 255`, "bot");
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
    searchInput.addEventListener('input', (e) => {
        isNavigatingWithArrows = false;
        updateSuggestions(e.target.value);
    });

    searchInput.addEventListener('keydown', (e) => {
        const buttons = suggestionsDiv.querySelectorAll('.suggestion-btn');
        if (buttons.length === 0) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            isNavigatingWithArrows = true;
            selectedIndex = (selectedIndex + 1) % buttons.length;
            updateSelectedSuggestion();
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            isNavigatingWithArrows = true;
            selectedIndex = (selectedIndex - 1 + buttons.length) % buttons.length;
            updateSelectedSuggestion();
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (searchInput.value.trim()) {
                if (!isNavigatingWithArrows) {
                    handleQuestion(searchInput.value.trim());
                } else {
                    const selectedItem = getAllSuggestions().find(item => item.q === searchInput.value);
                    if (selectedItem) {
                        handleQuestion(selectedItem);
                    } else {
                        handleQuestion(searchInput.value.trim());
                    }
                }
                searchInput.value = "";
                suggestionsDiv.innerHTML = "";
                suggestionsDiv.style.display = "none";
                isNavigatingWithArrows = false;
                return;
            }
        } else if (e.key === "Escape") {
            suggestionsDiv.style.display = "none";
            isNavigatingWithArrows = false;
        } else {
            isNavigatingWithArrows = false;
        }
    });

    // إخفاء الاقتراحات عند النقر خارجها
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !suggestionsDiv.contains(e.target)) {
            suggestionsDiv.style.display = 'none';
            isNavigatingWithArrows = false;
        }
    });

    // ======== تحميل عند البداية ========
    loadMessages();
    if (!localStorage.getItem('chatMessages')) {
        addMessage("مرحباً! كيف يمكنني مساعدتك اليوم؟", "bot", false);
    }
    searchInput.focus();
};
