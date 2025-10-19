// --- App State and Elements ---
const pages = document.querySelectorAll('.page');
const mobileMenuButton = document.getElementById('mobile-menu-button');
const mobileMenu = document.getElementById('mobile-menu');
const ayahAudioPlayer = document.getElementById('ayah-audio-player');
let prayerTimesInterval;

// --- Page Navigation ---
function showPage(pageId, activeLink, subPageId = null) {
    pages.forEach(page => page.classList.add('hidden'));
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.remove('hidden');
    }
    
    document.querySelectorAll('.nav-link, .dropdown-link, #mobile-menu a, .side-nav-link').forEach(link => link.classList.remove('active'));
    if (activeLink) {
         if (activeLink.closest('#mobile-menu')) {
             activeLink.classList.add('bg-gray-100', 'dark:bg-gray-700');
         } else if (activeLink.classList.contains('side-nav-link')) {
            // No active state for side nav, but find corresponding top nav
            const topNavLink = document.querySelector(`.nav-link[href="${activeLink.getAttribute('href')}"]`);
            if (topNavLink) topNavLink.classList.add('active');
         } else {
             let mainLink = activeLink.closest('.dropdown') ? activeLink.closest('.dropdown').querySelector('.nav-link') : activeLink;
             if(mainLink) mainLink.classList.add('active');
         }
    }
    mobileMenu.classList.add('hidden');
    window.scrollTo(0, 0);

    if(pageId === 'discover' && subPageId) {
        document.querySelectorAll('.discover-detail').forEach(el => el.classList.add('hidden'));
        const targetDetail = document.getElementById(subPageId);
        if(targetDetail) targetDetail.classList.remove('hidden');
    }
}

mobileMenuButton.addEventListener('click', () => mobileMenu.classList.toggle('hidden'));

// --- Theme Toggler ---
const themeToggle = document.getElementById('theme-toggle');
const themeIcon = themeToggle.querySelector('i');
const applyTheme = (isDark) => {
    document.documentElement.classList.toggle('dark', isDark);
    themeIcon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
};
themeToggle.addEventListener('click', () => {
    const isDark = !document.documentElement.classList.contains('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    applyTheme(isDark);
});
const savedTheme = localStorage.getItem('theme');
applyTheme(savedTheme === 'dark' || (savedTheme === null && window.matchMedia('(prefers-color-scheme: dark)').matches));

// --- Loading/Error States ---
const showLoading = (elementId, message = 'جاري التحميل...') => { document.getElementById(elementId).innerHTML = `<div class="text-center opacity-50 p-4">${message}</div>`; };
const showError = (elementId, message) => { document.getElementById(elementId).innerHTML = `<div class="text-center text-red-500 p-4">${message}</div>`; };

// --- Toast Notification ---
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.remove('opacity-0', 'translate-x-full');
    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-x-full');
    }, 2000);
}

// --- Caching ---
function setCache(key, data, ttlMinutes = 1440) { // Default 24 hours
     const now = new Date();
     const item = {
         value: data,
         expiry: now.getTime() + ttlMinutes * 60 * 1000,
     };
     localStorage.setItem(key, JSON.stringify(item));
}

function getCache(key) {
     const itemStr = localStorage.getItem(key);
     if (!itemStr) return null;
     const item = JSON.parse(itemStr);
     const now = new Date();
     if (now.getTime() > item.expiry) {
         localStorage.removeItem(key);
         return null;
     }
     return item.value;
}

// --- Homepage Content ---
async function fetchDailyContent() {
    // Ayah of the Day
    showLoading('ayah-of-the-day'); 
    try { 
        const randomAyah = Math.floor(Math.random() * 6236) + 1;
        const response = await fetch(`https://api.alquran.cloud/v1/ayah/${randomAyah}/ar.alafasy`);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        document.getElementById('ayah-of-the-day').innerHTML = `<p class="quran-text text-2xl mb-2">"${data.data.text}"</p><p class="text-sm opacity-60 font-semibold">- سورة ${data.data.surah.name}، الآية ${data.data.numberInSurah}</p>`; 
    } catch (e) { showError('ayah-of-the-day', 'فشل تحميل الآية. الرجاء المحاولة مرة أخرى.'); }
    
    // Hadith of the Day
     const hadiths = [
        { text: "قَالَ رَسُولُ اللَّهِ ﷺ: «إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ، وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى...»", source: "صحيح البخاري" },
        { text: "قَالَ رَسُولُ اللَّهِ ﷺ: «مَنْ سَلَكَ طَرِيقًا يَلْتَمِسُ فِيهِ عِلْمًا سَهَّلَ اللَّهُ لَهُ بِهِ طَرِيقًا إِلَى الْجَنَّةِ»", source: "صحيح مسلم" },
        { text: "قَالَ رَسُولُ اللَّهِ ﷺ: «الْكَلِمَةُ الطَّيِّبَةُ صَدَقَةٌ»", source: "متفق عليه" },
        { text: "قَالَ رَسُولُ اللَّهِ ﷺ: «لا يُؤْمِنُ أَحَدُكُمْ حَتَّى يُحِبَّ لأَخِيهِ مَا يُحِبُّ لِنَفْسِهِ»", source: "متفق عليه" }
    ];
    const randomHadith = hadiths[Math.floor(Math.random() * hadiths.length)];
    document.getElementById('hadith-of-the-day').innerHTML = `<p class="mb-2">"${randomHadith.text}"</p><p class="text-sm opacity-60 font-semibold">- ${randomHadith.source}</p>`;
}

// --- Quran Section ---
let currentSurahNumber = null;

async function fetchSurahList() {
    const cachedSurahs = getCache('surahList');
    if (cachedSurahs) {
        renderSurahList(cachedSurahs);
        return;
    }
    showLoading('surah-list');
    try {
        const response = await fetch('https://api.alquran.cloud/v1/surah');
        if (!response.ok) throw new Error('Network error');
        const data = await response.json();
        setCache('surahList', data.data);
        renderSurahList(data.data);
    } catch(error) { showError('surah-list', 'فشل تحميل قائمة السور.'); }
}

function renderSurahList(data) {
     document.getElementById('surah-list').innerHTML = data.map(surah => 
        `<div class="card text-center cursor-pointer hover:scale-105 transition-transform" onclick="showSurah(${surah.number})">
            <p class="font-semibold text-lg" style="color: var(--primary-color);">${surah.number}. ${surah.name}</p>
            <p class="text-sm opacity-60">${surah.englishName} - ${surah.revelationType === 'Meccan' ? 'مكية' : 'مدنية'}</p>
        </div>`
    ).join('');
}

function pad(number, length) {
    return (number + '').padStart(length, '0');
}

function playAyahAudio(surahNumber, ayahNumberInSurah) {
    const surahPad = pad(surahNumber, 3);
    const ayahPad = pad(ayahNumberInSurah, 3);
    ayahAudioPlayer.src = `https://everyayah.com/data/Alafasy_128kbps/${surahPad}${ayahPad}.mp3`;
    ayahAudioPlayer.play().catch(e => {
        console.error("Audio play failed", e);
        showToast('فشل تشغيل الصوت');
    });
}

function playSurahAudio(surahNumber) {
    const paddedSurah = String(surahNumber).padStart(3, '0');
    ayahAudioPlayer.src = `https://server7.mp3quran.net/afs/${paddedSurah}.mp3`;
    ayahAudioPlayer.play().catch(e => {
        console.error("Audio play failed", e);
        showToast('فشل تشغيل الصوت');
    });
}

function playZikrAudio(identifier) {
    const audioMap = {
        'ayat-al-kursi': () => playAyahAudio(2, 255),
        'al-ikhlas': () => playSurahAudio(112),
        'al-falaq': () => playSurahAudio(113),
        'al-nas': () => playSurahAudio(114),
        'al-baqarah-last-two': () => playAyahAudio(2, 285) // Play first of the two
    };
    if (audioMap[identifier]) {
        audioMap[identifier]();
    }
}

function copyToClipboard(text) {
     navigator.clipboard.writeText(text).then(() => {
        showToast('تم النسخ بنجاح!');
    }).catch(err => {
        console.error('Failed to copy: ', err);
        showToast('فشل النسخ!');
    });
}

function bookmarkAyah(surahNumber, ayahNumber) {
    const bookmark = { surah: surahNumber, ayah: ayahNumber };
    localStorage.setItem('quranBookmark', JSON.stringify(bookmark));
    showToast('تم حفظ العلامة!');
}

document.getElementById('goto-bookmark-btn').addEventListener('click', () => {
    const bookmarkStr = localStorage.getItem('quranBookmark');
    if (bookmarkStr) {
        const bookmark = JSON.parse(bookmarkStr);
        showSurah(bookmark.surah, `ayah-${bookmark.ayah}`);
    } else {
        showToast('لم يتم حفظ أي علامة.');
    }
});


async function showSurah(surahNumber, scrollToAyahId = null) {
    currentSurahNumber = surahNumber;
    const modal = document.getElementById('surah-modal');
    const contentDiv = document.getElementById('surah-modal-content');
    
    document.getElementById('surah-modal-title').textContent = 'جاري التحميل...';
    contentDiv.innerHTML = `<div class="text-center p-8"><i class="fas fa-spinner fa-spin fa-3x" style="color: var(--primary-color);"></i></div>`;
    modal.classList.remove('hidden');

    try {
        const endpoints = [ 
            `https://api.alquran.cloud/v1/surah/${surahNumber}`,
            `https://api.alquran.cloud/v1/surah/${surahNumber}/ar.muyassar` // Tafsir Muyassar
        ];
        
        const responses = await Promise.all(endpoints.map(url => fetch(url)));
        const [arabicResponse, tafsirResponse] = responses;

        if (!arabicResponse.ok) throw new Error('Failed to load Arabic text');
        const arabicData = await arabicResponse.json();

        let tafsirData = null;
        if (tafsirResponse.ok) {
            tafsirData = await tafsirResponse.json();
        }

        document.getElementById('surah-modal-title').textContent = `سورة ${arabicData.data.name}`;
        
        const basmala = (surahNumber !== 1 && surahNumber !== 9) ? `<div class="text-center mb-4 quran-text text-2xl">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>` : '';
        
        let contentHTML = basmala;

        arabicData.data.ayahs.forEach((ayah, index) => {
            const tafsirText = tafsirData ? tafsirData.data.ayahs[index].text : '';
            contentHTML += `
                <div class="quran-ayah-container" id="ayah-${ayah.numberInSurah}">
                    <p class="quran-ayah">${ayah.text} <span class="ayah-number">﴿${ayah.numberInSurah}﴾</span></p>
                    ${tafsirText ? `<div class="tafsir-text">${tafsirText}</div>` : ''}
                    <div class="flex items-center gap-2 mt-4">
                       <button class="btn btn-sm" onclick="playAyahAudio(${surahNumber}, ${ayah.numberInSurah})"><i class="fas fa-play"></i> استماع</button>
                       <button class="btn btn-sm" onclick="copyToClipboard('${ayah.text} (سورة ${arabicData.data.name}: ${ayah.numberInSurah})')"><i class="fas fa-copy"></i> نسخ</button>
                       <button class="btn btn-sm" onclick="bookmarkAyah(${surahNumber}, ${ayah.numberInSurah})"><i class="fas fa-bookmark"></i> حفظ</button>
                    </div>
                </div>`;
        });

        contentDiv.innerHTML = contentHTML;

        if (scrollToAyahId) {
            const targetAyah = document.getElementById(scrollToAyahId);
            if (targetAyah) {
                targetAyah.scrollIntoView({ behavior: 'smooth', block: 'center' });
                targetAyah.style.backgroundColor = 'rgba(0, 137, 123, 0.1)';
                setTimeout(() => targetAyah.style.backgroundColor = '', 2000);
            }
        }

    } catch(error) { 
        console.error(error);
        contentDiv.innerHTML = `<p class="text-red-500 text-center">عذراً، حدث خطأ أثناء تحميل السورة.</p>`;
    }
}

// Font size controls
document.getElementById('font-increase-btn').addEventListener('click', () => {
    let currentSize = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--quran-font-size'));
    if (currentSize < 2.5) {
        document.documentElement.style.setProperty('--quran-font-size', `${currentSize + 0.1}rem`);
    }
});
document.getElementById('font-decrease-btn').addEventListener('click', () => {
     let currentSize = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--quran-font-size'));
    if (currentSize > 1.2) {
        document.documentElement.style.setProperty('--quran-font-size', `${currentSize - 0.1}rem`);
    }
});

document.getElementById('close-modal').onclick = () => document.getElementById('surah-modal').classList.add('hidden');

// --- Azkar Section ---
const texts = {
    ayatAlKursi: `اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَّهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ ۗ مَن ذَا الَّذِي يَشْفَعُ عِندَهُ إِلَّا بِإِذْنِهِ ۚ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ ۖ وَلَا يُحِيطُونَ بِشَيْءٍ مِّنْ عِلْمِهِ إِلَّا بِمَا شَاءَ ۚ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ ۖ وَلَا يَئُودُهُ حِفْظُهُمَا ۚ وَهُوَ الْعَلِيُّ الْعَظِيمُ.`,
    alBaqarahLastTwo: `آمَنَ الرَّسُولُ بِمَا أُنزِلَ إِلَيْهِ مِن رَّبِّهِ وَالْمُؤْمِنُونَ ۚ كُلٌّ آمَنَ بِاللَّهِ وَمَلَائِكَتِهِ وَكُتُبِهِ وَرُسُلِهِ لَا نُفَرِّقُ بَيْنَ أَحَدٍ مِّن رُّسُلِهِ ۚ وَقَالُوا سَمِعْنَا وَأَطَعْنَا ۖ غُفْرَانَكَ رَبَّنَا وَإِلَيْكَ الْمَصِيرُ (285) لَا يُكَلِّفُ اللَّهُ نَفْسًا إِلَّا وُسْعَهَا ۚ لَهَا مَا كَسَبَتْ وَعَلَيْهَا مَا اكْتَسَبَتْ ۗ رَبَّنَا لَا تُؤَاخِذْنَا إِن نَّسِينَا أَوْ أَخْطَأْنَا ۚ رَبَّنَا وَلَا تَحْمِلْ عَلَيْنَا إِصْرًا كَمَا حَمَلْتَهُ عَلَى الَّذِينَ مِن قَبْلِنَا ۚ رَبَّنَا وَلَا تُحَمِّلْنَا مَا لَا طَاقَةَ لَنَا بِهِ ۖ وَاعْفُ عَنَّا وَاغْفِرْ لَنَا وَارْحَمْنَا ۚ أَنتَ مَوْلَانَا فَانصُرْنَا عَلَى الْقَوْمِ الْكَافِرِينَ (286)`,
    alIkhlas: `قُلْ هُوَ اللَّهُ أَحَدٌ ﴿١﴾ اللَّهُ الصَّمَدُ ﴿٢﴾ لَمْ يَلِدْ وَلَمْ يُولَدْ ﴿٣﴾ وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ ﴿٤﴾`,
    alFalaq: `قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ ﴿١﴾ مِن شَرِّ مَا خَلَقَ ﴿٢﴾ وَمِن شَرِّ غَاسِقٍ إِذَا وَقَبَ ﴿٣﴾ وَمِن شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ ﴿٤﴾ وَمِن شَرِّ حَاسِدٍ إِذَا حَسَدَ ﴿٥﴾`,
    anNas: `قُلْ أَعُوذُ بِرَبِّ النَّاسِ ﴿١﴾ مَلِكِ النَّاسِ ﴿٢﴾ إِلَٰهِ النَّاسِ ﴿٣﴾ مِن شَرِّ الْوَسْوَاسِ الْخَنَّاسِ ﴿٤﴾ الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ ﴿٥﴾ مِنَ الْجِنَّةِ وَالنَّاسِ ﴿٦﴾`,
    sayyidAlIstighfar: 'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ لَكَ بِذَنْبِي فَاغْفِرْ لِي، فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ.'
};
const azkarData = {
    morning: { name: "أذكار الصباح", items: [ 
        { id: 'm1', text: `<span class="font-bold">آية الكرسي:</span><br>${texts.ayatAlKursi}`, count: 1, type: 'quran', audioIdentifier: 'ayat-al-kursi' }, 
        { id: 'm2a', text: `<span class="font-bold">سورة الإخلاص</span><br>${texts.alIkhlas}`, count: 3, type: 'quran', audioIdentifier: 'al-ikhlas' },
        { id: 'm2b', text: `<span class="font-bold">سورة الفلق</span><br>${texts.alFalaq}`, count: 3, type: 'quran', audioIdentifier: 'al-falaq' },
        { id: 'm2c', text: `<span class="font-bold">سورة الناس</span><br>${texts.anNas}`, count: 3, type: 'quran', audioIdentifier: 'al-nas' },
        { id: 'm3', text: 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لاَ إِلَهَ إلاَّ اللَّهُ وَحْدَهُ لاَ شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ. رَبِّ أَسْأَلُكَ خَيْرَ مَا فِي هَذَا الْيَوْمِ وَخَيْرَ مَا بَعْدَهُ، وَأَعُوذُ بِكَ مِنْ شَرِّ مَا فِي هَذَا الْيَوْمِ وَشَرِّ مَا بَعْدَهُ، رَبِّ أَعُوذُ بِكَ مِنَ الْكَسَلِ وَسُوءِ الْكِبَرِ، رَبِّ أَعُوذُ بِكَ مِنْ عَذَابٍ فِي النَّارِ وَعَذَابٍ فِي الْقَبْرِ.', count: 1 }, 
        { id: 'm4', text: 'اللَّهُمَّ بِكَ أَصْبَحْنَا، وَبِكَ أَمْسَيْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ وَإِلَيْكَ النُّشُورُ.', count: 1 },
        { id: 'm5', text: `<span class="font-bold">سيد الاستغفار:</span><br>${texts.sayyidAlIstighfar}`, count: 1 },
        { id: 'm6', text: 'اللَّهُمَّ عَافِنِي فِي بَدَنِي، اللَّهُمَّ عَافِنِي فِي سَمْعِي، اللَّهُمَّ عَافِنِي فِي بَصَرِي، لاَ إِلَهَ إِلاَّ أَنْتَ. اللَّهُمَّ  إِنِّي أَعُوذُ بِكَ مِنَ الْكُفْرِ، وَالْفَقْرِ، وَأَعُوذُ بِكَ مِنْ عَذَابِ الْقَبْرِ، لاَ إِلَهَ إِلاَّ أَنْتَ.', count: 3 },
        { id: 'm7', text: 'أَصْبَحْنَا عَلَى فِطْرَةِ الْإِسْلَامِ، وَعَلَى كَلِمَةِ الْإِخْلَاصِ، وَعَلَى دِينِ نَبِيِّنَا مُحَمَّدٍ صَلَّى اللهُ عَلَيْهِ وَسَلَّمَ، وَعَلَى مِلَّةِ أَبِينَا إِبْرَاهِيمَ حَنِيفًا مُسْلِمًا وَمَا كَانَ مِنَ الْمُشْرِكِينَ.', count: 1 },
        { id: 'm8', text: 'سُبْحَانَ اللهِ وَبِحَمْدِهِ، عَدَدَ خَلْقِهِ، وَرِضَا نَفْسِهِ، وَزِنَةَ عَرْشِهِ، وَمِدَادَ كَلِمَاتِهِ.', count: 3},
        { id: 'm9', text: 'سُبْحَانَ اللهِ وَبِحَمْدِهِ.', count: 100 }
    ] },
    evening: { name: "أذكار المساء", items: [ 
        { id: 'e1', text: `<span class="font-bold">آية الكرسي:</span><br>${texts.ayatAlKursi}`, count: 1, type: 'quran', audioIdentifier: 'ayat-al-kursi' }, 
        { id: 'e2a', text: `<span class="font-bold">سورة الإخلاص</span><br>${texts.alIkhlas}`, count: 3, type: 'quran', audioIdentifier: 'al-ikhlas' },
        { id: 'e2b', text: `<span class="font-bold">سورة الفلق</span><br>${texts.alFalaq}`, count: 3, type: 'quran', audioIdentifier: 'al-falaq' },
        { id: 'e2c', text: `<span class="font-bold">سورة الناس</span><br>${texts.anNas}`, count: 3, type: 'quran', audioIdentifier: 'al-nas' },
        { id: 'e3', text: 'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لاَ إِلَهَ إلاَّ اللَّهُ وَحْدَهُ لاَ شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ. رَبِّ أَسْأَلُكَ خَيْرَ مَا فِي هَذِهِ اللَّيْلَةِ وَخَيْرَ مَا بَعْدَهَا، وَأَعُوذُ بِكَ مِنْ شَرِّ مَا فِي هَذِهِ اللَّيْلَةِ وَشَرِّ مَا بَعْدَهَا، رَبِّ أَعُوذُ بِكَ مِنَ الْكَسَلِ وَسُوءِ الْكِبَرِ، رَبِّ أَعُوذُ بِكَ مِنْ عَذَابٍ فِي النَّارِ وَعَذَابٍ فِي الْقَبْرِ.', count: 1 }, 
        { id: 'e4', text: 'اللَّهُمَّ بِكَ أَمْسَيْنَا، وَبِكَ أَصْبَحْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ وَإِلَيْكَ الْمَصِيرُ.', count: 1 },
        { id: 'e5', text: 'اللَّهُمَّ مَا أَمْسَى بِي مِنْ نِعْمَةٍ أَوْ بِأَحَدٍ مِنْ خَلْقِكَ فَمِنْكَ وَحْدَكَ لاَ شَرِيكَ لَكَ، فَلَكَ الْحَمْدُ وَلَكَ الشُّكْرُ.', count: 1 },
        { id: 'e6', text: 'أَعُوذُ بِكَلِمَاتِ اللهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ.', count: 3 }
    ] },
    afterSalah: { name: "بعد الصلاة", items: [ 
        { id: 's1', text: 'أَسْتَغْفِرُ اللَّهَ.', count: 3 }, 
        { id: 's2', text: 'اللَّهُمَّ أَنْتَ السَّلاَمُ، وَمِنْكَ السَّلَامُ، تَبَارَكْتَ يَا ذَا الْجَلَالِ وَالْإِكْرَامِ.', count: 1 }, 
        { id: 's3', text: 'سُبْحَانَ اللَّهِ.', count: 33 }, { id: 's4', text: 'الْحَمْدُ لِلَّهِ.', count: 33 }, { id: 's5', text: 'اللَّهُ أَكْبَرُ.', count: 33 }, 
        { id: 's6', text: 'يختم المئة بقول: لاَ إِلَهَ إِلاَّ اللَّهُ وَحْدَهُ لاَ شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ.', count: 1 }, 
        { id: 's7', text: `<span class="font-bold">آية الكرسي:</span><br>${texts.ayatAlKursi}`, count: 1, type: 'quran', audioIdentifier: 'ayat-al-kursi' },
        { id: 's8', text: `قراءة <span class="font-bold">المعوذات</span> (الإخلاص، الفلق، الناس) بعد كل صلاة`, count: 1, type: 'quran' }
    ] },
    sleep: { name: "أذكار النوم", items: [ 
        { id: 'sl1', text: `يجمع كفيه ثم ينفث فيهما ويقرأ: <br><span class="font-bold">سورة الإخلاص</span><br>${texts.alIkhlas}<br><span class="font-bold">سورة الفلق</span><br>${texts.alFalaq}<br><span class="font-bold">سورة الناس</span><br>${texts.anNas}<br>ثم يمسح بهما ما استطاع من جسده`, count: 3, type: 'quran' }, 
        { id: 'sl2', text: `<span class="font-bold">آية الكرسي:</span><br>${texts.ayatAlKursi}`, count: 1, type: 'quran', audioIdentifier: 'ayat-al-kursi' },
        { id: 'sl3', text: `<span class="font-bold">آخر آيتين من سورة البقرة:</span><br>${texts.alBaqarahLastTwo}`, count: 1, type: 'quran', audioIdentifier: 'al-baqarah-last-two'},
        { id: 'sl4', text: `بِاسْمِكَ رَبِّـي وَضَعْـتُ جَنْـبِي، وَبِكَ أَرْفَعُـهُ، إِنْ أَمْسَكْتَ نَفْسِي فَارْحَمْهَا، وَإِنْ أَرْسَلْتَهَا فَاحْفَظْهَا بِمَا تَحْفَظُ بِهِ عِبَادَكَ الصَّالِحِينَ.`, count: 1 }
    ] }
};

function getAzkarProgress() {
    const progress = localStorage.getItem('azkarProgress');
    return progress ? JSON.parse(progress) : {};
}

function saveAzkarProgress(progress) {
    localStorage.setItem('azkarProgress', JSON.stringify(progress));
}

function incrementAzkarCount(element, zikrId) {
    const currentCountEl = element.querySelector('.current-count');
    const checkIcon = element.querySelector('.fa-check-circle');
    let currentCount = parseInt(currentCountEl.textContent);
    const targetCount = parseInt(element.dataset.targetCount);

    if (currentCount < targetCount) {
        currentCount++;
        currentCountEl.textContent = currentCount;
        
        let progress = getAzkarProgress();
        progress[zikrId] = currentCount;
        saveAzkarProgress(progress);
    }

    if (currentCount >= targetCount) {
        element.classList.add('completed');
        checkIcon.classList.remove('hidden');
        if(navigator.vibrate) navigator.vibrate(100);
    }
}

function initializeAzkarTabs() {
    const tabsContainer = document.getElementById('azkar-tabs');
    const contentContainer = document.getElementById('azkar-content');
    
    tabsContainer.innerHTML = Object.keys(azkarData).map((key, index) => 
        `<button class="azkar-tab ${index === 0 ? 'active' : ''}" data-target="${key}">${azkarData[key].name}</button>`
    ).join('');

    function displayAzkar(key) {
         const progress = getAzkarProgress();
        contentContainer.innerHTML = azkarData[key].items.map((item, index) => {
            const zikrId = item.id || `${key}-${index}`; // Fallback id
            const savedCount = progress[zikrId] || 0;
            const isCompleted = savedCount >= item.count;
            const audioButton = item.audioIdentifier ? `<button class="btn btn-sm" onclick="event.stopPropagation(); playZikrAudio('${item.audioIdentifier}')"><i class="fas fa-play"></i> استماع</button>` : '';
            
            return `<div class="azkar-card card p-4 cursor-pointer ${isCompleted ? 'completed' : ''}" onclick="incrementAzkarCount(this, '${zikrId}')" data-target-count="${item.count}">
                <p class="${item.type === 'quran' ? 'quran-text text-xl' : 'text-lg'} leading-relaxed">${item.text}</p>
                <div class="flex justify-between items-center mt-4 pt-4 border-t dark:border-gray-600">
                    <div class="flex items-center gap-2">
                        ${audioButton}
                    </div>
                    <div class="flex items-center gap-2 text-lg font-bold" style="color: var(--primary-color)">
                       <i class="fas fa-check-circle text-green-500 ${isCompleted ? '' : 'hidden'}"></i>
                       <span class="current-count">${savedCount}</span> / <span>${item.count}</span>
                    </div>
                </div>
            </div>`
        }).join('') + `<p class="text-xs text-center opacity-50 mt-4">المرجع: كتاب حصن المسلم.</p>`;
    }

    tabsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('azkar-tab')) {
            tabsContainer.querySelectorAll('.azkar-tab').forEach(tab => tab.classList.remove('active'));
            e.target.classList.add('active');
            displayAzkar(e.target.dataset.target);
        }
    });
    
    displayAzkar(Object.keys(azkarData)[0]);
}

// --- Tasbeeh Logic ---
let tasbeehCount = 0;
const tasbeehDisplay = document.getElementById('tasbeeh-display');
function incrementTasbeeh() { tasbeehDisplay.textContent = ++tasbeehCount; }
function resetTasbeeh() { tasbeehCount = 0; tasbeehDisplay.textContent = 0; }
function setTasbeehText(text) { document.getElementById('tasbeeh-text').textContent = text; resetTasbeeh(); }

// --- Hijri Calendar ---
function initializeHijriWidget() {
    moment.locale('ar-SA');
    document.getElementById('hijri-widget').innerHTML = `<p class="text-3xl font-bold">${moment().format('iD')}</p><p class="text-lg">${moment().format('iMMMM iYYYY')}</p>`;
}

// --- Zakat Calculator ---
function calculateZakat() {
    const nisabGold = 85;
    const goldPrice = parseFloat(document.getElementById('gold-price').value) || 0;
    const nisabValue = nisabGold * goldPrice;
    const cash = parseFloat(document.getElementById('cash').value) || 0;
    const resultDiv = document.getElementById('zakat-result');
    
    if (cash > 0 && goldPrice > 0) {
         if (cash >= nisabValue) {
             const zakatAmount = (cash * 0.025).toFixed(2);
             resultDiv.innerHTML = `<p class="text-lg mt-4">بلغ مالك النصاب.</p><p>قيمة الزكاة الواجبة: <strong class="text-2xl" style="color: var(--primary-color);">${zakatAmount}</strong>.</p>`;
         } else {
             resultDiv.innerHTML = `<p class="text-lg mt-4">لم يبلغ مالك النصاب.</p><p class="opacity-70">(قيمة النصاب حاليًا تقريبًا: ${nisabValue.toFixed(2)})</p>`;
         }
    } else {
         resultDiv.innerHTML = `<p class="text-red-500 mt-4">الرجاء إدخال قيم صحيحة.</p>`;
    }
}

// --- Prayer Times & Qibla ---
const countrySelect = document.getElementById('country-select');
const citySelect = document.getElementById('city-select');

async function fetchPrayerTimes(city, country) {
    try {
        const response = await fetch(`https://api.aladhan.com/v1/timingsByCity?city=${city}&country=${country}&method=5`);
        if (!response.ok) throw new Error('Failed to fetch prayer times');
        const result = await response.json();
        
        document.getElementById('location-info').textContent = `أوقات الصلاة لمدينة ${city}, ${country}`;
        displayPrayerTimes(result.data.timings);
        updateNextPrayer(result.data.timings);
        
        localStorage.setItem('prayerLocation', JSON.stringify({city, country}));
        
        if (prayerTimesInterval) clearInterval(prayerTimesInterval);
        prayerTimesInterval = setInterval(() => updateNextPrayer(result.data.timings), 60000);
    } catch (error) {
        console.error("Prayer times error:", error);
        document.getElementById('location-info').textContent = 'فشل في تحميل أوقات الصلاة.';
    }
}

async function initializeLocationSelector() {
    const locations = { "Egypt": ["Cairo", "Alexandria", "Giza", "Luxor", "Aswan"], "Saudi Arabia": ["Makkah", "Riyadh", "Jeddah", "Madinah", "Dammam"], "United Arab Emirates": ["Dubai", "Abu Dhabi", "Sharjah"], "Jordan": ["Amman", "Zarqa", "Irbid"], "Palestine": ["Jerusalem", "Gaza", "Ramallah"], "Kuwait": ["Kuwait City"], "Qatar": ["Doha"], "Bahrain": ["Manama"], "Oman": ["Muscat"] };
    
    countrySelect.innerHTML = Object.keys(locations).map(country => `<option value="${country}">${country}</option>`).join('');
    
    function updateCities() {
        const selectedCountry = countrySelect.value;
        citySelect.innerHTML = locations[selectedCountry].map(city => `<option value="${city}">${city}</option>`).join('');
    }
    
    countrySelect.addEventListener('change', () => { updateCities(); fetchPrayerTimes(citySelect.value, countrySelect.value); });
    citySelect.addEventListener('change', () => fetchPrayerTimes(citySelect.value, countrySelect.value));
    
    const savedLocation = JSON.parse(localStorage.getItem('prayerLocation'));
    if(savedLocation && locations[savedLocation.country]) {
        countrySelect.value = savedLocation.country;
        updateCities();
        citySelect.value = savedLocation.city;
        fetchPrayerTimes(savedLocation.city, savedLocation.country);
    } else {
        updateCities();
        fetchPrayerTimes(citySelect.value, countrySelect.value);
    }
}

function displayPrayerTimes(timings) {
    const prayerNames = { Fajr: 'الفجر', Sunrise: 'الشروق', Dhuhr: 'الظهر', Asr: 'العصر', Maghrib: 'المغرب', Isha: 'العشاء' };
    const table = document.getElementById('prayer-times-table');
    table.innerHTML = Object.entries(prayerNames).map(([key, name]) => {
        const time24 = timings[key];
        const time12 = new Date(`1970-01-01T${time24}:00`).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });
        return `<div class="flex justify-between items-center p-3 rounded-lg odd:bg-gray-100 dark:odd:bg-gray-800">
                    <span class="font-semibold text-lg">${name}</span>
                    <span class="text-lg font-bold" style="color:var(--primary-color)">${time12}</span>
                </div>`;
    }).join('');
}

function updateNextPrayer(timings) {
    const now = new Date();
    const prayerOrder = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
    let nextPrayerName = '';
    let nextPrayerTime = null;

    for (const prayer of prayerOrder) {
        const [h, m] = timings[prayer].split(':');
        const prayerTime = new Date();
        prayerTime.setHours(h, m, 0, 0);

        if (prayerTime > now) {
            nextPrayerName = prayer;
            nextPrayerTime = prayerTime;
            break;
        }
    }

    if (!nextPrayerTime) {
        nextPrayerName = 'Fajr';
        const [h, m] = timings['Fajr'].split(':');
        nextPrayerTime = new Date();
        nextPrayerTime.setDate(now.getDate() + 1);
        nextPrayerTime.setHours(h, m, 0, 0);
    }
    
    const prayerNamesAR = { Fajr: 'الفجر', Dhuhr: 'الظهر', Asr: 'العصر', Maghrib: 'المغرب', Isha: 'العشاء' };
    const diff = nextPrayerTime.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    document.getElementById('next-prayer-widget').innerHTML = 
    `<div class="text-center">
        <p class="text-2xl sm:text-3xl font-bold" style="color:var(--primary-color)">${prayerNamesAR[nextPrayerName]}</p>
        <p class="text-lg opacity-80">يتبقى ${hours} ساعة و ${minutes} دقيقة</p>
     </div>`;
     
     checkForPrayerNotification(timings);
}

// Prayer Notifications
document.getElementById('notifications-btn').addEventListener('click', () => {
     Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
            showToast('تم تفعيل تنبيهات الصلاة بنجاح!');
            localStorage.setItem('notificationsEnabled', 'true');
        } else {
             showToast('تم رفض إذن التنبيهات.');
             localStorage.setItem('notificationsEnabled', 'false');
        }
    });
});

function checkForPrayerNotification(timings) {
    if (localStorage.getItem('notificationsEnabled') !== 'true' || Notification.permission !== 'granted') return;

    const now = new Date();
    const prayerNamesAR = { Fajr: 'الفجر', Dhuhr: 'الظهر', Asr: 'العصر', Maghrib: 'المغرب', Isha: 'العشاء' };

    for (const prayer in prayerNamesAR) {
         const [h, m] = timings[prayer].split(':');
         if (now.getHours() == h && now.getMinutes() == m) {
             new Notification('حان الآن وقت صلاة', {
                body: `${prayerNamesAR[prayer]} حسب التوقيت المحلي لمدينتك.`,
                icon: 'icon-192.png'
             });
         }
    }
}


function setupQibla() {
    const qiblaBtn = document.getElementById('qibla-permission-btn');
    const qiblaError = document.getElementById('qibla-error');

    function calculateQibla(lat, lon) {
        const kaabaLat = 21.4225 * Math.PI / 180;
        const kaabaLon = 39.8262 * Math.PI / 180;
        const userLat = lat * Math.PI / 180;
        const userLon = lon * Math.PI / 180;
        const lonDiff = kaabaLon - userLon;

        const y = Math.sin(lonDiff) * Math.cos(kaabaLat);
        const x = Math.cos(userLat) * Math.sin(kaabaLat) - Math.sin(userLat) * Math.cos(kaabaLat) * Math.cos(lonDiff);
        const qiblaDirection = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;

        document.getElementById('qibla-direction').textContent = qiblaDirection.toFixed(2);
        return qiblaDirection;
    }

    let qiblaDirection = calculateQibla(30.0444, 31.2357); // Default to Cairo

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            qiblaDirection = calculateQibla(position.coords.latitude, position.coords.longitude);
        });
    }

    qiblaBtn.onclick = () => {
        qiblaError.classList.add('hidden');
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
            DeviceOrientationEvent.requestPermission().then(permissionState => {
                if (permissionState === 'granted') {
                     window.addEventListener('deviceorientation', handleOrientation);
                     qiblaBtn.style.display = 'none';
                } else {
                    qiblaError.textContent = 'تم رفض إذن الوصول للمستشعرات.';
                    qiblaError.classList.remove('hidden');
                }
            }).catch(console.error);
        } else {
             try {
                window.addEventListener('deviceorientation', handleOrientation, true);
                qiblaBtn.style.display = 'none';
            } catch (e) {
                 qiblaError.textContent = 'المتصفح لا يدعم الوصول للمستشعرات.';
                 qiblaError.classList.remove('hidden');
            }
        }
    };
    
    function handleOrientation(event) {
        let heading = event.alpha;
        if(typeof event.webkitCompassHeading !== "undefined") {
            heading = event.webkitCompassHeading; // iOS
        }
        
        if (heading === null) {
            qiblaError.textContent = 'لا يمكن للمتصفح تحديد اتجاه الجهاز.';
            qiblaError.classList.remove('hidden');
            return;
        }

        const rotation = qiblaDirection - heading;
        document.getElementById('qibla-arrow').style.transform = `rotate(${rotation}deg)`;
    }
}

// --- Discover Islam ---
const discoverContent = {
    'pillars-islam': `
        <p class="mb-4">أركان الإسلام هي الأسس الخمسة التي يقوم عليها الدين، وهي واجبة على كل مسلم. ورد ذكرها في حديث جبريل عليه السلام عندما سأل النبي محمد ﷺ عن الإسلام.</p>
        <ul class="list-none space-y-4 mt-4">
            <li class="flex items-start gap-4"><i class="fas fa-hand-pointer text-xl mt-1" style="color: var(--primary-color);"></i><div><strong class="font-semibold text-lg">الشهادتان:</strong> وهي الإقرار والشهادة بأنه <span class="highlight">"لا إله إلا الله، وأن محمداً رسول الله"</span>. هذا هو مفتاح الدخول إلى الإسلام.</div></li>
            <li class="flex items-start gap-4"><i class="fas fa-person-praying text-xl mt-1" style="color: var(--primary-color);"></i><div><strong class="font-semibold text-lg">إقامة الصلاة:</strong> وهي خمس صلوات مفروضة في اليوم والليلة (الفجر، الظهر، العصر، المغرب، العشاء). وهي عمود الدين والصلة المباشرة بين العبد وربه.</div></li>
            <li class="flex items-start gap-4"><i class="fas fa-hand-holding-dollar text-xl mt-1" style="color: var(--primary-color);"></i><div><strong class="font-semibold text-lg">إيتاء الزكاة:</strong> وهي إخراج نسبة معينة (2.5%) من المال الذي بلغ النصاب وحال عليه الحول، وتُعطى للفقراء والمحتاجين وغيرهم من الأصناف الثمانية المذكورة في القرآن.</div></li>
            <li class="flex items-start gap-4"><i class="fas fa-moon text-xl mt-1" style="color: var(--primary-color);"></i><div><strong class="font-semibold text-lg">صوم رمضان:</strong> وهو الامتناع عن الطعام والشراب وسائر المفطرات من طلوع الفجر إلى غروب الشمس في شهر رمضان المبارك.</div></li>
            <li class="flex items-start gap-4"><i class="fas fa-kaaba text-xl mt-1" style="color: var(--primary-color);"></i><div><strong class="font-semibold text-lg">حج البيت:</strong> وهو قصد مكة المكرمة لأداء مناسك الحج مرة واحدة في العمر لمن استطاع إليه سبيلاً (القدرة المالية والجسدية).</div></li>
        </ul>
        <p class="text-xs text-center opacity-50 mt-6">المرجع: حديث جبريل (رواه مسلم).</p>`,
    'articles-faith': `
        <p class="mb-4">أركان الإيمان هي الأصول العقدية الستة التي يجب على المسلم أن يؤمن بها إيماناً جازماً لا شك فيه. وهي أساس عقيدة المسلم.</p>
        <ul class="list-none space-y-4 mt-4">
            <li class="flex items-start gap-4"><i class="fas fa-star-and-crescent text-xl mt-1" style="color: var(--primary-color);"></i><div><strong class="font-semibold text-lg">الإيمان بالله:</strong> الإيمان بوجوده ووحدانيته وربوبيته وألوهيته وأسمائه وصفاته.</div></li>
            <li class="flex items-start gap-4"><i class="fas fa-users text-xl mt-1" style="color: var(--primary-color);"></i><div><strong class="font-semibold text-lg">الإيمان بالملائكة:</strong> الإيمان بوجودهم وأنهم مخلوقات من نور، لا يعصون الله ما أمرهم ويفعلون ما يؤمرون.</div></li>
            <li class="flex items-start gap-4"><i class="fas fa-book-quran text-xl mt-1" style="color: var(--primary-color);"></i><div><strong class="font-semibold text-lg">الإيمان بالكتب السماوية:</strong> الإيمان بأن الله أنزل كتباً على رسله هداية للبشر، مثل القرآن والتوراة والإنجيل والزبور.</div></li>
            <li class="flex items-start gap-4"><i class="fas fa-user-check text-xl mt-1" style="color: var(--primary-color);"></i><div><strong class="font-semibold text-lg">الإيمان بالرسل:</strong> الإيمان بجميع الرسل الذين أرسلهم الله، من أولهم إلى خاتمهم محمد ﷺ.</div></li>
            <li class="flex items-start gap-4"><i class="fas fa-calendar-day text-xl mt-1" style="color: var(--primary-color);"></i><div><strong class="font-semibold text-lg">الإيمان باليوم الآخر:</strong> الإيمان بكل ما أخبر به الله ورسوله مما يكون بعد الموت، كالحساب والجنة والنار.</div></li>
            <li class="flex items-start gap-4"><i class="fas fa-arrows-spin text-xl mt-1" style="color: var(--primary-color);"></i><div><strong class="font-semibold text-lg">الإيمان بالقدر خيره وشره:</strong> الإيمان بأن كل ما يقع في الكون هو بتقدير الله وعلمه.</div></li>
        </ul>
        <p class="text-xs text-center opacity-50 mt-6">المرجع: حديث جبريل (رواه مسلم).</p>`
};

function populateDiscoverDetails() {
    for (const key in discoverContent) {
        const element = document.getElementById(key);
        if(element) element.innerHTML = discoverContent[key];
    }
}

const asmaUlHusna = [ {name: 'الرحمن', meaning: 'واسع الرحمة'}, {name: 'الرحيم', meaning: 'المعطي للرحمة'}, {name: 'الملك', meaning: 'مالك كل شيء'}, {name: 'القدوس', meaning: 'المنزه عن كل نقص'}, {name: 'السلام', meaning: 'الذي سلم من العيوب'}, {name: 'المؤمن', meaning: 'المصدق لرسله'}, {name: 'المهيمن', meaning: 'الرقيب على كل شيء'}, {name: 'العزيز', meaning: 'الغالب الذي لا يغلب'}, {name: 'الجبار', meaning: 'الذي ينفذ مشيئته'}, {name: 'المتكبر', meaning: 'المنفرد بالعظمة'}, {name: 'الخالق', meaning: 'الموجد للأشياء'}, {name: 'البارئ', meaning: 'الذي أوجد الخلق'}, {name: 'المصور', meaning: 'الذي صور المخلوقات'}, {name: 'الغفار', meaning: 'كثير المغفرة'}, {name: 'القهار', meaning: 'الغالب على كل شيء'}, {name: 'الوهاب', meaning: 'كثير العطاء'}, {name: 'الرزاق', meaning: 'المتكفل بالرزق'}, {name: 'الفتاح', meaning: 'الذي يفتح أبواب الخير'}, {name: 'العليم', meaning: 'الذي يعلم كل شيء'}, {name: 'القابض', meaning: 'الذي يضيق الرزق'}, {name: 'الباسط', meaning: 'الذي يوسع الرزق'}, {name: 'الخافض', meaning: 'الذي يخفض المتكبرين'}, {name: 'الرافع', meaning: 'الذي يرفع المؤمنين'}, {name: 'المعز', meaning: 'الذي يهب العزة'}, {name: 'المذل', meaning: 'الذي ينزع العزة'}, {name: 'السميع', meaning: 'الذي يسمع كل شيء'}, {name: 'البصير', meaning: 'الذي يرى كل شيء'}, {name: 'الحكم', meaning: 'الحاكم بين خلقه'}, {name: 'العدل', meaning: 'المنزه عن الظلم'}, {name: 'اللطيف', meaning: 'البر بعباده'}, {name: 'الخبير', meaning: 'العالم بدقائق الأمور'}, {name: 'الحليم', meaning: 'الذي لا يعاجل بالعقوبة'}, {name: 'العظيم', meaning: 'الذي له العظمة المطلقة'}, {name: 'الغفور', meaning: 'كثير المغفرة'}, {name: 'الشكور', meaning: 'الذي يجزي على القليل'}, {name: 'العلي', meaning: 'الرفيع فوق خلقه'}, {name: 'الكبير', meaning: 'الأكبر من كل شيء'}, {name: 'الحفيظ', meaning: 'الذي يحفظ كل شيء'}, {name: 'المقيت', meaning: 'خالق الأقوات'}, {name: 'الحسيب', meaning: 'الكافي لعباده'}, {name: 'الجليل', meaning: 'المتصف بصفات الجلال'}, {name: 'الكريم', meaning: 'كثير الخير والجود'}, {name: 'الرقيب', meaning: 'المطلع على كل شيء'}, {name: 'المجيب', meaning: 'الذي يجيب دعاء الداعين'}, {name: 'الواسع', meaning: 'الذي وسع رزقه'}, {name: 'الحكيم', meaning: 'المحكم في أفعاله'}, {name: 'الودود', meaning: 'المحب لعباده'}, {name: 'المجيد', meaning: 'المتناهي في المجد'}, {name: 'الباعث', meaning: 'الذي يبعث الموتى'}, {name: 'الشهيد', meaning: 'الشاهد على كل شيء'}, {name: 'الحق', meaning: 'الثابت وجوده'}, {name: 'الوكيل', meaning: 'المتكفل بأمور خلقه'}, {name: 'القوي', meaning: 'تام القدرة'}, {name: 'المتين', meaning: 'شديد القوة'}, {name: 'الولي', meaning: 'الناصر للمؤمنين'}, {name: 'الحميد', meaning: 'المستحق للحمد'}, {name: 'المحصي', meaning: 'الذي أحصى كل شيء'}, {name: 'المبدئ', meaning: 'الذي بدأ الخلق'}, {name: 'المعيد', meaning: 'الذي يعيد الخلق'}, {name: 'المحيي', meaning: 'الذي يهب الحياة'}, {name: 'المميت', meaning: 'الذي يسلب الحياة'}, {name: 'الحي', meaning: 'الدائم الحياة'}, {name: 'القيوم', meaning: 'القائم بنفسه'}, {name: 'الواجد', meaning: 'الغني الذي لا يفتقر'}, {name: 'الماجد', meaning: 'الكثير المجد'}, {name: 'الواحد', meaning: 'المنفرد في ذاته'}, {name: 'الأحد', meaning: 'المنفرد بالوحدانية'}, {name: 'الصمد', meaning: 'المقصود في الحوائج'}, {name: 'القادر', meaning: 'صاحب القدرة'}, {name: 'المقتدر', meaning: 'كامل القدرة'}, {name: 'المقدم', meaning: 'الذي يقدم من يشاء'}, {name: 'المؤخر', meaning: 'الذي يؤخر من يشاء'}, {name: 'الأول', meaning: 'الذي ليس قبله شيء'}, {name: 'الآخر', meaning: 'الذي ليس بعده شيء'}, {name: 'الظاهر', meaning: 'الظاهر فوق كل شيء'}, {name: 'الباطن', meaning: 'المحتجب عن الأبصار'}, {name: 'الوالي', meaning: 'المالك للأشياء'}, {name: 'المتعالي', meaning: 'المنزه عن صفات الخلق'}, {name: 'البر', meaning: 'المحسن لعباده'}, {name: 'التواب', meaning: 'الذي يقبل التوبة'}, {name: 'المنتقم', meaning: 'الذي يعاقب العصاة'}, {name: 'العفو', meaning: 'الذي يمحو السيئات'}, {name: 'الرؤوف', meaning: 'شديد الرحمة'}, {name: 'مالك الملك', meaning: 'صاحب الملك المطلق'}, {name: 'ذو الجلال والإكرام', meaning: 'صاحب العظمة والإحسان'}, {name: 'المقسط', meaning: 'العادل في حكمه'}, {name: 'الجامع', meaning: 'الذي يجمع الخلائق'}, {name: 'الغني', meaning: 'الذي لا يحتاج لشيء'}, {name: 'المغني', meaning: 'الذي يغني من يشاء'}, {name: 'المانع', meaning: 'الذي يمنع العطاء'}, {name: 'الضار', meaning: 'الذي يقدر الضر'}, {name: 'النافع', meaning: 'الذي يقدر النفع'}, {name: 'النور', meaning: 'الذي يهدي بنوره'}, {name: 'الهادي', meaning: 'المرشد إلى الحق'}, {name: 'البديع', meaning: 'المبدع للخلق'}, {name: 'الباقي', meaning: 'الدائم الوجود'}, {name: 'الوارث', meaning: 'الذي يبقى بعد فناء الخلق'}, {name: 'الرشيد', meaning: 'المرشد إلى الصواب'}, {name: 'الصبور', meaning: 'الذي لا يستعجل بالعقوبة'} ];

function initializeNamesGrid() {
    const grid = document.getElementById('names-grid-detail');
    grid.innerHTML = asmaUlHusna.map(item =>
        `<div class="card p-4 text-center">
            <p class="text-xl font-bold" style="color:var(--primary-color)">${item.name}</p>
            <p class="text-sm opacity-70">${item.meaning}</p>
         </div>`
    ).join('');
}

// --- Radio Player ---
const radioStations = [ { "id": 1, "name": "إذاعة أبو بكر الشاطري", "url": "https://backup.qurango.net/radio/shaik_abu_bakr_al_shatri", "img": "https://i1.sndcdn.com/artworks-000663801097-wb0y31-t200x200.jpg" }, { "id": 2, "name": " إذاعة أحمد خضر الطرابلسي", "url": "https://backup.qurango.net/radio/ahmad_khader_altarabulsi", "img": "https://i.pinimg.com/564x/d3/c2/9c/d3c29cc03198c3c15d380af048b2d68b.jpg" }, { "id": 3, "name": "إذاعة إبراهيم الأخضر", "url": "https://backup.qurango.net/radio/ibrahim_alakdar", "img": "https://static.suratmp3.com/pics/reciters/thumbs/44_600_600.jpg" }, { "id": 4, "name": "إذاعة خالد الجليل", "url": "https://backup.qurango.net/radio/khalid_aljileel", "img": "https://i1.sndcdn.com/avatars-ubX3f7yLm5eGyphJ-A4ysyA-t500x500.jpg" }, { "id": 5, "name": " إذاعة صلاح الهاشم", "url": "https://backup.qurango.net/radio/salah_alhashim", "img": "https://i.pinimg.com/564x/e9/22/1b/e9221b5ffd484937dc70c3eabe350c6f.jpg" }, { "id": 6, "name": "إذاعة صلاح بو خاطر", "url": "https://backup.qurango.net/radio/slaah_bukhatir", "img": "https://pbs.twimg.com/profile_images/1306502829251624960/uHKIJQpq_200x200.jpg" }, { "id": 7, "name": " إذاعة عبدالباسط عبدالصمد ", "url": "https://backup.qurango.net/radio/abdulbasit_abdulsamad_mojawwad", "img": "https://cdns-images.dzcdn.net/images/talk/06b711ac6da4cde0eb698e244f5e27b8/300x300.jpg" }, { "id": 8, "name": " إذاعة عبد العزيز سحيم", "url": "https://backup.qurango.net/radio/a_sheim", "img": "https://i.pinimg.com/564x/a7/37/47/a73747375897de4897da372a0fd921a0.jpg" }, { "id": 9, "name": " إذاعة فارس عباد", "url": "https://backup.qurango.net/radio/fares_abbad", "img": "https://static.suratmp3.com/pics/reciters/thumbs/15_600_600.jpg" }, { "id": 10, "name": "إذاعة ماهر المعيقلي", "url": "https://backup.qurango.net/radio/maher", "img": "https://is1-ssl.mzstatic.com/image/thumb/Podcasts113/v4/4b/80/58/4b80582d-78ca-a466-0341-0869bc611745/mza_5280524847349008894.jpg/250x250bb.jpg" }, { "id": 11, "name": " إذاعة محمد صديق المنشاوي", "url": "https://backup.qurango.net/radio/mohammed_siddiq_alminshawi_mojawwad", "img": "https://i1.sndcdn.com/artworks-000284633237-7gdg9t-t200x200.jpg" }, { "id": 12, "name": " إذاعة محمود خليل الحصري", "url": "https://backup.qurango.net/radio/mahmoud_khalil_alhussary_mojawwad", "img": "https://watanimg.elwatannews.com/image_archive/original_lower_quality/18194265071637693809.jpg" }, { "id": 13, "name": " إذاعة محمود علي البنا", "url": "https://backup.qurango.net/radio/mahmoud_ali__albanna_mojawwad", "img": "https://i.pinimg.com/200x/29/67/b3/2967b3fbc1ce1f5a70874288d34317bf.jpg" }, { "id": 14, "name": " إذاعة مشاري العفاسي", "url": "https://backup.qurango.net/radio/mishary_alafasi", "img": "https://i1.sndcdn.com/artworks-000019055020-yr9cjc-t200x200.jpg" }, { "id": 15, "name": " إذاعة ناصر القطامي", "url": "https://backup.qurango.net/radio/nasser_alqatami", "img": "https://i1.sndcdn.com/artworks-000096282703-s9wldh-t200x200.jpg" }, { "id": 16, "name": " إذاعة نبيل الرفاعي", "url": "https://backup.qurango.net/radio/nabil_al_rifay", "img": "https://i1.sndcdn.com/artworks-000161140408-wh6nhw-t200x200.jpg" }, { "id": 17, "name": "إذاعة هيثم الجدعاني", "url": "https://backup.qurango.net/radio/hitham_aljadani", "img": "https://ar.islamway.net/uploads/authors/3948.jpg" }, { "id": 18, "name": " إذاعة ياسر الدوسري", "url": "https://backup.qurango.net/radio/yasser_aldosari", "img": "https://www.almowaten.net/wp-content/uploads/2022/06/%D9%8A%D8%A7%D8%B3%D8%B1-%D8%A7%D9%84%D8%AF%D9%88%D8%B3%D8%B1%D9%8A.jpg" }, { "id": 19, "name": "إذاعة القرأن الكريم من القاهرة", "url": "https://n0e.radiojar.com/8s5u5tpdtwzuv?rj-ttl=5&rj-tok=AAABjW7yROAA0TUU8cXhXIAi6g", "img": "https://apkdownmod.com/thumbnail?src=images/appsicon/2020/08/app-image-5f42ba68a61b1.jpg" }, { "id": 20, "name": "إذاعة السنة النبوية", "url": "https://n01.radiojar.com/x0vs2vzy6k0uv?rj-ttl=5&rj-tok=AAABjW751GcA4NgCI8-5DCpCHQ", "img": "https://i.pinimg.com/564x/55/16/ab/5516abd3744c3d0b0a7b28bedd5474c0.jpg" }, { "id": 21, "name": "إذاعة تلاوات خاشعة", "url": "https://backup.qurango.net/radio/salma", "img": "https://pbs.twimg.com/profile_images/1396812808659079169/5ft2haLD_400x400.jpg" }, { "id": 22, "name": "إذاعة الرقية الشرعية", "url": "https://backup.qurango.net/radio/roqiah", "img": "https://i1.sndcdn.com/artworks-zygACgAd2NKwuohE-UF2Piw-t500x500.jpg" }, { "id": 23, "name": "إذاعة تكبيرات العيد", "url": "https://backup.qurango.net/radio/eid", "img": "https://i.pinimg.com/736x/3c/b3/fc/3cb3fc494b9f8332a7b7b3256e3d9822.jpg" }, { "id": 24, "name": "المختصر في تفسير القرآن الكريم", "url": "https://backup.qurango.net/radio/mukhtasartafsir", "img": "https://areejquran.net/wp-content/uploads/2015/12/unnamed.jpg" } ];

function initializeWaveform(container) {
    let barsHtml = '';
    for (let i = 0; i < 25; i++) {
        barsHtml += `<span style="animation-delay: -${(Math.random() * 3).toFixed(2)}s; height: ${Math.floor(Math.random() * 20) + 5}px"></span>`;
    }
    container.innerHTML = barsHtml;
}

function initializeRadioPlayer() {
    const radioGrid = document.getElementById('radio-grid');
    const playerBar = document.getElementById('radio-player-bar');
    const playerImg = document.getElementById('radio-player-img');
    const playerName = document.getElementById('radio-player-name');
    const playerStatus = document.getElementById('radio-player-status');
    const audio = document.getElementById('radio-audio-element');
    const playPauseBtn = document.getElementById('radio-play-pause-btn');
    const closeBtn = document.getElementById('radio-close-btn');
    const waveformContainer = document.getElementById('radio-waveform');

    radioGrid.innerHTML = radioStations.map(station => `
        <div class="radio-card" data-name="${station.name}" data-img="${station.img}" data-url="${station.url}">
            <div class="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center text-white p-2 text-center rounded-lg">
                <span class="font-semibold">${station.name}</span>
            </div>
            <img src="${station.img}" alt="${station.name}" class="w-full h-full object-cover aspect-square" onerror="this.onerror=null;this.src='https://placehold.co/200x200/00897b/ffffff?text=${station.name.split(' ').pop()}';">
        </div>
    `).join('');

    radioGrid.addEventListener('click', function(e) {
        const card = e.target.closest('.radio-card');
        if (card) {
            const { name, img, url } = card.dataset;
            playRadio(name, img, url, card);
        }
    });

    function playRadio(name, img, url, card) {
        playerBar.classList.add('active');
        playerImg.src = img;
        playerName.textContent = name;
        playerStatus.textContent = "جاري التحميل...";
        audio.src = url;
        const playPromise = audio.play();

        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.error("Playback failed for:", url, error);
                playerStatus.textContent = "فشل التشغيل";
            });
        }

        document.querySelectorAll('.radio-card').forEach(c => c.classList.remove('playing'));
        card.classList.add('playing');
    }
    
    audio.onplaying = () => {
        playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        playerStatus.textContent = "جاري التشغيل...";
        waveformContainer.classList.remove('paused');
    };
    audio.onpause = () => {
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        waveformContainer.classList.add('paused');
        playerStatus.textContent = "متوقف مؤقتاً";
    };
    audio.onerror = () => {
        console.error("Error loading radio station.");
        playerStatus.textContent = "خطأ في تحميل الإذاعة";
        waveformContainer.classList.add('paused');
    };
    
    playPauseBtn.addEventListener('click', () => {
        if (audio.paused) {
            if(audio.src) {
                const playPromise = audio.play();
                if (playPromise !== undefined) {
                    playPromise.catch(e => console.error("Error playing on click:", e));
                }
            }
        } else {
            audio.pause();
        }
    });

    closeBtn.addEventListener('click', () => {
        audio.pause();
        audio.src = '';
        playerBar.classList.remove('active');
        document.querySelectorAll('.radio-card').forEach(c => c.classList.remove('playing'));
    });
}

// --- Daily Recitation Player ---
function initializeDailyRecitationPlayer() {
    const audio = document.getElementById('daily-recitation-audio');
    const canvas = document.getElementById('daily-recitation-canvas');
    const timeDisplay = document.getElementById('daily-recitation-time');
    const ctx = canvas.getContext('2d');
    let audioContext, analyser, source, dataArray, animationFrameId;

    let isPlaying = false;
    let hasBeenInitialized = false;

    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    
    audio.addEventListener('loadedmetadata', () => {
        timeDisplay.textContent = formatTime(audio.duration);
    });
    
    audio.addEventListener('timeupdate', () => {
         timeDisplay.textContent = formatTime(audio.currentTime);
    });

    function setupAudioContext() {
        if (hasBeenInitialized) return;
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        source = audioContext.createMediaElementSource(audio);
        source.connect(analyser);
        analyser.connect(audioContext.destination);
        analyser.fftSize = 128;
        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);
        hasBeenInitialized = true;
    }

    function draw() {
        animationFrameId = requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);
        
        const isDark = document.documentElement.classList.contains('dark');
        const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim();
        const textColor = isDark ? '#e0e0e0' : '#263238';

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const barWidth = 3;
        const gap = 2;
        const numBars = Math.floor(canvas.width / (barWidth + gap));
        const step = Math.floor(dataArray.length / numBars);

        for (let i = 0; i < numBars; i++) {
            const barHeight = (dataArray[i * step] / 255) * canvas.height * 0.8 + canvas.height * 0.1;
            const x = i * (barWidth + gap);
            const y = (canvas.height - barHeight) / 2;
            ctx.fillStyle = i * (barWidth + gap) < (audio.currentTime / audio.duration) * canvas.width ? primaryColor : textColor;
            ctx.fillRect(x, y, barWidth, barHeight);
        }

        const progressX = (audio.currentTime / audio.duration) * canvas.width;
        ctx.fillStyle = 'red';
        ctx.fillRect(progressX, 0, 2, canvas.height);
    }

    canvas.addEventListener('click', () => {
        if (!hasBeenInitialized) {
            setupAudioContext();
        }
        
         if (audioContext.state === 'suspended') {
            audioContext.resume();
        }

        if (isPlaying) {
            audio.pause();
            cancelAnimationFrame(animationFrameId);
        } else {
            audio.play();
            draw();
        }
        isPlaying = !isPlaying;
    });
}


// --- NEW SECTIONS ---

// --- Hadith Section ---
let allHadiths = [];
async function initializeHadithLibrary() {
    const hadithListEl = document.getElementById('hadith-list');
    try {
        showLoading('hadith-list');
        const response = await fetch('https://raw.githubusercontent.com/fawazahmed0/hadith-api/1/editions/ara-muslim/sections/1.json');
        if (!response.ok) throw new Error('Failed to load Hadiths');
        const data = await response.json();
        allHadiths = data.hadiths;
        displayHadiths(allHadiths); 
    } catch (error) {
        showError('hadith-list', 'فشل تحميل الأحاديث. الرجاء المحاولة مرة أخرى.');
        console.error(error);
    }
    
    document.getElementById('hadith-search').addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        if (searchTerm.length > 2) {
            const filteredHadiths = allHadiths.filter(h => h.text.toLowerCase().includes(searchTerm));
            displayHadiths(filteredHadiths);
        } else if (searchTerm.length === 0) {
             displayHadiths(allHadiths);
        }
    });
}
function displayHadiths(hadiths) {
     const hadithListEl = document.getElementById('hadith-list');
     if (hadiths.length === 0) {
         hadithListEl.innerHTML = '<p class="text-center opacity-70">لم يتم العثور على نتائج.</p>';
         return;
     }
     hadithListEl.innerHTML = hadiths.map(hadith => `
        <div class="p-4 border-b dark:border-gray-700">
            <p class="text-lg leading-loose mb-2">${hadith.text}</p>
            <p class="font-bold" style="color:var(--primary-color)">صحيح مسلم</p>
        </div>
     `).join('');
}

// --- Dua Section ---
const duaData = {
    quran: { name: "من القرآن", items: [
        {text: "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ"},
        {text: "رَبَّنَا لَا تُزِغْ قُلُوبَنَا بَعْدَ إِذْ هَدَيْتَنَا وَهَبْ لَنَا مِنْ لَدُنْكَ رَحْمَةً إِنَّكَ أَنْتَ الْوَهَّابُ"},
        {text: "رَبِّ اجْعَلْنِي مُقِيمَ الصَّلَاةِ وَمِنْ ذُرِّيَّتِي رَبَّنَا وَتَقَبَّلْ دُعَاءِ"},
        {text: "رَبَّنَا اغْفِرْ لِي وَلِوَالِدَيَّ وَلِلْمُؤْمِنِينَ يَوْمَ يَقُومُ الْحِسَابُ"}
    ] },
    sunnah: { name: "من السنة", items: [
        {text: "اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي الدُّنْيَا وَالْآخِرَةِ، اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي دِينِي وَدُنْيَايَ وَأَهْلِي وَمَالِي، اللَّهُمَّ اسْتُرْ عَوْرَاتِي وَآمِنْ رَوْعَاتِي، اللَّهُمَّ احْفَظْنِي مِنْ بَيْنِ يَدَيَّ وَمِنْ خَلْفِي وَعَنْ يَمِينِي وَعَنْ شِمَالِي وَمِنْ فَوْقِي وَأَعُوذُ بِعَظَمَتِكَ أَنْ أُغْتَالَ مِنْ تَحْتِي"},
        {text: "اللَّهُمَّ إنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ، وَالْعَجْزِ وَالْكَسَلِ، وَالْبُخْلِ وَالْجُبْنِ، وَضَلَعِ الدَّيْنِ وَغَلَبَةِ الرِّجَالِ"},
        {text: "يَا مُقَلِّبَ الْقُلُوبِ ثَبِّتْ قَلْبِي عَلَى دِينِكَ"}
    ] },
    travel: { name: "دعاء السفر", items: [
        {text: "الله أكبر، الله أكبر، الله أكبر، سُبْحانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ * وَإِنَّا إِلَى رَبِّنَا لَمُنقَلِبُونَ. اللهم إنا نسألك في سفرنا هذا البر والتقوى، ومن العمل ما ترضى..."}
    ]},
    sickness: { name: "للمريض", items: [
        {text: "أَذْهِبِ الْبَاسَ رَبَّ النَّاسِ، وَاشْفِ أَنْتَ الشَّافِي، لاَ شِفَاءَ إِلاَّ شِفَاؤُكَ، شِفَاءً لاَ يُغَادِرُ سَقَمًا"}
    ]}
};
function initializeDuaSection() {
     const tabsContainer = document.getElementById('dua-tabs');
     const contentContainer = document.getElementById('dua-content');
    
     tabsContainer.innerHTML = Object.keys(duaData).map((key, index) => 
        `<button class="azkar-tab ${index === 0 ? 'active' : ''}" data-target="${key}">${duaData[key].name}</button>`
    ).join('');

     function displayDua(key) {
         contentContainer.innerHTML = duaData[key].items.map(item =>
            `<div class="card p-4">
                <p class="quran-text text-xl leading-relaxed">${item.text}</p>
                 <div class="flex items-center gap-2 mt-4">
                   <button class="btn btn-sm" onclick="copyToClipboard('${item.text}')"><i class="fas fa-copy"></i> نسخ</button>
                </div>
            </div>`
        ).join('');
     }

     tabsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('azkar-tab')) {
            tabsContainer.querySelectorAll('.azkar-tab').forEach(tab => tab.classList.remove('active'));
            e.target.classList.add('active');
            displayDua(e.target.dataset.target);
        }
    });
    displayDua(Object.keys(duaData)[0]);
}

// --- Seerah Section ---
const seerahData = {
    before: { name: "قبل البعثة", content: `<ul class="list-disc pr-4 space-y-3">
        <li><strong class="text-teal-600 dark:text-teal-400">مولده الشريف:</strong> ولد ﷺ يتيماً في مكة في عام الفيل، وكان مولده إيذاناً ببدء فجر جديد للبشرية.</li>
        <li><strong class="text-teal-600 dark:text-teal-400">رضاعته وطفولته:</strong> أرضعته حليمة السعدية في بادية بني سعد، فنشأ في بيئة صحراوية نقية أكسبته فصاحة اللسان وقوة البنيان.</li>
        <li><strong class="text-teal-600 dark:text-teal-400">شبابه:</strong> عُرف في شبابه بـ <span class="highlight">الصادق الأمين</span>، وعمل برعي الغنم ثم بالتجارة، فأظهر مهارة وأمانة لا مثيل لهما.</li>
        <li><strong class="text-teal-600 dark:text-teal-400">زواجه:</strong> تزوج من السيدة خديجة بنت خويلد رضي الله عنها، وكانت له نعم الزوجة والسند.</li>
    </ul>` },
    meccan: { name: "العهد المكي", content: `<ul class="list-disc pr-4 space-y-3">
        <li><strong class="text-teal-600 dark:text-teal-400">نزول الوحي:</strong> بدأ نزول الوحي عليه في غار حراء وهو في سن الأربعين، حيث جاءه جبريل بأولى آيات القرآن "اقرأ".</li>
        <li><strong class="text-teal-600 dark:text-teal-400">الدعوة السرية:</strong> استمرت ثلاث سنوات، أسلم فيها السابقون الأولون كأبي بكر وعلي وخديجة وزيد بن حارثة.</li>
        <li><strong class="text-teal-600 dark:text-teal-400">الدعوة الجهرية:</strong> بدأت بعد أمر الله، وقوبلت بالرفض والإيذاء الشديد من سادة قريش.</li>
        <li><strong class="text-teal-600 dark:text-teal-400">الهجرة إلى الحبشة:</strong> هاجر بعض المسلمين فراراً بدينهم إلى ملك عادل لا يُظلم عنده أحد.</li>
        <li><strong class="text-teal-600 dark:text-teal-400">عام الحزن:</strong> توفيت فيه زوجته السيدة خديجة وعمه أبو طالب، اللذان كانا أكبر داعمين له.</li>
        <li><strong class="text-teal-600 dark:text-teal-400">الإسراء والمعراج:</strong> رحلته المعجزة من مكة إلى بيت المقدس ثم إلى السماوات العلى، حيث فُرضت الصلاة.</li>
    </ul>` },
    medinan: { name: "العهد المدني", content: `<ul class="list-disc pr-4 space-y-3">
        <li><strong class="text-teal-600 dark:text-teal-400">الهجرة إلى المدينة:</strong> هاجر ﷺ وأصحابه إلى يثرب (المدينة المنورة) وأسس فيها أول دولة إسلامية قائمة على العدل والإخاء.</li>
        <li><strong class="text-teal-600 dark:text-teal-400">بناء المجتمع:</strong> آخى بين المهاجرين والأنصار، وبنى المسجد النبوي ليكون مركزاً للعبادة والحكم والتعليم.</li>
        <li><strong class="text-teal-600 dark:text-teal-400">الغزوات:</strong> خاض المسلمون غزوات للدفاع عن دينهم ودولتهم، أهمها بدر (نصر مبين)، وأحد (درس في الطاعة)، والخندق (ابتلاء وصبر).</li>
        <li><strong class="text-teal-600 dark:text-teal-400">صلح الحديبية:</strong> كان فتحاً مبيناً للمسلمين رغم شروطه التي بدت مجحفة في ظاهرها.</li>
        <li><strong class="text-teal-600 dark:text-teal-400">فتح مكة:</strong> عاد ﷺ إلى مكة فاتحاً في العام الثامن للهجرة، ودخلها متواضعاً وعفا عن أهلها.</li>
        <li><strong class="text-teal-600 dark:text-teal-400">حجة الوداع ووفاته:</strong> حج بالمسلمين وألقى خطبته الشهيرة التي أرسى فيها قواعد الدين، ثم توفي في المدينة بالعام الحادي عشر للهجرة بعد أن أتم الرسالة وأدى الأمانة.</li>
    </ul>` }
};
function initializeSeerahSection() {
    const tabs = document.getElementById('seerah-tabs');
    const content = document.getElementById('seerah-content');
    tabs.innerHTML = Object.keys(seerahData).map((key, index) => 
        `<button class="azkar-tab ${index === 0 ? 'active' : ''}" data-key="${key}">${seerahData[key].name}</button>`
    ).join('');

    tabs.addEventListener('click', e => {
        if(e.target.classList.contains('azkar-tab')) {
            tabs.querySelectorAll('.azkar-tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            content.innerHTML = seerahData[e.target.dataset.key].content;
        }
    });
    content.innerHTML = seerahData.before.content;
}

// --- Calendar Section ---
let currentMoment = moment();
function initializeCalendar() {
    const islamicEvents = { '1-1': 'رأس السنة الهجرية', '10-1': 'يوم عاشوراء', '12-3': 'مولد النبي ﷺ', '1-7': 'الإسراء والمعراج', '1-9': 'بداية رمضان', '1-10': 'عيد الفطر', '10-12': 'يوم عرفة', '11-12': 'عيد الأضحى' };
    document.getElementById('islamic-events').innerHTML = Object.values(islamicEvents).map(e => `<li>${e}</li>`).join('');
    
    document.getElementById('prev-month-btn').addEventListener('click', () => { currentMoment.subtract(1, 'iMonth'); renderCalendar(); });
    document.getElementById('next-month-btn').addEventListener('click', () => { currentMoment.add(1, 'iMonth'); renderCalendar(); });
    renderCalendar();
}
function renderCalendar() {
    moment.locale('ar-SA');
    document.getElementById('calendar-title').textContent = currentMoment.format('iMMMM iYYYY');
    
    const grid = document.getElementById('calendar-grid');
    const headers = document.getElementById('calendar-headers');
    grid.innerHTML = '';
    headers.innerHTML = moment.weekdaysShort().map(day => `<div class="calendar-header">${day}</div>`).join('');

    const startOfMonth = currentMoment.clone().startOf('iMonth');
    const endOfMonth = currentMoment.clone().endOf('iMonth');
    const startDay = startOfMonth.day();

    for (let i = 0; i < startDay; i++) {
        grid.innerHTML += `<div class="calendar-day other-month"></div>`;
    }

    for (let m = startOfMonth.clone(); m.isSameOrBefore(endOfMonth); m.add(1, 'days')) {
        const isToday = m.isSame(moment(), 'day');
        grid.innerHTML += `<div class="calendar-day ${isToday ? 'today' : ''}">
            <span class="text-lg">${m.format('iD')}</span>
            <br>
            <span class="text-xs opacity-70">${m.format('D MMM')}</span>
        </div>`;
    }
}
// --- Initialization ---
async function initializeApp() {
    showPage('home', document.querySelector('.nav-link[href="#home"]'));
    fetchDailyContent();
    fetchSurahList();
    initializeAzkarTabs();
    initializeHijriWidget();
    populateDiscoverDetails();
    initializeNamesGrid();
    initializeLocationSelector();
    setupQibla();
    initializeRadioPlayer();
    initializeWaveform(document.getElementById('radio-waveform'));
    initializeDailyRecitationPlayer();
    initializeHadithLibrary();
    initializeDuaSection();
    initializeSeerahSection();
    initializeCalendar();
}

document.addEventListener('DOMContentLoaded', initializeApp);
