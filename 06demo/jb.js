/**
 * Modified JavaScript code with added fireworks effect for correct answers and red flash effect for incorrect answers.
 * Fireworks use a dynamically created canvas for particle animation.
 * Red flash effect uses CSS animation applied to the quiz container or body for 1.2 seconds.
 * No changes to the HTML file are required.
 */

// 標準模式的預設題目數量和允許錯誤數
let STANDARD_MODE_QUESTION_COUNT = 10;
let STANDARD_MODE_MAX_WRONG = 1;

let quizData = {};
let questionBank = [];
let challengeBank = [];
let hasChallengeBank = false;
let aiBank = [];
let hasAIBank = false;
let quizTitle = "自我測驗";
let challengeTitle = "挑戰測驗";
let aiTitle = "AI測驗";
let currentTitle = quizTitle;
let fibQuestionBank = [];
let passwordBank = {};
let hasPasswordBank = false;
let hasFibBank = false;
let hasQuizBank = false;
let availableQuestions = [];
let availableChallengeQuestions = [];
let availableAIQuestions = [];
let usedFibQuestions = new Set();
let wrongQuestions = new Set();
let wrongCount = 0;
let quizNumber = 1;
let totalQuestions = 0;
let currentQuestionCount = 0;
let isStandardMode = false;
let isAiMode = false;
let isEndlessMode = false;
let passwordRetrieved = false;
let currentFibQuestion = null;
let isAnswerShown = false;
let consecutiveCorrect = 0;
let isChallengeMode = false;
let lastIncorrect = false;
let hasTotalConfig = false;
let questionBankSources = [];
let wrongCountToday = 0;
const MAX_COUNTDOWN_SECONDS = 20;
const BASE_COUNTDOWN_SECONDS = 5;
let currentLevel = 0;
let levelQuestions = [];
let apiConfig = {};
let endlessStartTime = null;
let usedEndlessQuestions = new Set();

// Fireworks canvas for correct answer effect
let fireworksCanvas = null;
let fireworksCtx = null;
let particles = [];

function initializeWrongCount() {
  const today = new Date().toDateString();
  const storedDate = localStorage.getItem('wrongCountDate');
  if (storedDate !== today) {
    localStorage.setItem('wrongCountDate', today);
    localStorage.setItem('wrongCountToday', '0');
    wrongCountToday = 0;
  } else {
    wrongCountToday = parseInt(localStorage.getItem('wrongCountToday') || '0', 10);
  }
}

function updateTitle(title) {
  currentTitle = title;
  document.getElementById('quiz-title').textContent = isStandardMode ? `${title} - 第 ${currentLevel + 1} 關` : isEndlessMode ? `${title} - 無盡模式` : title;
  document.title = isStandardMode ? `${title} - 第 ${currentLevel + 1} 關 - 測驗 ${quizNumber}` : isEndlessMode ? `${title} - 無盡模式 - 測驗 ${quizNumber}` : `${title} - 測驗 ${quizNumber}`;
}

function setChallengeModeStyle(isChallenge) {
  const container = document.getElementById('quiz-container') || document.body;
  if (isChallenge) {
    container.style.backgroundColor = '#ffcccc'; // 紅底
    document.getElementById('feedback').innerHTML = '進入挑戰模式！';
    document.getElementById('feedback').style.color = 'darkred';
    MathJax.typeset();
    setTimeout(() => {
      document.getElementById('feedback').innerHTML = '';
    }, 2000);
  } else {
    container.style.backgroundColor = '#ffffff'; // 恢復白色背景
  }
}

// Red flash effect for incorrect answers
function startRedFlash() {
  const container = document.getElementById('quiz-container') || document.body;
  // Create a style element for the flash animation
  let style = document.getElementById('red-flash-style');
  if (!style) {
    style = document.createElement('style');
    style.id = 'red-flash-style';
    document.head.appendChild(style);
  }
  style.innerHTML = `
    @keyframes redFlash {
      0%, 100% { background-color: #ffffff; }
      50% { background-color: #ff5555; }
    }
    .red-flash {
      animation: redFlash 1.2s ease-in-out;
    }
  `;
  container.classList.add('red-flash');
  setTimeout(() => {
    container.classList.remove('red-flash');
  }, 1200);
}

async function loadData() {
  const loadingMessageDiv = document.getElementById('loading-message');
  const errorMessageDiv = document.getElementById('error-message');
  const standardModeBtn = document.getElementById('standard-mode-btn');

  initializeWrongCount();

  try {
    updateTitle(quizTitle);

    // 加載 api.json 以備用
    let useApi = false;
    try {
      console.log('開始檢查 api.json');
      const apiResponse = await fetch('api.json');
      if (!apiResponse.ok) {
        console.warn(`無法載入 api.json：HTTP 狀態 ${apiResponse.status}，將僅使用本地文件`);
      } else {
        apiConfig = await apiResponse.json();
        if (apiConfig && apiConfig.useApi === true && apiConfig.endpoints && typeof apiConfig.endpoints === 'object') {
          useApi = true;
          console.log('api.json 載入成功，將在本地文件失敗時從 API 獲取 num 系列數據');
        } else {
          console.warn('api.json 格式錯誤或未設置 useApi 為 true，將僅使用本地文件');
        }
      }
    } catch (error) {
      console.warn('api.json 載入失敗，將僅使用本地文件：', error.message);
    }

    try {
      console.log('開始載入 total.json');
      const totalResponse = await fetch('total.json');
      if (!totalResponse.ok) {
        console.warn(`無法載入 total.json：HTTP 狀態 ${totalResponse.status}，使用預設標準模式設定（10題，允許錯1題）`);
        hasTotalConfig = false;
      } else {
        const totalData = await totalResponse.json();
        if (!totalData || typeof totalData !== 'object' || !Number.isInteger(totalData.questionCount) || !Number.isInteger(totalData.maxWrong) || totalData.questionCount < 1 || totalData.maxWrong < 0) {
          console.warn('total.json 格式錯誤或數值無效，使用預設標準模式設定（10題，允許錯1題）');
          hasTotalConfig = false;
        } else {
          hasTotalConfig = true;
          STANDARD_MODE_QUESTION_COUNT = totalData.questionCount;
          STANDARD_MODE_MAX_WRONG = totalData.maxWrong;
          console.log('total.json 加載成功：', {
            questionCount: STANDARD_MODE_QUESTION_COUNT,
            maxWrong: STANDARD_MODE_MAX_WRONG
          });
        }
      }
    } catch (error) {
      console.warn('total.json 載入失敗，使用預設標準模式設定（10題，允許錯1題）：', error.message);
      hasTotalConfig = false;
    }

    try {
      console.log('開始載入 fib.json');
      const fibResponse = await fetch('fib.json');
      if (!fibResponse.ok) {
        console.warn(`無法載入 fib.json：HTTP 狀態 ${fibResponse.status}，填空模式將不可用`);
        hasFibBank = false;
      } else {
        const fibData = await fibResponse.json();
        if (!Array.isArray(fibData) || fibData.length === 0 || !fibData[0].question) {
          console.warn('fib.json 為空或格式錯誤，填空模式將不可用');
          hasFibBank = false;
        } else {
          hasFibBank = true;
          fibQuestionBank = fibData;
          if (fibData.title) {
            quizTitle = fibData.title;
            updateTitle(quizTitle);
          }
          console.log('填空題題庫加載成功，題目數：', fibQuestionBank.length);
          const modeSelection = document.getElementById('mode-selection');
          const fibButton = document.createElement('button');
          fibButton.id = 'fib-mode-btn';
          fibButton.textContent = '填空或解答題';
          fibButton.onclick = startFibMode;
          modeSelection.appendChild(fibButton);
        }
      }
    } catch (error) {
      console.warn('填空題題庫載入失敗，填空模式將不可用：', error.message);
      hasFibBank = false;
    }

    questionBank = [];
    questionBankSources = [];
    hasQuizBank = false;
    levelQuestions = [];
    for (let i = 0; i <= 4; i++) {
      const filename = i === 0 ? 'num.json' : `num${i}.json`;
      let quizData = null;
      let source = `local_${filename}`;

      try {
        console.log(`開始載入本地 ${filename}`);
        const questionResponse = await fetch(filename);
        if (!questionResponse.ok) {
          console.warn(`無法載入本地 ${filename}：HTTP 狀態 ${questionResponse.status}，嘗試從 API 加載`);
          throw new Error(`Local fetch failed for ${filename}`);
        }
        quizData = await questionResponse.json();
      } catch (error) {
        console.warn(`本地 ${filename} 載入失敗：`, error.message);
        if (useApi && apiConfig.endpoints[filename]) {
          try {
            console.log(`開始從 API 獲取 ${filename}`);
            const { url, headers } = apiConfig.endpoints[filename];
            const response = await fetch(url, { headers });
            if (!response.ok) {
              console.warn(`無法從 API 載入 ${filename}：HTTP 狀態 ${response.status}，將跳過此檔案`);
              continue;
            }
            const apiData = await response.json();
            quizData = apiData.record;
            source = `API_${filename}`;
          } catch (apiError) {
            console.warn(`API 載入 ${filename} 失敗，將跳過此檔案：`, apiError.message);
            continue;
          }
        } else {
          console.warn(`無 API 配置或 api.json 不可用，跳過 ${filename}`);
          continue;
        }
      }

      if (!quizData || !Array.isArray(quizData.questions) || quizData.questions.length === 0) {
        console.warn(`${filename} 為空或格式錯誤，將跳過此檔案`);
        continue;
      }

      hasQuizBank = true;
      const questions = quizData.questions.map(q => ({ ...q, level: i }));
      levelQuestions.push(questions);
      questionBank = questionBank.concat(questions);
      questionBankSources.push(source);
      if (quizData.title && i === 0) {
        quizTitle = quizData.title;
        updateTitle(quizTitle);
      }
      console.log(`${filename} 題庫加載成功，題目數：`, quizData.questions.length);
    }
    console.log('選擇題題庫總題目數：', questionBank.length, '來源檔案：', questionBankSources);

    try {
      console.log('開始載入 numh.json');
      const challengeResponse = await fetch('numh.json');
      if (!challengeResponse.ok) {
        console.warn(`無法載入 numh.json：HTTP 狀態 ${challengeResponse.status}，挑戰題功能將不可用`);
        hasChallengeBank = false;
      } else {
        const challengeData = await challengeResponse.json();
        if (!challengeData || !Array.isArray(challengeData.questions) || challengeData.questions.length === 0) {
          console.warn('numh.json 為空或格式錯誤，挑戰題功能將不可用');
          hasChallengeBank = false;
        } else {
          hasChallengeBank = true;
          challengeBank = challengeData.questions.map(q => ({ ...q, level: 'challenge' }));
          if (challengeData.title) {
            challengeTitle = challengeData.title;
          }
          console.log('挑戰題題庫加載成功，題目數：', challengeBank.length);
        }
      }
    } catch (error) {
      console.warn('挑戰題題庫載入失敗，挑戰題功能將不可用：', error.message);
      hasChallengeBank = false;
    }

    try {
      console.log('開始載入 numai.json');
      const aiResponse = await fetch('numai.json');
      if (!aiResponse.ok) {
        console.warn(`無法載入 numai.json：HTTP 狀態 ${aiResponse.status}，AI題庫功能將不可用`);
        hasAIBank = false;
      } else {
        const aiData = await aiResponse.json();
        if (!aiData || !Array.isArray(aiData.questions) || aiData.questions.length === 0) {
          console.warn('numai.json 為空或格式錯誤，AI題庫功能將不可用');
          hasAIBank = false;
        } else {
          hasAIBank = true;
          aiBank = aiData.questions.map(q => ({ ...q, level: 'ai' }));
          if (aiData.title) {
            aiTitle = aiData.title;
          }
          console.log('AI題庫加載成功，題目數：', aiBank.length);
          const modeSelection = document.getElementById('mode-selection');
          const aiButton = document.createElement('button');
          aiButton.id = 'ai-mode-btn';
          aiButton.textContent = 'AI題庫';
          aiButton.onclick = startAiMode;
          modeSelection.insertBefore(aiButton, standardModeBtn);
        }
      }
    } catch (error) {
      console.warn('AI題庫載入失敗，AI題庫功能將不可用：', error.message);
      hasAIBank = false;
    }

    try {
      console.log('開始載入 pass.json');
      const passwordResponse = await fetch('pass.json');
      if (!passwordResponse.ok) {
        console.warn(`無法載入 pass.json：HTTP 狀態 ${passwordResponse.status}，遊戲結束後將不要求輸入密碼`);
        hasPasswordBank = false;
      } else {
        passwordBank = await passwordResponse.json();
        if (!passwordBank || typeof passwordBank !== 'object') {
          console.warn('pass.json 格式錯誤，遊戲結束後將不要求輸入密碼');
          hasPasswordBank = false;
        } else {
          hasPasswordBank = true;
          console.log('密碼表加載成功');
        }
      }
    } catch (error) {
      console.warn('密碼表載入失敗，遊戲結束後將不要求輸入密碼：', error.message);
      hasPasswordBank = false;
    }

    if (hasQuizBank) {
      standardModeBtn.disabled = false;
    } else {
      standardModeBtn.style.display = 'none';
    }

    if (hasFibBank) {
      document.getElementById('fib-mode-btn').disabled = false;
    }

    if (hasAIBank) {
      document.getElementById('ai-mode-btn').disabled = false;
    }

    loadingMessageDiv.style.display = 'none';

    if (!hasQuizBank && !hasFibBank && !hasAIBank) {
      errorMessageDiv.innerHTML = '無法載入任何題庫，請檢查 fib.json、num*.json 或 numai.json 是否存在並格式正確。';
      errorMessageDiv.style.display = 'block';
    }
  } catch (error) {
    console.error('載入數據失敗:', error);
    loadingMessageDiv.style.display = 'none';
    errorMessageDiv.innerHTML = `無法載入題庫，請檢查檔案是否存在並格式正確（錯誤：${error.message}）。`;
    errorMessageDiv.style.display = 'block';
  }
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// Fireworks effect functions
function createFireworksCanvas() {
  fireworksCanvas = document.createElement('canvas');
  fireworksCanvas.id = 'fireworks-canvas';
  fireworksCanvas.style.position = 'fixed';
  fireworksCanvas.style.top = '0';
  fireworksCanvas.style.left = '0';
  fireworksCanvas.style.width = '100%';
  fireworksCanvas.style.height = '100%';
  fireworksCanvas.style.pointerEvents = 'none';
  fireworksCanvas.style.zIndex = '1000';
  document.body.appendChild(fireworksCanvas);
  fireworksCanvas.width = window.innerWidth;
  fireworksCanvas.height = window.innerHeight;
  fireworksCtx = fireworksCanvas.getContext('2d');
}

function createParticle(x, y) {
  return {
    x: x,
    y: y,
    vx: (Math.random() - 0.5) * 10,
    vy: (Math.random() - 0.5) * 10,
    radius: Math.random() * 3 + 2,
    color: `hsl(${Math.random() * 360}, 100%, 50%)`,
    alpha: 1,
    life: 60
  };
}

function startFireworks() {
  if (!fireworksCanvas) {
    createFireworksCanvas();
  }
  particles = [];
  for (let i = 0; i < 50; i++) {
    particles.push(createParticle(window.innerWidth / 2, window.innerHeight / 2));
  }
  animateFireworks();
}

function animateFireworks() {
  fireworksCtx.clearRect(0, 0, fireworksCanvas.width, fireworksCanvas.height);
  particles.forEach((particle, index) => {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vy += 0.1; // Gravity effect
    particle.alpha -= 0.016; // Fade out
    particle.life--;

    fireworksCtx.beginPath();
    fireworksCtx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
    fireworksCtx.fillStyle = particle.color;
    fireworksCtx.globalAlpha = particle.alpha;
    fireworksCtx.fill();
    fireworksCtx.globalAlpha = 1;

    if (particle.life <= 0) {
      particles.splice(index, 1);
    }
  });

  if (particles.length > 0) {
    requestAnimationFrame(animateFireworks);
  } else {
    fireworksCanvas.remove();
    fireworksCanvas = null;
    fireworksCtx = null;
  }
}

function startAiMode() {
  if (!hasAIBank || aiBank.length === 0) {
    document.getElementById('error-message').innerHTML = 'AI題庫為空，無法開始遊戲！';
    document.getElementById('error-message').style.display = 'block';
    return;
  }

  isStandardMode = false;
  isAiMode = true;
  isEndlessMode = false;
  wrongCount = 0;
  passwordRetrieved = false;
  totalQuestions = aiBank.length;
  availableQuestions = [...aiBank];
  availableChallengeQuestions = hasChallengeBank ? [...challengeBank] : [];
  currentQuestionCount = 0;
  wrongQuestions.clear();
  consecutiveCorrect = 0;
  isChallengeMode = false;
  lastIncorrect = false;
  updateTitle(aiTitle);
  setChallengeModeStyle(false);

  console.log('AI模式啟動：', {
    totalQuestions,
    availableQuestionsLength: availableQuestions.length,
    availableChallengeQuestionsLength: availableChallengeQuestions.length,
    currentQuestionCount
  });

  document.getElementById('mode-selection').style.display = 'none';
  document.getElementById('error-message').style.display = 'none';
  document.getElementById('question').style.display = 'block';
  document.getElementById('remaining-questions').style.display = 'block';
  document.getElementById('options').style.display = 'table';
  document.getElementById('fib-mode').style.display = 'none';
  displayQuestion();
}

function startStandardMode() {
  if (!hasQuizBank || levelQuestions.length === 0) {
    document.getElementById('error-message').innerHTML = '選擇題題庫為空，無法開始遊戲！';
    document.getElementById('error-message').style.display = 'block';
    return;
  }

  isStandardMode = true;
  isAiMode = false;
  isEndlessMode = false;
  wrongCount = 0;
  passwordRetrieved = false;
  currentLevel = 0;
  totalQuestions = Math.min(STANDARD_MODE_QUESTION_COUNT, levelQuestions[0].length);
  availableQuestions = shuffleArray([...levelQuestions[0]]);
  availableChallengeQuestions = hasChallengeBank ? [...challengeBank] : [];
  currentQuestionCount = 0;
  wrongQuestions.clear();
  consecutiveCorrect = 0;
  isChallengeMode = false;
  lastIncorrect = false;
  updateTitle(quizTitle);
  setChallengeModeStyle(false);

  console.log('標準模式（闖關模式）啟動：', {
    currentLevel: currentLevel + 1,
    totalQuestions,
    maxWrong: STANDARD_MODE_MAX_WRONG,
    availableQuestionsLength: availableQuestions.length,
    availableChallengeQuestionsLength: availableChallengeQuestions.length,
    currentQuestionCount
  });

  document.getElementById('mode-selection').style.display = 'none';
  document.getElementById('error-message').style.display = 'none';
  document.getElementById('question').style.display = 'block';
  document.getElementById('remaining-questions').style.display = 'block';
  document.getElementById('options').style.display = 'table';
  document.getElementById('fib-mode').style.display = 'none';
  displayQuestion();
}

function startEndlessMode() {
  if (!hasQuizBank || questionBank.length === 0) {
    document.getElementById('error-message').innerHTML = '選擇題題庫為空，無法開始無盡模式！';
    document.getElementById('error-message').style.display = 'block';
    return;
  }

  isStandardMode = false;
  isAiMode = false;
  isEndlessMode = true;
  wrongCount = 0;
  currentQuestionCount = 0;
  wrongQuestions.clear();
  usedEndlessQuestions.clear();
  availableQuestions = shuffleArray([...questionBank]);
  endlessStartTime = new Date();
  updateTitle(quizTitle);
  setChallengeModeStyle(false);

  console.log('無盡模式啟動：', {
    totalQuestions: availableQuestions.length,
    currentQuestionCount
  });

  document.getElementById('mode-selection').style.display = 'none';
  document.getElementById('error-message').style.display = 'none';
  document.getElementById('question').style.display = 'block';
  document.getElementById('remaining-questions').style.display = 'block';
  document.getElementById('options').style.display = 'table';
  document.getElementById('fib-mode').style.display = 'none';
  document.getElementById('password-input').style.display = 'none';
  displayQuestion();
}

function startFibMode() {
  if (!hasFibBank || fibQuestionBank.length === 0) {
    document.getElementById('error-message').innerHTML = '填空題題庫為空或未找到，無法開始填空模式！';
    document.getElementById('error-message').style.display = 'block';
    return;
  }

  usedFibQuestions.clear();
  isAnswerShown = false;
  updateTitle(quizTitle);
  setChallengeModeStyle(false);
  document.getElementById('mode-selection').style.display = 'none';
  document.getElementById('error-message').style.display = 'none';
  document.getElementById('question').style.display = 'none';
  document.getElementById('question-image-container').style.display = 'none';
  document.getElementById('remaining-questions').style.display = 'none';
  document.getElementById('options').style.display = 'none';
  document.getElementById('feedback').style.display = 'none';
  document.getElementById('password-input').style.display = 'none';
  document.getElementById('wrong-questions').style.display = 'none';
  document.getElementById('fib-mode').style.display = 'block';

  displayFibQuestion();
}

function displayFibQuestion() {
  const availableFibIndices = fibQuestionBank
    .map((_, index) => index)
    .filter(index => !usedFibQuestions.has(index));

  if (availableFibIndices.length === 0) {
    document.getElementById('fib-mode').innerHTML = '<p>你已完成練習</p>';
    MathJax.typeset();
    return;
  }

  const randomIndex = availableFibIndices[Math.floor(Math.random() * availableFibIndices.length)];
  currentFibQuestion = fibQuestionBank[randomIndex];
  usedFibQuestions.add(randomIndex);

  document.getElementById('fib-question').innerHTML = currentFibQuestion.question;
  const fibImageContainer = document.getElementById('fib-image-container');
  if (currentFibQuestion.image) {
    fibImageContainer.innerHTML = `<img src="${currentFibQuestion.image}" alt="Question Image" class="question-image">`;
    fibImageContainer.style.display = 'block';
  } else {
    fibImageContainer.innerHTML = '';
    fibImageContainer.style.display = 'none';
  }

  document.getElementById('fib-feedback').innerHTML = '';
  isAnswerShown = false;
  document.getElementById('fib-show-answer').disabled = false;
  document.getElementById('fib-next').disabled = false;

  MathJax.typeset();
}

function showFibAnswer() {
  if (!currentFibQuestion) return;
  isAnswerShown = true;
  const feedbackDiv = document.getElementById('fib-feedback');
  const isMathExpression = currentFibQuestion.answer.includes('\\(') && currentFibQuestion.answer.includes('\\)');
  const displayAnswer = isMathExpression ? currentFibQuestion.answer : `\\(${currentFibQuestion.answer}\\)`;
  let answerImageHtml = '';
  if (currentFibQuestion.answerimage) {
    answerImageHtml = `<img src="${currentFibQuestion.answerimage}" alt="Answer Image" class="answer-image">`;
  }
  feedbackDiv.innerHTML = `
    <p>正確答案：${displayAnswer}</p>
    <p>解析：${currentFibQuestion.explanation}</p>
    ${answerImageHtml}
  `;
  MathJax.typeset();
}

function nextFibQuestion() {
  isAnswerShown = false;
  displayFibQuestion();
}

function toggleButtons(disabled) {
  const buttons = document.querySelectorAll('.option-button');
  buttons.forEach(button => {
    button.disabled = disabled;
  });
}

function generateOptionsTable(options, correctAnswerLabel, questionIndex, correctAnswerContent, bank) {
  const optionsTable = document.getElementById('options');
  optionsTable.innerHTML = '';
  const labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].slice(0, options.length);
  options.forEach((option, index) => {
    const label = labels[index];
    const isMathExpression = option && (option.includes('\\(') && option.includes('\\)'));
    const displayContent = isMathExpression ? option : `\\(${option}\\)`;
    const row = document.createElement('tr');
    const buttonCell = document.createElement('td');
    const contentCell = document.createElement('td');
    const button = document.createElement('button');
    button.className = 'option-button';
    button.id = `button-${label}`;
    button.textContent = label;
    buttonCell.appendChild(button);
    contentCell.className = 'option-content';
    contentCell.id = `content-${label}`;
    contentCell.innerHTML = displayContent;
    row.appendChild(buttonCell);
    row.appendChild(contentCell);
    optionsTable.appendChild(row);
    button.addEventListener('click', () => {
      checkAnswer(label, correctAnswerLabel, questionIndex, correctAnswerContent, bank);
    });
  });
  MathJax.typeset();
}

function proceedToNextLevel() {
  currentLevel++;
  wrongCount = 0;
  if (currentLevel < levelQuestions.length) {
    totalQuestions = Math.min(STANDARD_MODE_QUESTION_COUNT, levelQuestions[currentLevel].length);
    availableQuestions = shuffleArray([...levelQuestions[currentLevel]]);
    currentQuestionCount = 0;
    consecutiveCorrect = 0;
    isChallengeMode = false;
    lastIncorrect = false;
    updateTitle(quizTitle);
    setChallengeModeStyle(false);
    console.log(`進入第 ${currentLevel + 1} 關`, {
      totalQuestions,
      availableQuestionsLength: availableQuestions.length,
      currentQuestionCount
    });
    displayQuestion();
  } else {
    endGame();
  }
}

function displayQuestion() {
  console.log('顯示選擇題：', {
    currentLevel: isEndlessMode ? '無盡模式' : currentLevel + 1,
    currentQuestionCount,
    totalQuestions: isEndlessMode ? availableQuestions.length : totalQuestions,
    availableQuestionsLength: availableQuestions.length,
    availableChallengeQuestionsLength: availableChallengeQuestions.length,
    isChallengeMode,
    lastIncorrect,
    consecutiveCorrect
  });

  if (isEndlessMode && availableQuestions.length === 0) {
    endGame();
    return;
  }

  if (isStandardMode && wrongCount > STANDARD_MODE_MAX_WRONG) {
    console.log('錯誤次數超過限制，結束遊戲：', {
      wrongCount,
      maxWrong: STANDARD_MODE_MAX_WRONG
    });
    endGame();
    return;
  }

  if (isStandardMode && currentQuestionCount >= totalQuestions || availableQuestions.length === 0) {
    console.log('當前關卡題目已完成或無可用題目，嘗試進入下一關');
    proceedToNextLevel();
    return;
  }

  let question, questionIndex, bank, title;
  if (isStandardMode) {
    if (consecutiveCorrect >= 3 && hasChallengeBank && availableChallengeQuestions.length > 0 && !lastIncorrect) {
      isChallengeMode = true;
      const randomIndex = Math.floor(Math.random() * availableChallengeQuestions.length);
      question = availableChallengeQuestions[randomIndex];
      questionIndex = challengeBank.indexOf(question);
      bank = challengeBank;
      title = challengeTitle;
      availableChallengeQuestions.splice(randomIndex, 1);
      setChallengeModeStyle(true);
    } else {
      isChallengeMode = false;
      const randomIndex = Math.floor(Math.random() * availableQuestions.length);
      question = availableQuestions[randomIndex];
      questionIndex = levelQuestions[currentLevel].indexOf(question);
      bank = levelQuestions[currentLevel];
      title = quizTitle;
      availableQuestions.splice(randomIndex, 1);
      setChallengeModeStyle(false);
    }
  } else if (isAiMode) {
    if (availableQuestions.length > 0) {
      const randomIndex = Math.floor(Math.random() * availableQuestions.length);
      question = availableQuestions[randomIndex];
      questionIndex = aiBank.indexOf(question);
      bank = aiBank;
      title = aiTitle;
      availableQuestions.splice(randomIndex, 1);
      setChallengeModeStyle(false);
    } else {
      console.error('無可用AI題目');
      endGame();
      return;
    }
  } else if (isEndlessMode) {
    if (availableQuestions.length > 0) {
      const randomIndex = Math.floor(Math.random() * availableQuestions.length);
      question = availableQuestions[randomIndex];
      questionIndex = questionBank.indexOf(question);
      bank = questionBank;
      title = quizTitle;
      usedEndlessQuestions.add(JSON.stringify(question));
      availableQuestions.splice(randomIndex, 1);
      setChallengeModeStyle(false);
    } else {
      console.error('無可用題目');
      endGame();
      return;
    }
  } else {
    if (availableQuestions.length > 0) {
      question = availableQuestions.shift();
      questionIndex = questionBank.indexOf(question);
      bank = questionBank;
      title = quizTitle;
      setChallengeModeStyle(false);
    } else if (hasChallengeBank && availableChallengeQuestions.length > 0) {
      question = availableChallengeQuestions.shift();
      questionIndex = challengeBank.indexOf(question);
      bank = challengeBank;
      title = challengeTitle;
      setChallengeModeStyle(true);
    } else {
      console.error('無可用題目');
      endGame();
      return;
    }
  }

  updateTitle(title);

  if (isStandardMode && consecutiveCorrect >= 3 && hasChallengeBank && !isChallengeMode && !lastIncorrect) {
    document.getElementById('feedback').innerHTML = `你已連續答對 ${consecutiveCorrect} 題，準備進入挑戰模式！`;
    MathJax.typeset();
    setTimeout(() => {
      document.getElementById('feedback').innerHTML = '';
    }, 2000);
  }

  document.getElementById('question').innerHTML = question.question;

  const imageContainer = document.getElementById('question-image-container');
  if (question.image) {
    imageContainer.innerHTML = `<img src="${question.image}" alt="Question Image" class="question-image">`;
    imageContainer.style.display = 'block';
  } else {
    imageContainer.innerHTML = '';
    imageContainer.style.display = 'none';
  }

  const remaining = isEndlessMode ? availableQuestions.length : totalQuestions - currentQuestionCount;
  let stars = '';
  if (isStandardMode) {
    const remainingWrong = Math.max(0, STANDARD_MODE_MAX_WRONG - wrongCount);
    stars = '❤️'.repeat(remainingWrong);
    document.getElementById('remaining-questions').innerHTML = `第 ${currentLevel + 1} 關，還剩 ${remaining} 題，生命值：${stars}`;
  } else {
    document.getElementById('remaining-questions').innerHTML = `還剩 ${remaining} 題`;
  }

  const shuffledOptions = shuffleArray([...question.options]);
  console.log('題目:', question.question);
  console.log('原始選項:', question.options);
  console.log('打亂後選項:', shuffledOptions);
  console.log('正確答案:', question.answer);
  const correctAnswerIndex = shuffledOptions.indexOf(question.answer);
  console.log('正確答案索引:', correctAnswerIndex);
  let correctAnswerLabel = correctAnswerIndex >= 0 ? String.fromCharCode(65 + correctAnswerIndex) : '0';
  console.log('正確答案標籤:', correctAnswerLabel);

  if (correctAnswerIndex === -1) {
    console.error('錯誤：正確答案未在選項中找到！', {
      question: question.question,
      answer: question.answer,
      options: shuffledOptions
    });
    correctAnswerLabel = '0';
  }

  generateOptionsTable(shuffledOptions, correctAnswerLabel, questionIndex, question.answer, bank);

  currentQuestionCount++;

  document.getElementById('feedback').innerHTML = '';
  toggleButtons(false);
  MathJax.typeset();
}

function checkAnswer(selected, correctAnswerLabel, questionIndex, correctAnswerContent, bank) {
  const question = bank[questionIndex];
  const feedback = document.getElementById('feedback');
  console.log('檢查答案:', {
    selected,
    correctAnswerLabel,
    questionIndex,
    correctAnswerContent,
    bank: bank === challengeBank ? 'challengeBank' : bank === aiBank ? 'aiBank' : isEndlessMode ? 'questionBank' : `levelQuestions[${currentLevel}]`,
    consecutiveCorrect,
    isChallengeMode,
    isEndlessMode
  });

  if (selected === correctAnswerLabel) {
    if (isStandardMode || isAiMode) {
      consecutiveCorrect++;
    }
    lastIncorrect = false;
    feedback.innerHTML = isChallengeMode ? '挑戰題正確！進入下一關...' : '正確！正在加載下一題...';
    feedback.style.color = 'green';
    toggleButtons(true);
    startFireworks(); // Trigger fireworks effect for correct answer
    setTimeout(() => {
      quizNumber++;
      if (isChallengeMode) {
        proceedToNextLevel();
      } else {
        updateTitle(isAiMode ? aiTitle : quizTitle);
        displayQuestion();
      }
    }, 1000);
  } else {
    if (!isChallengeMode) {
      wrongCount++;
      wrongCountToday++;
      localStorage.setItem('wrongCountToday', wrongCountToday.toString());
    }
    wrongQuestions.add(JSON.stringify({ question: question.question, answer: question.answer, explanation: question.explanation, image: question.image, answerimage: question.answerimage }));
    if (isEndlessMode) {
      endGame();
      return;
    }
    startRedFlash(); // Trigger red flash effect for incorrect answer
    const countdownSeconds = Math.min(BASE_COUNTDOWN_SECONDS + wrongCountToday, MAX_COUNTDOWN_SECONDS);
    let secondsLeft = countdownSeconds;
    feedback.innerHTML = `答錯了！請思考正確答案，倒計時 ${secondsLeft} 秒...`;
    feedback.style.color = 'red';
    toggleButtons(true);

    const countdownInterval = setInterval(() => {
      secondsLeft--;
      if (secondsLeft > 0) {
        feedback.innerHTML = `答錯了！請思考正確答案，倒計時 ${secondsLeft} 秒...`;
      } else {
        clearInterval(countdownInterval);
        const displayAnswer = correctAnswerContent.includes('\\(') ? correctAnswerContent : `\\(${correctAnswerContent}\\)`;
        let answerImageHtml = '';
        if (question.answerimage) {
          answerImageHtml = `<img src="${question.answerimage}" alt="Answer Image" class="answer-image">`;
        }
        feedback.innerHTML = `
          <p>錯誤！正確答案是 ${correctAnswerLabel}：${displayAnswer}</p>
          <p>答案解析：${question.explanation}</p>
          ${answerImageHtml}
          <button class="next-question-button" onclick="nextQuestion()">下一題</button>
        `;
        MathJax.typeset();
      }
    }, 1000);

    if (isStandardMode || isAiMode) {
      consecutiveCorrect = 0;
      if (isChallengeMode) {
        currentQuestionCount--;
        isChallengeMode = false;
        lastIncorrect = true;
        setChallengeModeStyle(false);
      } else {
        isChallengeMode = false;
        lastIncorrect = true;
      }
    }
  }
}

function nextQuestion() {
  if (isStandardMode && wrongCount > STANDARD_MODE_MAX_WRONG) {
    endGame();
  } else {
    quizNumber++;
    updateTitle(isAiMode ? aiTitle : quizTitle);
    displayQuestion();
  }
}

function handlePasswordSubmit() {
  if (passwordRetrieved) return;

  const numberInput = document.getElementById('password-number');
  const number = numberInput.value;
  const resultDiv = document.getElementById('password-result');

  if (!number || number < 1 || number > 50) {
    resultDiv.innerHTML = '請輸入 1~50 的數字！';
    resultDiv.style.color = 'red';
    return;
  }

  const password = passwordBank[number];
  if (password) {
    resultDiv.innerHTML = `你的密碼是：${password}`;
    resultDiv.style.color = 'green';
    passwordRetrieved = true;
    numberInput.disabled = true;
    document.getElementById('password-submit').disabled = true;
  } else {
    resultDiv.innerHTML = '無效的數字！';
    resultDiv.style.color = 'red';
  }
}

function endGame() {
  setChallengeModeStyle(false);
  let endMessage = '';
  let showRestartButton = false;

  if (isEndlessMode) {
    const endTime = new Date();
    const timeUsed = Math.round((endTime - endlessStartTime) / 1000); // 秒
    if (availableQuestions.length === 0 && wrongQuestions.size === 0) {
      endMessage = `遊戲結束！恭喜你完成無盡模式所有題目！總用時：${timeUsed} 秒`;
    } else {
      endMessage = `無盡模式結束！你答錯了第 ${currentQuestionCount} 題。`;
      showRestartButton = true;
    }
  } else if (isStandardMode && wrongCount > STANDARD_MODE_MAX_WRONG) {
    endMessage = `遊戲結束！你已錯 ${wrongCount} 題，超過允許的最大錯誤數 ${STANDARD_MODE_MAX_WRONG} 題。`;
    showRestartButton = true;
  } else {
    endMessage = '遊戲結束！恭喜你完成所有關卡！';
  }

  document.getElementById('question').innerHTML = endMessage;
  if (showRestartButton) {
    const restartButton = document.createElement('button');
    restartButton.id = 'restart-btn';
    restartButton.textContent = '重新開始';
    restartButton.onclick = () => location.reload();
    document.getElementById('question').appendChild(restartButton);
  }
  document.getElementById('question-image-container').style.display = 'none';
  document.getElementById('remaining-questions').style.display = 'none';
  document.getElementById('options').style.display = 'none';
  document.getElementById('feedback').style.display = 'none';
  document.getElementById('fib-mode').style.display = 'none';

  // 若標準模式完成所有關卡，顯示無盡模式按鈕
  if (isStandardMode && currentLevel >= levelQuestions.length) {
    const endlessButton = document.createElement('button');
    endlessButton.id = 'endless-mode-btn';
    endlessButton.textContent = '無盡模式';
    endlessButton.onclick = startEndlessMode;
    document.getElementById('question').appendChild(endlessButton);
  }

  // 若有密碼庫且錯誤數未超限，顯示密碼輸入框
  if ((isStandardMode || isAiMode) && wrongCount <= STANDARD_MODE_MAX_WRONG && hasPasswordBank && !isEndlessMode) {
    document.getElementById('password-input').style.display = 'block';
    document.getElementById('password-submit').onclick = handlePasswordSubmit;
  } else {
    document.getElementById('password-input').style.display = 'none';
  }

  const wrongQuestionsContainer = document.getElementById('wrong-questions');
  wrongQuestionsContainer.style.display = 'block';
  if (wrongQuestions.size === 0) {
    wrongQuestionsContainer.innerHTML = '<p>恭喜！你全部答對，沒有錯題！</p>';
  } else {
    wrongQuestionsContainer.innerHTML = '<h2>答錯的題目</h2>';
    wrongQuestions.forEach(item => {
      const question = JSON.parse(item);
      const div = document.createElement('div');
      div.className = 'wrong-question';
      let imageHtml = '';
      if (question.image) {
        imageHtml = `<img src="${question.image}" alt="Wrong Question Image" class="question-image">`;
      }
      let answerImageHtml = '';
      if (question.answerimage) {
        answerImageHtml = `<img src="${question.answerimage}" alt="Answer Image" class="answer-image">`;
      }
      const isMathExpression = question.answer.includes('\\(') && question.answer.includes('\\)');
      const displayAnswer = isMathExpression ? question.answer : `\\(${question.answer}\\)`;
      div.innerHTML = `
        <p><strong>題目：</strong>${question.question}</p>
        ${imageHtml}
        <p><strong>正確答案：</strong>${displayAnswer}</p>
        <p><strong>解析：</strong>${question.explanation}</p>
        ${answerImageHtml}
      `;
      wrongQuestionsContainer.appendChild(div);
    });
  }
  MathJax.typeset();
}

loadData();