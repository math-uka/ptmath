let threeDigit = 959;
let twoDigit = 86;
let hundreds, tens, units, secondTens, secondUnits;
let horizontalStep = 0;
let verticalStep = 0;

function updateProblem() {
    hundreds = Math.floor(threeDigit / 100) * 100;
    tens = Math.floor((threeDigit % 100) / 10) * 10;
    units = threeDigit % 10;
    secondTens = Math.floor(twoDigit / 10) * 10;
    secondUnits = twoDigit % 10;
    horizontalStep = 0;
    verticalStep = 0;
    updateHorizontalSteps();
    updateVerticalSteps();
}

function generateProblem() {
    const hundredsDigit = Math.floor(Math.random() * 9) + 1;
    const tensDigit = Math.floor(Math.random() * 10);
    const unitsDigit = Math.floor(Math.random() * 9) + 1;
    const secondTensDigit = Math.floor(Math.random() * 9) + 1;
    const secondUnitsDigit = Math.floor(Math.random() * 9) + 1;
    threeDigit = hundredsDigit * 100 + tensDigit * 10 + unitsDigit;
    twoDigit = secondTensDigit * 10 + secondUnitsDigit;
    document.getElementById('three-digit').value = threeDigit;
    document.getElementById('two-digit').value = twoDigit;
    updateProblem();
}

function getHorizontalSteps() {
    return [
        `${threeDigit} \\times ${twoDigit}`,
        `${threeDigit} \\times (${secondTens} + ${secondUnits})`,
        `${threeDigit} \\times ${secondTens} + ${threeDigit} \\times ${secondUnits}`,
        `${threeDigit * secondTens} + ${threeDigit * secondUnits}`,
        // 最終答案使用雙下劃線，但等號不包含雙下劃線
        `\\underline{\\underline{${threeDigit * twoDigit}}}`
    ];
}

function getVerticalSteps() {
    return [
        // 乘號左移到千位位置，使用 \phantom{0}
        `\\begin{array}{r} \\phantom{0}${threeDigit} \\\\ \\times \\phantom{0}${twoDigit} \\\\ \\hline \\end{array}`,
        // 顯示個位乘法結果（例如 959 × 6 = 5754），不添加橫線
        `\\begin{array}{r} \\phantom{0}${threeDigit} \\\\ \\times \\phantom{0}${twoDigit} \\\\ \\hline ${threeDigit * secondUnits} \\end{array}`,
        // 顯示十位乘法結果（例如 959 × 8 = 7672），橫線在 7672\phantom{0} 下
        `\\begin{array}{r} \\phantom{0}${threeDigit} \\\\ \\times \\phantom{0}${twoDigit} \\\\ \\hline ${threeDigit * secondUnits} \\\\ ${threeDigit * (secondTens / 10)}\\phantom{0} \\\\ \\hline \\end{array}`,
        // 顯示最終答案（例如 5754 + 76720 = 82474），保留 7672\phantom{0} 的橫線，使用雙下劃線
        `\\begin{array}{r} \\phantom{0}${threeDigit} \\\\ \\times \\phantom{0}${twoDigit} \\\\ \\hline ${threeDigit * secondUnits} \\\\ ${threeDigit * (secondTens / 10)}\\phantom{0} \\\\ \\hline \\underline{\\underline{${threeDigit * twoDigit}}} \\end{array}`
    ];
}

const horizontalDiv = document.getElementById('horizontal-steps');
const verticalDiv = document.getElementById('vertical-steps');
const horizontalNextButton = document.getElementById('horizontal-next-step');
const verticalNextButton = document.getElementById('vertical-next-step');
const newProblemButton = document.getElementById('new-problem');
const threeDigitInput = document.getElementById('three-digit');
const twoDigitInput = document.getElementById('two-digit');

function updateHorizontalSteps() {
    const horizontalSteps = getHorizontalSteps();
    horizontalDiv.innerHTML = '';
    for (let i = 0; i <= Math.min(horizontalStep, horizontalSteps.length - 1); i++) {
        const stepDiv = document.createElement('div');
        stepDiv.classList.add('equation-container', 'py-1');
        const equalsDiv = document.createElement('div');
        equalsDiv.classList.add('equals-sign');
        equalsDiv.innerHTML = i === 0 ? '' : '=';
        const mathDiv = document.createElement('div');
        mathDiv.classList.add('math-expression');
        mathDiv.innerHTML = `\\(${horizontalSteps[i]}\\)`;
        stepDiv.appendChild(equalsDiv);
        stepDiv.appendChild(mathDiv);
        horizontalDiv.appendChild(stepDiv);
    }

    MathJax.typesetPromise().catch(err => console.error('MathJax typesetting failed:', err));

    horizontalNextButton.disabled = horizontalStep >= horizontalSteps.length - 1;
    horizontalNextButton.classList.toggle('bg-green-500', !horizontalNextButton.disabled);
    horizontalNextButton.classList.toggle('hover:bg-green-600', !horizontalNextButton.disabled);
    horizontalNextButton.classList.toggle('bg-gray-400', horizontalNextButton.disabled);
    horizontalNextButton.classList.toggle('cursor-not-allowed', horizontalNextButton.disabled);
}

function updateVerticalSteps() {
    const verticalSteps = getVerticalSteps();
    verticalDiv.innerHTML = `\\(${verticalSteps[Math.min(verticalStep, verticalSteps.length - 1)]}\\)`;
    MathJax.typesetPromise().catch(err => console.error('MathJax typesetting failed:', err));

    verticalNextButton.disabled = verticalStep >= verticalSteps.length - 1;
    verticalNextButton.classList.toggle('bg-green-500', !verticalNextButton.disabled);
    verticalNextButton.classList.toggle('hover:bg-green-600', !verticalNextButton.disabled);
    verticalNextButton.classList.toggle('bg-gray-400', verticalNextButton.disabled);
    verticalNextButton.classList.toggle('cursor-not-allowed', verticalNextButton.disabled);
}

function validateAndUpdate() {
    const newThreeDigit = parseInt(threeDigitInput.value);
    const newTwoDigit = parseInt(twoDigitInput.value);

    if (newThreeDigit >= 100 && newThreeDigit <= 999 && newTwoDigit >= 10 && newTwoDigit <= 99) {
        threeDigit = newThreeDigit;
        twoDigit = newTwoDigit;
        updateProblem();
    } else {
        threeDigitInput.setCustomValidity('請輸入100-999');
        twoDigitInput.setCustomValidity('請輸入10-99');
    }
}

threeDigitInput.addEventListener('input', () => {
    threeDigitInput.setCustomValidity('');
    if (/^[1-9][0-9]{1,2}$/.test(threeDigitInput.value)) {
        validateAndUpdate();
    }
});

twoDigitInput.addEventListener('input', () => {
    twoDigitInput.setCustomValidity('');
    if (/^[1-9][0-9]?$/.test(twoDigitInput.value)) {
        validateAndUpdate();
    }
});

horizontalNextButton.addEventListener('click', () => {
    if (horizontalStep < getHorizontalSteps().length - 1) {
        horizontalStep++;
        updateHorizontalSteps();
    }
});

verticalNextButton.addEventListener('click', () => {
    if (verticalStep < getVerticalSteps().length - 1) {
        verticalStep++;
        updateVerticalSteps();
    }
});

newProblemButton.addEventListener('click', generateProblem);

// Initialize with a random problem on first load
window.addEventListener('load', () => {
    generateProblem();
});
