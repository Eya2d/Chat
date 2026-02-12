window.onload = () => {
    const messagesDiv = document.getElementById('messages');
    const searchInput = document.getElementById('searchInput');
    const suggestionsDiv = document.getElementById('suggestions');
    const newChatBtn = document.getElementById('newChatBtn');
    const shareBtn = document.getElementById('shareBtn');
    const scrollToBottomBtn = document.getElementById('scrollToBottomBtn');
    const spinner = document.getElementById('spinner');
    const messagePreviewModal = document.getElementById('messagePreviewModal');
    const closePreviewBtn = document.getElementById('closePreviewBtn');
    const previewContent = document.getElementById('messagePreviewContent');
    
    let selectedIndex = 0;
    let isNavigatingWithArrows = false;
    let dynamicSuggestions = [];
    let suggestionsGenerated = false;
    let isScrollingEnabled = true;
    let currentTypingMessage = null;
    let hasPendingMessages = false;
    let isProcessingQuestion = false;
    let typingInProgress = false;

    // ثوابت التحديثات
    const LONG_MESSAGE_THRESHOLD = 600;
    const LONG_MESSAGE_LINES_THRESHOLD = 25;

    // ======== دالة التمرير التلقائي عند ظهور suggestions-container ========
    function scrollToMessagesWhenSuggestionsAppear() {
        // مراقبة إضافة أي عنصر suggestions-container جديد
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === 1 && node.classList.contains('suggestions-container')) {
                        // التمرير إلى messages div
                        messagesDiv.scrollTo({
                            top: messagesDiv.scrollHeight,
                            behavior: 'smooth'
                        });
                        
                        // تأكيد التمرير بعد فترة قصيرة للتأكد من اكتمال التحميل
                        setTimeout(() => {
                            messagesDiv.scrollTo({
                                top: messagesDiv.scrollHeight,
                                behavior: 'smooth'
                            });
                        }, 100);
                        
                        setTimeout(() => {
                            messagesDiv.scrollTo({
                                top: messagesDiv.scrollHeight,
                                behavior: 'smooth'
                            });
                        }, 300);
                    }
                });
            });
        });

        // بدء المراقبة
        observer.observe(messagesDiv, {
            childList: true,
            subtree: true
        });
    }

    // قائمة الرسائل الترحيبية المختلفة
    const welcomeMessages = [
        "مرحباً! كيف يمكنني مساعدتك اليوم؟",
        "أهلاً وسهلاً! أنا هنا لمساعدتك في تفسير القرآن الكريم، ماذا تريد أن تعرف؟",
        "السلام عليكم! مستعد للإجابة على أسئلتك حول تفسير القرآن، تفضل بسؤالك.",
        "مرحباً بك في مساعد تفسير القرآن! أرجو كتابة سؤالك وسأجيبك بإذن الله.",
        "أهلاً بك! أنا مساعدك في تفسير آيات القرآن الكريم، اسألني عن أي سورة أو آية.",
        "السلام عليكم ورحمة الله وبركاته! كيف يمكنني خدمتك في تفسير القرآن اليوم؟"
    ];

    // دالة للحصول على رسالة ترحيبية عشوائية
    function getRandomWelcomeMessage() {
        const randomIndex = Math.floor(Math.random() * welcomeMessages.length);
        return welcomeMessages[randomIndex];
    }

    // دالة إظهار/إخفاء spinner
    function showSpinner() {
        spinner.style.display = 'flex';
        searchInput.disabled = true;
        searchInput.placeholder = 'جاري المعالجة...';
        isProcessingQuestion = true;
    }

    function hideSpinner() {
        spinner.style.display = 'none';
        searchInput.disabled = false;
        searchInput.placeholder = 'اكتب سؤالك هنا...';
        isProcessingQuestion = false;
        typingInProgress = false;
    }

    // دالة تغيير أيقونة النسخ
    function changeCopyIcon(copyBtn) {
        const icon = copyBtn.querySelector('ion-icon');
        const originalIcon = icon.getAttribute('name');
        
        icon.setAttribute('name', 'checkmark-outline');
        
        setTimeout(() => {
            icon.setAttribute('name', originalIcon);
        }, 1000);
    }

    // دالة تبديل طول الرسالة
    function toggleMessageHeight(txtBtn) {
        const wrapper = txtBtn.closest('.bot-message-wrapper');
        const message = wrapper.querySelector('.message');
        const icon = txtBtn.querySelector('ion-icon');
        const textSpan = txtBtn.querySelector('.btn-text');
        
        if (message.classList.contains('collapsed')) {
            message.classList.remove('collapsed');
            message.classList.remove('Wave-cloud');
            message.style.maxHeight = 'none';
            icon.setAttribute('name', 'reorder-three-outline');
            textSpan.textContent = 'Short';
        } else {
            message.classList.add('collapsed');
            const currentHeight = message.scrollHeight;
            message.style.maxHeight = (currentHeight * 0.6) + 'px';
            icon.setAttribute('name', 'reorder-four-outline');
            textSpan.textContent = 'Long';
        }
    }

    // تطبيق الوضع الافتراضي (Short) على الرسالة
    function applyDefaultShortState(messageElement, txtBtn) {
        if (messageElement && txtBtn) {
            messageElement.classList.add('collapsed');
            const currentHeight = messageElement.scrollHeight;
            messageElement.style.maxHeight = (currentHeight * 0.6) + 'px';
            
            const icon = txtBtn.querySelector('ion-icon');
            const textSpan = txtBtn.querySelector('.btn-text');
            icon.setAttribute('name', 'reorder-four-outline');
            textSpan.textContent = 'Long';
        }
    }

    // إعادة ربط أحداث الرسائل المحفوظة
    function rebindMessageEventsForWrapper(wrapper) {
        const message = wrapper.querySelector('.message');
        const copyBtn = wrapper.querySelector('.copy-btn');
        const shareBtn = wrapper.querySelector('.share-btn');
        const txtBtn = wrapper.querySelector('.txt-btn');
        
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                const text = message.textContent || message.innerText;
                navigator.clipboard.writeText(text).then(() => {
                    changeCopyIcon(copyBtn);
                }).catch(err => {
                    console.error('فشل النسخ:', err);
                });
            });
        }
        
        if (shareBtn) {
            shareBtn.addEventListener('click', () => {
                const text = message.textContent || message.innerText;
                if (navigator.share) {
                    navigator.share({
                        title: 'تفسير القرآن الكريم',
                        text: text,
                        url: window.location.href
                    }).catch(err => {
                        console.error('فشل المشاركة:', err);
                    });
                } else {
                    navigator.clipboard.writeText(text).then(() => {
                        console.log('تم نسخ النص للمشاركة');
                    });
                }
            });
        }
        
        if (txtBtn) {
            txtBtn.addEventListener('click', () => {
                toggleMessageHeight(txtBtn);
            });
        }
    }

    // تحديث زر txt-btn للرسائل المحفوظة بناءً على طول النص
    function updateTxtBtnForSavedMessages(wrapper) {
        const message = wrapper.querySelector('.message');
        const txtBtn = wrapper.querySelector('.txt-btn');
        const chatDiv = wrapper.querySelector('.chat-div');
        
        if (message && txtBtn && chatDiv) {
            const messageText = message.textContent || message.innerText;
            const textLength = messageText.length;
            
            const lineHeight = parseInt(getComputedStyle(message).lineHeight) || 20;
            const messageHeight = message.scrollHeight;
            const numberOfLines = Math.round(messageHeight / lineHeight);
            
            if (textLength > LONG_MESSAGE_THRESHOLD || numberOfLines >= LONG_MESSAGE_LINES_THRESHOLD) {
                txtBtn.style.display = 'flex';
                applyDefaultShortState(message, txtBtn);
            } else {
                txtBtn.style.display = 'none';
            }
            
            if (!welcomeMessages.some(msg => messageText.includes(msg))) {
                chatDiv.classList.add('show');
            }
        }
    }

    // إعادة ربط أحداث النسخ والمشاركة للرسائل المحفوظة
    function rebindMessageEvents() {
        document.querySelectorAll('.bot-message-wrapper').forEach(wrapper => {
            const message = wrapper.querySelector('.message');
            const chatDiv = wrapper.querySelector('.chat-div');
            const txtBtn = wrapper.querySelector('.txt-btn');
            
            if (message && chatDiv && !welcomeMessages.some(msg => message.textContent.includes(msg))) {
                chatDiv.classList.add('show');
                
                rebindMessageEventsForWrapper(wrapper);
                
                updateTxtBtnForSavedMessages(wrapper);
            }
        });
    }

    // معاينة الرسالة الطويلة
    function showMessagePreview(messageElement) {
        const messageContent = messageElement.textContent || messageElement.innerText;
        
        previewContent.textContent = messageContent;
        
        messagePreviewModal.style.display = 'flex';
        
        document.body.classList.add('joo');
        
        document.body.style.overflow = 'hidden';
    }
    
    function closeMessagePreview() {
        messagePreviewModal.style.display = 'none';
        document.body.classList.remove('joo');
        document.body.style.overflow = '';
    }

    // إضافة أحداث إغلاق المودال
    function setupPreviewModalEvents() {
        closePreviewBtn.addEventListener('click', closeMessagePreview);
        
        messagePreviewModal.addEventListener('click', function(e) {
            if (e.target === messagePreviewModal) {
                closeMessagePreview();
            }
        });
        
        document.addEventListener('keydown', function closeOnEsc(e) {
            if (e.key === 'Escape' && messagePreviewModal.style.display === 'flex') {
                closeMessagePreview();
            }
        });
    }

    // التحكم في زر النزول لأسفل
    function toggleScrollButton() {
        const scrollBottom = messagesDiv.scrollHeight - messagesDiv.scrollTop - messagesDiv.clientHeight;
        const isScrollable = messagesDiv.scrollHeight > messagesDiv.clientHeight;
        
        if (scrollBottom > 100 && isScrollable) {
            scrollToBottomBtn.classList.add('show');
        } else {
            scrollToBottomBtn.classList.remove('show');
        }
    }
    
    messagesDiv.addEventListener('scroll', toggleScrollButton);
    
    scrollToBottomBtn.addEventListener('click', () => {
        messagesDiv.scrollTo({
            top: messagesDiv.scrollHeight,
            behavior: 'smooth'
        });
    });

    // تمكين/تعطيل التمرير التلقائي أثناء الكتابة
    function enableAutoScroll() {
        isScrollingEnabled = true;
    }

    function disableAutoScroll() {
        isScrollingEnabled = false;
    }

    messagesDiv.addEventListener('wheel', () => {
        disableAutoScroll();
        clearTimeout(window.scrollTimeout);
        window.scrollTimeout = setTimeout(() => {
            enableAutoScroll();
        }, 1000);
    });

    messagesDiv.addEventListener('touchmove', () => {
        disableAutoScroll();
        clearTimeout(window.scrollTimeout);
        window.scrollTimeout = setTimeout(() => {
            enableAutoScroll();
        }, 1000);
    });

    function scrollToBottom() {
        if (isScrollingEnabled) {
            messagesDiv.scrollTo({
                top: messagesDiv.scrollHeight,
                behavior: 'smooth'
            });
        }
    }

    function scrollToBottomImmediate() {
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
    
    // زر مشاركة الرابط
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

    // استخراج أجزاء الصور من الأقواس
    function extractImageParts(text) {
        const imagePattern = /\(([^)]+)\)/g;
        const matches = [];
        let match;
        
        while ((match = imagePattern.exec(text)) !== null) {
            matches.push(match[1]);
        }
        
        return matches;
    }

    // استخراج النص حول كلمات البحث
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
                    
                    if (!results.some(item => item.includes(snippet))) {
                        results.push(snippet);
                    }
                }
            }
        });
        
        return results.slice(0, 3);
    }

    // توليد اقتراحات ديناميكية لكل سورة وآياتها - عند الحاجة فقط
    function generateAyahSuggestionsLazy() {
        if (suggestionsGenerated) return;
        
        dynamicSuggestions = [];
        
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

    // تحميل الرسائل المحفوظة مع تطبيق الوضع الافتراضي (Short)
    function loadMessages() {
        const saved = localStorage.getItem('chatMessages');
        if (saved) {
            messagesDiv.innerHTML = saved;
            
            setTimeout(() => {
                scrollToBottomImmediate();
            }, 50);
            setTimeout(() => {
                scrollToBottomImmediate();
            }, 200);
            setTimeout(toggleScrollButton, 100);
            
            setTimeout(() => {
                document.querySelectorAll('.bot-message-wrapper').forEach(wrapper => {
                    const message = wrapper.querySelector('.message');
                    const chatDiv = wrapper.querySelector('.chat-div');
                    const txtBtn = wrapper.querySelector('.txt-btn');
                    
                    if (message && chatDiv && !welcomeMessages.some(msg => message.textContent.includes(msg))) {
                        chatDiv.classList.add('show');
                        
                        rebindMessageEventsForWrapper(wrapper);
                        
                        const messageText = message.textContent || message.innerText;
                        const textLength = messageText.length;
                        
                        const lineHeight = parseInt(getComputedStyle(message).lineHeight) || 20;
                        const messageHeight = message.scrollHeight;
                        const numberOfLines = Math.round(messageHeight / lineHeight);
                        
                        if (txtBtn) {
                            if (textLength > LONG_MESSAGE_THRESHOLD || numberOfLines >= LONG_MESSAGE_LINES_THRESHOLD) {
                                txtBtn.style.display = 'flex';
                                applyDefaultShortState(message, txtBtn);
                            } else {
                                txtBtn.style.display = 'none';
                            }
                        }
                    }
                });
                
                document.querySelectorAll('.bot-message-wrapper').forEach(wrapper => {
                    const message = wrapper.querySelector('.message');
                    const chatDiv = wrapper.querySelector('.chat-div');
                    const existingTxtBtn = wrapper.querySelector('.txt-btn');
                    
                    if (message && chatDiv && !existingTxtBtn && !welcomeMessages.some(msg => message.textContent.includes(msg))) {
                        const messageText = message.textContent || message.innerText;
                        const textLength = messageText.length;
                        
                        const lineHeight = parseInt(getComputedStyle(message).lineHeight) || 20;
                        const messageHeight = message.scrollHeight;
                        const numberOfLines = Math.round(messageHeight / lineHeight);
                        
                        if (textLength > LONG_MESSAGE_THRESHOLD || numberOfLines >= LONG_MESSAGE_LINES_THRESHOLD) {
                            const txtBtn = document.createElement('button');
                            txtBtn.className = 'txt-btn';
                            txtBtn.innerHTML = '<ion-icon name="reorder-four-outline"></ion-icon><span class="btn-text">Long</span>';
                            
                            const copyBtn = wrapper.querySelector('.copy-btn');
                            if (copyBtn) {
                                copyBtn.parentNode.insertBefore(txtBtn, copyBtn);
                            } else {
                                chatDiv.appendChild(txtBtn);
                            }
                            
                            applyDefaultShortState(message, txtBtn);
                            
                            rebindMessageEventsForWrapper(wrapper);
                        }
                    }
                });

                document.querySelectorAll('.suggestions-container').forEach(container => {
                    const wrapper = container.closest('.bot-message-wrapper');
                    if (wrapper) {
                        const suggestionButtons = container.querySelectorAll('.suggestion-button');
                        suggestionButtons.forEach(button => {
                            const newButton = button.cloneNode(true);
                            button.parentNode.replaceChild(newButton, button);
                            
                            newButton.addEventListener('click', (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const suggestionText = newButton.textContent;
                                
                                const matchingSuggestion = faq.find(item => item.q === suggestionText);
                                if (matchingSuggestion) {
                                    if (container.parentNode) {
                                        container.remove();
                                        saveMessages();
                                    }
                                    handleQuestion(matchingSuggestion);
                                }
                            });
                        });
                        
                        const closeBtn = container.querySelector('.closeBtn');
                        if (closeBtn) {
                            const newCloseBtn = closeBtn.cloneNode(true);
                            closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
                            
                            newCloseBtn.addEventListener('click', (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (container.parentNode) {
                                    container.remove();
                                    saveMessages();
                                }
                            });
                        }
                    }
                });
                
            }, 100);
        }
    }

    // حفظ الرسائل
    function saveMessages() {
        localStorage.setItem('chatMessages', messagesDiv.innerHTML);
    }

    // إخفاء جميع صناديق الاقتراحات
    function hideAllSuggestionsContainers() {
        document.querySelectorAll('.suggestions-container').forEach(container => {
            container.remove();
        });
        saveMessages();
    }

    // معالجة النص واستبدال علامات الصور
    function processTextWithImages(text) {
        if (text.includes('<img')) {
            return text.replace(/<img src="([^"]+)"\s*(\/)?>/g, (match, src) => {
                return `<div class="message-image-container">
                    <img src="${src}" alt="صورة توضيحية" class="message-image" loading="lazy">
                    <div class="image-loading">جاري تحميل الصورة...</div>
                </div>`;
            });
        }
        return text;
    }

    // إضافة رسالة مع دعم الصور
    function addMessage(text, sender, isNew = true) {
        const msg = document.createElement('div');
        msg.classList.add('message', sender);
        if (isNew) msg.classList.add('new');
        
        const processedText = processTextWithImages(text);
        
        if (processedText.includes('<img') || processedText.includes('message-image-container')) {
            msg.innerHTML = processedText;
            
            const images = msg.querySelectorAll('.message-image');
            images.forEach(img => {
                img.addEventListener('load', () => {
                    const container = img.closest('.message-image-container');
                    const loading = container.querySelector('.image-loading');
                    if (loading) {
                        loading.style.display = 'none';
                    }
                    img.style.display = 'block';
                    setTimeout(toggleScrollButton, 100);
                });
                
                img.addEventListener('error', () => {
                    const container = img.closest('.message-image-container');
                    const loading = container.querySelector('.image-loading');
                    if (loading) {
                        loading.textContent = 'فشل تحميل الصورة';
                        loading.style.color = '#e53e3e';
                    }
                });
            });
        } else {
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
                        imageSpan.style.color = 'rgb(120, 126, 232)';
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
        }
        
        messagesDiv.appendChild(msg);
        scrollToBottom();
        saveMessages();
        
        setTimeout(toggleScrollButton, 100);
        return msg;
    }

    // إنشاء HTML للرسالة بناءً على نوعها
    function createMessageHTML(isWelcomeMessage, hasMultipleParts) {
        if (isWelcomeMessage) {
            return `<div class="bot-message-wrapper"><div class="message bot new typing-message"></div></div>`;
        } else {
            if (hasMultipleParts) {
                return `<div class="bot-message-wrapper">
                    <div class="message bot new typing-message"></div>
                    <div class="chat-div Wave-all">
                        <button class="txt-btn"><ion-icon name="reorder-three-outline"></ion-icon><span class="btn-text">Short</span></button>
                        <button class="copy-btn"><ion-icon name="copy-outline"></ion-icon></button>
                        <button class="share-btn"><ion-icon name="share-social-outline"></ion-icon></button>
                    </div>
                </div>`;
            } else {
                return `<div class="bot-message-wrapper">
                    <div class="message bot new typing-message"></div>
                    <div class="chat-div Wave-all">
                        <button class="copy-btn"><ion-icon name="copy-outline"></ion-icon></button>
                        <button class="share-btn"><ion-icon name="share-social-outline"></ion-icon></button>
                    </div>
                </div>`;
            }
        }
    }

    // إنشاء ديف الاقتراحات مع 6 أزرار
    function createSuggestionsDiv(messageWrapper) {
        const randomSuggestions = [...faq]
            .sort(() => Math.random() - 0.5)
            .slice(0, 6);
        
        const suggestionsContainer = document.createElement('div');
        suggestionsContainer.className = 'suggestions-container Wave-all';
        
        const title = document.createElement('div');
        suggestionsContainer.appendChild(title);
        
        const buttonRow = document.createElement('div');
        buttonRow.style.display = 'flex';
        buttonRow.style.flexWrap = 'wrap';
        buttonRow.style.gap = '10px';
        buttonRow.style.justifyContent = 'flex-start';
        
        randomSuggestions.forEach(suggestion => {
            const suggestionBtn = document.createElement('button');
            suggestionBtn.className = 'suggestion-button';
            suggestionBtn.textContent = suggestion.q;
            
            suggestionBtn.addEventListener('click', () => {
                if (suggestionsContainer.parentNode) {
                    suggestionsContainer.remove();
                    saveMessages();
                }
                
                handleQuestion(suggestion);
            });
            
            buttonRow.appendChild(suggestionBtn);
        });
        
        suggestionsContainer.appendChild(buttonRow);
        
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '×';
        closeBtn.className = "closeBtn";
        
        closeBtn.addEventListener('click', () => {
            if (suggestionsContainer.parentNode) {
                suggestionsContainer.remove();
                saveMessages();
            }
        });
        
        suggestionsContainer.appendChild(closeBtn);
        
        messageWrapper.appendChild(suggestionsContainer);
        
        saveMessages();
        
        return suggestionsContainer;
    }

    // إضافة رسالة البوت مع تأثير الكتابة حرفًا حرفًا
    function addBotMessageWithTyping(text, isNew = true, isFirstChunk = false, onComplete = null, hasMoreParts = false, showSuggestions = false) {
        const isWelcomeMessage = welcomeMessages.some(msg => text.includes(msg));
        
        const hasMultipleParts = text.length > LONG_MESSAGE_THRESHOLD;
        
        const msgHTML = createMessageHTML(isWelcomeMessage, hasMultipleParts);
                    
        const wrapper = document.createElement('div');
        wrapper.innerHTML = msgHTML.trim();
                    
        const msg = wrapper.querySelector('.message');
        const chatDiv = wrapper.querySelector('.chat-div');
        const txtBtn = wrapper.querySelector('.txt-btn');
                    
        messagesDiv.appendChild(wrapper);
        scrollToBottom();
                    
        if (!isNew) {
            const processedText = processTextWithImages(text);
        
            if (processedText.includes('<img') || processedText.includes('message-image-container')) {
                msg.innerHTML = processedText;
            
                const images = msg.querySelectorAll('.message-image');
                images.forEach(img => {
                    img.addEventListener('load', () => {
                        const container = img.closest('.message-image-container');
                        const loading = container.querySelector('.image-loading');
                        if (loading) loading.style.display = 'none';
                    
                        img.style.display = 'block';
                        setTimeout(toggleScrollButton, 100);
                    });
                
                    img.addEventListener('error', () => {
                        const container = img.closest('.message-image-container');
                        const loading = container.querySelector('.image-loading');
                        if (loading) {
                            loading.textContent = 'فشل تحميل الصورة';
                            loading.style.color = '#e53e3e';
                        }
                    });
                });
            } else {
                const imageParts = extractImageParts(text);
            
                if (imageParts.length > 0) {
                    const textContainer = document.createElement('div');
                    textContainer.style.whiteSpace = 'pre-wrap';
                
                    const parts = text.split(/\(([^)]+)\)/);
                
                    parts.forEach((part, index) => {
                        if (index % 2 === 0) {
                            if (part.trim()) textContainer.appendChild(document.createTextNode(part));
                        } else {
                            const imageSpan = document.createElement('span');
                            imageSpan.textContent = `(${part})`;
                            imageSpan.className = "image-tag";
                            imageSpan.style.color = 'rgb(120, 126, 232)';
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
            }
        
            if (chatDiv && !isWelcomeMessage) {
                chatDiv.classList.add('show');
                
                const copyBtn = wrapper.querySelector('.copy-btn');
                const shareBtn = wrapper.querySelector('.share-btn');
                
                if (copyBtn) {
                    copyBtn.addEventListener('click', () => {
                        navigator.clipboard.writeText(text).then(() => {
                            changeCopyIcon(copyBtn);
                        });
                    });
                }
                
                if (shareBtn) {
                    shareBtn.addEventListener('click', () => {
                        if (navigator.share) {
                            navigator.share({
                                title: 'تفسير القرآن الكريم',
                                text: text,
                                url: window.location.href
                            });
                        } else {
                            navigator.clipboard.writeText(text).then(() => {
                                console.log('تم نسخ النص للمشاركة');
                            });
                        }
                    });
                }
                
                if (txtBtn) {
                    txtBtn.addEventListener('click', () => {
                        toggleMessageHeight(txtBtn);
                    });
                    
                    const lineHeight = parseInt(getComputedStyle(msg).lineHeight) || 20;
                    const messageHeight = msg.scrollHeight;
                    const numberOfLines = Math.round(messageHeight / lineHeight);
                    const textLength = text.length;
                    
                    if (textLength > LONG_MESSAGE_THRESHOLD || numberOfLines >= LONG_MESSAGE_LINES_THRESHOLD) {
                        applyDefaultShortState(msg, txtBtn);
                        txtBtn.style.display = 'flex';
                    } else {
                        txtBtn.style.display = 'none';
                    }
                }
            }
            
            saveMessages();
            if (onComplete) onComplete();
            return msg;
        }
    
        let currentIndex = 0;
        const typingSpeed = 20;
        let spinnerShown = false;
    
        let isInsideParentheses = false;
        let currentParenthesesContent = '';
    
        let isInsideImageTag = false;
        let currentImageTag = '';
    
        function typeCharacter() {
            if (currentIndex < text.length) {
                const currentChar = text[currentIndex];
            
                if (!spinnerShown && typingInProgress) {
                    showSpinner();
                    spinnerShown = true;
                }
            
                if (currentChar === '<' && text.substring(currentIndex, currentIndex + 4).toLowerCase() === '<img') {
                    isInsideImageTag = true;
                    currentImageTag = '';
                }
            
                if (isInsideImageTag) {
                    currentImageTag += currentChar;
                
                    if (currentChar === '>') {
                        isInsideImageTag = false;
                    
                        const processedImage = processTextWithImages(currentImageTag);
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = processedImage;
                    
                        while (tempDiv.firstChild) msg.appendChild(tempDiv.firstChild);
                    
                        const images = msg.querySelectorAll('.message-image');
                        images.forEach(img => {
                            img.addEventListener('load', () => {
                                const container = img.closest('.message-image-container');
                                const loading = container.querySelector('.image-loading');
                                if (loading) loading.style.display = 'none';
                            
                                img.style.display = 'block';
                                setTimeout(toggleScrollButton, 100);
                            });
                        
                            img.addEventListener('error', () => {
                                const container = img.closest('.message-image-container');
                                const loading = container.querySelector('.image-loading');
                                if (loading) {
                                    loading.textContent = 'فشل تحميل الصورة';
                                    loading.style.color = '#e53e3e';
                                }
                            });
                        });
                    
                        currentImageTag = '';
                    }
                }
            
                else if (!isInsideImageTag) {
                    if (currentChar === '(') {
                        isInsideParentheses = true;
                        currentParenthesesContent = '';
                    }
                
                    if (isInsideParentheses) {
                        currentParenthesesContent += currentChar;
                    
                        if (currentChar === ')') {
                            isInsideParentheses = false;
                        
                            const imageSpan = document.createElement('span');
                            imageSpan.textContent = currentParenthesesContent;
                            imageSpan.style.color = 'rgb(120, 126, 232)';
                            imageSpan.style.fontWeight = 'bold';
                            imageSpan.style.backgroundColor = '#fff';
                            imageSpan.style.padding = '2px 6px';
                            imageSpan.style.borderRadius = '4px';
                            imageSpan.style.margin = '0 2px';
                            imageSpan.style.fontSize = '0.9em';
                        
                            msg.appendChild(imageSpan);
                            currentParenthesesContent = '';
                        }
                    } else {
                        if (currentChar !== ')') msg.appendChild(document.createTextNode(currentChar));
                    }
                }
            
                currentIndex++;
                scrollToBottom();
                setTimeout(typeCharacter, typingSpeed);
            
            } else {
                saveMessages();
                setTimeout(toggleScrollButton, 100);
                
                if (spinnerShown) {
                    hideSpinner();
                }
                
                if (!isWelcomeMessage && chatDiv) {
                    if (!hasMoreParts) {
                        chatDiv.classList.add('show');
                        
                        const lineHeight = parseInt(getComputedStyle(msg).lineHeight) || 20;
                        const messageHeight = msg.scrollHeight;
                        const numberOfLines = Math.round(messageHeight / lineHeight);
                        const textLength = text.length;
                        
                        if (hasMultipleParts && (textLength > LONG_MESSAGE_THRESHOLD || numberOfLines >= LONG_MESSAGE_LINES_THRESHOLD)) {
                            applyDefaultShortState(msg, txtBtn);
                        } else {
                            if (txtBtn) {
                                txtBtn.style.display = 'none';
                            }
                        }
                    }
                    
                    const copyBtn = wrapper.querySelector('.copy-btn');
                    const shareBtn = wrapper.querySelector('.share-btn');
                    
                    if (copyBtn) {
                        copyBtn.addEventListener('click', () => {
                            navigator.clipboard.writeText(text).then(() => {
                                changeCopyIcon(copyBtn);
                            });
                        });
                    }
                    
                    if (shareBtn) {
                        shareBtn.addEventListener('click', () => {
                            if (navigator.share) {
                                navigator.share({
                                    title: 'تفسير القرآن الكريم',
                                    text: text,
                                    url: window.location.href
                                });
                            } else {
                                navigator.clipboard.writeText(text).then(() => {
                                    console.log('تم نسخ النص للمشاركة');
                                });
                            }
                        });
                    }
                    
                    if (txtBtn) {
                        txtBtn.addEventListener('click', () => {
                            toggleMessageHeight(txtBtn);
                        });
                    }
                    
                    if (showSuggestions && !hasMoreParts) {
                        setTimeout(() => {
                            createSuggestionsDiv(wrapper);
                        }, 500);
                    }
                }
                
                if (onComplete) onComplete();
            }
        }
    
        typingInProgress = true;
        setTimeout(typeCharacter, 100);
        return msg;
    }

    // مؤشر الكتابة
    function showTypingIndicator() {
        const indicator = document.createElement('div');
        indicator.classList.add('typing-indicator');
        indicator.innerHTML = '<span></span><span></span><span></span>';
        messagesDiv.appendChild(indicator);
        scrollToBottom();
        
        setTimeout(toggleScrollButton, 100);
        return indicator;
    }

    // تقسيم النص
    function splitTextIntoChunks(text, size = 220) {
        let chunks = [];
        for (let i = 0; i < text.length; i += size) {
            chunks.push(text.substr(i, size));
        }
        return chunks;
    }

    // إنشاء زر جلب المزيد
    function createMoreButton(onClick) {
        const buttonDiv = document.createElement("div");
        buttonDiv.style.margin = "14px 0 24px 0";
        buttonDiv.style.textAlign = "left";

        const moreBtn = document.createElement("button");
        moreBtn.textContent = "جلب المزيد";
        moreBtn.className = "more-btn Wave-cloud";

        moreBtn.onclick = () => {
            if (buttonDiv.parentElement) {
                buttonDiv.remove();
            }
            onClick();
        };

        buttonDiv.appendChild(moreBtn);
        messagesDiv.appendChild(buttonDiv);
        scrollToBottom();
        
        setTimeout(toggleScrollButton, 100);
        
        return buttonDiv;
    }

    // عرض الإجابة الطويلة مع دعم الصور وتأثير الكتابة
    function showLongAnswer(answerText) {
        const chunks = splitTextIntoChunks(answerText, 220);
        let currentIndex = 0;
        let buttonDiv = null;
        let currentMessage = null;
        let currentWrapper = null;

        function showNextChunk() {
            if (currentIndex < chunks.length) {
                const isFirstChunk = (currentIndex === 0);
                const hasMoreParts = (currentIndex < chunks.length - 1);
                
                if (isFirstChunk) {
                    currentMessage = addBotMessageWithTyping(chunks[currentIndex], true, isFirstChunk, () => {
                        currentIndex++;
                        
                        if (currentIndex < chunks.length) {
                            setTimeout(() => {
                                buttonDiv = createMoreButton(showNextChunk);
                            }, 300);
                        } else {
                            if (currentWrapper) {
                                const chatDiv = currentWrapper.querySelector('.chat-div');
                                if (chatDiv) {
                                    chatDiv.classList.add('show');
                                }
                            }
                            saveMessages();
                        }
                    }, hasMoreParts);
                    
                    currentWrapper = currentMessage.closest('.bot-message-wrapper');
                } else {
                    const textToAdd = chunks[currentIndex];
                    const hasMoreParts = (currentIndex < chunks.length - 1);
                    
                    addTextToExistingMessage(currentMessage, textToAdd, () => {
                        currentIndex++;
                        
                        if (currentIndex < chunks.length) {
                            setTimeout(() => {
                                buttonDiv = createMoreButton(showNextChunk);
                            }, 300);
                        } else {
                            if (currentWrapper) {
                                const chatDiv = currentWrapper.querySelector('.chat-div');
                                if (chatDiv) {
                                    chatDiv.classList.add('show');
                                }
                            }
                            saveMessages();
                        }
                    }, hasMoreParts);
                }
            }
        }

        showNextChunk();
    }

    // إضافة نص إلى رسالة موجودة
    function addTextToExistingMessage(messageElement, text, onComplete = null, hasMoreParts = false) {
        let currentIndex = 0;
        const typingSpeed = 20;
        let spinnerShown = false;
        let isInsideParentheses = false;
        let currentParenthesesContent = '';
        let isInsideImageTag = false;
        let currentImageTag = '';
        
        function typeCharacter() {
            if (currentIndex < text.length) {
                const currentChar = text[currentIndex];
                
                if (!spinnerShown && typingInProgress) {
                    showSpinner();
                    spinnerShown = true;
                }
                
                if (currentChar === '<' && text.substring(currentIndex, currentIndex + 4).toLowerCase() === '<img') {
                    isInsideImageTag = true;
                    currentImageTag = '';
                }
                
                if (isInsideImageTag) {
                    currentImageTag += currentChar;
                    
                    if (currentChar === '>') {
                        isInsideImageTag = false;
                        
                        const processedImage = processTextWithImages(currentImageTag);
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = processedImage;
                        
                        while (tempDiv.firstChild) {
                            messageElement.appendChild(tempDiv.firstChild);
                        }
                        
                        const images = messageElement.querySelectorAll('.message-image');
                        images.forEach(img => {
                            img.addEventListener('load', () => {
                                const container = img.closest('.message-image-container');
                                const loading = container.querySelector('.image-loading');
                                if (loading) {
                                    loading.style.display = 'none';
                                }
                                img.style.display = 'block';
                                setTimeout(toggleScrollButton, 100);
                            });
                            
                            img.addEventListener('error', () => {
                                const container = img.closest('.message-image-container');
                                const loading = container.querySelector('.image-loading');
                                if (loading) {
                                    loading.textContent = 'فشل تحميل الصورة';
                                    loading.style.color = '#e53e3e';
                                }
                            });
                        });
                        
                        currentImageTag = '';
                    }
                } else if (!isInsideImageTag) {
                    if (currentChar === '(') {
                        isInsideParentheses = true;
                        currentParenthesesContent = '';
                    }
                    
                    if (isInsideParentheses) {
                        currentParenthesesContent += currentChar;
                        
                        if (currentChar === ')') {
                            isInsideParentheses = false;
                            
                            const imageSpan = document.createElement('span');
                            imageSpan.textContent = currentParenthesesContent;
                            imageSpan.style.color = 'rgb(120, 126, 232)';
                            imageSpan.style.fontWeight = 'bold';
                            imageSpan.style.backgroundColor = '#fff';
                            imageSpan.style.padding = '2px 6px';
                            imageSpan.style.borderRadius = '4px';
                            imageSpan.style.margin = '0 2px';
                            imageSpan.style.fontSize = '0.9em';
                            
                            messageElement.appendChild(imageSpan);
                            currentParenthesesContent = '';
                        }
                    } else {
                        if (currentChar !== ')') {
                            const textNode = document.createTextNode(currentChar);
                            messageElement.appendChild(textNode);
                        }
                    }
                }
                
                currentIndex++;
                
                scrollToBottom();
                
                setTimeout(typeCharacter, typingSpeed);
            } else {
                saveMessages();
                
                setTimeout(toggleScrollButton, 100);
                
                if (spinnerShown) {
                    hideSpinner();
                }
                
                if (!hasMoreParts) {
                    const wrapper = messageElement.closest('.bot-message-wrapper');
                    if (wrapper) {
                        const chatDiv = wrapper.querySelector('.chat-div');
                        if (chatDiv) {
                            chatDiv.classList.add('show');
                        }
                        
                        setTimeout(() => {
                            createSuggestionsDiv(wrapper);
                        }, 500);
                    }
                }
                
                if (onComplete) onComplete();
            }
        }
        
        typingInProgress = true;
        setTimeout(() => {
            typeCharacter();
        }, 100);
    }

    // استخراج مقتطف من النص حول الكلمة المطلوبة
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

    // البحث النصي المتقدم في جميع الإجابات
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
                
                const parenthesesContent = ayahPart.match(/\(([^)]+)\)/g) || [];
                parenthesesContent.forEach(parenthesesText => {
                    const cleanParenthesesText = parenthesesText.toLowerCase();
                    searchWords.forEach(word => {
                        if (cleanParenthesesText.includes(word)) {
                            matchScore += word.length * 2;
                            if (!foundWords.includes(word)) {
                                foundWords.push(word);
                            }
                        }
                    });
                });
                
                if (matchScore > 0) {
                    const ayahMatch = ayahPart.match(/^(\d+)\./);
                    const ayahNumber = ayahMatch ? ayahMatch[1] : '1';
                    
                    const imageParts = extractImageParts(ayahPart);
                    const searchSnippets = extractTextAroundSearch(ayahPart, searchWords, 8);
                    
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
                        ayahContent: ayahContent
                    });
                }
            });
        });

        const uniqueResults = [];
        const seenContents = new Set();
        
        results.sort((a, b) => b.score - a.score).forEach(result => {
            const contentKey = `${result.surah}-${result.ayah}-${result.ayahContent.substring(0, 50)}`;
            
            if (!seenContents.has(contentKey)) {
                seenContents.add(contentKey);
                uniqueResults.push(result);
            }
        });

        return uniqueResults.slice(0, 6);
    }

    // تحديث المقترحات مع البحث النصي المتقدم والمقتطفات
    function updateSuggestions(value) {
        suggestionsDiv.innerHTML = '';
        selectedIndex = 0;

        if (!value.trim()) {
            suggestionsDiv.style.display = 'none';
            return;
        }

        let filtered = [];

        const traditionalResults = getAllSuggestions().filter(item =>
            item.q.toLowerCase().includes(value.toLowerCase())
        ).slice(0, 2);

        filtered.push(...traditionalResults);

        const textSearchResults = searchInAllAnswers(value);
        
        textSearchResults.forEach(result => {
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
                        const uniqueSnippets = [];
                        const seenSnippets = new Set();
                        
                        item.searchSnippets.forEach(snippet => {
                            const normalizedSnippet = snippet.substring(0, 80);
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
                        imagesDiv.style.marginBottom = "4px";
                        imagesDiv.style.padding = '2px 6px';
                        imagesDiv.style.backgroundColor = '#fefcbf';
                        imagesDiv.style.borderRadius = '4px';
                        imagesDiv.textContent = `◀ ${item.imageParts.join('، ')}`;
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
                    searchInput.blur();
                });
                
                suggestionItem.appendChild(btn);
                suggestionsDiv.appendChild(suggestionItem);
            });
        }

        suggestionsDiv.style.display = filtered.length > 0 ? 'block' : 'none';
    }

    // تحديث خلفية الأزرار المختارة
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

    // تمرير الاقتراح المحدد إلى العرض
    function scrollSelectedIntoView() {
        const buttons = suggestionsDiv.querySelectorAll('.suggestion-btn');
        if (buttons.length > 0 && selectedIndex >= 0 && selectedIndex < buttons.length) {
            const selectedButton = buttons[selectedIndex];
            const suggestionItem = selectedButton.closest('.suggestion-item');
            
            if (suggestionItem) {
                suggestionItem.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest'
                });
            }
        }
    }

    // البحث الدقيق عن تفسير آية - محسن
    function findAyahTafsir(userText) {
        const patterns = [
            /سورة\s*([\u0600-\u06FF\s]+)\s*(?:آية|اية|رقم)?\s*(\d+)/i,
            /تفسير\s*سورة\s*([\u0600-\u06FF\s]+)\s*(?:آية|اية)?\s*(\d+)/i,
            /سورة\s*([\u0600-\u06FF\s]+)\s*(\d+)/i,
            /([\u0600-\u06FF\s]+)\s*(?:آية|اية)\s*(\d+)/i,
            /سوره\s*([\u0600-\u06FF\s]+)\s*(\d+)/i,
            /^([\u0600-\u06FF\s]+)\s+(\d+)$/i
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
                return "لم يتم العثور على السورة في تأكد من صحة الإسم 🟢.";
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

            return `⚪ لم يتم العثور على تفسير الآية ${ayahNumber} من ${surahItem.q}.`;
        }

        console.log('البحث النصي عن:', userText);
        const textSearchResults = searchInAllAnswers(userText);
        
        if (textSearchResults.length > 0) {
            let resultText = `🔍 نتائج البحث عن: " ${userText} "\n\n`;
            
            const seenResults = new Set();
            
            textSearchResults.forEach((result, index) => {
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

    // دالة مساعدة لاستخراج جميع آيات السورة
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

    // معالجة السؤال
    function handleQuestion(itemOrText) {
        if (isProcessingQuestion) return;
        
        document.querySelectorAll('.more-btn').forEach(btn => {
            const container = btn.closest('div');
            if (container) container.remove();
        });

        hideAllSuggestionsContainers();

        showSpinner();

        let userQuestion = "";
        let answer = "";

        if (typeof itemOrText === "string") {
            userQuestion = itemOrText;
            answer = findAyahTafsir(userQuestion);

            addMessage(userQuestion, 'user');

            if (answer === null) {
                setTimeout(() => {
                    addBotMessageWithTyping(`لم أجد تفسيراً يتطابق مع " ${userQuestion} ". حاول البحث بكلمات أخرى أو اكتب: إسم سورة , كلمة من سورة , جزئ من آية او أي كلمة وانا سأبحث لك عنها`, false, false, null, false, true);
                    hideSpinner();
                }, 500);
                return;
            }

            if (answer.length > LONG_MESSAGE_THRESHOLD) {
                setTimeout(() => {
                    showLongAnswer(answer);
                    hideSpinner();
                }, 500);
            } else {
                setTimeout(() => {
                    addBotMessageWithTyping(answer, true, false, null, false, true);
                    hideSpinner();
                }, 500);
            }

            return;
        }

        const item = itemOrText;
        addMessage(item.q, 'user');

        const typing = showTypingIndicator();

        setTimeout(() => {
            typing.remove();

            if (!item.a || item.a.trim() === "") {
                addBotMessageWithTyping("نحن نعمل على هذا الجزء، سيتم إضافة الإجابة قريباً.", false, false, null, false, true);
                hideSpinner();
                return;
            }

            if (item.a.length > LONG_MESSAGE_THRESHOLD) {
                showLongAnswer(item.a);
            } else {
                addBotMessageWithTyping(item.a, true, false, null, false, true);
            }
            
            hideSpinner();

        }, 800);

        searchInput.value = '';
        suggestionsDiv.innerHTML = '';
        suggestionsDiv.style.display = 'none';
        searchInput.blur();
    }

    // محادثة جديدة
    newChatBtn.addEventListener('click', () => {
        if (confirm("هل تريد حقًا بدء محادثة جديدة؟ سيتم حذف جميع الرسائل الحالية.")) {
            messagesDiv.innerHTML = '';
            localStorage.removeItem('chatMessages');
            scrollToBottomBtn.classList.remove('show');
            const randomWelcomeMessage = getRandomWelcomeMessage();
            addBotMessageWithTyping(randomWelcomeMessage, false);
        }
    });

    // إدخال وأسهم مع التمرير للاقتراحات
    searchInput.addEventListener('input', (e) => {
        if (isProcessingQuestion) return;
        isNavigatingWithArrows = false;
        updateSuggestions(e.target.value);
    });

    searchInput.addEventListener('keydown', (e) => {
        if (isProcessingQuestion) {
            e.preventDefault();
            return;
        }
        
        const buttons = suggestionsDiv.querySelectorAll('.suggestion-btn');
        
        if (e.key === "ArrowDown") {
            e.preventDefault();
            isNavigatingWithArrows = true;
            
            if (buttons.length > 0) {
                selectedIndex = (selectedIndex + 1) % buttons.length;
                updateSelectedSuggestion();
                scrollSelectedIntoView();
            } else {
                updateSuggestions(searchInput.value);
                setTimeout(() => {
                    const newButtons = suggestionsDiv.querySelectorAll('.suggestion-btn');
                    if (newButtons.length > 0) {
                        selectedIndex = 0;
                        updateSelectedSuggestion();
                        scrollSelectedIntoView();
                    }
                }, 50);
            }
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            isNavigatingWithArrows = true;
            
            if (buttons.length > 0) {
                selectedIndex = (selectedIndex - 1 + buttons.length) % buttons.length;
                updateSelectedSuggestion();
                scrollSelectedIntoView();
            }
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (searchInput.value.trim()) {
                if (!isNavigatingWithArrows) {
                    handleQuestion(searchInput.value.trim());
                } else if (buttons.length > 0) {
                    const selectedButton = buttons[selectedIndex];
                    const titleElement = selectedButton.querySelector('div:first-child');
                    const itemTitle = titleElement ? titleElement.textContent : selectedButton.textContent;
                    
                    const selectedItem = getAllSuggestions().find(item => item.q === itemTitle);
                    if (selectedItem) {
                        handleQuestion(selectedItem);
                    } else {
                        handleQuestion(searchInput.value.trim());
                    }
                } else {
                    handleQuestion(searchInput.value.trim());
                }
                
                searchInput.value = "";
                suggestionsDiv.innerHTML = "";
                suggestionsDiv.style.display = "none";
                isNavigatingWithArrows = false;
                searchInput.blur();
                return;
            }
        } else if (e.key === "Escape") {
            suggestionsDiv.style.display = "none";
            isNavigatingWithArrows = false;
            searchInput.blur();
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

    // إضافة حدث النقر على الرسائل الطويلة
    document.addEventListener('click', function(e) {
        const messageElement = e.target.closest('.message.bot.new.typing-message.collapsed');
        
        if (messageElement && !e.target.closest('.chat-div')) {
            showMessagePreview(messageElement);
        }
    });

    // Event Delegation لأزرار الاقتراحات
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('suggestion-button')) {
            e.preventDefault();
            e.stopPropagation();
            
            const suggestionText = e.target.textContent;
            
            const matchingSuggestion = faq.find(item => item.q === suggestionText);
            if (matchingSuggestion) {
                const suggestionsContainer = e.target.closest('.suggestions-container');
                if (suggestionsContainer) {
                    suggestionsContainer.remove();
                    saveMessages();
                }
                handleQuestion(matchingSuggestion);
            }
        }
        
        if (e.target.classList.contains('closeBtn')) {
            e.preventDefault();
            e.stopPropagation();
            
            const suggestionsContainer = e.target.closest('.suggestions-container');
            if (suggestionsContainer) {
                suggestionsContainer.remove();
                saveMessages();
            }
        }
    });

    // إعداد أحداث المودال مرة واحدة
    setupPreviewModalEvents();

    // ======== تفعيل التمرير التلقائي عند ظهور ديف الاقتراحات ========
    scrollToMessagesWhenSuggestionsAppear();

    // تحميل عند البداية
    loadMessages();
    if (!localStorage.getItem('chatMessages')) {
        const randomWelcomeMessage = getRandomWelcomeMessage();
        addBotMessageWithTyping(randomWelcomeMessage, false);
    }
    searchInput.focus();
    
    setTimeout(() => {
        scrollToBottomImmediate();
    }, 100);
    
    setTimeout(() => {
        scrollToBottomImmediate();
    }, 300);
    
    setTimeout(() => {
        generateAyahSuggestionsLazy();
    }, 1000);

    setTimeout(toggleScrollButton, 500);
};
