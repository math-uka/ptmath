let a, b, sign;
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
    sign = Math.random() < 0.5 ? '+' : '-';
    let coeff = 2 * a * b;
    let constant = b * b;
    let aSquared = a * a;
    // Suppress coefficient 1 in the middle term
    let middleTerm = coeff === 1 ? `+x` : coeff === -1 ? `-x` : (sign === '+' ? `+${coeff}x` : `-${coeff}x`);
    let mathExpression = `\\(${aSquared}x^2 ${middleTerm} + ${constant}\\)`; // Use MathJax format
    // Suppress coefficient 1 in the correct answer
    let aTerm = a === 1 ? 'x' : a === -1 ? '-x' : `${a}x`;
    correctAnswer = sign === '+' ? `(${aTerm}+${b})²` : `(${aTerm}-${b})²`;
    document.getElementById('problem').innerHTML = mathExpression;
    document.getElementById('userAnswer').value = '';
    document.getElementById('feedback').style.display = 'none';
    document.getElementById('feedback').className = '';
    hintCount = 0;
    hintText = '';
    document.getElementById('feedback').innerHTML = '';
    document.getElementById('hintButton').disabled = false; // Reset hint button
    MathJax.typeset(); // Re-render MathJax
}

function parseAnswer(input) {
    // Remove whitespace and normalize superscript
    input = input.trim().replace(/\^2/g, '\u00B2');

    // Check if the input ends with ² and is enclosed in parentheses
    if (!input.endsWith('\u00B2') || !input.startsWith('(') || !input.includes(')')) {
        return null;
    }

    // Extract the expression inside the parentheses
    let expr = input.slice(1, input.indexOf(')')).trim();
    if (!expr.includes('x')) {
        return null;
    }

    // Split by + or - to separate terms, preserving signs
    let terms = expr.split(/([+-])/).filter(t => t !== '');
    let coeff = 0, constant = 0, currentSign = '+';

    for (let i = 0; i < terms.length; i++) {
        let term = terms[i].trim();
        if (term === '+' || term === '-') {
            currentSign = term;
            continue;
        }

        if (term.includes('x')) {
            // Handle coefficient of x
            let xCoeff = term.replace('x', '');
            if (xCoeff === '') xCoeff = '1'; // Interpret 'x' as '1x'
            if (xCoeff === '-') xCoeff = '-1'; // Interpret '-x' as '-1x'
            coeff = parseInt(currentSign + xCoeff);
        } else {
            // Handle constant term
            constant = parseInt(currentSign + term);
        }
    }

    return { coeff, constant };
}

function checkAnswer() {
    let userInput = document.getElementById('userAnswer').value.trim();
    let feedback = document.getElementById('feedback');
    let parsedUser = parseAnswer(userInput);

    if (!parsedUser) {
        feedback.textContent = 'Incorrect format. Use (ax+b)², (b+ax)², or (x+b)² if a=1';
        feedback.className = 'incorrect';
        feedback.style.display = 'block';
        return;
    }

    let { coeff, constant } = parsedUser;
    let correctParsed = parseAnswer(correctAnswer);

    // Check equivalence: (ax+b)² = (-ax-b)² = (b-ax)² = (-b+ax)²
    let isCorrect = (
        // Case 1: (ax+b)² or (-ax-b)²
        (coeff === correctParsed.coeff && constant === correctParsed.constant) ||
        (coeff === -correctParsed.coeff && constant === -correctParsed.constant) ||
        // Case 2: (b-ax)² or (-b+ax)²
        (coeff === correctParsed.constant && constant === -correctParsed.coeff) ||
        (coeff === -correctParsed.constant && constant === correctParsed.coeff)
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
        let aTerm = a === 1 ? 'x' : a === -1 ? '-x' : `${a}x`;
        let middleTerm = sign === '+' ? `+2(${aTerm})(${b})` : `-2(${aTerm})(${b})`;
        hintText = `Hint: Try factoring as \\((${aTerm})^2 ${middleTerm} + (${b})^2\\).`;
        feedback.innerHTML = hintText;
    } else if (hintCount === 2) {
        hintText += `<br>Hint: The factored form is \\(${correctAnswer}\\).`;
        feedback.innerHTML = hintText;
        document.getElementById('hintButton').disabled = true;
    }
    feedback.className = '';
    feedback.style.display = 'block';
    MathJax.typeset();
}