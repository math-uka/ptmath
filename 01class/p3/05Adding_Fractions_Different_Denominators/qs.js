const canvas1 = document.getElementById('canvas1');
const canvas2 = document.getElementById('canvas2');
const canvasResult = document.getElementById('canvasResult');
const ctx1 = canvas1.getContext('2d');
const ctx2 = canvas2.getContext('2d');
const ctxResult = canvasResult.getContext('2d');
const stepText = document.getElementById('stepText');
const algebraText = document.getElementById('algebra');
const nextBtn = document.getElementById('nextBtn');
const prevBtn = document.getElementById('prevBtn');
const applyBtn = document.getElementById('applyBtn');
const resetBtn = document.getElementById('resetBtn');
const denom1Input = document.getElementById('denom1');
const denom2Input = document.getElementById('denom2');

let step = 0;
let num1 = 1, denom1 = 2;
let num2 = 1, denom2 = 3;
let commonDenom, newNum1, newNum2;

function drawFraction(canvas, ctx, num, denom, color = 'rgba(255, 165, 0, 0.7)', fillCount = null) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const width = canvas.width / denom;
    const height = canvas.height;

    for (let i = 0; i < denom; i++) {
        ctx.beginPath();
        ctx.rect(i * width, 0, width, height);
        if (fillCount !== null && i < fillCount) {
            ctx.fillStyle = color;
        } else {
            ctx.fillStyle = 'rgba(200, 200, 200, 0.3)';
        }
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.stroke();
    }
}

function gcd(a, b) {
    return b === 0 ? a : gcd(b, a % b);
}

function lcm(a, b) {
    return (a * b) / gcd(a, b);
}

function generateRandomDenominators() {
    denom1 = Math.floor(Math.random() * 7) + 2; // 2 to 8
    denom2 = Math.floor(Math.random() * 7) + 2;
    while (denom1 === denom2) {
        denom2 = Math.floor(Math.random() * 7) + 2;
    }
    denom1Input.value = denom1;
    denom2Input.value = denom2;
    resetDemo();
    updateFractions();
}

function resetDemo() {
    step = 0;
    nextBtn.textContent = '下一步 (Next)';
    nextBtn.disabled = false;
    nextBtn.classList.remove('hidden');
    prevBtn.disabled = true;
    applyBtn.disabled = false;
    resetBtn.disabled = false;
    document.getElementById('result').textContent = '?';
    algebraText.textContent = '';
    ctxResult.clearRect(0, 0, canvasResult.width, canvasResult.height);
    stepText.innerHTML = '點擊「下一步」開始學習！<br>Click "Next" to start learning!';
    document.getElementById('frac1').textContent = `\\(\\frac{1}{${denom1}}\\)`;
    document.getElementById('frac2').textContent = `\\(\\frac{1}{${denom2}}\\)`;
    drawFraction(canvas1, ctx1, num1, denom1, 'rgba(255, 165, 0, 0.7)', num1);
    drawFraction(canvas2, ctx2, num2, denom2, 'rgba(135, 206, 235, 0.7)', num2);
    MathJax.typeset();
}

function updateFractions() {
    denom1 = parseInt(denom1Input.value);
    denom2 = parseInt(denom2Input.value);
    if (isNaN(denom1) || isNaN(denom2) || denom1 < 2 || denom2 < 2 || denom1 > 15 || denom2 > 15) {
        stepText.innerHTML = '請輸入2到15之間的分母！<br>Please enter denominators between 2 and 15!';
        nextBtn.disabled = true;
        return;
    }
    document.getElementById('frac1').textContent = `\\(\\frac{1}{${denom1}}\\)`;
    document.getElementById('frac2').textContent = `\\(\\frac{1}{${denom2}}\\)`;
    algebraText.textContent = `\\(\\frac{1}{${denom1}} + \\frac{1}{${denom2}}\\)`;
    drawFraction(canvas1, ctx1, num1, denom1, 'rgba(255, 165, 0, 0.7)', num1);
    drawFraction(canvas2, ctx2, num2, denom2, 'rgba(135, 206, 235, 0.7)', num2);
    stepText.innerHTML = '分數已設定！點擊「下一步」繼續。<br>Fractions set! Click "Next" to continue.';
    nextBtn.disabled = false;
    applyBtn.disabled = true;
    step = 1;
    commonDenom = lcm(denom1, denom2);
    newNum1 = num1 * (commonDenom / denom1);
    newNum2 = num2 * (commonDenom / denom2);
    MathJax.typeset();
}

function nextStep() {
    prevBtn.disabled = false;
    if (step === 0) {
        updateFractions();
    } else if (step === 1) {
        stepText.innerHTML = `這是 \\(\\frac{1}{${denom1}}\\) 和 \\(\\frac{1}{${denom2}}\\) 的圖形表示<br>This is the graphical representation of \\(\\frac{1}{${denom1}}\\) and \\(\\frac{1}{${denom2}}\\)`;
        algebraText.textContent = `\\(\\frac{1}{${denom1}} + \\frac{1}{${denom2}}\\)`;
        drawFraction(canvas1, ctx1, num1, denom1, 'rgba(255, 165, 0, 0.7)', num1);
        drawFraction(canvas2, ctx2, num2, denom2, 'rgba(135, 206, 235, 0.7)', num2);
    } else if (step === 2) {
        stepText.innerHTML = `我們需要通分，讓分母相同。最小公倍數是 ${commonDenom}<br>We need to find a common denominator. The least common multiple is ${commonDenom}`;
        algebraText.textContent = `\\(\\frac{1}{${denom1}} + \\frac{1}{${denom2}}\\)`;
    } else if (step === 3) {
        stepText.innerHTML = `\\(\\frac{1}{${denom1}}\\) 通分後變成 \\(\\frac{${newNum1}}{${commonDenom}}\\)<br>\\(\\frac{1}{${denom1}}\\) becomes \\(\\frac{${newNum1}}{${commonDenom}}\\) after finding the common denominator`;
        algebraText.textContent = `\\(\\frac{1 \\times ${commonDenom / denom1}}{${denom1} \\times ${commonDenom / denom1}} + \\frac{1}{${denom2}}\\)`;
        document.getElementById('frac1').textContent = `\\(\\frac{${newNum1}}{${commonDenom}}\\)`;
        drawFraction(canvas1, ctx1, newNum1, commonDenom, 'rgba(255, 165, 0, 0.7)', newNum1);
    } else if (step === 4) {
        stepText.innerHTML = `\\(\\frac{1}{${denom2}}\\) 通分後變成 \\(\\frac{${newNum2}}{${commonDenom}}\\)<br>\\(\\frac{1}{${denom2}}\\) becomes \\(\\frac{${newNum2}}{${commonDenom}}\\) after finding the common denominator`;
        algebraText.textContent = `\\(\\frac{${newNum1}}{${commonDenom}} + \\frac{1 \\times ${commonDenom / denom2}}{${denom2} \\times ${commonDenom / denom2}}\\)`;
        document.getElementById('frac2').textContent = `\\(\\frac{${newNum2}}{${commonDenom}}\\)`;
        drawFraction(canvas2, ctx2, newNum2, commonDenom, 'rgba(135, 206, 235, 0.7)', newNum2);
    } else if (step === 5) {
        stepText.innerHTML = `現在你們知道答案了嗎？<br>Do you know the answer now?`;
        algebraText.textContent = `\\(\\frac{${newNum1}}{${commonDenom}} + \\frac{${newNum2}}{${commonDenom}} = ?\\)`;
        drawFraction(canvasResult, ctxResult, commonDenom, commonDenom, 'rgba(200, 200, 200, 0.3)', 0); // Draw empty grid
    } else if (step === 6) {
        const sumNum = newNum1 + newNum2;
        stepText.innerHTML = `現在我們把 \\(\\frac{${newNum1}}{${commonDenom}}\\) 和 \\(\\frac{${newNum2}}{${commonDenom}}\\) 相加，得到 \\(\\frac{${sumNum}}{${commonDenom}}\\)<br>Now we add \\(\\frac{${newNum1}}{${commonDenom}}\\) and \\(\\frac{${newNum2}}{${commonDenom}}\\), getting \\(\\frac{${sumNum}}{${commonDenom}}\\)`;
        algebraText.textContent = `\\(\\frac{${newNum1}}{${commonDenom}} + \\frac{${newNum2}}{${commonDenom}} = \\frac{${sumNum}}{${commonDenom}}\\)`;
        document.getElementById('result').textContent = `\\(\\frac{${sumNum}}{${commonDenom}}\\)`;
        ctxResult.clearRect(0, 0, canvasResult.width, canvasResult.height);
        const width = canvasResult.width / commonDenom;
        for (let i = 0; i < newNum1; i++) {
            ctxResult.beginPath();
            ctxResult.rect(i * width, 0, width, canvasResult.height);
            ctxResult.fillStyle = 'rgba(255, 165, 0, 0.7)';
            ctxResult.fill();
            ctxResult.strokeStyle = '#333';
            ctxResult.stroke();
        }
        for (let i = 0; i < newNum2; i++) {
            ctxResult.beginPath();
            ctxResult.rect((newNum1 + i) * width, 0, width, canvasResult.height);
            ctxResult.fillStyle = 'rgba(135, 206, 235, 0.7)';
            ctxResult.fill();
            ctxResult.strokeStyle = '#333';
            ctxResult.stroke();
        }
        for (let i = newNum1 + newNum2; i < commonDenom; i++) {
            ctxResult.beginPath();
            ctxResult.rect(i * width, 0, width, canvasResult.height);
            ctxResult.fillStyle = 'rgba(200, 200, 200, 0.3)';
            ctxResult.fill();
            ctxResult.strokeStyle = '#333';
            ctxResult.stroke();
        }
        nextBtn.classList.add('hidden'); // Hide the Next button
    }
    step++;
    MathJax.typeset();
}

function prevStep() {
    if (step > 1) {
        step -= 2;
        nextBtn.classList.remove('hidden');
        nextBtn.textContent = '下一步 (Next)';
        nextStep();
    }
    if (step <= 1) {
        prevBtn.disabled = true;
    }
}

drawFraction(canvas1, ctx1, num1, denom1, 'rgba(255, 165, 0, 0.7)', num1);
drawFraction(canvas2, ctx2, num2, denom2, 'rgba(135, 206, 235, 0.7)', num2);

applyBtn.addEventListener('click', updateFractions);
nextBtn.addEventListener('click', nextStep);
prevBtn.addEventListener('click', prevStep);
resetBtn.addEventListener('click', generateRandomDenominators);
denom1Input.addEventListener('change', resetDemo);
denom2Input.addEventListener('change', resetDemo);

MathJax.typeset();
