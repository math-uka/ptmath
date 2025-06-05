let a, b, c, d;
let correctAnswer;
let hintCount = 0;
let hintText = '';

function generateRandomNonZero() {
    let num = Math.floor(Math.random() * 19) - 9; // -9 to 9
    while (num === 0) {
        num = Math.floor(Math.random() * 19) - 9;
    }
    return num;
}

function generateRandomCoefficient() {
    return Math.floor(Math.random() * 4) + 1; // 1 to 4
}

function generateProblem() {
    a = generateRandomNonZero();
    b = generateRandomNonZero();
    c = generateRandomCoefficient();
    d = generateRandomCoefficient();
    
    // Generate the quadratic: cdx^2 + (cb + ad)x + ab
    let coeffX2 = c * d;
    let coeffX = c * b + a * d;
    let constant = a * b;
    let x2Term = coeffX2 === 1 ? 'x^2' : `${coeffX2}x^2`;
    let middleTerm = coeffX === 0 ? '' : (coeffX === 1 ? '+x' : coeffX === -1 ? '-x' : (coeffX > 0 ? `+${coeffX}x` : `${coeffX}x`));
    let constantTerm = constant > 0 ? `+${constant}` : `${constant}`;
    if (middleTerm && middleTerm.startsWith('+')) {
        middleTerm = ` ${middleTerm}`; // Add space before positive middle term
    } else if (!middleTerm) {
        middleTerm = ''; // Handle case when coeffX is 0
    }
    let mathExpression = `\\(${x2Term}${middleTerm}${constantTerm}\\)`; // Ensure proper spacing

    // Generate the correct answer: (cx + a)(dx + b)
    let aTerm = a > 0 ? `+${a}` : a < 0 ? `${a}` : '';
    let bTerm = b > 0 ? `+${b}` : b < 0 ? `${b}` : '';
    let cTerm = c === 1 ? '' : c;
    let dTerm = d === 1 ? '' : d;
    correctAnswer = `(${cTerm}x${aTerm})(${dTerm}x${bTerm})`;

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

    // Check if input is in the form (cx+a)(dx+b)
    if (!input.startsWith('(') || !input.includes(')(') || !input.endsWith(')')) {
        return null;
    }

    // Split into two factors
    let splitIndex = input.indexOf(')(');
    let firstFactor = input.slice(1, splitIndex).trim();
    let secondFactor = input.slice(splitIndex + 2, input.length - 1).trim();

    // Parse each factor: expect form cx + a or cx - a
    function parseFactor(factor) {
        let coeff = 1, constant = 0;
        let parts = factor.split(/([+-])/).filter(t => t !== '');
        let currentSign = '+';
        let xSeen = false;

        for (let i = 0; i < parts.length; i++) {
            let part = parts[i].trim();
            if (part === '+' || part === '-') {
                currentSign = part;
                continue;
            }
            if (part.includes('x')) {
                let xCoeff = part.replace('x', '');
                if (xCoeff === '') xCoeff = '1';
                if (xCoeff === '-') xCoeff = '-1';
                coeff = parseInt(currentSign + xCoeff);
                xSeen = true;
            } else if (!xSeen) {
                return null; // Constant before x is invalid
            } else {
                constant = parseInt(currentSign + part);
            }
        }
        return { coeff, constant };
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
        feedback.textContent = 'Incorrect format. Use (cx+a)(dx+b) or (dx+b)(cx+a), e.g., (2x+3)(x-4)';
        feedback.className = 'incorrect';
        feedback.style.display = 'block';
        return;
    }

    let [factor1, factor2] = parsedUser;

    // Check commutative property: (cx+a)(dx+b) = (dx+b)(cx+a)
    let isCorrect = (
        (factor1.coeff === c && factor1.constant === a && factor2.coeff === d && factor2.constant === b) ||
        (factor1.coeff === d && factor1.constant === b && factor2.coeff === c && factor2.constant === a)
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
        let coeffX = c * b + a * d;
        let constant = a * b;
        hintText = `Hint: Find factors of the form (cx+a)(dx+b) where c*d = ${c * d} and a*b = ${constant}, and the middle term gives ${coeffX}x.`;
        feedback.innerHTML = hintText;
    } else if (hintCount === 2) {
        let aTerm = a > 0 ? `+${a}` : a < 0 ? `${a}` : '';
        let bTerm = b > 0 ? `+${b}` : b < 0 ? `${b}` : '';
        let cTerm = c === 1 ? '' : c;
        let dTerm = d === 1 ? '' : d;
        hintText += `<br>Hint: The factored form is \\(${correctAnswer}\\).`;
        feedback.innerHTML = hintText;
        document.getElementById('hintButton').disabled = true;
    }
    feedback.className = '';
    feedback.style.display = 'block';
    MathJax.typeset();
}