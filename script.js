window.onload = () => {
    const messagesDiv = document.getElementById('messages');
    const searchInput = document.getElementById('searchInput');
    const suggestionsDiv = document.getElementById('suggestions');
    const newChatBtn = document.getElementById('newChatBtn');
    const shareBtn = document.getElementById('shareBtn');
    let selectedIndex = 0;
    let isNavigatingWithArrows = false;
    
    // ======== تحسينات الأداء ========
    let searchCache = new Map(); // كاش للبحث
    let debounceTimer; // لمنع البحث المتكرر السريع
    let preprocessedData = null; // بيانات معالجة مسبقاً

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

    // ======== معالجة مسبقة للبيانات ========
    function preprocessData() {
        if (preprocessedData) return preprocessedData;
        
        console.time('معالجة البيانات');
        preprocessedData = {
            dynamicSuggestions: [],
            searchIndex: new Map() // فهرس للبحث السريع
        };

        // معالجة مسبقة لجميع السور والآيات
        faq.forEach((item, surahIndex) => {
            const ayahMatches = item.a.match(/\d+\.\s*[^]*?(?=\d+\.|$)/g) || [];
            
            ayahMatches.forEach(part => {
                const match = part.match(/^(\d+)\./);
                if (match) {
                    const ayahNum = parseInt(match[1]);
                    const suggestion = {
                        q: `${item.q} آية ${ayahNum}`,
                        a: part.trim(),
                        surah: item.q,
                        ayah: ayahNum,
                        fullText: part.trim(),
                        surahIndex: surahIndex
                    };
                    
                    preprocessedData.dynamicSuggestions.push(suggestion);
                    
                    // إنشاء فهرس للبحث السريع
                    const words = part.toLowerCase().split(/\s+/);
                    words.forEach(word => {
                        if (word.length > 2) { // تجاهل الكلمات القصيرة
                            if (!preprocessedData.searchIndex.has(word)) {
                                preprocessedData.searchIndex.set(word, []);
                            }
                            preprocessedData.searchIndex.get(word).push(suggestion);
                        }
                    });
                }
            });
        });
        
        console.timeEnd('معالجة البيانات');
        console.log('تم معالجة:', preprocessedData.dynamicSuggestions.length, 'آية');
        return preprocessedData;
    }

    // ======== توليد اقتراحات ديناميكية - محسنة ========
    function generateAyahSuggestions() {
        const data = preprocessData();
        return data.dynamicSuggestions;
    }

    // توليد الاقتراحات عند التحميل
    const dynamicSuggestions = generateAyahSuggestions();

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
        
        // إضافة border-radius لرسائل البوت
        if (sender === 'bot') {
            msg.style.borderRadius = '18px';
        }
        
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
                    const additionalMessage = addMessage(chunks[currentIndex], "bot");
                    additionalMessage.style.borderRadius = '18px';
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

        const firstMessage = addMessage(chunks[0], "bot");
        firstMessage.style.borderRadius = '18px';
        currentIndex = 1;

        if (currentIndex < chunks.length) {
            createMoreButton();
        }
    }

    // ======== استخراج مقتطف سريع ========
    function extractSnippetFast(text, searchWords, maxWords = 8) {
        // بحث سريع عن أول ظهور لأي كلمة بحث
        const lowerText = text.toLowerCase();
        let bestPosition = -1;
        
        for (const word of searchWords) {
            const pos = lowerText.indexOf(word);
            if (pos !== -1 && (bestPosition === -1 || pos < bestPosition)) {
                bestPosition = pos;
            }
        }
        
        if (bestPosition === -1) {
            return text.split(/\s+/).slice(0, 6).join(' ') + '...';
        }
        
        // استخراج مقتطف حول الموضع
        const start = Math.max(0, bestPosition - 30);
        const end = Math.min(text.length, bestPosition + 70);
        let snippet = text.substring(start, end);
        
        // تقصير إذا كان طويلاً
        const words = snippet.split(/\s+/);
        if (words.length > maxWords) {
            snippet = words.slice(0, maxWords).join(' ') + '...';
        }
        
        return snippet;
    }

    // ======== البحث النصي السريع ========
    function searchInAllAnswersFast(searchText) {
        // التحقق من الكاش أولاً
        if (searchCache.has(searchText)) {
            return searchCache.get(searchText);
        }

        const searchWords = searchText.toLowerCase().split(/\s+/).filter(word => word.length > 1);
        if (searchWords.length === 0) return [];

        const data = preprocessData();
        const results = new Map(); // استخدام Map لمنع التكرارات
        
        // بحث سريع باستخدام الفهرس
        searchWords.forEach(word => {
            if (data.searchIndex.has(word)) {
                data.searchIndex.get(word).forEach(item => {
                    const key = `${item.surah}-${item.ayah}`;
                    if (!results.has(key)) {
                        results.set(key, {
                            ...item,
                            score: 0
                        });
                    }
                    
                    // تحديث النقاط
                    const result = results.get(key);
                    result.score += word.length;
                    
                    // نقاط إضافية إذا كانت الكلمة في بداية النص
                    if (item.a.toLowerCase().indexOf(word) < 100) {
                        result.score += 5;
                    }
                });
            }
        });

        const finalResults = Array.from(results.values())
            .sort((a, b) => b.score - a.score)
            .slice(0, 6)
            .map(result => ({
                ...result,
                snippet: extractSnippetFast(result.a.replace(/^\d+\.\s*/, ''), searchWords, 8)
            }));

        // حفظ في الكاش
        searchCache.set(searchText, finalResults);
        return finalResults;
    }

    // ======== تحديث المقترحات - محسن للأداء ========
    function updateSuggestions(value) {
        clearTimeout(debounceTimer);
        
        debounceTimer = setTimeout(() => {
            suggestionsDiv.innerHTML = '';
            selectedIndex = 0;

            if (!value.trim()) {
                suggestionsDiv.style.display = 'none';
                return;
            }

            let filtered = [];

            // البحث التقليدي السريع في الأسئلة
            const traditionalResults = [];
            const searchLower = value.toLowerCase();
            
            for (let i = 0; i < faq.length && traditionalResults.length < 3; i++) {
                if (faq[i].q.toLowerCase().includes(searchLower)) {
                    traditionalResults.push(faq[i]);
                }
            }
            
            for (let i = 0; i < dynamicSuggestions.length && traditionalResults.length < 6; i++) {
                if (dynamicSuggestions[i].q.toLowerCase().includes(searchLower)) {
                    traditionalResults.push(dynamicSuggestions[i]);
                }
            }

            filtered.push(...traditionalResults.slice(0, 4));

            // البحث النصي السريع إذا لم تكن هناك نتائج كافية
            if (filtered.length < 5) {
                const textSearchResults = searchInAllAnswersFast(value);
                textSearchResults.forEach(result => {
                    if (!filtered.some(item => item.q === result.q)) {
                        filtered.push({
                            ...result,
                            isTextSearch: true
                        });
                    }
                });
            }

            // إزالة التكرارات والحد إلى 8 نتائج
            filtered = filtered.slice(0, 8);

            if (filtered.length === 0) {
                const noResult = document.createElement('div');
                noResult.textContent = "لا توجد نتائج...";
                noResult.className = "no";
                suggestionsDiv.appendChild(noResult);
            } else {
                filtered.forEach((item, index) => {
                    const suggestionItem = document.createElement('div');
                    suggestionItem.classList.add('suggestion-item');
                    
                    const btn = document.createElement('button');
                    btn.classList.add('suggestion-btn');
                    
                    if (item.isTextSearch || item.snippet) {
                        const title = document.createElement('div');
                        title.textContent = item.q;
                        title.style.fontWeight = 'bold';
                        title.style.marginBottom = '4px';
                        title.style.textAlign = 'right';
                        
                        const snippet = document.createElement('div');
                        snippet.textContent = item.snippet || extractSnippetFast(item.a.replace(/^\d+\.\s*/, ''), value.toLowerCase().split(/\s+/), 8);
                        snippet.style.fontSize = '0.85em';
                        snippet.style.color = '#666';
                        snippet.style.marginBottom = '4px';
                        snippet.style.lineHeight = '1.3';
                        snippet.style.textAlign = 'right';
                        
                        const source = document.createElement('div');
                        source.textContent = `${item.surah.replace('تفسير ', '')} - آية ${item.ayah}`;
                        source.style.fontSize = '0.8em';
                        source.style.color = '#888';
                        source.style.fontStyle = 'italic';
                        source.style.textAlign = 'right';
                        
                        btn.appendChild(title);
                        btn.appendChild(snippet);
                        btn.appendChild(source);
                    } else {
                        btn.textContent = item.q;
                        btn.style.textAlign = 'right';
                    }
                    
                    if (index === 0) {
                        btn.style.backgroundColor = "#dbeafe";
                    }
                    
                    btn.addEventListener('click', () => {
                        searchInput.value = item.q;
                        handleQuestion(item);
                    });
                    
                    suggestionItem.appendChild(btn);
                    suggestionsDiv.appendChild(suggestionItem);
                });
            }

            suggestionsDiv.style.display = filtered.length > 0 ? 'block' : 'none';
        }, 150); // تأخير 150 مللي ثانية
    }

    // ======== تحديث خلفية الأزرار المختارة ========
    function updateSelectedSuggestion() {
        const buttons = suggestionsDiv.querySelectorAll('.suggestion-btn');
        buttons.forEach((btn, i) => {
            btn.style.backgroundColor = i === selectedIndex ? "#dbeafe" : "#f1f5f9";
        });
        
        if (buttons.length > 0 && isNavigatingWithArrows) {
            const selectedButton = buttons[selectedIndex];
            const titleElement = selectedButton.querySelector('div:first-child');
            if (titleElement) {
                searchInput.value = titleElement.textContent;
            } else {
                searchInput.value = selectedButton.textContent;
            }
        }
    }

    // ======== البحث الدقيق عن تفسير آية - محسن ========
    function findAyahTafsir(userText) {
        const patterns = [
            /سورة\s*([\u0600-\u06FF\s]+)\s*(?:آية|اية|رقم)?\s*(\d+)/i,
            /تفسير\s*سورة\s*([\u0600-\u06FF\s]+)\s*(?:آية|اية)?\s*(\d+)/i,
            /سورة\s*([\u0600-\u06FF\s]+)\s*(\d+)/i,
            /([\u0600-\u06FF\s]+)\s*(?:آية|اية)\s*(\d+)/i,
            /سوره\s*([\u0600-\u06FF\s]+)\s*(\d+)/i
        ];

        let surahName = null;
        let ayahNumber = null;

        for (let pattern of patterns) {
            const match = userText.match(pattern);
            if (match) {
                surahName = match[1].trim();
                ayahNumber = parseInt(match[2]);
                break;
            }
        }

        if (surahName && ayahNumber) {
            // بحث سريع عن السورة
            const surahItem = faq.find(item => {
                const itemName = item.q.replace('تفسير ', '').trim();
                const cleanSurahName = surahName.replace('سورة', '').replace('سوره', '').trim();
                return itemName.includes(cleanSurahName) || cleanSurahName.includes(itemName);
            });

            if (!surahItem) {
                return "❌ لم يتم العثور على السورة في قاعدة البيانات.";
            }

            // بحث سريع في الاقتراحات الديناميكية
            const exactMatch = dynamicSuggestions.find(suggestion => 
                suggestion.surah === surahItem.q && suggestion.ayah === ayahNumber
            );

            if (exactMatch) {
                return exactMatch.a;
            }

            // بحث في النص الأصلي
            const ayahRegex = new RegExp(`(${ayahNumber}\\.\\s*[^]*?)(?=\\d+\\.|$)`, 'g');
            const ayahMatch = surahItem.a.match(ayahRegex);
            
            if (ayahMatch && ayahMatch[0]) {
                return ayahMatch[0].trim();
            }

            return `❌ لم يتم العثور على تفسير الآية ${ayahNumber} من ${surahItem.q}.`;
        }

        // البحث النصي السريع
        const textSearchResults = searchInAllAnswersFast(userText);
        
        if (textSearchResults.length > 0) {
            let resultText = `🔍 نتائج البحث عن: "${userText}"\n\n`;
            
            textSearchResults.forEach((result, index) => {
                resultText += `${index + 1}. ${result.q}:\n`;
                resultText += `${result.matchedText}\n\n`;
            });
            
            return resultText;
        }

        return null;
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
                    const selectedButton = buttons[selectedIndex];
                    const titleElement = selectedButton.querySelector('div:first-child');
                    const itemTitle = titleElement ? titleElement.textContent : selectedButton.textContent;
                    
                    const selectedItem = getAllSuggestions().find(item => item.q === itemTitle);
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
