// ============================================================
// 平行四边形判定实验 - 核心逻辑 (p5.js)
// 功能: 拖拽顶点、格点吸附、防共线/自交、实时判定对边相等
// ============================================================

// 全局配置
const GRID_SIZE = 50;          // 每个格子50px
let points = [];               // 存储四个顶点 {x, y, label}
let selectedPoint = null;      // 当前拖拽的顶点

// UI 显示开关
let showEdges = false;
let showAngles = false;

// 获取DOM元素引用
let edgesSection, anglesSection;
let edgeButton, angleButton;
let abSpan, bcSpan, cdSpan, daSpan;
let angleASpan, angleBSpan, angleCSpan, angleDSpan;
let resultSpan;

// ------------------------------------------------------------
// p5.js 生命周期: setup
// ------------------------------------------------------------
function setup() {
    // 创建画布 (宽600，高600，基于网格6x6=300但实际我们取12格范围 0~600)
    let canvas = createCanvas(600, 600);
    canvas.parent('canvasContainer');
    pixelDensity(2);           // 高清晰度渲染
    
    // 初始化顶点: 一个典型的平行四边形（矩形开始，方便实验）
    // 为了让初始形状非正方形但保持对边相等: A(2,2), B(6,2), C(8,5), D(4,5) 但为满足格点且6*50=300
    // 更标准的平行四边形: A(2,2) B(6,2) C(8,5) D(4,5) -> 但边长需要是网格整数倍。采用规整形状: A(100,200) B(400,200) C(500,400) D(200,400)
    // 转为grid单位: x = col * GRID_SIZE
    // 初始: 一个明显的平行四边形但非矩形 展示对边相等
    points = [
        { x: 2 * GRID_SIZE, y: 2 * GRID_SIZE, label: 'A' },     // (100,100)
        { x: 6 * GRID_SIZE, y: 2 * GRID_SIZE, label: 'B' },     // (300,100)
        { x: 8 * GRID_SIZE, y: 4 * GRID_SIZE, label: 'C' },     // (400,200)
        { x: 4 * GRID_SIZE, y: 4 * GRID_SIZE, label: 'D' }      // (200,200)
    ];
    
    // 边界保护: 确保所有点在画布内 (已经符合0~600)
    
    // 获取DOM元素
    edgesSection = document.getElementById('edgesSection');
    anglesSection = document.getElementById('anglesSection');
    edgeButton = document.getElementById('edgeButton');
    angleButton = document.getElementById('angleButton');
    
    abSpan = document.getElementById('abLen');
    bcSpan = document.getElementById('bcLen');
    cdSpan = document.getElementById('cdLen');
    daSpan = document.getElementById('daLen');
    
    angleASpan = document.getElementById('angleA');
    angleBSpan = document.getElementById('angleB');
    angleCSpan = document.getElementById('angleC');
    angleDSpan = document.getElementById('angleD');
    
    resultSpan = document.getElementById('result');
    
    // 绑定UI按钮事件 (同时处理鼠标与触摸)
    edgeButton.addEventListener('click', toggleEdges);
    angleButton.addEventListener('click', toggleAngles);
    
    // 移动端增强: 避免触摸时页面滚动/缩放干扰
    edgeButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        toggleEdges();
    });
    angleButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        toggleAngles();
    });
    
    // 初始化界面信息
    updateInfo();
    
    // 设置文字对齐样式
    textAlign(CENTER, CENTER);
    textSize(16);
}

// ------------------------------------------------------------
// p5.js draw: 每帧绘制
// ------------------------------------------------------------
function draw() {
    // 完全透明背景 (但为了让网格可见, clear后用白色底层比较美观)
    clear();
    background(255);          // 白底清晰
    
    drawGrid();               // 绘制浅色网格
    
    // 绘制四边形 (半透明填充)
    stroke(20, 40, 80);
    strokeWeight(2.5);
    fill(173, 216, 230, 100);   // 淡蓝色半透明
    beginShape();
    for (let p of points) {
        vertex(p.x, p.y);
    }
    endShape(CLOSE);
    
    // 绘制顶点和标签
    for (let i = 0; i < points.length; i++) {
        let p = points[i];
        // 高亮选中的点（外发光效果）
        if (selectedPoint === p) {
            fill(255, 100, 100);
            stroke(255, 50, 50);
            strokeWeight(3);
            ellipse(p.x, p.y, 16, 16);
        } else {
            fill(255, 60, 60);
            stroke(200, 0, 0);
            strokeWeight(2);
            ellipse(p.x, p.y, 13, 13);
        }
        // 文字标签
        fill(20);
        noStroke();
        textSize(18);
        textFont('system-ui');
        text(p.label, p.x, p.y - 14);
        
        // 可选显示坐标(grip调试) 可省略为了清爽，不加
    }
    
    // 绘制边长标注 (如果开启)
    if (showEdges) {
        drawEdgeLengthLabels();
    }
    
    // 绘制角度标记 (如果开启) —— 用简易圆弧示意
    if (showAngles) {
        drawAngleArcs();
    }
}

// ------------------------------------------------------------
// 工具: 绘制网格 (吸附参考)
// ------------------------------------------------------------
function drawGrid() {
    stroke(190, 200, 210);
    strokeWeight(0.8);
    // 绘制垂直线和水平线
    for (let x = 0; x <= width; x += GRID_SIZE) {
        line(x, 0, x, height);
    }
    for (let y = 0; y <= height; y += GRID_SIZE) {
        line(0, y, width, y);
    }
    // 深色强调原点附近
    stroke(140, 160, 180);
    strokeWeight(1.2);
    line(0, height/2, width, height/2);
    line(width/2, 0, width/2, height);
}

// ------------------------------------------------------------
// 显示边长数值标签 (绘制在边的中点附近)
// ------------------------------------------------------------
function drawEdgeLengthLabels() {
    fill(30, 60, 90);
    stroke(30, 60, 90);
    strokeWeight(1);
    textSize(14);
    textFont('monospace');
    
    // 边 AB
    let mxAB = (points[0].x + points[1].x) / 2;
    let myAB = (points[0].y + points[1].y) / 2;
    let lenAB = dist(points[0].x, points[0].y, points[1].x, points[1].y) / GRID_SIZE;
    text(`${lenAB.toFixed(1)}`, mxAB, myAB - 8);
    
    // 边 BC
    let mxBC = (points[1].x + points[2].x) / 2;
    let myBC = (points[1].y + points[2].y) / 2;
    let lenBC = dist(points[1].x, points[1].y, points[2].x, points[2].y) / GRID_SIZE;
    text(`${lenBC.toFixed(1)}`, mxBC + 8, myBC);
    
    // 边 CD
    let mxCD = (points[2].x + points[3].x) / 2;
    let myCD = (points[2].y + points[3].y) / 2;
    let lenCD = dist(points[2].x, points[2].y, points[3].x, points[3].y) / GRID_SIZE;
    text(`${lenCD.toFixed(1)}`, mxCD, myCD + 8);
    
    // 边 DA
    let mxDA = (points[3].x + points[0].x) / 2;
    let myDA = (points[3].y + points[0].y) / 2;
    let lenDA = dist(points[3].x, points[3].y, points[0].x, points[0].y) / GRID_SIZE;
    text(`${lenDA.toFixed(1)}`, mxDA - 12, myDA);
}

// ------------------------------------------------------------
// 简单的角度弧线绘制 (视觉反馈，不追求完美正弦，但显示相对位置)
// ------------------------------------------------------------
function drawAngleArcs() {
    // 为简化且美观，只绘制小圆弧示意，展示角度区域
    stroke(40, 80, 120);
    strokeWeight(1.8);
    noFill();
    // 计算每个顶点的两个边向量，并画弧
    let verts = points;
    for (let i = 0; i < verts.length; i++) {
        let prev = verts[(i - 1 + 4) % 4];
        let curr = verts[i];
        let next = verts[(i + 1) % 4];
        
        // 向量 prev->curr 和 curr->next
        let v1 = { x: prev.x - curr.x, y: prev.y - curr.y };
        let v2 = { x: next.x - curr.x, y: next.y - curr.y };
        // 归一化方向用于绘制起始和结束角度
        let angle1 = atan2(v1.y, v1.x);
        let angle2 = atan2(v2.y, v2.x);
        
        // 确保绘制最小的内角 (通过方向调整)
        let delta = angle2 - angle1;
        if (delta < 0) delta += TWO_PI;
        if (delta > PI) {
            // 如果 delta > 180°，绘制另一侧角。但平行四边形内角都小于180，安全。但以防万一交换
            let temp = angle1;
            angle1 = angle2;
            angle2 = temp;
            delta = angle2 - angle1;
            if (delta < 0) delta += TWO_PI;
        }
        let radius = 22;
        // 避免极端情况
        if (delta > 0.01 && delta < PI) {
            let startAng = angle1;
            let endAng = angle1 + delta;
            // 绘制圆弧
            arc(curr.x, curr.y, radius, radius, startAng, endAng);
            // 绘制角度数值小字
            let angleDeg = calculateVertexAngle(curr, prev, next);
            let midAngle = startAng + delta / 2;
            let textX = curr.x + (radius + 8) * cos(midAngle);
            let textY = curr.y + (radius + 8) * sin(midAngle);
            fill(30, 70, 110);
            noStroke();
            textSize(12);
            text(`${angleDeg.toFixed(0)}°`, textX, textY);
        }
    }
}

// 计算某个顶点角度（度数）
function calculateVertexAngle(curr, prev, next) {
    let v1 = { x: prev.x - curr.x, y: prev.y - curr.y };
    let v2 = { x: next.x - curr.x, y: next.y - curr.y };
    let dot = v1.x * v2.x + v1.y * v2.y;
    let mag1 = Math.hypot(v1.x, v1.y);
    let mag2 = Math.hypot(v2.x, v2.y);
    if (mag1 === 0 || mag2 === 0) return 90;
    let cos = dot / (mag1 * mag2);
    cos = Math.min(1, Math.max(-1, cos));
    return Math.acos(cos) * 180 / Math.PI;
}

// ------------------------------------------------------------
// 几何约束: 三点共线检测 (容差极小)
// ------------------------------------------------------------
function isCollinear(p1, p2, p3) {
    // 叉积法: (p2-p1) x (p3-p1) 面积接近于0
    let area = (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x);
    return Math.abs(area) < 0.5;  // 网格坐标较大时，面积阈值0.5足够严格
}

// 检查四边形任意三点共线 (出现共线会导致退化为三角形)
function hasCollinearPoints(pointsArr) {
    for (let i = 0; i < pointsArr.length; i++) {
        for (let j = i+1; j < pointsArr.length; j++) {
            for (let k = j+1; k < pointsArr.length; k++) {
                if (isCollinear(pointsArr[i], pointsArr[j], pointsArr[k])) {
                    return true;
                }
            }
        }
    }
    return false;
}

// 线段相交判定 (用于检测自交)
function orientation(p, q, r) {
    let val = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
    if (Math.abs(val) < 0.5) return 0;
    return val > 0 ? 1 : 2;
}
function onSegment(p, q, r) {
    return (q.x <= Math.max(p.x, r.x) && q.x >= Math.min(p.x, r.x) &&
            q.y <= Math.max(p.y, r.y) && q.y >= Math.min(p.y, r.y));
}
function segmentsIntersect(p1, q1, p2, q2) {
    let o1 = orientation(p1, q1, p2);
    let o2 = orientation(p1, q1, q2);
    let o3 = orientation(p2, q2, p1);
    let o4 = orientation(p2, q2, q1);
    
    if (o1 !== o2 && o3 !== o4) return true;
    if (o1 === 0 && onSegment(p1, p2, q1)) return true;
    if (o2 === 0 && onSegment(p1, q2, q1)) return true;
    if (o3 === 0 && onSegment(p2, p1, q2)) return true;
    if (o4 === 0 && onSegment(p2, q1, q2)) return true;
    return false;
}

// 检查四边形自相交 (非相邻边相交)
function checkSelfIntersection(pointsArr) {
    let A = pointsArr[0], B = pointsArr[1], C = pointsArr[2], D = pointsArr[3];
    // 检测对边 AB 和 CD
    if (segmentsIntersect(A, B, C, D)) return true;
    // 检测对边 BC 和 DA
    if (segmentsIntersect(B, C, D, A)) return true;
    // 额外检测邻边本不应检测，避免误判
    return false;
}

// 检查整体有效性: 无自交 + 无三点共线
function isValidQuad(pointsArr) {
    if (hasCollinearPoints(pointsArr)) return false;
    if (checkSelfIntersection(pointsArr)) return false;
    return true;
}

// ------------------------------------------------------------
// 交互: 鼠标 / 触摸 事件
// ------------------------------------------------------------
function mousePressed() {
    selectPoint(mouseX, mouseY);
    return false;
}

function touchStarted() {
    if (touches.length > 0) {
        selectPoint(touches[0].x, touches[0].y);
    }
    return false;
}

function selectPoint(px, py) {
    for (let p of points) {
        if (dist(px, py, p.x, p.y) < 25) {  // 较大命中区域优化触屏
            selectedPoint = p;
            return true;
        }
    }
    selectedPoint = null;
    return false;
}

function mouseDragged() {
    if (selectedPoint) {
        movePoint(mouseX, mouseY);
    }
    return false;
}

function touchMoved() {
    if (selectedPoint && touches.length > 0) {
        movePoint(touches[0].x, touches[0].y);
        return false;
    }
    return false;
}

function movePoint(newX, newY) {
    // 吸附到网格 (保证拖拽后坐标是GRID_SIZE的整数倍)
    let snapX = Math.round(newX / GRID_SIZE) * GRID_SIZE;
    let snapY = Math.round(newY / GRID_SIZE) * GRID_SIZE;
    snapX = constrain(snapX, GRID_SIZE, width - GRID_SIZE);
    snapY = constrain(snapY, GRID_SIZE, height - GRID_SIZE);
    
    // 备份当前points
    let originalPoints = points.map(p => ({ x: p.x, y: p.y, label: p.label }));
    let idx = points.indexOf(selectedPoint);
    if (idx === -1) return;
    
    // 测试新坐标
    let testPoints = points.map(p => ({ ...p }));
    testPoints[idx].x = snapX;
    testPoints[idx].y = snapY;
    
    // 有效性测试 (非自交，非共线)
    if (isValidQuad(testPoints)) {
        selectedPoint.x = snapX;
        selectedPoint.y = snapY;
        updateInfo();          // 更新侧边栏及判定结果
    }
}

function mouseReleased() {
    selectedPoint = null;
}
function touchEnded() {
    selectedPoint = null;
    return false;
}

// ------------------------------------------------------------
// 更新数值面板 & 平行四边形判定
// ------------------------------------------------------------
function updateInfo() {
    // 计算边长 (像素转格数)
    let ab = dist(points[0].x, points[0].y, points[1].x, points[1].y) / GRID_SIZE;
    let bc = dist(points[1].x, points[1].y, points[2].x, points[2].y) / GRID_SIZE;
    let cd = dist(points[2].x, points[2].y, points[3].x, points[3].y) / GRID_SIZE;
    let da = dist(points[3].x, points[3].y, points[0].x, points[0].y) / GRID_SIZE;
    
    abSpan.innerText = ab.toFixed(2);
    bcSpan.innerText = bc.toFixed(2);
    cdSpan.innerText = cd.toFixed(2);
    daSpan.innerText = da.toFixed(2);
    
    // 计算四个内角
    let angles = [];
    for (let i = 0; i < points.length; i++) {
        let prev = points[(i - 1 + 4) % 4];
        let curr = points[i];
        let next = points[(i + 1) % 4];
        let ang = calculateVertexAngle(curr, prev, next);
        angles.push(ang);
    }
    angleASpan.innerText = angles[0].toFixed(1);
    angleBSpan.innerText = angles[1].toFixed(1);
    angleCSpan.innerText = angles[2].toFixed(1);
    angleDSpan.innerText = angles[3].toFixed(1);
    
    // 核心判定: 对边相等 (容许误差0.01格)
    let isPara = (Math.abs(ab - cd) < 0.02) && (Math.abs(bc - da) < 0.02);
    if (isPara) {
        resultSpan.innerHTML = '✅ 是平行四邊形 (對邊相等)';
        resultSpan.style.color = '#1a6e3f';
        resultSpan.style.fontWeight = 'bold';
        resultSpan.style.background = '#e0f2e9';
        resultSpan.style.padding = '0.2rem 1rem';
        resultSpan.style.borderRadius = '2rem';
        resultSpan.style.display = 'inline-block';
    } else {
        resultSpan.innerHTML = '❌ 不是平行四邊形 (對邊不相等)';
        resultSpan.style.color = '#b13a3a';
        resultSpan.style.fontWeight = 'bold';
        resultSpan.style.background = '#ffe6e6';
        resultSpan.style.padding = '0.2rem 1rem';
        resultSpan.style.borderRadius = '2rem';
        resultSpan.style.display = 'inline-block';
    }
}

// ------------------------------------------------------------
// 切换边显示 & 角度显示
// ------------------------------------------------------------
function toggleEdges() {
    showEdges = !showEdges;
    edgesSection.style.display = showEdges ? 'block' : 'none';
    edgeButton.innerText = showEdges ? '📏 隱藏邊長' : '📏 顯示邊長';
    // 重绘会自动通过draw更新画布上的边标
}

function toggleAngles() {
    showAngles = !showAngles;
    anglesSection.style.display = showAngles ? 'block' : 'none';
    angleButton.innerText = showAngles ? '📐 隱藏角度' : '📐 顯示角度';
}

// 窗口大小自适应 (保持画布大小固定600x600，无需额外resize)
function windowResized() {
    // 固定canvas尺寸不随窗口缩放，保持体验
    // 无需操作
}