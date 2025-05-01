let threeDigit = 649;
let oneDigit = 6;
let hundreds, tens, unitsDigit;
let horizontalStep = 0;
let verticalStep = 0;

function updateProblem() {
    hundreds = Math.floor(threeDigit / 100) * 100;
    tens = Math.floor((threeDigit % 100) / 10) * 10;
    unitsDigit = threeDigit % 10;
    horizontalStep = 0;
    verticalStep = 0;
    updateHorizontalSteps();
    updateVerticalSteps();
}

function generateProblem() {
    const hundredsDigit = Math.floor(Math.random() * 9) + 1;
    const tensDigit = Math.floor(Math.random() * 10);
    const units = Math.floor(Math.random() * 9) + 1;
    threeDigit = hundredsDigit * 100 + tensDigit * 10 + units;
    oneDigit = Math.floor(Math.random() * 9) + 1;
    document.getElementById('three-digit').value = threeDigit;
    document.getElementById('one-digit').value = oneDigit;
    updateProblem();
}

function getHorizontalSteps() {
    return [
        `${threeDigit} \\times ${oneDigit}`,
        `(${hundreds} + ${tens} + ${unitsDigit}) \\times ${oneDigit}`,
        `${hundreds} \\times ${oneDigit} + ${tens} \\times ${oneDigit} + ${unitsDigit} \\times ${oneDigit}`,
        `${hundreds * oneDigit} + ${tens * oneDigit} + ${unitsDigit * oneDigit}`,
        // 最終答案使用雙下劃線，但等號不包含雙下劃線
        `\\underline{\\underline{${threeDigit * oneDigit}}}`
    ];
}

function getVerticalSteps() {
    return [
        // 修改：乘號對齊千位，使用 \phantom{0}
        `\\begin{array}{r} \\phantom{0}${threeDigit} \\\\ \\times \\phantom{0}${oneDigit} \\\\ \\hline \\end{array}`,
        // 修改：顯示個位乘法結果（例如 9 × 6 = 54），無橫線
        `\\begin{array}{r} \\phantom{0}${threeDigit} \\\\ \\times \\phantom{0}${oneDigit} \\\\ \\hline ${unitsDigit * oneDigit} \\end{array}`,
        // 修改：顯示十位乘法結果（例如 4 × 6 = 24），無橫線
        `\\begin{array}{r} \\phantom{0}${threeDigit} \\\\ \\times \\phantom{0}${oneDigit} \\\\ \\hline ${unitsDigit * oneDigit} \\\\ ${tens / 10 * oneDigit}\\phantom{0} \\end{array}`,
        // 修改：顯示百位乘法結果（例如 6 × 6 = 36），橫線在 36\phantom{00} 下
        `\\begin{array}{r} \\phantom{0}${threeDigit} \\\\ \\times \\phantom{0}${oneDigit} \\\\ \\hline ${unitsDigit * oneDigit} \\\\ ${tens / 10 * oneDigit}\\phantom{0} \\\\ ${hundreds / 100 * oneDigit}\\phantom{00} \\\\ \\hline \\end{array}`,
        // 修改：顯示最終答案（例如 3894），使用雙下劃線，保留百位結果的橫線
        `\\begin{array}{r} \\phantom{0}${threeDigit} \\\\ \\times \\phantom{0}${oneDigit} \\\\ \\hline ${unitsDigit * oneDigit} \\\\ ${tens / 10 * oneDigit}\\phantom{0} \\\\ ${hundreds / 100 * oneDigit}\\phantom{00} \\\\ \\hline \\underline{\\underline{${threeDigit * oneDigit}}} \\end{array}`
    ];
}

const horizontalDiv = document.getElementById('horizontal-steps');
const verticalDiv = document.getElementById('vertical-steps');
const horizontalNextButton = document.getElementById('horizontal-next-step');
const verticalNextButton = document.getElementById('vertical-next-step');
const newProblemButton = document.getElementById('new-problem');
const threeDigitInput = document.getElementById('three-digit');
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
    const newThreeDigit = parseInt(threeDigitInput.value);
    const newOneDigit = parseInt(oneDigitInput.value);

    if (newThreeDigit >= 100 && newThreeDigit <= 999 && newOneDigit >= 1 && newOneDigit <= 9) {
        threeDigit = newThreeDigit;
        oneDigit = newOneDigit;
        updateProblem();
    } else {
        threeDigitInput.setCustomValidity('請輸入100-999');
        oneDigitInput.setCustomValidity('請輸入1-9');
    }
}

threeDigitInput.addEventListener('input', () => {
    threeDigitInput.setCustomValidity('');
    if (/^[1-9][0-9]{2}$/.test(threeDigitInput.value)) {
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
