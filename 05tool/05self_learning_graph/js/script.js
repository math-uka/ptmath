document.addEventListener('DOMContentLoaded', () => {
    loadVoices();
    fetchJsonFileList();
});

let wordData = [];
let quizArray = [];
let currentIndex = 0;
let voices = [];
let voicesLoaded = false;
let selectedWords = [];
let timerInterval = null;
let timeLeft = 60;
let quizMode = '';
let currentJsonFile = '';

function loadVoices() {
    return new Promise((resolve) => {
        voices = speechSynthesis.getVoices();
        if (voices.length > 0) {
            voicesLoaded = true;
            resolve();
        } else {
            speechSynthesis.onvoiceschanged = () => {
                voices = speechSynthesis.getVoices();
                voicesLoaded = true;
                resolve();
            };
        }
    });
}

async function fetchJsonFileList() {
    try {
        console.log('Attempting to load file.json');
        const response = await fetch('./file.json');
        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }
        const jsonFiles = await response.json();
        console.log('Loaded JSON file list:', jsonFiles);
        generateJsonButtons(jsonFiles);
    } catch (error) {
        console.error('Failed to load file.json:', error);
        document.getElementById('jsonButtons').innerHTML = 
            `<p class="error-message">無法載入 file.json：${error.message}。使用備用檔案清單...</p>`;
        const fallbackFiles = ['data'];
        generateJsonButtons(fallbackFiles);
    }
}

function generateJsonButtons(jsonFiles) {
    console.log('Generating JSON buttons for files:', jsonFiles);
    const buttonContainer = document.getElementById('jsonButtons');
    if (!buttonContainer) {
        console.error('jsonButtons element not found');
        return;
    }
    let buttonHtml = '';
    jsonFiles.forEach(file => {
        buttonHtml += `<button onclick="loadJson('${file}')">${file}</button>`;
    });
    buttonContainer.innerHTML = buttonHtml;
    if (jsonFiles.length === 0) {
        buttonContainer.innerHTML = '<p class="error-message">未找到 JSON 檔案，請檢查 file.json。</p>';
    }
}

async function fetchData(jsonFile) {
    try {
        console.log(`Attempting to load js/${jsonFile}.json`);
        const response = await fetch(`js/${jsonFile}.json`);
        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }
        const data = await response.json();
        console.log('Loaded data:', data);
        wordData = Object.entries(data).map(([key, value]) => ({
            id: key,
            word: value,
            image: `images/${jsonFile}/${key}.png`
        }));
        if (wordData.length === 0) {
            throw new Error('JSON file contains no valid data');
        }
        generateTable();
        document.getElementById('inputContainer').style.display = 'none';
        document.getElementById('mainContainer').style.display = 'block';
    } catch (error) {
        console.error(`Failed to load js/${jsonFile}.json:`, error);
        document.getElementById('tableContainer').innerHTML = 
            `<p class="error-message">無法載入 js/${jsonFile}.json：${error.message}。請檢查檔案路徑或格式。正在使用備用數據...</p>`;
        wordData = [
            { id: '01', word: 'Apple', image: `images/${jsonFile}/01.png` },
            { id: '02', word: 'Boy', image: `images/${jsonFile}/02.png` }
        ];
        generateTable();
        document.getElementById('inputContainer').style.display = 'none';
        document.getElementById('mainContainer').style.display = 'block';
    }
}

function generateTable() {
    console.log('Generating table with data:', wordData);
    let tableHtml = '<table><tr><th>編號</th><th>圖片</th><th>詞語</th><th>發音</th></tr>';
    wordData.forEach((item, index) => {
        const escapedWord = item.word.replace(/'/g, "\\'");
        tableHtml += `<tr><td>${index + 1}</td><td><img src="${item.image}" alt="${item.word}" onerror="this.alt='圖片載入失敗'"></td><td>${item.word}</td><td><button class="play-button" onclick="speak('${escapedWord}')">播放</button></td></tr>`;
    });
    tableHtml += '</table>';
    document.getElementById('tableContainer').innerHTML = tableHtml;
}

async function speak(text) {
    if (!voicesLoaded) {
        await loadVoices();
    }
    const utterance = new SpeechSynthesisUtterance(text);
    let selectedVoice = voices.find(voice => 
        (voice.lang === 'en-US' || voice.lang === 'en-GB') && 
        (voice.name.includes('Samantha') || voice.name.includes('Victoria') || 
         voice.name.includes('Karen') || voice.name.includes('Female') || 
         voice.name.includes('Siri') && voice.localService)
    ) || voices.find(voice => voice.lang.startsWith('en'));
    utterance.lang = 'en-US';
    if (selectedVoice) {
        utterance.voice = selectedVoice;
    }
    utterance.rate = 0.7;
    utterance.pitch = 1.1;
    utterance.volume = 1.0;
    if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
    }
    speechSynthesis.speak(utterance);
}

function loadJson(jsonFile) {
    console.log('Loading JSON file:', jsonFile);
    currentJsonFile = jsonFile;
    fetchData(jsonFile);
}

function startQuizMode() {
    document.getElementById('mainContainer').style.display = 'none';
    document.getElementById('quizContainer').style.display = 'block';
    document.getElementById('modeSelection').style.display = 'block';
    document.getElementById('currentWord').style.display = 'none';
    document.getElementById('currentImage').style.display = 'none';
    document.getElementById('timerDisplay').style.display = 'none';
    document.querySelector('.quiz-buttons').style.display = 'none';
    document.getElementById('resultContainer').innerHTML = '';
}

function startQuiz(mode) {
    if (wordData.length === 0) {
        alert('沒有可用的詞語！');
        return;
    }
    quizMode = mode;
    quizArray = [...wordData].sort(() => Math.random() - 0.5);
    currentIndex = 0;
    selectedWords = [];
    document.getElementById('modeSelection').style.display = 'none';
    document.getElementById('currentWord').style.display = quizMode === 'audio' ? 'block' : 'none';
    document.getElementById('currentImage').style.display = quizMode === 'image' ? 'block' : 'none';
    document.getElementById('timerDisplay').style.display = 'block';
    document.querySelector('.quiz-buttons').style.display = 'flex';
    showCurrentWord();
}

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timeLeft = 60;
    updateTimerDisplay();
    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            nextWord();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    document.getElementById('timerDisplay').textContent = 
        `剩餘時間: ${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function showCurrentWord() {
    if (currentIndex < quizArray.length) {
        const item = quizArray[currentIndex];
        document.getElementById('currentWord').textContent = `第 ${currentIndex + 1} 個詞語`;
        document.getElementById('currentImage').innerHTML = quizMode === 'image' ? 
            `<img src="${item.image}" alt="${item.word}" onerror="this.alt='圖片載入失敗'">` : '';
        if (quizMode === 'audio') {
            speak(item.word);
        }
        startTimer();
    } else {
        endQuiz();
    }
}

function replay() {
    if (currentIndex < quizArray.length) {
        const item = quizArray[currentIndex];
        if (quizMode === 'audio') {
            speak(item.word);
        } else {
            document.getElementById('currentImage').innerHTML = 
                `<img src="${item.image}" alt="${item.word}" onerror="this.alt='圖片載入失敗'">`;
        }
    }
}

function nextWord() {
    clearInterval(timerInterval);
    currentIndex++;
    showCurrentWord();
}

function endQuiz() {
    clearInterval(timerInterval);
    document.getElementById('currentWord').textContent = '全部結束！';
    document.getElementById('currentImage').innerHTML = '';
    document.getElementById('timerDisplay').textContent = '';
    let resultHtml = '<h3>剛剛的詞語：</h3><div class="word-buttons">';
    quizArray.forEach(item => {
        const escapedWord = item.word.replace(/'/g, "\\'");
        resultHtml += `<button class="word-button" onclick="toggleWord('${escapedWord}', this); speak('${escapedWord}')">${item.word}</button>`;
    });
    resultHtml += '</div><div class="button-group"><button onclick="retest()">返回主頁</button></div>';
    document.getElementById('resultContainer').innerHTML = resultHtml;
}

function toggleWord(word, button) {
    const index = selectedWords.indexOf(word);
    if (index === -1) {
        selectedWords.push(word);
        button.classList.add('selected');
    } else {
        selectedWords.splice(index, 1);
        button.classList.remove('selected');
    }
}

function retest() {
    clearInterval(timerInterval);
    document.getElementById('quizContainer').style.display = 'none';
    document.getElementById('mainContainer').style.display = 'block';
}
