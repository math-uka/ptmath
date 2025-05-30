// 生成星空背景
function createStars() {
    const starsContainer = document.getElementById('stars');
    if (!starsContainer) return;
    for (let i = 0; i < 100; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        star.style.width = `${Math.random() * 2 + 1}px`;
        star.style.height = star.style.width;
        star.style.left = `${Math.random() * 100}%`;
        star.style.top = `${Math.random() * 100}%`;
        star.style.animationDelay = `${Math.random() * 1.5}s`;
        starsContainer.appendChild(star);
    }
}
createStars();

// 載入並解密 JSON 數據
let people = [];
const imageCache = {};
const positions = ['in front of', 'behind', 'between', 'on the left', 'on the right'];
const ordinals = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh'];
let currentQuestion = 0;
let score = 0;
let leftOrRightCount = 0;
const maxQuestions = 15;
const maxLeftOrRightQuestions = 2;
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let गर्नेblocks = [];
let startLeft = true;

// 隨機生成人物序列
function generateBlocks() {
    const numBlocks = Math.floor(Math.random() * 3) + 5; // 5 到 7
    const shuffledPeople = people.filter(p => p.name !== 'start').sort(() => Math.random() - 0.5).slice(0, numBlocks);
    startLeft = Math.random() < 0.5;
    blocks = startLeft 
        ? [people.find(p => p.name === 'start'), ...shuffledPeople]
        : [...shuffledPeople, people.find(p => p.name === 'start')];
    return startLeft;
}

// 粒子動畫數據
let particles = [];
const particleColors = ['#FF0000', '#FFA500', '#FFFF00', '#00FF00', '#00FFFF', '#0000FF', '#800080'];

// 創建粒子
function createParticle() {
    return {
        x: Math.random() * canvas.width,
        y: canvas.height,
        radius: Math.random() * 5 + 2,
        color: particleColors[Math.floor(Math.random() * particleColors.length)],
        vx: Math.random() * 4 - 2,
        vy: -(Math.random() * 5 + 5),
        alpha: 1
    };
}

// 更新和繪製粒子
function updateParticles() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#000';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Final Score: ${score} / ${maxQuestions}`, canvas.width / 2, canvas.height / 2);

    particles.forEach(particle => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.alpha -= 0.005;
        if (particle.alpha < 0) particle.alpha = 0;

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${parseInt(particle.color.slice(1, 3), 16)}, ${parseInt(particle.color.slice(3, 5), 16)}, ${parseInt(particle.color.slice(5, 7), 16)}, ${particle.alpha})`;
        ctx.fill();
    });

    particles = particles.filter(p => p.alpha > 0);
    if (particles.length > 0) {
        requestAnimationFrame(updateParticles);
    }
}

// 啟動慶祝動畫
function startCelebration() {
    particles = [];
    for (let i = 0; i < 100; i++) {
        particles.push(createParticle());
    }
    updateParticles();
    setTimeout(() => particles = [], 5000);
}

// 繪製場景
function drawScene() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const imageWidth = 200;
    const imageHeight = 400;
    const spacing = 10;
    const startX = (canvas.width - (blocks.length * (imageWidth + spacing) - spacing)) / 2;
    const startY = (canvas.height - imageHeight) / 2;

    blocks.forEach((block, index) => {
        const x = startX + index * (imageWidth + spacing);
        const img = imageCache[block.name];
        if (img.complete) {
            ctx.drawImage(img, x, startY, imageWidth, imageHeight);
        } else {
            ctx.fillStyle = '#ccc';
            ctx.fillRect(x, startY, imageWidth, imageHeight);
        }
        ctx.fillStyle = block.name === 'start' ? '#fff' : '#000';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(block.name.charAt(0).toUpperCase() + block.name.slice(1), x + imageWidth / 2, startY + imageHeight + 20);
    });
}

// 格式化題目文字
function formatQuestionText(text, person1, person2, person3) {
    return text.replace(
        new RegExp(`\\b(${person1?.name}|${person2?.name}|${person3?.name})\\b`, 'g'),
        match => `<span class="color-${match === 'Tom' ? 'red' : match === 'May' ? 'orange' : match === 'Sam' ? 'yellow' : match === 'Kath' ? 'green' : match === 'Leo' ? 'cyan' : match === 'Joe' ? 'blue' : 'purple'}">${match}</span>`
    );
}

// 鎖定/解鎖選項按鈕
function toggleButtons(disabled) {
    const buttons = document.querySelectorAll('.options button:not(.next-button)');
    buttons.forEach(button => button.disabled = disabled);
}

// 生成隨機問題
function generateQuestion() {
    if (currentQuestion >= maxQuestions) {
        endGame();
        return;
    }

    generateBlocks();
    const nonStartBlocks = blocks.filter(b => b.name !== 'start');
    let questionText, correctAnswer, person1, person2, person3, options;

    if (currentQuestion >= 10) {
        // 最後 5 題：序數問題
        const index = Math.floor(Math.random() * nonStartBlocks.length);
        person1 = nonStartBlocks[index];
        const ordinalIndex = startLeft ? index : nonStartBlocks.length - 1 - index;
        const isWhoQuestion = Math.random() < 0.5;

        if (isWhoQuestion) {
            // 問法 1: Who is the ...?
            correctAnswer = person1.name;
            questionText = `Who is the ${ordinals[ordinalIndex]}?`;
            options = nonStartBlocks.map(p => p.name);
        } else {
            // 問法 2: ... is the ...
            correctAnswer = ordinals[ordinalIndex];
            questionText = `${person1.name} is the ______.`;
            options = ordinals.slice(0, nonStartBlocks.length);
        }
    } else {
        // 前 10 題
        const forceLeftOrRight = currentQuestion === 9 && leftOrRightCount === 0;
        const disableLeftOrRight = leftOrRightCount >= maxLeftOrRightQuestions;
        const questionType = forceLeftOrRight ? 0.9 : (disableLeftOrRight ? Math.random() * 0.9 : Math.random());

        if (questionType < 0.4 && nonStartBlocks.length >= 2) {
            // 類型 1: in front of / behind
            let index1, index2;
            const preferInFront = Math.random() < 0.5;
            do {
                index1 = Math.floor(Math.random() * (nonStartBlocks.length - 1));
                index2 = index1 + 1;
            } while (index2 >= nonStartBlocks.length);

            person1 = nonStartBlocks[index1];
            person2 = nonStartBlocks[index2];

            const blockIndex1 = blocks.findIndex(b => b.name === person1.name);
            const blockIndex2 = blocks.findIndex(b => b.name === person2.name);

            if (preferInFront) {
                correctAnswer = 'in front of';
                if (startLeft) {
                    if (blockIndex1 > blockIndex2) {
                        [person1, person2] = [person2, person1];
                    }
                } else {
                    if (blockIndex1 < blockIndex2) {
                        [person1, person2] = [person2, person1];
                    }
                }
            } else {
                correctAnswer = 'behind';
                if (startLeft) {
                    if (blockIndex1 < blockIndex2) {
                        [person1, person2] = [person2, person1];
                    }
                } else {
                    if (blockIndex1 > blockIndex2) {
                        [person1, person2] = [person2, person1];
                    }
                }
            }

            questionText = `${person1.name} is ______ ${person2.name}.`;
            options = positions;
        } else if (questionType < 0.6 && nonStartBlocks.length >= 3) {
            // 類型 2: between
            const index = Math.floor(Math.random() * (nonStartBlocks.length - 2)) + 1;
            person1 = nonStartBlocks[index];
            person2 = nonStartBlocks[index - 1];
            person3 = nonStartBlocks[index + 1];
            correctAnswer = 'between';
            questionText = `${person1.name} is ______ ${person2.name} and ${person3.name}.`;
            options = positions;
        } else if (questionType < 0.9) {
            // 類型 3: 序數問題
            const index = Math.floor(Math.random() * nonStartBlocks.length);
            person1 = nonStartBlocks[index];
            const ordinalIndex = startLeft ? index : nonStartBlocks.length - 1 - index;
            const isWhoQuestion = Math.random() < 0.5;

            if (isWhoQuestion) {
                // 問法 1: Who is the ...?
                correctAnswer = person1.name;
                questionText = `Who is the ${ordinals[ordinalIndex]}?`;
                options = nonStartBlocks.map(p => p.name);
            } else {
                // 問法 2: ... is the ...
                correctAnswer = ordinals[ordinalIndex];
                questionText = `${person1.name} is the ______.`;
                options = ordinals.slice(0, nonStartBlocks.length);
            }
        } else {
            // 類型 4: on the left / on the right
            const isLeft = Math.random() < 0.5;
            person1 = isLeft ? nonStartBlocks[0] : nonStartBlocks[nonStartBlocks.length - 1];
            correctAnswer = isLeft ? 'on the left' : 'on the right';
            questionText = `${person1.name} is ______.`;
            options = positions;
            leftOrRightCount++;
        }
    }

    const questionDiv = document.getElementById('question');
    if (questionDiv) {
        questionDiv.innerHTML = formatQuestionText(questionText, person1, person2, person3);
    }

    drawScene();

    const optionsDiv = document.getElementById('options');
    if (optionsDiv) {
        optionsDiv.innerHTML = '';
        options.forEach(opt => {
            const button = document.createElement('button');
            button.innerText = opt;
            button.onclick = () => checkAnswer(opt, correctAnswer);
            optionsDiv.appendChild(button);
        });
    }

    const feedbackDiv = document.getElementById('feedback');
    if (feedbackDiv) {
        feedbackDiv.innerText = '';
    }
    toggleButtons(false);
    currentQuestion++;
}

// 檢查答案
function checkAnswer(selected, correct) {
    const feedback = document.getElementById('feedback');
    const optionsDiv = document.getElementById('options');
    if (!feedback || !optionsDiv) return;
    toggleButtons(true);

    if (selected === correct) {
        feedback.innerText = 'Correct!';
        score++;
        const scoreDiv = document.getElementById('score');
        if (scoreDiv) {
            scoreDiv.innerText = `Score: ${score} / ${maxQuestions}`;
        }
        setTimeout(generateQuestion, 1000);
    } else {
        feedback.innerText = `Wrong! The correct answer is "${correct}".`;
        const nextButton = document.createElement('button');
        nextButton.innerText = 'Next Question';
        nextButton.className = 'next-button';
        nextButton.onclick = () => {
            optionsDiv.removeChild(nextButton);
            generateQuestion();
        };
        optionsDiv.appendChild(nextButton);
    }
}

// 結束遊戲
function endGame() {
    const questionDiv = document.getElementById('question');
    const optionsDiv = document.getElementById('options');
    const feedbackDiv = document.getElementById('feedback');
    if (questionDiv) questionDiv.innerText = 'Game Over!';
    if (optionsDiv) optionsDiv.innerHTML = '';
    if (feedbackDiv) feedbackDiv.innerText = `Final Score: ${score} / ${maxQuestions}`;
    startCelebration();
}

// 初始化遊戲
async function initGame() {
    try {
        // 載入並解密 JSON
        const response = await fetch('data.json');
        if (!response.ok) throw new Error('Failed to load data.json');
        const data = await response.json();
        people = JSON.parse(atob(data.encoded));

        // 預載圖片
        people.forEach(person => {
            const img = new Image();
            img.src = person.image;
            imageCache[person.name] = img;
        });

        let loadedImages = 0;
        const totalImages = people.length;
        people.forEach(person => {
            const img = imageCache[person.name];
            if (img.complete) {
                loadedImages++;
            } else {
                img.onload = () => {
                    loadedImages++;
                    if (loadedImages === totalImages) {
                        generateQuestion();
                    }
                };
                img.onerror = () => {
                    console.error(`Failed to load image: ${person.image}`);
                    const feedbackDiv = document.getElementById('feedback');
                    if (feedbackDiv) {
                        feedbackDiv.innerText = `Error loading image: ${person.image}. Please check file path.`;
                    }
                };
            }
        });

        if (loadedImages === totalImages) {
            generateQuestion();
        }
    } catch (error) {
        console.error('Initialization failed:', error);
        const feedbackDiv = document.getElementById('feedback');
        if (feedbackDiv) {
            feedbackDiv.innerText = 'Error starting game. Please try refreshing or check console for details.';
        }
    }
}

// 啟動遊戲
initGame();
