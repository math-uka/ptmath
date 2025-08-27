let twoDigit = 49;
let oneDigit = 6;
let tens, unitsDigit;
let horizontalStep = 0;
let verticalStep = 0;

function updateProblem() {
    tens = Math.floor(twoDigit / 10) * 10;
    unitsDigit = twoDigit % 10;
    horizontalStep = 0;
    verticalStep = 0;
    updateHorizontalSteps();
    updateVerticalSteps();
}

function generateProblem() {
    const tensDigit = Math.floor(Math.random() * 9) + 1;
    const units = Math.floor(Math.random() * 9) + 1;
    twoDigit = tensDigit * 10 + units;
    oneDigit = Math.floor(Math.random() * 9) + 1;
    document.getElementById('two-digit').value = twoDigit;
    document.getElementById('one-digit').value = oneDigit;
    updateProblem();
}

function getHorizontalSteps() {
    return [
        `${twoDigit} \\times ${oneDigit}`,
        `(${tens} + ${unitsDigit}) \\times ${oneDigit}`,
        `${tens} \\times ${oneDigit} + ${unitsDigit} \\times ${oneDigit}`,
        `${tens * oneDigit} + ${unitsDigit * oneDigit}`,
        // 最終答案使用雙下劃線，但等號不包含雙下劃線
        `\\underline{\\underline{${twoDigit * oneDigit}}}`
    ];
}

function getVerticalSteps() {
    return [
        // 乘號對齊百位，使用 \phantom{0}
        `\\begin{array}{r} \\phantom{0}${twoDigit} \\\\ \\times \\phantom{0}${oneDigit} \\\\ \\hline \\end{array}`,
        // 顯示個位乘法結果（例如 9 × 6 = 54），無橫線
        `\\begin{array}{r} \\phantom{0}${twoDigit} \\\\ \\times \\phantom{0}${oneDigit} \\\\ \\hline ${unitsDigit * oneDigit} \\end{array}`,
        // 顯示十位乘法結果（例如 4 × 6 = 24），橫線在 24\phantom{0} 下
        `\\begin{array}{r} \\phantom{0}${twoDigit} \\\\ \\times \\phantom{0}${oneDigit} \\\\ \\hline ${unitsDigit * oneDigit} \\\\ ${tens / 10 * oneDigit}\\phantom{0} \\\\ \\hline \\end{array}`,
        // 顯示最終答案（例如 294），使用雙下劃線，保留十位結果的橫線
        `\\begin{array}{r} \\phantom{0}${twoDigit} \\\\ \\times \\phantom{0}${oneDigit} \\\\ \\hline ${unitsDigit * oneDigit} \\\\ ${tens / 10 * oneDigit}\\phantom{0} \\\\ \\hline \\underline{\\underline{${twoDigit * oneDigit}}} \\end{array}`
    ];
}

const horizontalDiv = document.getElementById('horizontal-steps');
const verticalDiv = document.getElementById('vertical-steps');
const horizontalNextButton = document.getElementById('horizontal-next-step');
const verticalNextButton = document.getElementById('vertical-next-step');
const newProblemButton = document.getElementById('new-problem');
const twoDigitInput = document.getElementById('two-digit');
const oneDigitInput = document.getElementById('one-digit');

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
    const newTwoDigit = parseInt(twoDigitInput.value);
    const newOneDigit = parseInt(oneDigitInput.value);

    if (newTwoDigit >= 10 && newTwoDigit <= 99 && newOneDigit >= 1 && newOneDigit <= 9) {
        twoDigit = newTwoDigit;
        oneDigit = newOneDigit;
        updateProblem();
    } else {
        twoDigitInput.setCustomValidity('請輸入10-99');
        oneDigitInput.setCustomValidity('請輸入1-9');
    }
}

twoDigitInput.addEventListener('input', () => {
    twoDigitInput.setCustomValidity('');
    if (/^[1-9][0-9]$/.test(twoDigitInput.value)) {
        validateAndUpdate();
    }
});

oneDigitInput.addEventListener('input', () => {
    oneDigitInput.setCustomValidity('');
    if (/^[1-9]$/.test(oneDigitInput.value)) {
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
