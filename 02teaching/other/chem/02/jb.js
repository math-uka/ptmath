// 標準模式的預設題目數量和允許錯誤數
    let STANDARD_MODE_QUESTION_COUNT = 10;
    let STANDARD_MODE_MAX_WRONG = 2;

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
    let passwordRetrieved = false;
    let currentFibQuestion = null;
    let isAnswerShown = false;
    let consecutiveCorrect = 0;
    let isChallengeMode = false;
    let lastIncorrect = false;
    let hasTotalConfig = false;
    let questionBankSources = [];

    function updateTitle(title) {
      currentTitle = title;
      document.getElementById('quiz-title').textContent = title;
      document.title = `${title} - 測驗 ${quizNumber}`;
    }

    async function loadData() {
      const loadingMessageDiv = document.getElementById('loading-message');
      const errorMessageDiv = document.getElementById('error-message');
      const standardModeBtn = document.getElementById('standard-mode-btn');

      try {
        updateTitle(quizTitle);

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
              <!--Mao Zedong, Deng Xiaoping, Jiang Zemin, Hu Jintao, Xi Jinping-->STANDARD_MODE_MAX_WRONG = totalData.maxWrong;
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

        // Load num.json, num1.json, ..., num16.json
        questionBank = [];
        questionBankSources = [];
        hasQuizBank = false;
        for (let i = 0; i <= 16; i++) {
          const filename = i === 0 ? 'num.json' : `num${i}.json`;
          try {
            console.log(`開始載入 ${filename}`);
            const questionResponse = await fetch(filename);
            if (!questionResponse.ok) {
              console.warn(`無法載入 ${filename}：HTTP 狀態 ${questionResponse.status}，將跳過此檔案`);
              continue;
            }
            const quizData = await questionResponse.json();
            if (!quizData || !Array.isArray(quizData.questions) || quizData.questions.length === 0) {
              console.warn(`${filename} 為空或格式錯誤，將跳過此檔案`);
              continue;
            }
            hasQuizBank = true;
            questionBank = questionBank.concat(quizData.questions.map(q => ({ ...q, source: filename })));
            questionBankSources.push(filename);
            if (quizData.title && i === 0) {
              quizTitle = quizData.title;
              updateTitle(quizTitle);
            }
            console.log(`${filename} 題庫加載成功，題目數：`, quizData.questions.length);
          } catch (error) {
            console.warn(`${filename} 載入失敗，將跳過此檔案：`, error.message);
          }
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
              challengeBank = challengeData.questions.map(q => ({ ...q, source: 'numh.json' }));
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
              aiBank = aiData.questions.map(q => ({ ...q, source: 'numai.json' }));
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

    function startAiMode() {
      if (!hasAIBank || aiBank.length === 0) {
        document.getElementById('error-message').innerHTML = 'AI題庫為空，無法開始遊戲！';
        document.getElementById('error-message').style.display = 'block';
        return;
      }

      isStandardMode = false;
      isAiMode = true;
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
      if (!hasQuizBank || questionBank.length === 0) {
        document.getElementById('error-message').innerHTML = '選擇題題庫為空，無法開始遊戲！';
        document.getElementById('error-message').style.display = 'block';
        return;
      }

      isStandardMode = true;
      isAiMode = false;
      wrongCount = 0;
      passwordRetrieved = false;
      totalQuestions = Math.min(STANDARD_MODE_QUESTION_COUNT, questionBank.length);
      availableQuestions = shuffleArray([...questionBank]);
      availableChallengeQuestions = hasChallengeBank ? [...challengeBank] : [];
      currentQuestionCount = 0;
      wrongQuestions.clear();
      consecutiveCorrect = 0;
      isChallengeMode = false;
      lastIncorrect = false;
      updateTitle(quizTitle);

      console.log('標準模式啟動：', {
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

    function startFibMode() {
      if (!hasFibBank || fibQuestionBank.length === 0) {
        document.getElementById('error-message').innerHTML = '填空題題庫為空或未找到，無法開始填空模式！';
        document.getElementById('error-message').style.display = 'block';
        return;
      }

      usedFibQuestions.clear();
      isAnswerShown = false;
      updateTitle(quizTitle);
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

    function displayQuestion() {
      console.log('顯示選擇題：', {
        currentQuestionCount,
        totalQuestions,
        availableQuestionsLength: availableQuestions.length,
        availableChallengeQuestionsLength: availableChallengeQuestions.length,
        isChallengeMode,
        lastIncorrect,
        consecutiveCorrect
      });

      if (currentQuestionCount >= totalQuestions || (availableQuestions.length === 0 && availableChallengeQuestions.length === 0) || (isStandardMode && wrongCount > STANDARD_MODE_MAX_WRONG)) {
        console.log('條件滿足，結束選擇題遊戲：', {
          currentQuestionCount,
          totalQuestions,
          availableQuestionsLength: availableQuestions.length,
          availableChallengeQuestionsLength: availableChallengeQuestions.length,
          wrongCount,
          maxWrong: isStandardMode ? STANDARD_MODE_MAX_WRONG : 'N/A'
        });
        endGame();
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
        } else {
          isChallengeMode = false;
          const randomIndex = Math.floor(Math.random() * availableQuestions.length);
          question = availableQuestions[randomIndex];
          questionIndex = questionBank.indexOf(question);
          bank = questionBank;
          title = quizTitle;
          availableQuestions.splice(randomIndex, 1);
        }
      } else if (isAiMode) {
        if (availableQuestions.length > 0) {
          const randomIndex = Math.floor(Math.random() * availableQuestions.length);
          question = availableQuestions[randomIndex];
          questionIndex = aiBank.indexOf(question);
          bank = aiBank;
          title = aiTitle;
          availableQuestions.splice(randomIndex, 1);
        } else {
          console.error('無可用AI題目');
          endGame();
          return;
        }
      } else {
        if (availableQuestions.length > 0) {
          question = availableQuestions.shift();
          questionIndex = questionBank.indexOf(question);
          bank = questionBank;
          title = quizTitle;
        } else if (hasChallengeBank && availableChallengeQuestions.length > 0) {
          question = availableChallengeQuestions.shift();
          questionIndex = challengeBank.indexOf(question);
          bank = challengeBank;
          title = challengeTitle;
        } else {
          console.error('無可用題目');
          endGame();
          return;
        }
      }

      updateTitle(title);

      if (isStandardMode && consecutiveCorrect >= 3 && hasChallengeBank && !isChallengeMode && !lastIncorrect) {
        document.getElementById('feedback').innerHTML = `你已連續答對 ${consecutiveCorrect} 題，嘗試做一下挑戰題吧！`;
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

      const remaining = totalQuestions - currentQuestionCount;
      let stars = '';
      if (isStandardMode) {
        const remainingWrong = Math.max(0, STANDARD_MODE_MAX_WRONG - wrongCount);
        stars = '❤️'.repeat(remainingWrong);
      }
      document.getElementById('remaining-questions').innerHTML = `還剩 ${remaining} 題, 生命值：${stars}`;

      const shuffledOptions = shuffleArray([...question.options]);
      console.log('題目:', question.question);
      console.log('來源檔案:', question.source);
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
          options: shuffledOptions,
          source: question.source
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
        source: question.source,
        bank: bank === challengeBank ? 'challengeBank' : bank === aiBank ? 'aiBank' : 'questionBank',
        consecutiveCorrect,
        isChallengeMode
      });

      if (selected === correctAnswerLabel) {
        if (isStandardMode || isAiMode) {
          consecutiveCorrect++;
        }
        lastIncorrect = false;
        feedback.innerHTML = '正確！正在加載下一題...';
        feedback.style.color = 'green';
        toggleButtons(true);
        setTimeout(() => {
          quizNumber++;
          updateTitle(isChallengeMode ? challengeTitle : isAiMode ? aiTitle : quizTitle);
          displayQuestion();
        }, 1000);
      } else {
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
        feedback.style.color = 'red';
        wrongQuestions.add(questionIndex + (bank === challengeBank ? questionBank.length : bank === aiBank ? questionBank.length + challengeBank.length : 0));
        if (isStandardMode || isAiMode) {
          consecutiveCorrect = 0;
          if (bank === challengeBank) {
            currentQuestionCount--;
            isChallengeMode = false;
            lastIncorrect = true;
          } else {
            wrongCount++;
            isChallengeMode = false;
            lastIncorrect = true;
          }
        } else {
          wrongCount++;
        }
        toggleButtons(true);
        MathJax.typeset();
      }
    }

    function nextQuestion() {
      if (isStandardMode && wrongCount > STANDARD_MODE_MAX_WRONG) {
        endGame();
      } else {
        quizNumber++;
        updateTitle(isChallengeMode ? challengeTitle : isAiMode ? aiTitle : quizTitle);
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
      let endMessage = '遊戲結束！所有題目已完成。';
      if (isStandardMode && wrongCount > STANDARD_MODE_MAX_WRONG) {
        endMessage = `遊戲結束！你已錯 ${wrongCount} 題，超過允許的最大錯誤數 ${STANDARD_MODE_MAX_WRONG} 題。`;
      }
      document.getElementById('question').innerHTML = endMessage;
      document.getElementById('question-image-container').style.display = 'none';
      document.getElementById('remaining-questions').style.display = 'none';
      document.getElementById('options').style.display = 'none';
      document.getElementById('feedback').style.display = 'none';
      document.getElementById('fib-mode').style.display = 'none';

      if ((isStandardMode || isAiMode) && wrongCount <= STANDARD_MODE_MAX_WRONG && hasPasswordBank) {
        document.getElementById('password-input').style.display = 'block';
        document.getElementById('password-submit').onclick = handlePasswordSubmit;
      }

      const wrongQuestionsContainer = document.getElementById('wrong-questions');
      wrongQuestionsContainer.style.display = 'block';
      if (wrongQuestions.size === 0) {
        wrongQuestionsContainer.innerHTML = '<p>恭喜！你全部答對，沒有錯題！</p>';
      } else {
        wrongQuestionsContainer.innerHTML = '<h2>答錯的題目</h2>';
        wrongQuestions.forEach(index => {
          let question, adjustedIndex;
          if (index >= questionBank.length + challengeBank.length) {
            adjustedIndex = index - questionBank.length - challengeBank.length;
            question = aiBank[adjustedIndex];
          } else if (index >= questionBank.length) {
            adjustedIndex = index - questionBank.length;
            question = challengeBank[adjustedIndex];
          } else {
            adjustedIndex = index;
            question = questionBank[adjustedIndex];
          }
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