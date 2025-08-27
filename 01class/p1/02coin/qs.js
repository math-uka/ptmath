// 模擬圖片檔案（包含 100.jpg）
const imageFiles = ['01.jpg', '02.jpg', '05.jpg', '10.jpg', '50.jpg', '100.jpg'];
const coins = imageFiles.map(file => ({
    name: file,
    value: parseInt(file.split('.')[0]) / 10 // 檔案名的十分之一
}));

let totalValue = 0;
let selectedCoins = {};
let isAmountVisible = true;

// 更新總金額顯示
function updateTotalAmount() {
    if (isAmountVisible) {
        const dollars = Math.floor(totalValue);
        const cents = Math.round((totalValue - dollars) * 10);
        document.getElementById('total-amount').textContent = `${dollars}元${cents}毫`;
    } else {
        document.getElementById('total-amount').textContent = '金額隱藏';
    }
}

// 格式化價值顯示（小於 1元顯示為毫）
function formatValue(value) {
    if (value < 1) {
        return `${(value * 10).toFixed(0)}毫`;
    }
    return `${value.toFixed(0)}元`;
}

// 渲染硬幣表格
function renderCoinTable() {
    const tableBody = document.getElementById('coin-table');
    tableBody.innerHTML = '';
    coins.forEach(coin => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="p-2">
                <img src="images/${coin.name}" alt="${coin.name}" class="w-12 h-12 cursor-pointer" onclick="addCoin(${coin.value}, '${coin.name}')">
            </td>
            <td class="p-2">${formatValue(coin.value)}</td>
        `;
        tableBody.appendChild(row);
    });
}

// 添加被點擊的硬幣
function addCoin(value, name) {
    totalValue += value;
    selectedCoins[name] = (selectedCoins[name] || 0) + 1;
    updateTotalAmount();
    renderSelectedCoins();
}

// 渲染已選擇的硬幣（顯示實際圖片數量，按價值排序）
function renderSelectedCoins() {
    const selectedDiv = document.getElementById('selected-coins');
    selectedDiv.innerHTML = '';
    // 按價值排序
    const sortedCoins = Object.keys(selectedCoins).sort((a, b) => {
        return parseInt(a.split('.')[0]) - parseInt(b.split('.')[0]);
    });
    sortedCoins.forEach(name => {
        const count = selectedCoins[name];
        const value = parseInt(name.split('.')[0]) / 10;
        const div = document.createElement('div');
        div.className = 'flex items-center mb-2';
        // 顯示實際數量的圖片
        let images = '';
        for (let i = 0; i < count; i++) {
            images += `<img src="images/${name}" alt="${name}" class="w-10 h-10 mr-2">`;
        }
        div.innerHTML = `
            <div class="flex flex-wrap items-center">
                <span class="mr-2">${formatValue(value)}:</span>
                ${images}
            </div>
        `;
        selectedDiv.appendChild(div);
    });
}

// 清除已選擇的硬幣
function clearSelectedCoins() {
    totalValue = 0;
    selectedCoins = {};
    updateTotalAmount();
    renderSelectedCoins();
}

// 切換金額顯示
function toggleAmountDisplay() {
    isAmountVisible = !isAmountVisible;
    document.getElementById('toggle-amount-btn').textContent = isAmountVisible ? '不顯示金額' : '顯示金額';
    updateTotalAmount();
}

// 初始化
renderCoinTable();
updateTotalAmount();

// 綁定按鈕事件
document.getElementById('clear-btn').addEventListener('click', clearSelectedCoins);
document.getElementById('toggle-amount-btn').addEventListener('click', toggleAmountDisplay);
