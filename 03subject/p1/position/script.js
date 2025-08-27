// 生成星空背景
function createStars() {
    const starsContainer = document.getElementById('stars');
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

// 管理標題數字
let titleNumber = localStorage.getItem('titleNumber') ? parseInt(localStorage.getItem('titleNumber')) : 1;
document.title = `Position Game ${titleNumber}`;
localStorage.setItem('titleNumber', titleNumber + 1);

// 遊戲數據
const positions = ['in front of', 'between', 'behind', 'over', 'under'];
const fruits = [
    { image: 'images/red.png', name: 'apple', colorClass: 'apple' },
    { image: 'images/yellow.png', name: 'banana', colorClass: 'banana' },
    { image: 'images/blue.png', name: 'blueberry', colorClass: 'blueberry' },
    { image: 'images/green.png', name: 'watermelon', colorClass: 'watermelon' }
];
let currentQuestion = 0;
let score = 0;
const maxQuestions = 10;
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// 檢查 Canvas 初始化
console.log('Canvas initialized:', canvas, ctx);

// 預載入圖片
const images = {};
fruits.forEach(fruit => {
    images[fruit.name] = new Image();
    images[fruit.name].src = fruit.image;
    images[fruit.name].onload = () => console.log(`${fruit.name} image loaded`);
    images[fruit.name].onerror = () => console.error(`Failed to load ${fruit.name} image`);
});

// 粒子動畫數據
let particles = [];
const particleColors = ['#FF0000', '#FFFF00', '#87CEEB', '#00FF00'];

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
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
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
    setTimeout(() => {
        particles = [];
    }, 5000); // 動畫持續 5 秒
}

// 檢查 Canvas 數量（調試）
console.log('Canvas count:', document.querySelectorAll('canvas').length);

// 隨機選擇 3 個不同水果
function getRandomFruits() {
    const shuffled = [...fruits].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
}

// 鎖定/解鎖選項按鈕
function toggleButtons(disabled) {
    const buttons = document.querySelectorAll('.options button:not(.next-button)');
    buttons.forEach(button => {
        button.disabled = disabled;
    });
}

// 格式化題目文字，將水果名稱替換為帶樣式的 span
function formatQuestionText(text, fruit1, fruit2, fruit3) {
    return text.replace(
        new RegExp(`\\b(${fruit1.name}|${fruit2.name}|${fruit3.name})\\b`, 'g'),
        match => `<span class="color-${match}">${match}</span>`
    );
}

// 生成隨機問題
function generateQuestion() {
    if (currentQuestion >= maxQuestions) {
        endGame();
        return;
    }

    console.log('Generating question:', currentQuestion + 1);
    const position = positions[Math.floor(Math.random() * positions.length)];
    const selectedFruits = getRandomFruits();
    const fruit1 = selectedFruits[0]; // 主水果
    const fruit2 = selectedFruits[1]; // 第二水果
    const fruit3 = selectedFruits[2]; // 第三水果
    const isRightArrow = Math.random() > 0.5;

    const questionText = position === 'between'
        ? `Where is the ${fruit1.name} relative to the ${fruit2.name} and ${fruit3.name}?`
        : `Where is the ${fruit1.name} relative to the ${fruit2.name}?`;
    document.getElementById('question').innerHTML = formatQuestionText(questionText, fruit1, fruit2, fruit3);
    console.log('Question text:', questionText);

    // 繪製圖像
    drawScene(position, fruit1, fruit2, fruit3, isRightArrow);

    // 生成選項
    const options = [...positions];
    const optionsDiv = document.getElementById('options');
    optionsDiv.innerHTML = '';
    options.forEach(opt => {
        const button = document.createElement('button');
        button.innerText = opt;
        button.onclick = () => checkAnswer(opt, position);
        optionsDiv.appendChild(button);
    });
    console.log('Options generated:', options);

    document.getElementById('feedback').innerText = '';
    toggleButtons(false); // 解鎖按鈕
    currentQuestion++;
}

// 繪製場景
function drawScene(position, fruit1, fruit2, fruit3, isRightArrow) {
    console.log('Drawing scene:', position, isRightArrow);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const imageSize = 50;
    const spacing = 30;

    // 繪製箭頭
    if (position === 'in front of' || position === 'behind') {
        ctx.fillStyle = '#000';
        ctx.font = '30px Arial';
        ctx.fillText(isRightArrow ? '→' : '←', centerX - 20, 40);
    }

    if (position === 'in front of') {
        if (!isRightArrow) {
            ctx.drawImage(images[fruit3.name], centerX - 2 * (imageSize + spacing), centerY - imageSize / 2, imageSize, imageSize);
            ctx.drawImage(images[fruit1.name], centerX - (imageSize + spacing), centerY - imageSize / 2, imageSize, imageSize);
            ctx.drawImage(images[fruit2.name], centerX, centerY - imageSize / 2, imageSize, imageSize);
        } else {
            ctx.drawImage(images[fruit3.name], centerX - 2 * (imageSize + spacing), centerY - imageSize / 2, imageSize, imageSize);
            ctx.drawImage(images[fruit2.name], centerX - (imageSize + spacing), centerY - imageSize / 2, imageSize, imageSize);
            ctx.drawImage(images[fruit1.name], centerX, centerY - imageSize / 2, imageSize, imageSize);
        }
    } else if (position === 'behind') {
        if (!isRightArrow) {
            ctx.drawImage(images[fruit3.name], centerX - 2 * (imageSize + spacing), centerY - imageSize / 2, imageSize, imageSize);
            ctx.drawImage(images[fruit2.name], centerX - (imageSize + spacing), centerY - imageSize / 2, imageSize, imageSize);
            ctx.drawImage(images[fruit1.name], centerX, centerY - imageSize / 2, imageSize, imageSize);
        } else {
            ctx.drawImage(images[fruit3.name], centerX - 2 * (imageSize + spacing), centerY - imageSize / 2, imageSize, imageSize);
            ctx.drawImage(images[fruit1.name], centerX - (imageSize + spacing), centerY - imageSize / 2, imageSize, imageSize);
            ctx.drawImage(images[fruit2.name], centerX, centerY - imageSize / 2, imageSize, imageSize);
        }
    } else if (position === 'over') {
        ctx.drawImage(images[fruit3.name], centerX - imageSize / 2, centerY + (imageSize + spacing), imageSize, imageSize);
        ctx.drawImage(images[fruit2.name], centerX - imageSize / 2, centerY, imageSize, imageSize);
        ctx.drawImage(images[fruit1.name], centerX - imageSize / 2, centerY - (imageSize + spacing), imageSize, imageSize);
    } else if (position === 'under') {
        ctx.drawImage(images[fruit3.name], centerX - imageSize / 2, centerY - (imageSize + spacing), imageSize, imageSize);
        ctx.drawImage(images[fruit2.name], centerX - imageSize / 2, centerY, imageSize, imageSize);
        ctx.drawImage(images[fruit1.name], centerX - imageSize / 2, centerY + (imageSize + spacing), imageSize, imageSize);
    } else if (position === 'between') {
        ctx.drawImage(images[fruit2.name], centerX - (imageSize + spacing), centerY - imageSize / 2, imageSize, imageSize);
        ctx.drawImage(images[fruit3.name], centerX + spacing, centerY - imageSize / 2, imageSize, imageSize);
        ctx.drawImage(images[fruit1.name], centerX - imageSize / 2, centerY - imageSize / 2, imageSize, imageSize);
    }
}

// 檢查答案
function checkAnswer(selected, correct) {
    const feedback = document.getElementById('feedback');
    const optionsDiv = document.getElementById('options');

    console.log('Checking answer:', selected, 'Correct:', correct);
    toggleButtons(true);

    if (selected === correct) {
        feedback.innerText = 'Correct!';
        score++;
        document.getElementById('score').innerText = `Score: ${score} / ${maxQuestions}`;
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
    document.getElementById('question').innerText = 'Game Over!';
    document.getElementById('options').innerHTML = '';
    document.getElementById('feedback').innerText = `Final Score: ${score} / ${maxQuestions}`;
    startCelebration();
    console.log('Game ended, starting celebration');
}

// 初始化遊戲
try {
    console.log('Initializing game');
    generateQuestion();
} catch (error) {
    console.error('Initialization failed:', error);
    document.getElementById('feedback').innerText = 'Error starting game. Please check console for details.';
}
