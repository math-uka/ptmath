let firstTwoDigit = 18;
let secondTwoDigit = 12;
let firstTens, firstUnits, secondTens, secondUnits;
let horizontalStep = 0;
let verticalStep = 0;

function updateProblem() {
    firstTens = Math.floor(firstTwoDigit / 10) * 10;
    firstUnits = firstTwoDigit % 10;
    secondTens = Math.floor(secondTwoDigit / 10) * 10;
    secondUnits = secondTwoDigit % 10;
    horizontalStep = 0;
    verticalStep = 0;
    updateHorizontalSteps();
    updateVerticalSteps();
}

function generateProblem() {
    const firstTensDigit = Math.floor(Math.random() * 9) + 1;
    const firstUnitsDigit = Math.floor(Math.random() * 9) + 1;
    const secondTensDigit = Math.floor(Math.random() * 9) + 1;
    const secondUnitsDigit = Math.floor(Math.random() * 9) + 1;
    firstTwoDigit = firstTensDigit * 10 + firstUnitsDigit;
    secondTwoDigit = secondTensDigit * 10 + secondUnitsDigit;
    document.getElementById('first-two-digit').value = firstTwoDigit;
    document.getElementById('second-two-digit').value = secondTwoDigit;
    updateProblem();
}

function getHorizontalSteps() {
    return [
        `${firstTwoDigit} \\times ${secondTwoDigit}`,
        `${firstTwoDigit} \\times (${secondTens} + ${secondUnits})`,
        `${firstTwoDigit} \\times ${secondTens} + ${firstTwoDigit} \\times ${secondUnits}`,
        `${firstTwoDigit * secondTens} + ${firstTwoDigit * secondUnits}`,
        `${firstTwoDigit * secondTwoDigit}`
    ];
}

function getVerticalSteps() {
    return [
        `\\begin{array}{r} ${firstTwoDigit} \\\\ \\times ${secondTwoDigit} \\\\ \\hline \\end{array}`,
        `\\begin{array}{r} ${firstTwoDigit} \\\\ \\times ${secondTwoDigit} \\\\ \\hline ${firstTwoDigit * secondUnits} \\end{array}`,
        `\\begin{array}{r} ${firstTwoDigit} \\\\ \\times ${secondTwoDigit} \\\\ \\hline ${firstTwoDigit * secondUnits} \\\\ ${firstTwoDigit * (secondTens / 10)}\\phantom{0} \\end{array}`,
        `\\begin{array}{r} ${firstTwoDigit} \\\\ \\times ${secondTwoDigit} \\\\ \\hline ${firstTwoDigit * secondUnits} \\\\ ${firstTwoDigit * (secondTens / 10)}\\phantom{0} \\\\ \\hline ${firstTwoDigit * secondTwoDigit} \\end{array}`
    ];
}

const horizontalDiv = document.getElementById('horizontal-steps');
const verticalDiv = document.getElementById('vertical-steps');
const horizontalNextButton = document.getElementById('horizontal-next-step');
const verticalNextButton = document.getElementById('vertical-next-step');
const newProblemButton = document.getElementById('new-problem');
const firstTwoDigitInput = document.getElementById('first-two-digit');
const secondTwoDigitInput = document.getElementById('second-two-digit');

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
    const newFirstTwoDigit = parseInt(firstTwoDigitInput.value);
    const newSecondTwoDigit = parseInt(secondTwoDigitInput.value);

    if (newFirstTwoDigit >= 10 && newFirstTwoDigit <= 99 && newSecondTwoDigit >= 10 && newSecondTwoDigit <= 99) {
        firstTwoDigit = newFirstTwoDigit;
        secondTwoDigit = newSecondTwoDigit;
        updateProblem();
    } else {
        firstTwoDigitInput.setCustomValidity('請輸入10-99');
        secondTwoDigitInput.setCustomValidity('請輸入10-99');
    }
}

firstTwoDigitInput.addEventListener('input', () => {
    firstTwoDigitInput.setCustomValidity('');
    if (/^[1-9][0-9]?$/.test(firstTwoDigitInput.value)) {
        validateAndUpdate();
    }
});

secondTwoDigitInput.addEventListener('input', () => {
    secondTwoDigitInput.setCustomValidity('');
    if (/^[1-9][0-9]?$/.test(secondTwoDigitInput.value)) {
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
