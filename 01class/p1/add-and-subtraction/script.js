// 星星動畫
function addStars() {
    const stars = document.getElementById('stars');
    for (let i = 0; i < 10; i++) {
        let star = document.createElement('span');
        star.textContent = '⭐';
        star.style.position = 'absolute';
        star.style.left = Math.random() * 100 + '%';
        star.style.top = Math.random() * 100 + '%';
        star.style.animation = `float ${2 + Math.random() * 2}s infinite`;
        stars.appendChild(star);
    }
}
addStars();

// 彩帶動畫（取代迷你煙火）
function showConfetti() {
    const celebration = document.getElementById('celebration');
    celebration.innerHTML = '';
    for (let i = 0; i < 20; i++) {
        const confetti = document.createElement('div');
        confetti.classList.add('confetti');
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.backgroundColor = `hsl(${Math.random() * 360}, 100%, 50%)`;
        confetti.style.animationDelay = `${Math.random() * 1}s`;
        celebration.appendChild(confetti);
        setTimeout(() => confetti.remove(), 3000);
    }
}

let score = 0;
let wrongCount = 0;
let totalWrong = 0;
let answer = 0;
let startTime = new Date();

function generateQuestion() {
    let num1, num2, result;
    const isAddition = Math.random() > 0.5;

    if (isAddition) {
        do {
            num1 = Math.floor(Math.random() * 99) + 1;
            num2 = Math.floor(Math.random() * 99) + 1;
            result = num1 + num2;
        } while (result > 100 || (num1 % 10) + (num2 % 10) < 10);
        document.getElementById('question').textContent = `${num1} + ${num2} = ?`;
    } else {
        do {
            num1 = Math.floor(Math.random() * 99) + 1;
            num2 = Math.floor(Math.random() * 99) + 1;
            result = num1 - num2;
        } while (result < 0 || (num1 % 10) >= (num2 % 10) || num1 <= num2);
        document.getElementById('question').textContent = `${num1} - ${num2} = ?`;
    }

    answer = result;
    clearInput();
    document.getElementById('message').textContent = '';
}

function appendNumber(num) {
    const input = document.getElementById('answerInput');
    if (input.value.length < 2) {
        input.value += num;
    }
}

function clearInput() {
    document.getElementById('answerInput').value = '';
}

function checkAnswer() {
    const userAnswer = parseInt(document.getElementById('answerInput').value) || 0;
    
    if (userAnswer === answer) {
        score++;
        document.getElementById('score').textContent = `得分: ${score}`;
        showConfetti();
        if (score === 10) {
            endGame();
        } else {
            generateQuestion();
        }
    } else {
        wrongCount++;
        totalWrong++;
        document.getElementById('message').textContent = `哎呀，錯了${wrongCount}次！再試試吧～`;
    }
}

function endGame() {
    const endTime = new Date();
    const timeDiff = (endTime - startTime) / 1000;
    const fireworks = document.getElementById('fireworks');
    fireworks.style.display = 'block';
    fireworks.innerHTML = `太棒了，小勇士！<br>冒險完成！用時：${Math.round(timeDiff)}秒<br>總共錯了${totalWrong}題<br>魔法彩帶為你綻放！🎉`;
    
    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.classList.add('confetti');
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.backgroundColor = `hsl(${Math.random() * 360}, 100%, 50%)`;
        confetti.style.animationDelay = `${Math.random() * 2}s`;
        document.getElementById('celebration').appendChild(confetti);
        setTimeout(() => confetti.remove(), 3000);
    }
}

generateQuestion();
