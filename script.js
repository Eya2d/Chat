window.onload = () => {
            const messagesDiv = document.getElementById('messages');
            const searchInput = document.getElementById('searchInput');
            const suggestionsDiv = document.getElementById('suggestions');
            const newChatBtn = document.getElementById('newChatBtn');
            const shareBtn = document.getElementById('shareBtn');
            const scrollToBottomBtn = document.getElementById('scrollToBottomBtn');
            
            let selectedIndex = 0;
            let isNavigatingWithArrows = false;
            let dynamicSuggestions = [];
            let suggestionsGenerated = false;

            // ======== التحكم في زر النزول لأسفل ========
            function toggleScrollButton() {
                // احسب المسافة من الأسفل
                const scrollBottom = messagesDiv.scrollHeight - messagesDiv.scrollTop - messagesDiv.clientHeight;
                
                // إذا كان المستخدم ليس في الأسفل تمامًا، أظهر الزر
                if (scrollBottom > 100) {
                    scrollToBottomBtn.classList.add('show');
                } else {
                    scrollToBottomBtn.classList.remove('show');
                }
            }
            
            // استمع لحدث التمرير
            messagesDiv.addEventListener('scroll', toggleScrollButton);
            
            // حدث النقر على زر النزول لأسفل
            scrollToBottomBtn.addEventListener('click', () => {
                messagesDiv.scrollTo({
                    top: messagesDiv.scrollHeight,
                    behavior: 'smooth'
                });
            });
            
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

            // ======== استخراج أجزاء الصور من الأقواس ========
            function extractImageParts(text) {
                const imagePattern = /\(([^)]+)\)/g;
                const matches = [];
                let match;
                
                while ((match = imagePattern.exec(text)) !== null) {
                    matches.push(match[1]);
                }
                
                return matches;
            }

            // ======== استخراج النص حول كلمات البحث ========
            function extractTextAroundSearch(text, searchWords, contextWords = 10) {
                const words = text.split(/\s+/);
                const results = [];
                
                searchWords.forEach(searchWord => {
                    const lowerSearchWord = searchWord.toLowerCase();
                    
                    for (let i = 0; i < words.length; i++) {
                        const word = words[i].toLowerCase().replace(/[.,;!?()]/g, '');
                        
                        if (word.includes(lowerSearchWord)) {
                            const start = Math.max(0, i - contextWords);
                            const end = Math.min(words.length, i + contextWords + 1);
                            const snippet = words.slice(start, end).join(' ');
                            
                            // إضافة النتيجة فقط إذا لم تكن مكررة
                            if (!results.some(item => item.includes(snippet))) {
                                results.push(snippet);
                            }
                        }
                    }
                });
                
                return results.slice(0, 3); // إرجاع أول 3 نتائج فقط
            }

            // ======== توليد اقتراحات ديناميكية لكل سورة وآياتها - عند الحاجة فقط ========
            function generateAyahSuggestionsLazy() {
                if (suggestionsGenerated) return;
                
                dynamicSuggestions = [];
                
                // تقسيم العمل إلى دفعات صغيرة لتجنب تجميد الواجهة
                let currentIndex = 0;
                const batchSize = 5;
                
                function processBatch() {
                    const endIndex = Math.min(currentIndex + batchSize, faq.length);
                    
                    for (let i = currentIndex; i < endIndex; i++) {
                        const item = faq[i];
                        const ayahMatches = item.a.match(/\d+\.\s*[^]*?(?=\d+\.|$)/g);
                        
                        if (ayahMatches) {
                            ayahMatches.forEach(part => {
                                const match = part.match(/^(\d+)\./);
                                if (match) {
                                    const ayahNum = match[1];
                                    const imageParts = extractImageParts(part);
                                    
                                    dynamicSuggestions.push({
                                        q: `${item.q} آية ${ayahNum}`,
                                        a: part.trim(),
                                        surah: item.q,
                                        ayah: parseInt(ayahNum),
                                        fullText: part.trim(),
                                        imageParts: imageParts
                                    });
                                }
                            });
                        }
                    }
                    
                    currentIndex = endIndex;
                    
                    if (currentIndex < faq.length) {
                        setTimeout(processBatch, 10);
                    } else {
                        suggestionsGenerated = true;
                        console.log('تم توليد اقتراحات لـ:', dynamicSuggestions.length, 'آية');
                    }
                }
                
                processBatch();
            }

            // دمج الاقتراحات الديناميكية مع الاقتراحات الأصلية
            function getAllSuggestions() {
                generateAyahSuggestionsLazy();
                return [...faq, ...dynamicSuggestions];
            }

            // ======== تحميل الرسائل المحفوظة ========
            function loadMessages() {
                const saved = localStorage.getItem('chatMessages');
                if (saved) {
                    messagesDiv.innerHTML = saved;
                    messagesDiv.scrollTop = messagesDiv.scrollHeight;
                    // تحقق من حالة زر النزول بعد التحميل
                    setTimeout(toggleScrollButton, 100);
                }
            }

            // ======== حفظ الرسائل ========
            function saveMessages() {
                localStorage.setItem('chatMessages', messagesDiv.innerHTML);
            }

            // ======== إضافة رسالة مع دعم الصور ========
            function addMessage(text, sender, isNew = true) {
                const msg = document.createElement('div');
                msg.classList.add('message', sender);
                if (isNew) msg.classList.add('new');
                
                const imageParts = extractImageParts(text);
                
                if (imageParts.length > 0) {
                    const textContainer = document.createElement('div');
                    textContainer.style.whiteSpace = 'pre-wrap';
                    
                    const parts = text.split(/\(([^)]+)\)/);
                    
                    parts.forEach((part, index) => {
                        if (index % 2 === 0) {
                            if (part.trim()) {
                                const textNode = document.createTextNode(part);
                                textContainer.appendChild(textNode);
                            }
                        } else {
                            const imageSpan = document.createElement('span');
                            imageSpan.textContent = `(${part})`;
                            imageSpan.style.color = 'rgb(120 126 232)';
                            imageSpan.style.fontWeight = 'bold';
                            imageSpan.style.backgroundColor = '#fff';
                            imageSpan.style.padding = '2px 6px';
                            imageSpan.style.borderRadius = '4px';
                            imageSpan.style.margin = '0 2px';
                            imageSpan.style.fontSize = '0.9em';
                            textContainer.appendChild(imageSpan);
                        }
                    });
                    
                    msg.appendChild(textContainer);
                } else {
                    msg.textContent = text;
                }
                
                messagesDiv.appendChild(msg);
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
                saveMessages();
                
                // تحقق من حالة زر النزول بعد إضافة الرسالة
                setTimeout(toggleScrollButton, 100);
                return msg;
            }

            // ======== مؤشر الكتابة ========
            function showTypingIndicator() {
                const indicator = document.createElement('div');
                indicator.classList.add('typing-indicator');
                indicator.innerHTML = '<span></span><span></span><span></span>';
                messagesDiv.appendChild(indicator);
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
                
                // تحقق من حالة زر النزول بعد إضافة المؤشر
                setTimeout(toggleScrollButton, 100);
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

            // ======== عرض الإجابة الطويلة مع دعم الصور ========
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
                    
                    // تحقق من حالة زر النزول بعد إضافة الزر
                    setTimeout(toggleScrollButton, 100);
                }

                addMessage(chunks[0], "bot");
                currentIndex = 1;

                if (currentIndex < chunks.length) {
                    createMoreButton();
                }
            }

            // ======== استخراج مقتطف من النص حول الكلمة المطلوبة ========
            function extractSnippet(text, searchWords, maxWords = 8) {
                const words = text.split(/\s+/);
                let bestSnippet = '';
                let bestScore = 0;
                
                for (let i = 0; i < words.length; i++) {
                    let snippetWords = [];
                    let score = 0;
                    
                    const start = Math.max(0, i - 3);
                    const end = Math.min(words.length, i + 5);
                    
                    for (let j = start; j < end; j++) {
                        snippetWords.push(words[j]);
                        
                        const word = words[j].toLowerCase().replace(/[.,;!?()]/g, '');
                        if (searchWords.some(searchWord => word.includes(searchWord))) {
                            score += 3;
                            if (searchWords.includes(word)) {
                                score += 5;
                            }
                        }
                    }
                    
                    if (score > bestScore) {
                        bestScore = score;
                        bestSnippet = snippetWords.join(' ');
                        
                        const snippetWordCount = bestSnippet.split(/\s+/).length;
                        if (snippetWordCount > maxWords) {
                            const snippetWordsArray = bestSnippet.split(/\s+/);
                            bestSnippet = snippetWordsArray.slice(0, maxWords).join(' ') + '...';
                        }
                    }
                }
                
                return bestSnippet || words.slice(0, Math.min(6, words.length)).join(' ') + '...';
            }

            // ======== البحث النصي المتقدم في جميع الإجابات ========
            function searchInAllAnswers(searchText) {
                const results = [];
                const searchWords = searchText.toLowerCase().split(/\s+/).filter(word => word.length > 1);
                
                if (searchWords.length === 0) return results;

                faq.forEach(surah => {
                    const ayahMatches = surah.a.match(/\d+\.\s*[^]*?(?=\d+\.|$)/g) || [];
                    
                    ayahMatches.forEach(ayahPart => {
                        const ayahText = ayahPart.toLowerCase();
                        let matchScore = 0;
                        let foundWords = [];
                        
                        searchWords.forEach(word => {
                            if (ayahText.includes(word)) {
                                matchScore += word.length;
                                foundWords.push(word);
                                
                                if (ayahText.indexOf(word) < 100) {
                                    matchScore += 10;
                                }
                            }
                        });
                        
                        if (matchScore > 0) {
                            const ayahMatch = ayahPart.match(/^(\d+)\./);
                            const ayahNumber = ayahMatch ? ayahMatch[1] : '1';
                            
                            const imageParts = extractImageParts(ayahPart);
                            const searchSnippets = extractTextAroundSearch(ayahPart, searchWords, 8);
                            
                            // استخراج النص الأساسي للآية (بدون رقم الآية)
                            const ayahContent = ayahPart.replace(/^\d+\.\s*/, '').trim();
                            
                            results.push({
                                q: `${surah.q} آية ${ayahNumber}`,
                                a: ayahPart.trim(),
                                surah: surah.q,
                                ayah: parseInt(ayahNumber),
                                score: matchScore,
                                matchedText: ayahPart.trim(),
                                searchWords: foundWords,
                                imageParts: imageParts,
                                searchSnippets: searchSnippets,
                                ayahContent: ayahContent // إضافة النص الأساسي للكشف عن التكرار
                            });
                        }
                    });
                });

                // تصفية النتائج المكررة بناءً على محتوى الآية
                const uniqueResults = [];
                const seenContents = new Set();
                
                results.sort((a, b) => b.score - a.score).forEach(result => {
                    // إنشاء مفتوح فريد بناءً على السورة والآية والمحتوى الأساسي
                    const contentKey = `${result.surah}-${result.ayah}-${result.ayahContent.substring(0, 50)}`;
                    
                    if (!seenContents.has(contentKey)) {
                        seenContents.add(contentKey);
                        uniqueResults.push(result);
                    }
                });

                return uniqueResults.slice(0, 6);
            }

            // ======== تحديث المقترحات مع البحث النصي المتقدم والمقتطفات ========
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
                ).slice(0, 2);

                filtered.push(...traditionalResults);

                // البحث النصي في المحتوى مع المقتطفات
                const textSearchResults = searchInAllAnswers(value);
                
                // إضافة النتائج النصية مع تجنب التكرار
                textSearchResults.forEach(result => {
                    // التحقق من عدم وجود نتيجة مكررة بناءً على نص الآية
                    const isDuplicate = filtered.some(item => 
                        item.q === result.q || 
                        (item.a && result.a && item.a.substring(0, 100) === result.a.substring(0, 100))
                    );
                    
                    if (!isDuplicate) {
                        filtered.push({
                            ...result,
                            isTextSearch: true
                        });
                    }
                });

                // إزالة التكرارات والحد إلى 6 نتائج فقط
                const seenTitles = new Set();
                filtered = filtered.filter(item => {
                    if (seenTitles.has(item.q)) {
                        return false;
                    }
                    seenTitles.add(item.q);
                    return true;
                }).slice(0, 6);

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
                        
                        if (item.isTextSearch || item.searchSnippets) {
                            const title = document.createElement('div');
                            title.textContent = item.q;
                            title.style.fontWeight = 'bold';
                            title.style.marginBottom = '6px';
                            title.style.textAlign = 'right';
                            title.style.color = '#1a365d';
                            
                            if (item.searchSnippets && item.searchSnippets.length > 0) {
                                // عرض المقتطفات الفريدة فقط
                                const uniqueSnippets = [];
                                const seenSnippets = new Set();
                                
                                item.searchSnippets.forEach(snippet => {
                                    const normalizedSnippet = snippet.substring(0, 80); // تقليل طول المقتطف للكشف عن التكرار
                                    if (!seenSnippets.has(normalizedSnippet)) {
                                        seenSnippets.add(normalizedSnippet);
                                        uniqueSnippets.push(snippet);
                                    }
                                });
                                
                                uniqueSnippets.slice(0, 2).forEach((snippet, snippetIndex) => {
                                    const snippetDiv = document.createElement('div');
                                    snippetDiv.style.fontSize = '0.8em';
                                    snippetDiv.style.color = '#2d3748';
                                    snippetDiv.style.marginBottom = '4px';
                                    snippetDiv.style.lineHeight = '1.4';
                                    snippetDiv.style.textAlign = 'right';
                                    snippetDiv.style.padding = '4px 8px';
                                    snippetDiv.style.backgroundColor = '#f7fafc';
                                    snippetDiv.style.borderRadius = '4px';
                                    snippetDiv.style.borderRight = '3px solid #4299e1';
                                    
                                    let highlightedSnippet = snippet;
                                    const searchWords = value.toLowerCase().split(/\s+/);
                                    searchWords.forEach(word => {
                                        if (word.length > 1) {
                                            const regex = new RegExp(`(${word})`, 'gi');
                                            highlightedSnippet = highlightedSnippet.replace(regex, '<mark style="background-color: #ffeb3b; padding: 1px 2px; border-radius: 2px;">$1</mark>');
                                        }
                                    });
                                    
                                    snippetDiv.innerHTML = highlightedSnippet;
                                    btn.appendChild(snippetDiv);
                                });
                            }
                            
                            const source = document.createElement('div');
                            source.textContent = `${item.surah.replace('تفسير ', '')} - آية ${item.ayah}`;
                            source.style.fontSize = '0.75em';
                            source.style.color = '#718096';
                            source.style.fontStyle = 'italic';
                            source.style.textAlign = 'right';
                            source.style.marginTop = '4px';
                            
                            if (item.imageParts && item.imageParts.length > 0) {
                                const imagesDiv = document.createElement('div');
                                imagesDiv.style.fontSize = '0.7em';
                                imagesDiv.style.color = '#d69e2e';
                                imagesDiv.style.marginTop = '4px';
                                imagesDiv.style.padding = '2px 6px';
                                imagesDiv.style.backgroundColor = '#fefcbf';
                                imagesDiv.style.borderRadius = '4px';
                                imagesDiv.textContent = `🖼️ ${item.imageParts.join('، ')}`;
                                imagesDiv.style.textAlign = 'right';
                                btn.appendChild(imagesDiv);
                            }
                            
                            btn.appendChild(title);
                            btn.appendChild(source);
                        } else {
                            btn.textContent = item.q;
                            btn.style.textAlign = 'right';
                        }
                        
                        if (index === 0) {
                            btn.style.backgroundColor = "rgb(219, 234, 254)";
                        } else {
                            btn.style.backgroundColor = "#f1f5f9";
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
            }

            // ======== تحديث خلفية الأزرار المختارة ========
            function updateSelectedSuggestion() {
                const buttons = suggestionsDiv.querySelectorAll('.suggestion-btn');
                buttons.forEach((btn, i) => {
                    if (i === selectedIndex) {
                        btn.style.backgroundColor = "rgb(219, 234, 254)";
                    } else {
                        btn.style.backgroundColor = "#f1f5f9";
                    }
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
                    console.log('البحث عن:', surahName, 'آية:', ayahNumber);

                    const surahItem = faq.find(item => {
                        const itemName = item.q.replace('تفسير ', '').trim();
                        const cleanSurahName = surahName.replace('سورة', '').replace('سوره', '').trim();
                        return itemName.includes(cleanSurahName) || cleanSurahName.includes(itemName) || item.q.includes(surahName);
                    });

                    if (!surahItem) {
                        return "❌ لم يتم العثور على السورة في قاعدة البيانات.";
                    }

                    console.log('تم العثور على السورة:', surahItem.q);

                    const exactMatch = dynamicSuggestions.find(suggestion => 
                        suggestion.surah === surahItem.q && suggestion.ayah === ayahNumber
                    );

                    if (exactMatch) {
                        console.log('تم العثور على الآية في الاقتراحات الديناميكية');
                        return exactMatch.a;
                    }

                    console.log('البحث في النص الأصلي للسورة...');
                    
                    const ayahRegex = new RegExp(`(${ayahNumber}\\.\\s*[^]*?)(?=\\d+\\.|$)`, 'g');
                    const ayahMatch = surahItem.a.match(ayahRegex);
                    
                    if (ayahMatch && ayahMatch[0]) {
                        console.log('تم العثور على الآية في النص الأصلي باستخدام regex محسن');
                        return ayahMatch[0].trim();
                    }

                    return `❌ لم يتم العثور على تفسير الآية ${ayahNumber} من ${surahItem.q}.`;
                }

                console.log('البحث النصي عن:', userText);
                const textSearchResults = searchInAllAnswers(userText);
                
                if (textSearchResults.length > 0) {
                    let resultText = `🔍 نتائج البحث عن: "${userText}"\n\n`;
                    
                    // استخدام Set لمنع تكرار النتائج
                    const seenResults = new Set();
                    
                    textSearchResults.forEach((result, index) => {
                        // إنشاء مفتاح فريد للنتيجة
                        const resultKey = `${result.surah}-${result.ayah}-${result.matchedText.substring(0, 50)}`;
                        
                        if (!seenResults.has(resultKey)) {
                            seenResults.add(resultKey);
                            resultText += `${index + 1}. ${result.q}:\n`;
                            
                            if (result.searchSnippets && result.searchSnippets.length > 0) {
                                const uniqueSnippets = new Set();
                                result.searchSnippets.forEach(snippet => {
                                    const normalizedSnippet = snippet.substring(0, 80);
                                    if (!uniqueSnippets.has(normalizedSnippet)) {
                                        uniqueSnippets.add(normalizedSnippet);
                                        resultText += `   • ${snippet}\n`;
                                    }
                                });
                            } else {
                                resultText += `${result.matchedText}\n`;
                            }
                            resultText += `\n`;
                        }
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
            
            // بدء التحميل البطيء للاقتراحات في الخلفية بعد تحميل الصفحة
            setTimeout(() => {
                generateAyahSuggestionsLazy();
            }, 1000);
        };
