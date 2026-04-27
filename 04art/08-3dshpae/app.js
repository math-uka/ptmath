// app.js
// ================================================
// 基本設定
// ================================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf8f9fa);
const camera = new THREE.PerspectiveCamera(55, innerWidth/innerHeight, 0.1, 3000);
const renderer = new THREE.WebGLRenderer({antialias:true, preserveDrawingBuffer:true});
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
const orbitControls = new THREE.OrbitControls(camera, renderer.domElement);
orbitControls.enableDamping = true;
orbitControls.dampingFactor = 0.08;
orbitControls.minDistance = 6;
orbitControls.maxDistance = 180;
scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
directionalLight.position.set(10, 25, 15);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 100;
directionalLight.shadow.camera.left = -40;
directionalLight.shadow.camera.right = 40;
directionalLight.shadow.camera.top = 40;
directionalLight.shadow.camera.bottom = -40;
directionalLight.shadow.bias = -0.0001;
directionalLight.shadow.normalBias = 0.05;
scene.add(directionalLight);
const grid = new THREE.GridHelper(80, 40, 0x888888, 0xdddddd);
scene.add(grid);
const arrowX = new THREE.ArrowHelper(new THREE.Vector3(1,0,0), new THREE.Vector3(0,0.1,0), 4, 0xff0000);
const arrowZ = new THREE.ArrowHelper(new THREE.Vector3(0,0,1), new THREE.Vector3(0,0.1,0), 4, 0x00ff00);
scene.add(arrowX);
scene.add(arrowZ);
const directionArrows = [arrowX, arrowZ];
camera.position.set(20, 16, 28);
orbitControls.update();
const clock = new THREE.Clock();

// ================================================
// 全域變數
// ================================================
const baseSize = 2;
const moveStep = baseSize / 2;
const objects = [];
let selected = null;
let selectedObjects = [];
let displayMode = 0;
let gridVisible = true;
let diagonalsVisible = false;
let uiVisible = true;
let shadowsEnabled = true;
let wireframeVisible = true;
let selectedColor = 0x3366ff;
const history = [];
let historyIndex = -1;
let playerModel = null;
let playerMode = 0;
let designCameraPos = new THREE.Vector3();
let designTarget = new THREE.Vector3();
const moveSpeed = 20;
const rotationSpeed = 0.05;
const keys = {};
let isPointerLocked = false;
const colorHistory = ['#3366ff', '#ffffff', '#ffffff', '#ffffff'];

// ================================================
// 材質
// ================================================
function getSurfaceMaterial(color, mode, isSelected = false) {
    if (mode === 0) {
        return new THREE.MeshPhongMaterial({
            color: isSelected ? 0xff4444 : color,
            shininess: 60,
            emissive: isSelected ? 0x440000 : 0x000000,
            specular: 0x888888,
            transparent: false
        });
    }
    if (mode === 1) {
        return new THREE.MeshPhongMaterial({
            color: isSelected ? 0xff4444 : color,
            transparent: true,
            opacity: isSelected ? 0.88 : 0.68,
            shininess: 35,
            specular: 0x888888
        });
    }
    return new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 });
}

function getWireframeMaterial() {
    const mat = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 8 });
    mat.depthTest = true;
    mat.polygonOffset = true;
    mat.polygonOffsetFactor = -1.0;
    mat.polygonOffsetUnits = -4.0;
    return mat;
}

// ================================================
// 歷史記錄功能
// ================================================
function saveToHistory() {
    const state = objects.map(o => ({
        type: o.type,
        position: {x: o.position.x, y: o.position.y, z: o.position.z},
        rotation: {x: o.rotation ? o.rotation.x : 0, y: o.rotation ? o.rotation.y : 0, z: o.rotation ? o.rotation.z : 0},
        color: o.color
    }));
    history.splice(historyIndex + 1);
    history.push(state);
    historyIndex = history.length - 1;
}

function loadFromHistory(index) {
    if (index < 0 || index >= history.length) return;
    historyIndex = index;
    const data = history[index];
    while (objects.length) {
        const obj = objects.pop();
        if (obj.type === 'player') {
            scene.remove(obj.group);
        } else {
            scene.remove(obj.mesh);
            scene.remove(obj.wire);
            if (obj.diagWire) scene.remove(obj.diagWire);
        }
    }
    clearAllSelection();
    data.forEach(d => {
        const pos = new THREE.Vector3(d.position.x, d.position.y, d.position.z);
        const rotation = {x: d.rotation.x, y: d.rotation.y, z: d.rotation.z};
        if (d.type === 'player') {
            createPlayerModel(pos, d.color, rotation, false);
        } else {
            createShape(d.type, pos, d.color, rotation, false);
        }
    });
    updateCount();
    showStatus(`已${index < historyIndex ? '還原上一步' : '退回下一步'}`);
}

function undo() {
    if (historyIndex > 0) {
        loadFromHistory(historyIndex - 1);
    } else {
        showStatus("沒有上一步可還原");
    }
}

function redo() {
    if (historyIndex < history.length - 1) {
        loadFromHistory(historyIndex + 1);
    } else {
        showStatus("沒有下一步可退回");
    }
}

// ================================================
// 建立物件
// ================================================
function createShape(type, pos = null, color = selectedColor, rotation = {x: 0, y: 0, z: 0}, saveHistory = true) {
    let geo;
    if (type === 'cube') {
        geo = new THREE.BoxGeometry(baseSize, baseSize, baseSize);
    } else if (type === 'sphere') {
        geo = new THREE.SphereGeometry(baseSize*0.5, 28, 20);
    } else if (type === 'cone') {
        geo = new THREE.ConeGeometry(baseSize*0.5, baseSize*1.4, 28, 1);
    } else if (type === 'pyramid') {
        const r = baseSize / Math.sqrt(2);
        geo = new THREE.ConeGeometry(r, baseSize, 4);
        geo.rotateY(Math.PI / 4);
    } else if (type === 'cylinder') {
        geo = new THREE.CylinderGeometry(baseSize*0.5, baseSize*0.5, baseSize, 28, 1);
    } else if (type === 'halfCylinder') {
        geo = new THREE.CylinderGeometry(baseSize*0.5, baseSize*0.5, baseSize, 28, 1, false, 0, Math.PI);
    } else if (type === 'triPrism') {
        const side = baseSize * Math.sqrt(4/3);
        const shape = new THREE.Shape();
        shape.moveTo(-side/2, 0);
        shape.lineTo(side/2, 0);
        shape.lineTo(0, (side * Math.sqrt(3))/2);
        geo = new THREE.ExtrudeGeometry(shape, { depth: baseSize, bevelEnabled: false });
        geo.rotateX(-Math.PI / 2);
        geo.translate(0, baseSize/2, 0);
    } else if (type === 'floor') {
        geo = new THREE.BoxGeometry(baseSize, 0.2, baseSize);
        if (!pos) pos = getNextPosition();
        pos.y = 0.1;
        color = 0xcccccc;
    }
    if (!pos) pos = getNextPosition();
    const mesh = new THREE.Mesh(geo, getSurfaceMaterial(color, displayMode));
    mesh.position.copy(pos);
    mesh.rotation.set(rotation.x, rotation.y, rotation.z);
    mesh.castShadow = shadowsEnabled;
    mesh.receiveShadow = shadowsEnabled;
    mesh.visible = displayMode !== 2;
    const wire = new THREE.LineSegments(new THREE.EdgesGeometry(geo), getWireframeMaterial());
    wire.position.copy(pos);
    wire.rotation.set(rotation.x, rotation.y, rotation.z);
    wire.visible = wireframeVisible;
    let diag = null;
    if (type === 'cube' && diagonalsVisible) {
        diag = new THREE.LineSegments(new THREE.WireframeGeometry(geo), getWireframeMaterial());
        diag.material.color.set(0x555555);
        diag.position.copy(pos);
        diag.rotation.set(rotation.x, rotation.y, rotation.z);
        diag.visible = wireframeVisible;
        scene.add(diag);
    }
    scene.add(mesh);
    scene.add(wire);
    const obj = { type, mesh, wire, diagWire:diag, position:pos.clone(), color, isSelected:false };
    objects.push(obj);
    updateCount();
    if (saveHistory) saveToHistory();
    return obj;
}

function getNextPosition() {
    if (objects.length === 0) return new THREE.Vector3(0, baseSize/2, 0);
    for (let i = 0; i < 30; i++) {
        const angle = Math.random()*Math.PI*2;
        const dist = (Math.floor(Math.random()*5)+1) * moveStep;
        const x = Math.round(Math.cos(angle)*dist / moveStep) * moveStep;
        const z = Math.round(Math.sin(angle)*dist / moveStep) * moveStep;
        const p = new THREE.Vector3(x, baseSize/2, z);
        if (!objects.some(o => o.position.distanceTo(p) < baseSize*0.75)) return p;
    }
    return new THREE.Vector3((Math.random()-0.5)*40, baseSize/2, (Math.random()-0.5)*40);
}

function createPlayerModel(pos = null, color = 0xff0000, rotation = {x: 0, y: 0, z: 0}, saveHistory = true) {
    if (!pos) pos = new THREE.Vector3(0, 0.75, 0);
    const group = new THREE.Group();
    const scale = 0.5;
    const bodyGeo = new THREE.CylinderGeometry(0.8 * scale, 0.8 * scale, 2 * scale, 16);
    const body = new THREE.Mesh(bodyGeo, getSurfaceMaterial(0x00ff00, displayMode));
    body.position.y = 1 * scale;
    group.add(body);
    const headGeo = new THREE.SphereGeometry(0.6 * scale, 16, 16);
    const head = new THREE.Mesh(headGeo, getSurfaceMaterial(0xff0000, displayMode));
    head.position.y = 2.2 * scale;
    group.add(head);
    const armGeo = new THREE.CylinderGeometry(0.3 * scale, 0.3 * scale, 1.5 * scale, 16);
    const leftArm = new THREE.Mesh(armGeo, getSurfaceMaterial(0x00ff00, displayMode));
    leftArm.position.set(-1 * scale, 1.5 * scale, 0);
    group.add(leftArm);
    const rightArm = leftArm.clone();
    rightArm.position.x = 1 * scale;
    group.add(rightArm);
    const legGeo = new THREE.CylinderGeometry(0.4 * scale, 0.4 * scale, 1.5 * scale, 16);
    const leftLeg = new THREE.Mesh(legGeo, getSurfaceMaterial(0x00ff00, displayMode));
    leftLeg.position.set(-0.5 * scale, 0.25 * scale, 0);
    group.add(leftLeg);
    const rightLeg = leftLeg.clone();
    rightLeg.position.x = 0.5 * scale;
    group.add(rightLeg);
    group.position.copy(pos);
    group.rotation.set(rotation.x, rotation.y, rotation.z);
    group.traverse(child => {
        if (child instanceof THREE.Mesh) {
            child.castShadow = shadowsEnabled;
            child.receiveShadow = shadowsEnabled;
        }
    });
    scene.add(group);
    const player = { type: 'player', group, position: pos.clone(), rotation: new THREE.Euler(rotation.x, rotation.y, rotation.z), color, isSelected: false };
    objects.push(player);
    updateCount();
    if (saveHistory) saveToHistory();
    return player;
}

function addPlayerModel() {
    if (playerModel) {
        showStatus("只能有一個玩家角色");
        return;
    }
    const pos = new THREE.Vector3(0, 0.75, 0);
    playerModel = createPlayerModel(pos);
    showStatus("已新增玩家角色，按 Enter 進入操控模式");
}

// ================================================
// 切換模式
// ================================================
function togglePlayerMode() {
    if (!playerModel) {
        showStatus("請先新增玩家角色");
        return;
    }
    playerMode = (playerMode + 1) % 3;
    if (playerMode === 0) {
        document.exitPointerLock();
        orbitControls.enabled = true;
        camera.position.copy(designCameraPos);
        orbitControls.target.copy(designTarget);
        orbitControls.update();
        playerModel.group.visible = true;
        showStatus("返回設計模式");
    } else {
        if (playerMode === 1) {
            designCameraPos.copy(camera.position);
            designTarget.copy(orbitControls.target);
            orbitControls.enabled = false;
            renderer.domElement.requestPointerLock();
            playerModel.group.visible = true;
            showStatus("進入越肩視角模式：W S 前後移動, F 上升, Space 下降, A 左轉, D 右轉, 鼠標控制視角，按 Enter 切換");
        } else if (playerMode === 2) {
            playerModel.group.visible = false;
            showStatus("進入第一人稱視角模式：W S 前後移動, F 上升, Space 下降, A 左轉, D 右轉, 鼠標控制視角，按 Enter 切換");
        }
    }
}

// ================================================
// 玩家移動與碰撞檢測
// ================================================
function updatePlayer(delta) {
    if (playerMode === 0 || !playerModel) return;
    const forward = new THREE.Vector3(0, 0, -1).applyEuler(playerModel.rotation);
    forward.y = 0;
    forward.normalize();
    const right = new THREE.Vector3(1, 0, 0).applyEuler(playerModel.rotation);
    right.y = 0;
    right.normalize();
    const direction = new THREE.Vector3();
    if (keys['w']) direction.add(forward);
    if (keys['s']) direction.sub(forward);
    if (keys['f']) direction.y += 1;
    if (keys[' ']) direction.y -= 1;
    if (keys['a']) playerModel.rotation.y += rotationSpeed;
    if (keys['d']) playerModel.rotation.y -= rotationSpeed;
    if (direction.lengthSq() > 0) {
        const velocity = direction.normalize().multiplyScalar(moveSpeed * delta);
        let proposed = playerModel.position.clone();
        proposed.x += velocity.x;
        if (!checkCollision(proposed)) playerModel.position.x += velocity.x;
        proposed = playerModel.position.clone();
        proposed.y += velocity.y;
        if (!checkCollision(proposed)) playerModel.position.y += velocity.y;
        proposed = playerModel.position.clone();
        proposed.z += velocity.z;
        if (!checkCollision(proposed)) playerModel.position.z += velocity.z;
        playerModel.group.position.copy(playerModel.position);
    }
    playerModel.group.rotation.y = playerModel.rotation.y;
    if (playerMode === 1) {
        const shoulderOffset = new THREE.Vector3(0, 1.5, 3);
        const rotatedOffset = shoulderOffset.clone().applyEuler(playerModel.rotation);
        camera.position.copy(playerModel.position).add(rotatedOffset);
        const lookAtPos = playerModel.position.clone().add(new THREE.Vector3(0, 1, 0));
        camera.lookAt(lookAtPos);
    } else if (playerMode === 2) {
        const headOffset = new THREE.Vector3(0, 1.1, 0);
        camera.position.copy(playerModel.position).add(headOffset);
        camera.rotation.copy(playerModel.rotation);
    }
}

function checkCollision(proposedPos) {
    const playerBox = new THREE.Box3();
    playerBox.setFromCenterAndSize(proposedPos, new THREE.Vector3(0.75, 1.5, 0.75));
    for (let obj of objects) {
        if (obj === playerModel || obj.type === 'floor') continue;
        let objBox;
        if (obj.type === 'player') {
            objBox = new THREE.Box3().setFromObject(obj.group);
        } else {
            objBox = new THREE.Box3().setFromObject(obj.mesh);
        }
        if (playerBox.intersectsBox(objBox)) {
            return true;
        }
    }
    return false;
}

// ================================================
// 選擇相關
// ================================================
function selectObject(obj, multi = false) {
    if (!multi) {
        clearAllSelection();
        obj.isSelected = true;
        if (obj.type === 'player') {
            obj.group.traverse(child => {
                if (child instanceof THREE.Mesh) child.material = getSurfaceMaterial(obj.color, displayMode, true);
            });
        } else {
            obj.mesh.material = getSurfaceMaterial(obj.color, displayMode, true);
        }
        selected = obj;
        selectedObjects = [obj];
    } else {
        const index = selectedObjects.indexOf(obj);
        if (index === -1) {
            obj.isSelected = true;
            if (obj.type === 'player') {
                obj.group.traverse(child => {
                    if (child instanceof THREE.Mesh) child.material = getSurfaceMaterial(obj.color, displayMode, true);
                });
            } else {
                obj.mesh.material = getSurfaceMaterial(obj.color, displayMode, true);
            }
            selectedObjects.push(obj);
            selected = obj;
        } else {
            obj.isSelected = false;
            if (obj.type === 'player') {
                obj.group.traverse(child => {
                    if (child instanceof THREE.Mesh) child.material = getSurfaceMaterial(obj.color, displayMode);
                });
            } else {
                obj.mesh.material = getSurfaceMaterial(obj.color, displayMode);
            }
            selectedObjects.splice(index, 1);
            if (selected === obj) {
                selected = selectedObjects.length > 0 ? selectedObjects[selectedObjects.length-1] : null;
            }
        }
    }
}

function clearAllSelection() {
    selectedObjects.forEach(o => {
        o.isSelected = false;
        if (o.type === 'player') {
            o.group.traverse(child => {
                if (child instanceof THREE.Mesh) child.material = getSurfaceMaterial(o.color, displayMode);
            });
        } else {
            o.mesh.material = getSurfaceMaterial(o.color, displayMode);
        }
    });
    selectedObjects = [];
    selected = null;
}

function deselectAll() {
    clearAllSelection();
}

function selectLayer() {
    if (!selected) {
        showStatus("請先選取至少一個物件");
        return;
    }
    const targetY = selected.position.y;
    clearAllSelection();
    objects.forEach(o => {
        if (Math.abs(o.position.y - targetY) < 0.1 && o.type !== 'floor') {
            selectObject(o, true);
        }
    });
    showStatus("已選擇全層");
}

function selectAbove() {
    if (selectedObjects.length === 0) {
        showStatus("請先選取至少一個物件");
        return;
    }
    const toAdd = [];
    selectedObjects.forEach(baseObj => {
        const baseX = baseObj.position.x;
        const baseY = baseObj.position.y;
        const baseZ = baseObj.position.z;
        objects.forEach(o => {
            if (Math.abs(o.position.x - baseX) < 0.1 && Math.abs(o.position.z - baseZ) < 0.1 && o.position.y >= baseY - 0.1 && o.type !== 'floor') {
                if (!selectedObjects.includes(o)) {
                    toAdd.push(o);
                }
            }
        });
    });
    toAdd.forEach(o => selectObject(o, true));
    showStatus("已選擇選中物件及往上的所有物件");
}

// ================================================
// 刪除相關
// ================================================
function removeSelected() {
    if (selectedObjects.length === 0) return;
    for (let i = selectedObjects.length - 1; i >= 0; i--) {
        const obj = selectedObjects[i];
        if (obj.type === 'player') {
            scene.remove(obj.group);
        } else {
            scene.remove(obj.mesh);
            scene.remove(obj.wire);
            if (obj.diagWire) scene.remove(obj.diagWire);
        }
        const idx = objects.indexOf(obj);
        if (idx !== -1) objects.splice(idx, 1);
        if (obj === playerModel) playerModel = null;
    }
    selected = null;
    selectedObjects = [];
    updateCount();
    saveToHistory();
    showStatus("已刪除選中物件");
}

function removeLast() {
    if (!objects.length) return;
    const last = objects.pop();
    if (last.type === 'player') {
        scene.remove(last.group);
    } else {
        scene.remove(last.mesh);
        scene.remove(last.wire);
        if (last.diagWire) scene.remove(last.diagWire);
    }
    const idx = selectedObjects.indexOf(last);
    if (idx !== -1) selectedObjects.splice(idx, 1);
    if (selected === last) selected = null;
    if (last === playerModel) playerModel = null;
    updateCount();
    saveToHistory();
}

// ================================================
// 複製功能（支援多選）
// ================================================
function duplicate(dir) {
    if (selectedObjects.length === 0) {
        showStatus("請先選取至少一個物件");
        return;
    }
    const newObjects = [];
    let dx = 0, dy = 0, dz = 0;
    switch (dir) {
        case 'right': dx = baseSize; break;
        case 'left': dx = -baseSize; break;
        case 'backward': dz = baseSize; break;
        case 'forward': dz = -baseSize; break;
        case 'upward': dy = baseSize; break;
    }
    selectedObjects.forEach(obj => {
        const newPos = obj.position.clone();
        newPos.x += dx;
        newPos.y += dy;
        newPos.z += dz;
        const blocking = objects.find(o => o.position.equals(newPos));
        if (blocking) {
            if (blocking.type === 'player') {
                scene.remove(blocking.group);
            } else {
                scene.remove(blocking.mesh);
                scene.remove(blocking.wire);
                if (blocking.diagWire) scene.remove(blocking.diagWire);
            }
            const idx = objects.indexOf(blocking);
            if (idx !== -1) objects.splice(idx, 1);
            const selIdx = selectedObjects.indexOf(blocking);
            if (selIdx !== -1) selectedObjects.splice(selIdx, 1);
        }
        const rotation = {
            x: obj.rotation ? obj.rotation.x : obj.mesh.rotation.x,
            y: obj.rotation ? obj.rotation.y : obj.mesh.rotation.y,
            z: obj.rotation ? obj.rotation.z : obj.mesh.rotation.z
        };
        let newObj;
        if (obj.type === 'player') {
            newObj = createPlayerModel(newPos, obj.color, rotation, false);
        } else {
            newObj = createShape(obj.type, newPos, obj.color, rotation, false);
        }
        newObjects.push(newObj);
    });
    clearAllSelection();
    newObjects.forEach(o => selectObject(o, true));
    saveToHistory();
}

function duplicateLayer() {
    if (objects.length === 0) {
        showStatus("場景中沒有物件");
        return;
    }
    let maxY = -Infinity;
    objects.forEach(obj => {
        if (obj.position.y > maxY && obj.type !== 'floor') maxY = obj.position.y;
    });
    const currentLayerObjects = objects.filter(obj => Math.abs(obj.position.y - maxY) < 0.1 && obj.type !== 'floor');
    if (currentLayerObjects.length === 0) {
        showStatus("沒有找到任何物件在當前層");
        return;
    }
    const newObjects = [];
    const offsetY = baseSize;
    currentLayerObjects.forEach(obj => {
        const newPos = obj.position.clone();
        newPos.y += offsetY;
        const blocking = objects.find(o => o.position.equals(newPos));
        if (blocking) {
            if (blocking.type === 'player') {
                scene.remove(blocking.group);
            } else {
                scene.remove(blocking.mesh);
                scene.remove(blocking.wire);
                if (blocking.diagWire) scene.remove(blocking.diagWire);
            }
            const idx = objects.indexOf(blocking);
            if (idx !== -1) objects.splice(idx, 1);
            const selIdx = selectedObjects.indexOf(blocking);
            if (selIdx !== -1) selectedObjects.splice(selIdx, 1);
        }
        const rotation = {
            x: obj.rotation ? obj.rotation.x : obj.mesh.rotation.x,
            y: obj.rotation ? obj.rotation.y : obj.mesh.rotation.y,
            z: obj.rotation ? obj.rotation.z : obj.mesh.rotation.z
        };
        let newObj;
        if (obj.type === 'player') {
            newObj = createPlayerModel(newPos, obj.color, rotation, false);
        } else {
            newObj = createShape(obj.type, newPos, obj.color, rotation, false);
        }
        newObjects.push(newObj);
    });
    clearAllSelection();
    newObjects.forEach(o => selectObject(o, true));
    saveToHistory();
}

// ================================================
// 移動（目前只支援單選）
// ================================================
function move(dir) {
    if (!selected) return;
    const p = selected.position.clone();
    switch(dir.toLowerCase()) {
        case 'w': p.z -= moveStep; break;
        case 's': p.z += moveStep; break;
        case 'a': p.x -= moveStep; break;
        case 'd': p.x += moveStep; break;
        case 'r': p.y += moveStep; break;
        case 'f': p.y = Math.max(baseSize/2, p.y - moveStep); break;
    }
    if (!objects.some(o => o !== selected && o.position.distanceTo(p) < baseSize*0.7)) {
        selected.position.copy(p);
        if (selected.type === 'player') {
            selected.group.position.copy(p);
        } else {
            selected.mesh.position.copy(p);
            selected.wire.position.copy(p);
            if (selected.diagWire) selected.diagWire.position.copy(p);
        }
        saveToHistory();
    }
}

function flipVertical() {
    if (!selected) {
        showStatus("請先選取一個物件（翻轉目前只支援單選）");
        return;
    }
    if (selected.type === 'player') {
        showStatus("玩家角色不支援翻轉");
        return;
    }
    const boxBefore = new THREE.Box3().setFromObject(selected.mesh);
    const bottomBefore = boxBefore.min.y;
    selected.mesh.rotation.x += Math.PI / 2;
    selected.wire.rotation.x += Math.PI / 2;
    if (selected.diagWire) selected.diagWire.rotation.x += Math.PI / 2;
    const boxAfter = new THREE.Box3().setFromObject(selected.mesh);
    const bottomAfter = boxAfter.min.y;
    const deltaY = bottomBefore - bottomAfter;
    selected.position.y += deltaY;
    selected.mesh.position.y += deltaY;
    selected.wire.position.y += deltaY;
    if (selected.diagWire) selected.diagWire.position.y += deltaY;
    if (selected.position.y < baseSize / 2) {
        const adjust = (baseSize / 2) - selected.position.y;
        selected.position.y += adjust;
        selected.mesh.position.y += adjust;
        selected.wire.position.y += adjust;
        if (selected.diagWire) selected.diagWire.position.y += adjust;
    }
    saveToHistory();
    showStatus("已上下翻轉 90°，底部位置已對齊");
}

function flipHorizontal() {
    if (!selected) {
        showStatus("請先選取一個物件（翻轉目前只支援單選）");
        return;
    }
    if (selected.type === 'player') {
        showStatus("玩家角色不支援翻轉");
        return;
    }
    const boxBefore = new THREE.Box3().setFromObject(selected.mesh);
    const bottomBefore = boxBefore.min.y;
    selected.mesh.rotation.y += Math.PI / 2;
    selected.wire.rotation.y += Math.PI / 2;
    if (selected.diagWire) selected.diagWire.rotation.y += Math.PI / 2;
    const boxAfter = new THREE.Box3().setFromObject(selected.mesh);
    const bottomAfter = boxAfter.min.y;
    const deltaY = bottomBefore - bottomAfter;
    selected.position.y += deltaY;
    selected.mesh.position.y += deltaY;
    selected.wire.position.y += deltaY;
    if (selected.diagWire) selected.diagWire.position.y += deltaY;
    if (selected.position.y < baseSize / 2) {
        const adjust = (baseSize / 2) - selected.position.y;
        selected.position.y += adjust;
        selected.mesh.position.y += adjust;
        selected.wire.position.y += adjust;
        if (selected.diagWire) selected.diagWire.position.y += adjust;
    }
    saveToHistory();
    showStatus("已左右翻轉 90°，底部位置已對齊");
}

// ================================================
// 地板與生成牆壁
// ================================================
function addFloor() {
    createShape('floor');
}

function generateWalls() {
    const floorPositions = new Set();
    objects.filter(o => o.type === 'floor').forEach(o => {
        const key = `${Math.round(o.position.x / baseSize)},${Math.round(o.position.z / baseSize)}`;
        floorPositions.add(key);
    });
    const directions = [
        new THREE.Vector3(baseSize, 0, 0),
        new THREE.Vector3(-baseSize, 0, 0),
        new THREE.Vector3(0, 0, baseSize),
        new THREE.Vector3(0, 0, -baseSize),
    ];
    const newWalls = [];
    objects.filter(o => o.type === 'floor').forEach(floor => {
        directions.forEach(dir => {
            const neighborPos = floor.position.clone().add(dir);
            const neighborKey = `${Math.round(neighborPos.x / baseSize)},${Math.round(neighborPos.z / baseSize)}`;
            if (!floorPositions.has(neighborKey)) {
                const wallPos = neighborPos.clone();
                wallPos.y = baseSize / 2;
                if (!objects.some(o => o.position.equals(wallPos))) {
                    const newWall = createShape('cube', wallPos, 0x888888, {x:0,y:0,z:0}, false);
                    newWalls.push(newWall);
                }
            }
        });
    });
    saveToHistory();
    showStatus(`已生成 ${newWalls.length} 個牆壁`);
}

// ================================================
// 其他功能
// ================================================
function updateDisplayMode() {
    displayMode = (displayMode + 1) % 3;
    const texts = ['不透明表面 + 線框', '半透明表面 + 線框', '純線框'];
    document.getElementById('toggleDisplayMode').textContent = texts[displayMode];
    objects.forEach(o => {
        if (o.type === 'player') {
            o.group.traverse(child => {
                if (child instanceof THREE.Mesh) {
                    child.material = getSurfaceMaterial(o.color, displayMode, o.isSelected);
                    child.visible = displayMode !== 2;
                }
            });
        } else {
            o.mesh.material = getSurfaceMaterial(o.color, displayMode, o.isSelected);
            o.mesh.visible = displayMode !== 2;
            o.wire.visible = wireframeVisible;
            if (o.diagWire) o.diagWire.visible = wireframeVisible;
        }
    });
}

function toggleGrid() {
    gridVisible = !gridVisible;
    grid.visible = gridVisible;
    directionArrows.forEach(a => a.visible = gridVisible);
    document.getElementById('toggleGrid').textContent = gridVisible ? '隱藏地面格線' : '顯示地面格線';
}

function toggleDiagonals() {
    diagonalsVisible = !diagonalsVisible;
    objects.forEach(o => {
        if (o.type !== 'cube') return;
        if (o.diagWire) scene.remove(o.diagWire);
        o.diagWire = null;
        if (diagonalsVisible) {
            const geo = new THREE.BoxGeometry(baseSize,baseSize,baseSize);
            o.diagWire = new THREE.LineSegments(new THREE.WireframeGeometry(geo), getWireframeMaterial());
            o.diagWire.material.color.set(0x555555);
            o.diagWire.position.copy(o.position);
            o.diagWire.rotation.copy(o.wire.rotation);
            o.diagWire.visible = wireframeVisible;
            scene.add(o.diagWire);
        }
    });
    document.getElementById('toggleDiagonals').textContent = diagonalsVisible ? '隱藏對角線' : '顯示對角線';
}

function toggleShadows() {
    shadowsEnabled = !shadowsEnabled;
    directionalLight.castShadow = shadowsEnabled;
    objects.forEach(o => {
        if (o.type === 'player') {
            o.group.traverse(child => {
                if (child instanceof THREE.Mesh) {
                    child.castShadow = shadowsEnabled;
                    child.receiveShadow = shadowsEnabled;
                }
            });
        } else {
            o.mesh.castShadow = shadowsEnabled;
            o.mesh.receiveShadow = shadowsEnabled;
        }
    });
    document.getElementById('toggleShadows').textContent = shadowsEnabled ? '隱藏陰影' : '顯示陰影';
}

function toggleWireframe() {
    wireframeVisible = !wireframeVisible;
    document.getElementById('toggleWireframe').textContent = wireframeVisible ? '隱藏線框' : '顯示線框';
    objects.forEach(o => {
        if (o.type !== 'player') {
            o.wire.visible = wireframeVisible;
            if (o.diagWire) o.diagWire.visible = wireframeVisible;
        }
    });
}

function toggleUI() {
    uiVisible = !uiVisible;
    document.querySelectorAll('.controls, .instructions').forEach(el => el.classList.toggle('hidden', !uiVisible));
}

function showStatus(msg) {
    const el = document.getElementById('statusMessage');
    el.textContent = msg;
    el.classList.add('active');
    setTimeout(() => el.classList.remove('active'), 2600);
}

function updateCount() {
    document.getElementById('count').textContent = objects.length;
}

// ================================================
// 儲存 / 載入
// ================================================
function saveJSON() {
    const data = objects.map(o => ({
        type: o.type,
        position: {x: o.position.x, y: o.position.y, z: o.position.z},
        rotation: {x: o.rotation ? o.rotation.x : o.mesh.rotation.x, y: o.rotation ? o.rotation.y : o.mesh.rotation.y, z: o.rotation ? o.rotation.z : o.mesh.rotation.z},
        color: o.color
    }));
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], {type: 'application/json'});
    const link = document.createElement('a');
    link.download = `scene_${Date.now()}.json`;
    link.href = URL.createObjectURL(blob);
    link.click();
    showStatus('已儲存 JSON');
}

function loadJSON() {
    document.getElementById('fileInput').click();
}

function loadState(data) {
    while (objects.length) {
        const obj = objects.pop();
        if (obj.type === 'player') {
            scene.remove(obj.group);
        } else {
            scene.remove(obj.mesh);
            scene.remove(obj.wire);
            if (obj.diagWire) scene.remove(obj.diagWire);
        }
    }
    clearAllSelection();
    data.forEach(d => {
        const pos = new THREE.Vector3(d.position.x, d.position.y, d.position.z);
        const rotation = {x: d.rotation.x, y: d.rotation.y, z: d.rotation.z};
        if (d.type === 'player') {
            createPlayerModel(pos, d.color, rotation, false);
        } else {
            createShape(d.type, pos, d.color, rotation, false);
        }
    });
    updateCount();
    saveToHistory();
    showStatus('已載入場景');
}

// ================================================
// 顏色
// ================================================
function updateSelectedColor(hex) {
    const color = parseInt(hex.replace('#','0x'), 16);
    selectedColor = color;
    document.getElementById('colorInput').value = hex;
    colorHistory.unshift(hex);
    if (colorHistory.length > 4) colorHistory.pop();
    updateColorHistoryUI();
    selectedObjects.forEach(o => {
        o.color = color;
        if (o.type === 'player') {
            o.group.traverse(child => {
                if (child instanceof THREE.Mesh) child.material = getSurfaceMaterial(color, displayMode, o.isSelected);
            });
        } else {
            o.mesh.material = getSurfaceMaterial(color, displayMode, o.isSelected);
        }
    });
    if (selectedObjects.length > 0) saveToHistory();
}

function updateColorHistoryUI() {
    for (let i = 0; i < 4; i++) {
        const el = document.getElementById(`history${i}`);
        if (colorHistory[i]) {
            el.style.background = colorHistory[i];
            el.dataset.color = colorHistory[i];
        } else {
            el.style.background = '#ffffff';
            el.dataset.color = '#ffffff';
        }
    }
}

// ================================================
// 事件綁定
// ================================================
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

renderer.domElement.addEventListener('click', e => {
    if (playerMode !== 0) return;
    pointer.x = (e.clientX / innerWidth)*2 - 1;
    pointer.y = -(e.clientY / innerHeight)*2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const meshes = objects.map(o => o.type === 'player' ? o.group.children : [o.mesh]).flat();
    const hits = raycaster.intersectObjects(meshes);
    if (hits.length) {
        const hitMesh = hits[0].object;
        const obj = objects.find(o => {
            if (o.type === 'player') return o.group.children.includes(hitMesh);
            return o.mesh === hitMesh;
        });
        const multi = e.shiftKey;
        selectObject(obj, multi);
    } else if (!e.shiftKey) {
        deselectAll();
    }
});

window.addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    keys[k] = true;
    if (e.key === 'Enter') {
        togglePlayerMode();
        return;
    }
    if (playerMode === 0) {
        if (k==='1') return toggleUI();
        if (k==='2') {
            const link = document.createElement('a');
            link.download = `capture_${Date.now()}.png`;
            link.href = renderer.domElement.toDataURL('image/png');
            link.click();
            return;
        }
        if (k==='3') return saveJSON();
        if (k==='4') return loadJSON();
        if (k==='delete' || k==='backspace') return removeLast();
        if (k==='q') {
            const obj = createShape('cube');
            clearAllSelection();
            selectObject(obj);
            return;
        }
        if (k==='g') return addFloor();
        if (k==='h') return generateWalls();
        if (k==='l') return duplicate('right');
        if (k==='k') return duplicate('backward');
        if (k==='j') return duplicate('left');
        if (k==='i') return duplicate('forward');
        if (k==='o') return duplicate('upward');
        if (k==='z') return undo();
        if (k==='x') return redo();
        if (k==='v') return removeSelected();
        if (k==='p') return duplicateLayer();
        if (k==='9') return selectLayer();
        if (k==='0') return selectAbove();
        if (!selected) return;
        if ('wasdrf'.includes(k)) move(k);
        if (e.key === 'ArrowUp') move('w');
        if (e.key === 'ArrowDown') move('s');
        if (e.key === 'ArrowLeft') move('a');
        if (e.key === 'ArrowRight') move('d');
    }
});

window.addEventListener('keyup', e => {
    const k = e.key.toLowerCase();
    keys[k] = false;
});

document.addEventListener('mousemove', e => {
    if (playerMode !== 0 && isPointerLocked) {
        const dx = e.movementX || 0;
        const dy = e.movementY || 0;
        playerModel.rotation.y -= dx * rotationSpeed;
        camera.rotation.x -= dy * rotationSpeed;
        camera.rotation.x = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, camera.rotation.x));
        playerModel.group.rotation.y = playerModel.rotation.y;
    }
});

document.addEventListener('pointerlockchange', () => {
    isPointerLocked = document.pointerLockElement === renderer.domElement;
});

// UI 按鈕綁定
document.getElementById('addCube').onclick = () => {
    clearAllSelection();
    const obj = createShape('cube');
    selectObject(obj);
};
document.getElementById('addSphere').onclick = () => { createShape('sphere'); };
document.getElementById('addCone').onclick = () => { createShape('cone'); };
document.getElementById('addPyramid').onclick = () => { createShape('pyramid'); };
document.getElementById('addCylinder').onclick = () => { createShape('cylinder'); };
document.getElementById('addHalfCylinder').onclick = () => { createShape('halfCylinder'); };
document.getElementById('addTriPrism').onclick = () => { createShape('triPrism'); };
document.getElementById('addFloor').onclick = addFloor;
document.getElementById('generateWalls').onclick = generateWalls;
document.getElementById('addPlayerModel').onclick = addPlayerModel;
document.getElementById('removeSelected').onclick = removeSelected;
document.getElementById('removeLast').onclick = removeLast;
document.getElementById('flipVertical').onclick = flipVertical;
document.getElementById('flipHorizontal').onclick = flipHorizontal;
document.getElementById('toggleDisplayMode').onclick = updateDisplayMode;
document.getElementById('toggleGrid').onclick = toggleGrid;
document.getElementById('toggleDiagonals').onclick = toggleDiagonals;
document.getElementById('toggleShadows').onclick = toggleShadows;
document.getElementById('toggleWireframe').onclick = toggleWireframe;
document.getElementById('colorInput').addEventListener('input', e => updateSelectedColor(e.target.value));
document.querySelectorAll('.color-preset').forEach(p => {
    p.addEventListener('click', e => updateSelectedColor(e.target.dataset.color));
});
document.querySelectorAll('.color-history-item').forEach(h => {
    h.addEventListener('click', e => updateSelectedColor(e.target.dataset.color));
});
document.getElementById('fileInput').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
        try {
            const data = JSON.parse(ev.target.result);
            loadState(data);
        } catch (err) {
            showStatus('載入失敗：' + err.message);
        }
    };
    reader.readAsText(file);
    e.target.value = '';
});

// 初始場景
createShape('cube');
updateDisplayMode();
saveToHistory();
updateColorHistoryUI();

// ================================================
// 動畫循環
// ================================================
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    if (playerMode !== 0) {
        updatePlayer(delta);
    } else {
        orbitControls.update();
    }
    renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
});