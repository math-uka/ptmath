let currentQuestion;
let hintCount = 0;
let hintText = '';

function gcd(a, b) {
    a = Math.abs(a);
    b = Math.abs(b);
    return b === 0 ? a : gcd(b, a % b);
}

function gcdArray(numbers) {
    return numbers.reduce((a, b) => gcd(a, b));
}

function areCoprime(numbers) {
    for (let i = 0; i < numbers.length; i++) {
        for (let j = i + 1; j < numbers.length; j++) {
            if (gcd(numbers[i], numbers[j]) !== 1) return false;
        }
    }
    return true;
}

function isPerfectSquare(n) {
    n = Math.abs(n);
    const sqrt = Math.sqrt(n);
    return Number.isInteger(sqrt);
}

function isPerfectSquareTrinomial(a, b, c) {
    // Check if ax^2 + bx + c is a perfect square: b^2 = 4ac
    return b * b === 4 * a * c;
}

function isQuadraticFactorable(a, b, c) {
    // Check if ax^2 + bx + c can be factored into (px + q)(rx + s) with integer coefficients
    const discriminant = b * b - 4 * a * c;
    // If discriminant is not a perfect square, it's not factorable with integers
    if (!Number.isInteger(Math.sqrt(discriminant))) return false;

    // Test factor pairs of a and c to find integer solutions
    const aFactors = [];
    const cFactors = [];
    for (let i = -Math.abs(a); i <= Math.abs(a); i++) {
        if (i !== 0 && a % i === 0) aFactors.push(i);
    }
    for (let i = -Math.abs(c); i <= Math.abs(c); i++) {
        if (i !== 0 && c % i === 0) cFactors.push(i);
    }

    // Check all combinations of (px + q)(rx + s) where p*r = a and q*s = c
    for (let p of aFactors) {
        let r = a / p;
        for (let q of cFactors) {
            let s = c / q;
            // Check if middle term matches: pr + qs = b
            if (p * s + q * r === b) {
                return true;
            }
        }
    }
    return false;
}

function generateQuestion() {
    const numbers = [2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 15, 16, 18, 20];
    let a, b, c, d;
    const forms = [
        () => {
            // Quadratic Trinomial: d(ax^2 + bx + c)
            do {
                [a, b, c] = numbers.sort(() => Math.random() - 0.5).slice(0, 3);
                d = Math.floor(Math.random() * 7) + 2;
                // Adjust signs for b and c
                b = Math.random() > 0.5 ? b : -b;
                c = Math.random() > 0.5 ? c : -c;
            } while (
                !areCoprime([Math.abs(a), Math.abs(b), Math.abs(c)]) ||
                isPerfectSquareTrinomial(a, b, c) ||
                isQuadraticFactorable(a, b, c)
            );
            const signB = b >= 0 ? '+' : '-';
            const signC = c >= 0 ? '+' : '-';
            const coeffs = [d * a, d * b, d * c];
            const common = gcdArray([Math.abs(a), Math.abs(b), Math.abs(c)]) * d;
            const expr = `${d * a}x^2 ${signB} ${Math.abs(d * b)}x ${signC} ${Math.abs(d * c)}`;
            const ans = `${common}(${a / gcdArray([Math.abs(a), Math.abs(b), Math.abs(c)])}x^2 ${signB} ${Math.abs(b / gcdArray([Math.abs(a), Math.abs(b), Math.abs(c)]))}x ${signC} ${Math.abs(c / gcdArray([Math.abs(a), Math.abs(b), Math.abs(c)]))})`;
            return {
                expression: expr,
                answer: ans,
                commonFactor: common
            };
        },
        () => {
            // Quadratic Binomial: d(ax^2 + c)
            do {
                [a, c] = numbers.sort(() => Math.random() - 0.5).slice(0, 2);
                d = Math.floor(Math.random() * 7) + 2;
                c = Math.random() > 0.5 ? c : -c;
            } while (
                !areCoprime([Math.abs(a), Math.abs(c)]) ||
                isPerfectSquare(Math.abs(c)) // Avoid difference of squares
            );
            const signC = c >= 0 ? '+' : '-';
            const coeffs = [d * a, d * c];
            const common = gcdArray([Math.abs(a), Math.abs(c)]) * d;
            const expr = `${d * a}x^2 ${signC} ${Math.abs(d * c)}`;
            const ans = `${common}(${a / gcdArray([Math.abs(a), Math.abs(c)])}x^2 ${signC} ${Math.abs(c / gcdArray([Math.abs(a), Math.abs(c)]))})`;
            return {
                expression: expr,
                answer: ans,
                commonFactor: common
            };
        },
        () => {
            // Linear Monomial: d(ax^2 + bx)
            do {
                [a, b] = numbers.sort(() => Math.random() - 0.5).slice(0, 2);
                d = Math.floor(Math.random() * 7) + 2;
                b = Math.random() > 0.5 ? b : -b;
            } while (!areCoprime([Math.abs(a), Math.abs(b)]));
            const signB = b >= 0 ? '+' : '-';
            const coeffs = [d * a, d * b];
            const common = gcdArray([Math.abs(a), Math.abs(b)]) * d;
            const xFactor = 'x';
            const expr = `${d * a}x^2 ${signB} ${Math.abs(d * b)}x`;
            const ans = `${common}${xFactor}(${a / gcdArray([Math.abs(a), Math.abs(b)])}x ${signB} ${Math.abs(b / gcdArray([Math.abs(a), Math.abs(b)]))})`;
            return {
                expression: expr,
                answer: ans,
                commonFactor: `${common}${xFactor}`
            };
        }
    ];
    const form = forms[Math.floor(Math.random() * forms.length)]();
    if (!form.expression || !form.answer || !form.commonFactor) {
        return generateQuestion();
    }
    return form;
}

function generateProblem() {
    currentQuestion = generateQuestion();
    const problemElement = document.getElementById('problem');
    if (currentQuestion.expression) {
        problemElement.textContent = `\\( ${currentQuestion.expression} \\)`;
    } else {
        problemElement.textContent = '';
        console.error('Invalid expression generated:', currentQuestion);
        generateProblem();
        return;
    }
    document.getElementById('userAnswer').value = '';
    document.getElementById('feedback').style.display = 'none';
    document.getElementById('feedback').className = '';
    hintCount = 0;
    hintText = '';
    document.getElementById('feedback').textContent = '';
    document.getElementById('hintButton').disabled = false;
    MathJax.typeset();
}

function normalizeAnswer(answer) {
    // Replace ² with ^2 and remove spaces around + or -
    let normalized = answer
        .replace(/²/g, '^2')
        .replace(/\s*([+-])\s*/g, '$1');
    
    // Split into factors: common factor and parenthetical expression
    let factors = [];
    let match = normalized.match(/^(\d+x?)?\(([^)]+)\)$/);
    if (!match) {
        match = normalized.match(/^\(([^)]+)\)(\d+x?)?$/);
        if (!match) return normalized; // Return as is if format doesn't match
        factors = [match[2] || '', `(${match[1]})`];
    } else {
        factors = [match[1] || '', `(${match[2]})`];
    }
    
    // Sort factors to handle commutative property
    factors.sort();
    
    // Reconstruct normalized answer
    return factors.join('');
}

function checkAnswer() {
    const userAnswer = document.getElementById('userAnswer').value.trim();
    const feedback = document.getElementById('feedback');
    const normalizedUserAnswer = normalizeAnswer(userAnswer);
    const normalizedCorrectAnswer = normalizeAnswer(currentQuestion.answer);
    if (normalizedUserAnswer === normalizedCorrectAnswer) {
        feedback.textContent = '正確！';
        feedback.className = 'correct';
    } else {
        feedback.textContent = '答案不正確，請再試一次！';
        feedback.className = 'incorrect';
    }
    feedback.style.display = 'block';
}

function showHint() {
    const feedback = document.getElementById('feedback');
    hintCount++;
    if (hintCount === 1) {
        hintText = `提示：提取公因數 ${currentQuestion.commonFactor}`;
        feedback.textContent = hintText;
    } else if (hintCount >= 2) {
        hintText = `答案：${currentQuestion.answer.replace(/\^2/g, '²')}`;
        feedback.textContent = hintText;
        document.getElementById('hintButton').disabled = true;
    }
    feedback.className = '';
    feedback.style.display = 'block';
    MathJax.typeset();
}
