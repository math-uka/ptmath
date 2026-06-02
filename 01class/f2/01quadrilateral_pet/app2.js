// ============================================================
// 四边形探究器 - 核心逻辑 (app2.js)
// 功能: 平行四边形/矩形/菱形/正方形切换、拖拽顶点、边长/角度查询
// ============================================================

(function() {
    // DOM 元素
    const canvas = document.getElementById('quadCanvas');
    const ctx = canvas.getContext('2d');
    
    // 常量配置
    const GRID_SIZE = 10;
    const SNAP_THRESHOLD = 8; // 吸附阈值
    
    // 全局状态
    let points = [
        { x: 50, y: 50 },  // A
        { x: 100, y: 50 }, // B
        { x: 130, y: 100 },// C
        { x: 80, y: 100 }  // D
    ];
    let selectedPoint = -1;
    let shapeMode = 'parallelogram'; // 'parallelogram', 'rectangle', 'square', 'rhombus'
    let isDragging = false;
    
    // 存储拖拽开始的原始点坐标 (用于约束)
    let dragStartPoints = null;
    
    // ==================== 几何工具函数 ====================
    
    function calculateLength(x1, y1, x2, y2) {
        return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    }
    
    function calculateAngle(x1, y1, x2, y2, x3, y3) {
        const vec1x = x1 - x2;
        const vec1y = y1 - y2;
        const vec2x = x3 - x2;
        const vec2y = y3 - y2;
        
        const dot = vec1x * vec2x + vec1y * vec2y;
        const len1 = Math.sqrt(vec1x ** 2 + vec1y ** 2);
        const len2 = Math.sqrt(vec2x ** 2 + vec2y ** 2);
        
        if (len1 === 0 || len2 === 0) return 0;
        
        const cosTheta = Math.min(1, Math.max(-1, dot / (len1 * len2)));
        let angle = Math.acos(cosTheta) * 180 / Math.PI;
        if (angle > 180) angle = 360 - angle;
        return angle;
    }
    
    function findIntersection() {
        const x1 = points[0].x, y1 = points[0].y;
        const x2 = points[2].x, y2 = points[2].y;
        const x3 = points[1].x, y3 = points[1].y;
        const x4 = points[3].x, y4 = points[3].y;
        
        const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
        if (Math.abs(denom) < 0.0001) return null;
        
        const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
        const x = x1 + t * (x2 - x1);
        const y = y1 + t * (y2 - y1);
        return { x, y };
    }
    
    function arePointsCollinear(p1, p2, p3) {
        const area = Math.abs((p1.x * (p2.y - p3.y) + p2.x * (p3.y - p1.y) + p3.x * (p1.y - p2.y)) / 2);
        return area < 0.01;
    }
    
    function snapToGrid(value) {
        return Math.round(value / GRID_SIZE) * GRID_SIZE;
    }
    
    // 验证矩形有效性 (直角且对边相等)
    function isValidRectangle() {
        const lenAB = calculateLength(points[0].x, points[0].y, points[1].x, points[1].y);
        const lenCD = calculateLength(points[2].x, points[2].y, points[3].x, points[3].y);
        const lenAD = calculateLength(points[0].x, points[0].y, points[3].x, points[3].y);
        const lenBC = calculateLength(points[1].x, points[1].y, points[2].x, points[2].y);
        
        const sideEquality = Math.abs(lenAB - lenCD) < 0.1 && Math.abs(lenAD - lenBC) < 0.1;
        
        const vecABx = points[1].x - points[0].x;
        const vecABy = points[1].y - points[0].y;
        const vecADx = points[3].x - points[0].x;
        const vecADy = points[3].y - points[0].y;
        const dotProduct = vecABx * vecADx + vecABy * vecADy;
        const perpendicular = Math.abs(dotProduct) < 0.1;
        
        const minDistance = 0.5;
        const distinctPoints = [
            [0, 1], [1, 2], [2, 3], [3, 0], [0, 2], [1, 3]
        ].every(([i, j]) => calculateLength(points[i].x, points[i].y, points[j].x, points[j].y) > minDistance);
        
        return sideEquality && perpendicular && distinctPoints;
    }
    
    // 检查所有顶点都在画布内
    function allPointsInBounds() {
        const margin = 5;
        for (let p of points) {
            if (p.x < margin || p.x > canvas.width - margin || 
                p.y < margin || p.y > canvas.height - margin) {
                return false;
            }
        }
        return true;
    }
    
    // ==================== 四边形更新逻辑 (核心约束) ====================
    
    function updateParallelogram(index, newX, newY) {
        // 保存原始状态用于回滚
        const originalPoints = points.map(p => ({ x: p.x, y: p.y }));
        
        let targetX = newX;
        let targetY = newY;
        
        // 非菱形模式下吸附到网格
        if (shapeMode !== 'rhombus') {
            targetX = snapToGrid(newX);
            targetY = snapToGrid(newY);
        }
        
        // 边界限制
        targetX = Math.min(Math.max(targetX, 10), canvas.width - 10);
        targetY = Math.min(Math.max(targetY, 10), canvas.height - 10);
        
        // 根据不同模式更新顶点
        if (shapeMode === 'parallelogram') {
            if (index === 0) {
                const dx = targetX - points[0].x;
                const dy = targetY - points[0].y;
                points[0] = { x: targetX, y: targetY };
                points[1] = { x: points[1].x + dx, y: points[1].y + dy };
                points[2] = { x: points[2].x + dx, y: points[2].y + dy };
                points[3] = { x: points[3].x + dx, y: points[3].y + dy };
            } else if (index === 1) {
                points[1] = { x: targetX, y: targetY };
                // 保持平行四边形: D = A + (C - B)
                points[3] = { 
                    x: points[0].x + (points[2].x - points[1].x), 
                    y: points[0].y + (points[2].y - points[1].y) 
                };
            } else if (index === 2) {
                points[2] = { x: targetX, y: targetY };
                points[3] = { 
                    x: points[0].x + (points[2].x - points[1].x), 
                    y: points[0].y + (points[2].y - points[1].y) 
                };
            } else if (index === 3) {
                points[3] = { x: targetX, y: targetY };
                points[0] = { 
                    x: points[1].x + (points[3].x - points[2].x), 
                    y: points[1].y + (points[3].y - points[2].y) 
                };
            }
        } 
        else if (shapeMode === 'rectangle') {
            // 矩形模式: 保持直角
            if (index === 0) {
                points[0] = { x: targetX, y: targetY };
                points[1] = { x: points[2].x, y: points[0].y };
                points[3] = { x: points[0].x, y: points[2].y };
            } else if (index === 1) {
                points[1] = { x: targetX, y: targetY };
                points[0] = { x: points[3].x, y: points[1].y };
                points[2] = { x: points[1].x, y: points[3].y };
            } else if (index === 2) {
                points[2] = { x: targetX, y: targetY };
                points[1] = { x: points[2].x, y: points[0].y };
                points[3] = { x: points[0].x, y: points[2].y };
            } else if (index === 3) {
                points[3] = { x: targetX, y: targetY };
                points[0] = { x: points[3].x, y: points[1].y };
                points[2] = { x: points[1].x, y: points[3].y };
            }
        } 
        else if (shapeMode === 'square') {
            // 正方形: 保持边长相等且邻边垂直
            const getSquarePoints = (anchor, corner, isAnchorA) => {
                // 复杂的正方形计算
            };
            
            if (index === 0) {
                const dx = targetX - points[0].x;
                const dy = targetY - points[0].y;
                points[0] = { x: targetX, y: targetY };
                points[1] = { x: points[1].x + dx, y: points[1].y + dy };
                points[2] = { x: points[2].x + dx, y: points[2].y + dy };
                points[3] = { x: points[3].x + dx, y: points[3].y + dy };
            } else if (index === 1) {
                points[1] = { x: targetX, y: targetY };
                const vecABx = points[1].x - points[0].x;
                const vecABy = points[1].y - points[0].y;
                const lenAB = Math.sqrt(vecABx ** 2 + vecABy ** 2);
                if (lenAB > 0.01) {
                    // 垂直向量 (顺时针旋转90度)
                    const vecADx = vecABy / lenAB * lenAB;
                    const vecADy = -vecABx / lenAB * lenAB;
                    points[3] = { x: points[0].x + vecADx, y: points[0].y + vecADy };
                    points[2] = { x: points[3].x + vecABx, y: points[3].y + vecABy };
                }
            } else if (index === 2) {
                points[2] = { x: targetX, y: targetY };
                const vecBCx = points[2].x - points[1].x;
                const vecBCy = points[2].y - points[1].y;
                const lenBC = Math.sqrt(vecBCx ** 2 + vecBCy ** 2);
                if (lenBC > 0.01) {
                    const vecCDx = vecBCy / lenBC * lenBC;
                    const vecCDy = -vecBCx / lenBC * lenBC;
                    points[3] = { x: points[2].x + vecCDx, y: points[2].y + vecCDy };
                    points[0] = { x: points[3].x - vecBCx, y: points[3].y - vecBCy };
                }
            } else if (index === 3) {
                points[3] = { x: targetX, y: targetY };
                const vecCDx = points[3].x - points[2].x;
                const vecCDy = points[3].y - points[2].y;
                const lenCD = Math.sqrt(vecCDx ** 2 + vecCDy ** 2);
                if (lenCD > 0.01) {
                    const vecDAx = vecCDy / lenCD * lenCD;
                    const vecDAy = -vecCDx / lenCD * lenCD;
                    points[0] = { x: points[3].x + vecDAx, y: points[3].y + vecDAy };
                    points[1] = { x: points[0].x - vecCDx, y: points[0].y - vecCDy };
                }
            }
        } 
        else if (shapeMode === 'rhombus') {
            // 菱形: 对角线垂直平分且四边相等
            points[index] = { x: targetX, y: targetY };
            const oppositeIdx = (index + 2) % 4;
            const adj1 = (index + 1) % 4;
            const adj2 = (index + 3) % 4;
            
            const fixedPoint = points[oppositeIdx];
            const sideLength = calculateLength(targetX, targetY, fixedPoint.x, fixedPoint.y);
            const midX = (targetX + fixedPoint.x) / 2;
            const midY = (targetY + fixedPoint.y) / 2;
            let dx = targetX - fixedPoint.x;
            let dy = targetY - fixedPoint.y;
            let perpDx = -dy;
            let perpDy = dx;
            const mag = Math.sqrt(perpDx ** 2 + perpDy ** 2);
            
            if (mag > 0.01) {
                const scale = sideLength / Math.sqrt(2) / mag;
                perpDx *= scale;
                perpDy *= scale;
                points[adj1] = { x: midX + perpDx, y: midY + perpDy };
                points[adj2] = { x: midX - perpDx, y: midY - perpDy };
            }
        }
        
        // 验证有效性: 检查共线性和边界
        const collinearChecks = [
            [0, 1, 2], [1, 2, 3], [2, 3, 0], [3, 0, 1]
        ];
        let hasCollinear = false;
        for (let [i, j, k] of collinearChecks) {
            if (arePointsCollinear(points[i], points[j], points[k])) {
                hasCollinear = true;
                break;
            }
        }
        
        // 矩形模式下额外验证直角
        let invalidRect = false;
        if (shapeMode === 'rectangle' && !isValidRectangle()) {
            invalidRect = true;
        }
        
        // 超出边界回滚
        let outOfBounds = false;
        for (let p of points) {
            if (p.x < 5 || p.x > canvas.width - 5 || p.y < 5 || p.y > canvas.height - 5) {
                outOfBounds = true;
                break;
            }
        }
        
        if (hasCollinear || invalidRect || outOfBounds) {
            points = originalPoints.map(p => ({ x: p.x, y: p.y }));
        }
    }
    
    // ==================== 绘图函数 ====================
    
    function drawGrid() {
        if (shapeMode === 'rhombus') return; // 菱形不画网格更清爽
        
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 0.5;
        for (let x = 0; x <= canvas.width; x += GRID_SIZE) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        for (let y = 0; y <= canvas.height; y += GRID_SIZE) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }
    }
    
    function drawQuadrilateral() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawGrid();
        
        // 绘制四边形填充和边框
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        ctx.lineTo(points[1].x, points[1].y);
        ctx.lineTo(points[2].x, points[2].y);
        ctx.lineTo(points[3].x, points[3].y);
        ctx.closePath();
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = 'rgba(0, 123, 255, 0.15)';
        ctx.fill();
        
        // 绘制对角线 (虚线)
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        ctx.lineTo(points[2].x, points[2].y);
        ctx.strokeStyle = '#28a745';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(points[1].x, points[1].y);
        ctx.lineTo(points[3].x, points[3].y);
        ctx.strokeStyle = '#6f42c1';
        ctx.stroke();
        ctx.setLineDash([]); // 恢复实线
        
        // 绘制顶点和标签
        const labels = ['A', 'B', 'C', 'D'];
        points.forEach((point, index) => {
            ctx.beginPath();
            ctx.arc(point.x, point.y, 6, 0, 2 * Math.PI);
            ctx.fillStyle = index === selectedPoint ? '#dc3545' : '#007bff';
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 11px Arial';
            ctx.fillText(index === selectedPoint ? '●' : '●', point.x - 2, point.y + 2);
            ctx.fillStyle = '#2c3e50';
            ctx.font = 'bold 13px Arial';
            ctx.fillText(labels[index], point.x + 8, point.y - 8);
        });
        
        // 绘制对角线交点 O
        const intersection = findIntersection();
        if (intersection && intersection.x >= 0 && intersection.x <= canvas.width && 
            intersection.y >= 0 && intersection.y <= canvas.height) {
            ctx.beginPath();
            ctx.arc(intersection.x, intersection.y, 5, 0, 2 * Math.PI);
            ctx.fillStyle = '#fd7e14';
            ctx.fill();
            ctx.fillStyle = '#2c3e50';
            ctx.font = 'bold 12px Arial';
            ctx.fillText('O', intersection.x + 6, intersection.y - 6);
        }
        
        // 绘制边长标注（可选，简洁展示）
        if (shapeMode === 'parallelogram' || shapeMode === 'rectangle') {
            ctx.font = '11px Arial';
            ctx.fillStyle = '#555';
            ctx.setLineDash([]);
            // 标注AB中点
            let mx = (points[0].x + points[1].x) / 2;
            let my = (points[0].y + points[1].y) / 2;
            ctx.fillText(`${calculateLength(points[0].x, points[0].y, points[1].x, points[1].y).toFixed(1)}`, mx, my - 5);
            
            mx = (points[1].x + points[2].x) / 2;
            my = (points[1].y + points[2].y) / 2;
            ctx.fillText(`${calculateLength(points[1].x, points[1].y, points[2].x, points[2].y).toFixed(1)}`, mx + 5, my);
        }
    }
    
    // ==================== 边长/角度查询功能 ====================
    
    function getEdgeLength(edgeName) {
        edgeName = edgeName.toUpperCase().trim();
        
        // 边长映射
        if (edgeName === 'AB' || edgeName === 'BA') {
            return calculateLength(points[0].x, points[0].y, points[1].x, points[1].y).toFixed(2);
        } else if (edgeName === 'BC' || edgeName === 'CB') {
            return calculateLength(points[1].x, points[1].y, points[2].x, points[2].y).toFixed(2);
        } else if (edgeName === 'CD' || edgeName === 'DC') {
            return calculateLength(points[2].x, points[2].y, points[3].x, points[3].y).toFixed(2);
        } else if (edgeName === 'DA' || edgeName === 'AD') {
            return calculateLength(points[3].x, points[3].y, points[0].x, points[0].y).toFixed(2);
        } else if (edgeName === 'AC' || edgeName === 'CA') {
            return calculateLength(points[0].x, points[0].y, points[2].x, points[2].y).toFixed(2);
        } else if (edgeName === 'BD' || edgeName === 'DB') {
            return calculateLength(points[1].x, points[1].y, points[3].x, points[3].y).toFixed(2);
        } else if (edgeName === 'AO' || edgeName === 'OA') {
            const inter = findIntersection();
            if (inter) return calculateLength(points[0].x, points[0].y, inter.x, inter.y).toFixed(2);
        } else if (edgeName === 'BO' || edgeName === 'OB') {
            const inter = findIntersection();
            if (inter) return calculateLength(points[1].x, points[1].y, inter.x, inter.y).toFixed(2);
        } else if (edgeName === 'CO' || edgeName === 'OC') {
            const inter = findIntersection();
            if (inter) return calculateLength(points[2].x, points[2].y, inter.x, inter.y).toFixed(2);
        } else if (edgeName === 'DO' || edgeName === 'OD') {
            const inter = findIntersection();
            if (inter) return calculateLength(points[3].x, points[3].y, inter.x, inter.y).toFixed(2);
        }
        return '錯誤格式';
    }
    
    function getAngle(angleName) {
        angleName = angleName.toUpperCase().trim();
        if (angleName.length !== 3) return '錯誤格式';
        
        const pointMap = {
            'A': points[0],
            'B': points[1],
            'C': points[2],
            'D': points[3],
            'O': findIntersection()
        };
        
        if (!pointMap[angleName[0]] || !pointMap[angleName[1]] || !pointMap[angleName[2]]) {
            return '無效頂點';
        }
        
        const p1 = pointMap[angleName[0]];
        const p2 = pointMap[angleName[1]];
        const p3 = pointMap[angleName[2]];
        
        if ((p1.x === p2.x && p1.y === p2.y) || (p2.x === p3.x && p2.y === p3.y)) {
            return '點重合';
        }
        
        return calculateAngle(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y).toFixed(2);
    }
    
    function updateLengthsAndAngles() {
        const edgeInputs = document.querySelectorAll('.edgeInput');
        const lengthOutputs = document.querySelectorAll('.lengthOutput');
        const angleInputs = document.querySelectorAll('.angleInput');
        const angleOutputs = document.querySelectorAll('.angleOutput');
        
        edgeInputs.forEach((input, idx) => {
            const val = input.value.trim();
            if (val) {
                const result = getEdgeLength(val);
                lengthOutputs[idx].textContent = result;
                lengthOutputs[idx].style.color = result === '錯誤格式' ? '#dc3545' : '#333';
            } else {
                lengthOutputs[idx].textContent = '0';
                lengthOutputs[idx].style.color = '#333';
            }
        });
        
        angleInputs.forEach((input, idx) => {
            const val = input.value.trim();
            if (val) {
                const result = getAngle(val);
                angleOutputs[idx].textContent = result;
                angleOutputs[idx].style.color = (result === '錯誤格式' || result === '無效頂點' || result === '點重合') ? '#dc3545' : '#333';
            } else {
                angleOutputs[idx].textContent = '0';
                angleOutputs[idx].style.color = '#333';
            }
        });
    }
    
    function clearInputs() {
        const edgeInputs = document.querySelectorAll('.edgeInput');
        const angleInputs = document.querySelectorAll('.angleInput');
        const lengthOutputs = document.querySelectorAll('.lengthOutput');
        const angleOutputs = document.querySelectorAll('.angleOutput');
        
        edgeInputs.forEach(input => input.value = '');
        angleInputs.forEach(input => input.value = '');
        lengthOutputs.forEach(output => {
            output.textContent = '0';
            output.style.color = '#333';
        });
        angleOutputs.forEach(output => {
            output.textContent = '0';
            output.style.color = '#333';
        });
    }
    
    // ==================== 预设形状 ====================
    
    function setParallelogram() {
        shapeMode = 'parallelogram';
        points = [
            { x: 50, y: 80 },
            { x: 130, y: 80 },
            { x: 180, y: 150 },
            { x: 100, y: 150 }
        ];
        updateButtonStates();
        drawQuadrilateral();
        updateLengthsAndAngles();
    }
    
    function setRectangle() {
        shapeMode = 'rectangle';
        points = [
            { x: 60, y: 70 },
            { x: 160, y: 70 },
            { x: 160, y: 150 },
            { x: 60, y: 150 }
        ];
        updateButtonStates();
        drawQuadrilateral();
        updateLengthsAndAngles();
    }
    
    function setSquare() {
        shapeMode = 'square';
        points = [
            { x: 70, y: 70 },
            { x: 140, y: 70 },
            { x: 140, y: 140 },
            { x: 70, y: 140 }
        ];
        updateButtonStates();
        drawQuadrilateral();
        updateLengthsAndAngles();
    }
    
    function setRhombus() {
        shapeMode = 'rhombus';
        const cx = 120, cy = 110;
        const w = 70, h = 45;
        points = [
            { x: cx, y: cy - h },
            { x: cx + w, y: cy },
            { x: cx, y: cy + h },
            { x: cx - w, y: cy }
        ];
        updateButtonStates();
        drawQuadrilateral();
        updateLengthsAndAngles();
    }
    
    function updateButtonStates() {
        const btns = ['parallelogramBtn', 'rectangleBtn', 'squareBtn', 'rhombusBtn'];
        btns.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                if ((id === 'parallelogramBtn' && shapeMode === 'parallelogram') ||
                    (id === 'rectangleBtn' && shapeMode === 'rectangle') ||
                    (id === 'squareBtn' && shapeMode === 'square') ||
                    (id === 'rhombusBtn' && shapeMode === 'rhombus')) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            }
        });
    }
    
    // ==================== 事件绑定 ====================
    
    function getCanvasCoords(e) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        let clientX, clientY;
        if (e.type.startsWith('touch')) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        
        let canvasX = (clientX - rect.left) * scaleX;
        let canvasY = (clientY - rect.top) * scaleY;
        canvasX = Math.min(Math.max(canvasX, 0), canvas.width);
        canvasY = Math.min(Math.max(canvasY, 0), canvas.height);
        return { x: canvasX, y: canvasY };
    }
    
    function handleStart(e) {
        e.preventDefault();
        const coords = getCanvasCoords(e);
        for (let i = 0; i < points.length; i++) {
            const dx = coords.x - points[i].x;
            const dy = coords.y - points[i].y;
            if (Math.sqrt(dx * dx + dy * dy) < 12) {
                selectedPoint = i;
                isDragging = true;
                break;
            }
        }
    }
    
    function handleMove(e) {
        if (selectedPoint !== -1 && isDragging) {
            e.preventDefault();
            const coords = getCanvasCoords(e);
            updateParallelogram(selectedPoint, coords.x, coords.y);
            drawQuadrilateral();
            updateLengthsAndAngles();
        }
    }
    
    function handleEnd(e) {
        selectedPoint = -1;
        isDragging = false;
    }
    
    // 鼠标事件
    canvas.addEventListener('mousedown', handleStart);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    
    // 触摸事件
    canvas.addEventListener('touchstart', handleStart, { passive: false });
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd);
    
    // 按钮事件
    document.getElementById('parallelogramBtn').addEventListener('click', setParallelogram);
    document.getElementById('rectangleBtn').addEventListener('click', setRectangle);
    document.getElementById('squareBtn').addEventListener('click', setSquare);
    document.getElementById('rhombusBtn').addEventListener('click', setRhombus);
    document.getElementById('clearBtn').addEventListener('click', clearInputs);
    
    // 输入框事件
    document.querySelectorAll('.edgeInput, .angleInput').forEach(input => {
        input.addEventListener('input', () => {
            input.value = input.value.toUpperCase();
            updateLengthsAndAngles();
        });
    });
    
    // 初始化绘制
    setParallelogram();
})();