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

// 數獨遊戲邏輯
const grid = document.getElementById('sudoku-grid');
const numberPad = document.getElementById('number-pad');
const clearBtn = document.getElementById('clear-btn');
const undoBtn = document.getElementById('undo-btn');
const timerDisplay = document.getElementById('timer');
const celebration = document.getElementById('celebration');
const leaderboard = document.getElementById('leaderboard');
const currentScore = document.getElementById('current-score');
const leaderboardList = document.getElementById('leaderboard-list');
let selectedCell = null;
let startTime = null;
let timerInterval = null;
let solution = null;
let moveHistory = []; // 儲存用戶操作歷史

// 計時器
function startTimer() {
    startTime = Date.now();
    timerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        timerDisplay.textContent = `時間: ${elapsed}秒`;
    }, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
    return Math.floor((Date.now() - startTime) / 1000);
}

// 慶祝動畫（彩帶效果）
function triggerCelebration() {
    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.classList.add('confetti');
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.backgroundColor = `hsl(${Math.random() * 360}, 100%, 50%)`;
        confetti.style.animationDelay = `${Math.random() * 2}s`;
        celebration.appendChild(confetti);
        setTimeout(() => confetti.remove(), 3000);
    }
}

// 本地儲存成績
function saveScore(time) {
    const date = new Date();
    const record = {
        date: date.toLocaleString('zh-Hant'),
        time: time
    };
    let scores = JSON.parse(localStorage.getItem('sudokuScores') || '[]');
    scores.push(record);
    scores.sort((a, b) => a.time - b.time);
    scores = scores.slice(0, 5);
    localStorage.setItem('sudokuScores', JSON.stringify(scores));
    return record;
}

// 更新排行榜
function showLeaderboard(currentTime, currentDate) {
    leaderboard.style.display = 'block';
    currentScore.textContent = `本次成績: ${currentDate} - ${currentTime}秒`;
    const scores = JSON.parse(localStorage.getItem('sudokuScores') || '[]');
    leaderboardList.innerHTML = '';
    scores.forEach((score, index) => {
        const li = document.createElement('li');
        li.textContent = `#${index + 1}: ${score.date} - ${score.time}秒`;
        leaderboardList.appendChild(li);
    });
}

// 生成隨機4x4數獨，確保唯一解
function generateSudoku() {
    let board = Array(4).fill().map(() => Array(4).fill(0));
    fillBoard(board);
    solution = board.map(row => [...row]);
    return removeNumbersWithUniqueSolution(board);
}

function fillBoard(board) {
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            if (board[i][j] === 0) {
                let nums = shuffle([1, 2, 3, 4]);
                for (let num of nums) {
                    if (isSafe(board, i, j, num)) {
                        board[i][j] = num;
                        if (fillBoard(board)) return true;
                        board[i][j] = 0;
                    }
                }
                return false;
            }
        }
    }
    return true;
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function isSafe(board, row, col, num) {
    for (let x = 0; x < 4; x++) {
        if (board[row][x] === num || board[x][col] === num) return false;
    }
    let startRow = row - row % 2, startCol = col - col % 2;
    for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
            if (board[i + startRow][j + startCol] === num) return false;
        }
    }
    return true;
}

function removeNumbersWithUniqueSolution(board) {
    let puzzle = board.map(row => [...row]);
    let cells = [];
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            cells.push([i, j]);
        }
    }
    shuffle(cells);

    let clues = 8;
    let removed = 0;
    let maxRemoved = 16 - clues;

    for (let [i, j] of cells) {
        if (removed >= maxRemoved) break;
        let temp = puzzle[i][j];
        puzzle[i][j] = 0;
        if (hasUniqueSolution(puzzle)) {
            removed++;
        } else {
            puzzle[i][j] = temp;
        }
    }

    return puzzle;
}

function hasUniqueSolution(board) {
    let solutions = { count: 0 };
    solveSudoku(board.slice().map(row => [...row]), 0, 0, solutions);
    return solutions.count === 1;
}

function solveSudoku(board, row, col, solutions) {
    if (solutions.count > 1) return;
    if (row === 4) {
        solutions.count++;
        return;
    }
    if (col === 4) {
        solveSudoku(board, row + 1, 0, solutions);
        return;
    }
    if (board[row][col] !== 0) {
        solveSudoku(board, row, col + 1, solutions);
        return;
    }
    for (let num = 1; num <= 4; num++) {
        if (isSafe(board, row, col, num)) {
            board[row][col] = num;
            solveSudoku(board, row, col + 1, solutions);
            board[row][col] = 0;
        }
    }
}

// 檢查答案正確性
function checkSolution() {
    const cells = grid.querySelectorAll('.sudoku-cell');
    let current = Array(4).fill().map(() => Array(4).fill(0));
    let index = 0;
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            current[i][j] = parseInt(cells[index].textContent || '0');
            index++;
        }
    }
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            if (current[i][j] !== solution[i][j]) return false;
        }
    }
    return true;
}

// 初始化遊戲
function initGame() {
    grid.innerHTML = '';
    moveHistory = []; // 重置操作歷史
    const board = generateSudoku();
    for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
            const cell = document.createElement('div');
            cell.classList.add('sudoku-cell');
            if (board[i][j] !== 0) {
                cell.textContent = board[i][j];
                cell.classList.add('initial');
            }
            cell.dataset.row = i;
            cell.dataset.col = j;
            cell.dataset.index = i * 4 + j; // 儲存細胞索引
            cell.addEventListener('click', () => selectCell(cell));
            grid.appendChild(cell);
        }
    }
    startTimer();
    leaderboard.style.display = 'none'; // 遊戲開始時隱藏排行榜
}

function selectCell(cell) {
    if (cell.classList.contains('initial')) return;
    if (selectedCell) {
        selectedCell.classList.remove('selected');
    }
    selectedCell = cell;
    selectedCell.classList.add('selected');
}

// 數字鍵盤輸入
function setupNumberPad() {
    const buttons = numberPad.querySelectorAll('.number-btn');
    buttons.forEach(button => {
        button.addEventListener('click', () => {
            if (selectedCell) {
                const value = button.dataset.value;
                const previousValue = selectedCell.textContent || ''; // 儲存前一個值
                const cellIndex = parseInt(selectedCell.dataset.index);
                moveHistory.push({ cellIndex, previousValue, newValue: value }); // 記錄操作
                selectedCell.textContent = value;
                selectedCell.classList.remove('selected');
                selectedCell = null;
                if (checkSolution()) {
                    const time = stopTimer();
                    triggerCelebration();
                    timerDisplay.textContent = `完成！用時: ${time}秒`;
                    const record = saveScore(time);
                    showLeaderboard(time, record.date);
                }
            }
        });
    });
}

// 清除用戶填寫的數字（帶確認彈窗）
function setupClearButton() {
    clearBtn.addEventListener('click', () => {
        if (window.confirm('確定要清除所有填寫的數字嗎？')) {
            const cells = grid.querySelectorAll('.sudoku-cell:not(.initial)');
            cells.forEach(cell => {
                const cellIndex = parseInt(cell.dataset.index);
                const previousValue = cell.textContent || '';
                if (previousValue) {
                    moveHistory.push({ cellIndex, previousValue, newValue: '' }); // 記錄清除操作
                }
                cell.textContent = '';
            });
            if (selectedCell) {
                selectedCell.classList.remove('selected');
                selectedCell = null;
            }
        }
    });
}

// 上一步（Undo）功能
function setupUndoButton() {
    undoBtn.addEventListener('click', () => {
        if (moveHistory.length === 0) return; // 無操作可撤銷
        const lastMove = moveHistory.pop(); // 獲取最後一次操作
        const cells = grid.querySelectorAll('.sudoku-cell');
        const cell = cells[lastMove.cellIndex];
        cell.textContent = lastMove.previousValue; // 恢復前一個值
        if (selectedCell) {
            selectedCell.classList.remove('selected');
            selectedCell = null;
        }
    });
}

// 啟動遊戲
initGame();
setupNumberPad();
setupClearButton();
setupUndoButton();
