let a, b, aIsX, bIsX;
let correctAnswer;
let hintCount = 0;
let hintText = '';

function gcd(x, y) {
    while (y) {
        let t = y;
        y = x % y;
        x = t;
    }
    return x;
}

function generateCoprimeNumbers() {
    let num1 = Math.floor(Math.random() * 9) + 1;
    let num2 = Math.floor(Math.random() * 9) + 1;
    while (gcd(num1, num2) !== 1) {
        num2 = Math.floor(Math.random() * 9) + 1;
    }
    return [num1, num2];
}

function generateProblem() {
    [a, b] = generateCoprimeNumbers();
    // Randomly decide whether a or b contains x, ensuring at least one has x
    let choice = Math.floor(Math.random() * 2); // 0: a is x, 1: b is x
    aIsX = choice === 0;
    bIsX = choice === 1;

    // Generate the expression a^2 - b^2
    let aTerm = aIsX ? (a === 1 ? 'x^2' : `${a * a}x^2`) : `${a * a}`;
    let bTerm = bIsX ? (b === 1 ? 'x^2' : `${b * b}x^2`) : `${b * b}`;
    let mathExpression = `\\(${aTerm} - ${bTerm}\\)`; // Use MathJax format

    // Generate the correct answer (a + b)(a - b)
    let aFactor = aIsX ? (a === 1 ? 'x' : `${a}x`) : a;
    let bFactor = bIsX ? (b === 1 ? 'x' : `${b}x`) : b;
    correctAnswer = `(${aFactor}+${bFactor})(${aFactor}-${bFactor})`;

    document.getElementById('problem').innerHTML = mathExpression;
    document.getElementById('userAnswer').value = '';
    document.getElementById('feedback').style.display = 'none';
    document.getElementById('feedback').className = '';
    hintCount = 0;
    hintText = '';
    document.getElementById('feedback').innerHTML = '';
    document.getElementById('hintButton').disabled = false;
    MathJax.typeset();
}

function parseAnswer(input) {
    // Remove whitespace
    input = input.trim();

    // Check if input is in the form (term1)(term2)
    if (!input.startsWith('(') || !input.includes(')(') || !input.endsWith(')')) {
        return null;
    }

    // Split into two factors
    let splitIndex = input.indexOf(')(');
    let firstFactor = input.slice(1, splitIndex).trim();
    let secondFactor = input.slice(splitIndex + 2, input.length - 1).trim();

    // Parse each factor: expect form ax + b or ax - b or constant
    function parseFactor(factor) {
        let coeff = 0, constant = 0;
        let hasX = factor.includes('x');
        let terms = factor.split(/([+-])/).filter(t => t !== '');
        let currentSign = '+';

        for (let i = 0; i < terms.length; i++) {
            let term = terms[i].trim();
            if (term === '+' || term === '-') {
                currentSign = term;
                continue;
            }
            if (hasX && term.includes('x')) {
                let xCoeff = term.replace('x', '');
                if (xCoeff === '') xCoeff = '1';
                if (xCoeff === '-') xCoeff = '-1';
                coeff = parseInt(currentSign + xCoeff);
            } else {
                constant = parseInt(currentSign + term);
            }
        }
        return { coeff, constant, hasX };
    }

    let factor1 = parseFactor(firstFactor);
    let factor2 = parseFactor(secondFactor);

    if (!factor1 || !factor2) return null;

    return [factor1, factor2];
}

function checkAnswer() {
    let userInput = document.getElementById('userAnswer').value.trim();
    let feedback = document.getElementById('feedback');
    let parsedUser = parseAnswer(userInput);

    if (!parsedUser) {
        feedback.textContent = 'Incorrect format. Use (ax+b)(ax-b) or (x+b)(x-b) if a=1';
        feedback.className = 'incorrect';
        feedback.style.display = 'block';
        return;
    }

    let [factor1, factor2] = parsedUser;
    let correctParsed = parseAnswer(correctAnswer);

    // Check commutative property: (a+b)(a-b) = (a-b)(a+b)
    let isCorrect = (
        // Case 1: (a+b)(a-b)
        (factor1.coeff === correctParsed[0].coeff && factor1.constant === correctParsed[0].constant &&
         factor2.coeff === correctParsed[1].coeff && factor2.constant === correctParsed[1].constant) ||
        // Case 2: (a-b)(a+b)
        (factor1.coeff === correctParsed[1].coeff && factor1.constant === correctParsed[1].constant &&
         factor2.coeff === correctParsed[0].coeff && factor2.constant === correctParsed[0].constant)
    );

    if (isCorrect) {
        feedback.textContent = 'Correct!';
        feedback.className = 'correct';
    } else {
        feedback.textContent = 'Incorrect. Try again!';
        feedback.className = 'incorrect';
    }
    feedback.style.display = 'block';
}

function showHint() {
    let feedback = document.getElementById('feedback');
    if (hintCount >= 2) {
        feedback.textContent = 'No more hints available for this problem.';
        feedback.className = 'incorrect';
        feedback.style.display = 'block';
        document.getElementById('hintButton').disabled = true;
        return;
    }
    hintCount++;
    if (hintCount === 1) {
        hintText = `Hint: Use the difference of squares formula: \\(a^2 - b^2 = (a + b)(a - b)\\). Identify \\(a\\) and \\(b\\).`;
        feedback.innerHTML = hintText;
    } else if (hintCount === 2) {
        let aFactor = aIsX ? (a === 1 ? 'x' : `${a}x`) : a;
        let bFactor = bIsX ? (b === 1 ? 'x' : `${b}x`) : b;
        hintText += `<br>Hint: The factored form is \\(${correctAnswer}\\).`;
        feedback.innerHTML = hintText;
        document.getElementById('hintButton').disabled = true;
    }
    feedback.className = '';
    feedback.style.display = 'block';
    MathJax.typeset();
}
