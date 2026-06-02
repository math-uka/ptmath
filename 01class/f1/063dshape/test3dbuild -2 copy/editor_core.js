// 核心功能：物件建立、編輯、歷史記錄、拖曳與繪圖等
(function() {
    // 輔助函數
    function getSurfaceMaterial(color, mode, isSelected = false, texture = null) {
        if (isSelected) {
            return new THREE.MeshPhongMaterial({
                color: 0xff4444,
                shininess: 60,
                emissive: 0x440000,
                specular: 0x888888
            });
        }
        if (mode === 2) {
            return new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 });
        }
        const baseMaterial = texture ? 
            new THREE.MeshPhongMaterial({ map: texture, shininess: 40 }) :
            new THREE.MeshPhongMaterial({ color: color, shininess: 60, specular: 0x888888 });
        if (mode === 1) {
            baseMaterial.transparent = true;
            baseMaterial.opacity = 0.68;
        }
        return baseMaterial;
    }

    function getWireframeMaterial() {
        const mat = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 8 });
        mat.depthTest = true;
        mat.polygonOffset = true;
        mat.polygonOffsetFactor = -1.0;
        mat.polygonOffsetUnits = -4.0;
        return mat;
    }

    function getMouseGroundPosition(event) {
        const rect = renderer.domElement.getBoundingClientRect();
        const mouse = new THREE.Vector2();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const targetPoint = new THREE.Vector3();
        if (raycaster.ray.intersectPlane(groundPlane, targetPoint)) {
            return targetPoint;
        }
        return null;
    }

    function getGroupCenter(objectsList) {
        if (objectsList.length === 0) return new THREE.Vector3(0, 0, 0);
        const center = new THREE.Vector3();
        objectsList.forEach(obj => center.add(obj.position));
        center.divideScalar(objectsList.length);
        return center;
    }

    function recordLastSelection() {
        if (!suppressLastSelectionUpdate && selectedObjects.length > 0) {
            lastSelectedObjects = selectedObjects.slice();
        }
    }

    function initGroupRotationState() {
        if (selectedObjects.length === 0) {
            groupRotationState = null;
            return;
        }
        const center = getGroupCenter(selectedObjects);
        const items = selectedObjects.map(obj => {
            let initRot;
            if (obj.type === 'player') initRot = obj.group.rotation.clone();
            else if (obj.type === 'objgroup') initRot = obj.group.rotation.clone();
            else initRot = obj.mesh.rotation.clone();
            const relPos = obj.position.clone().sub(center);
            return { obj, relPos, initRot };
        });
        groupRotationState = {
            center: center.clone(),
            items: items,
            currentY: 0,
            currentX: 0
        };
    }

    function applyGroupRotation(targetY, targetX) {
        if (!groupRotationState || groupRotationState.items.length !== selectedObjects.length) {
            initGroupRotationState();
        }
        if (!groupRotationState) return;
        const state = groupRotationState;
        targetX = Math.max(-90, Math.min(90, targetX));
        const radY = targetY * Math.PI / 180;
        const radX = targetX * Math.PI / 180;
        const R = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(radX, radY, 0, 'YXZ'));

        for (let item of state.items) {
            const obj = item.obj;
            const rotatedRelPos = item.relPos.clone().applyMatrix4(R);
            const newPos = state.center.clone().add(rotatedRelPos);
            obj.position.copy(newPos);

            const M_init = new THREE.Matrix4().makeRotationFromEuler(item.initRot);
            const M_final = new THREE.Matrix4().multiplyMatrices(R, M_init);
            const finalEuler = new THREE.Euler().setFromRotationMatrix(M_final);

            if (obj.type === 'player') {
                obj.group.position.copy(newPos);
                obj.group.rotation.copy(finalEuler);
            } else if (obj.type === 'objgroup') {
                obj.group.position.copy(newPos);
                obj.group.rotation.copy(finalEuler);
                if (obj.boundingWire) {
                    obj.boundingWire.position.copy(newPos);
                    obj.boundingWire.rotation.copy(finalEuler);
                }
            } else {
                obj.mesh.position.copy(newPos);
                obj.mesh.rotation.copy(finalEuler);
                obj.wire.position.copy(newPos);
                obj.wire.rotation.copy(finalEuler);
                if (obj.diagWire) {
                    obj.diagWire.position.copy(newPos);
                    obj.diagWire.rotation.copy(finalEuler);
                }
                if (obj.type === 'polygon' && obj.vertices) {
                    const newVerts = obj.vertices.map(v => {
                        const offsetV = v.clone().sub(state.center);
                        offsetV.applyMatrix4(R);
                        return state.center.clone().add(offsetV);
                    });
                    obj.vertices = newVerts;
                }
            }
            obj.rotation = finalEuler.clone();
        }
        state.currentY = targetY;
        state.currentX = targetX;
        multiGroupRotY = targetY;
        multiGroupRotX = targetX;
    }

    function clearGroupRotationState() {
        groupRotationState = null;
        multiGroupRotY = 0;
        multiGroupRotX = 0;
    }

    // ----- 歷史記錄 (使用 window.historyStack 避免與原生 History 衝突) -----
    function saveToHistory() {
        const state = objects.map(o => {
            const base = {
                type: o.type,
                position: { x: o.position.x, y: o.position.y, z: o.position.z },
                rotation: {
                    x: o.rotation ? o.rotation.x : (o.mesh ? o.mesh.rotation.x : 0),
                    y: o.rotation ? o.rotation.y : (o.mesh ? o.mesh.rotation.y : 0),
                    z: o.rotation ? o.rotation.z : (o.mesh ? o.mesh.rotation.z : 0)
                },
                color: o.color,
                materialKey: o.materialKey || null
            };
            if (o.type === 'polygon' && o.vertices) {
                base.vertices = o.vertices.map(v => ({ x: v.x, y: v.y, z: v.z }));
            }
            if (o.type === 'objgroup') {
                base.type = 'objgroup_warning';
            }
            return base;
        });
        historyStack.splice(historyStackIndex + 1);
        historyStack.push(state);
        historyStackIndex = historyStack.length - 1;
    }

    function loadFromHistory(index) {
        if (index < 0 || index >= historyStack.length) return;
        historyStackIndex = index;
        const data = historyStack[index];
        while (objects.length) {
            const obj = objects.pop();
            if (obj.type === 'player') scene.remove(obj.group);
            else if (obj.type === 'objgroup') { scene.remove(obj.group); if (obj.boundingWire) scene.remove(obj.boundingWire); }
            else if (obj.type === 'polygon') { scene.remove(obj.mesh); scene.remove(obj.wire); }
            else { scene.remove(obj.mesh); scene.remove(obj.wire); if (obj.diagWire) scene.remove(obj.diagWire); }
        }
        clearAllSelection();
        data.forEach(d => {
            if (d.type === 'objgroup_warning') return;
            const pos = new THREE.Vector3(d.position.x, d.position.y, d.position.z);
            const rotation = { x: d.rotation.x, y: d.rotation.y, z: d.rotation.z };
            let newObj = null;
            if (d.type === 'player') newObj = createPlayerModel(pos, d.color, rotation, false);
            else if (d.type === 'polygon' && d.vertices) {
                const verts = d.vertices.map(v => new THREE.Vector3(v.x, v.y, v.z));
                newObj = createPolygon(verts, d.color, false);
                if (newObj) { newObj.mesh.rotation.set(rotation.x, rotation.y, rotation.z); newObj.wire.rotation.set(rotation.x, rotation.y, rotation.z); }
            } else newObj = createShape(d.type, pos, d.color, rotation, false);
            if (newObj && d.materialKey) {
                newObj.materialKey = d.materialKey;
                if (window.applyMaterialToObject) window.applyMaterialToObject(newObj, d.materialKey);
            }
        });
        updateCount();
        recordLastSelection();
        showStatus(`已${index < historyStackIndex ? '還原上一步' : '退回下一步'}`);
    }

    function undo() { if (historyStackIndex > 0) loadFromHistory(historyStackIndex - 1); else showStatus("沒有上一步可還原"); }
    function redo() { if (historyStackIndex < historyStack.length - 1) loadFromHistory(historyStackIndex + 1); else showStatus("沒有下一步可退回"); }

    function createPolygon(worldVertices, color = selectedColor, saveHistoryFlag = true) {
        if (worldVertices.length < 3) return null;
        const flatVerts = worldVertices.map(v => new THREE.Vector3(v.x, 0, v.z));
        const center = new THREE.Vector3();
        flatVerts.forEach(v => center.add(v));
        center.divideScalar(flatVerts.length);
        const localVerts = flatVerts.map(v => v.clone().sub(center));
        const shape = new THREE.Shape();
        shape.moveTo(localVerts[0].x, localVerts[0].z);
        for (let i = 1; i < localVerts.length; i++) shape.lineTo(localVerts[i].x, localVerts[i].z);
        shape.closePath();
        const extrudeSettings = { steps: 1, depth: 0.2, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 3 };
        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        geometry.computeVertexNormals();
        geometry.rotateX(-Math.PI / 2);
        geometry.translate(0, 0.1, 0);
        const mesh = new THREE.Mesh(geometry, getSurfaceMaterial(color, displayMode));
        mesh.position.copy(center);
        mesh.position.y = 0.1;
        mesh.castShadow = shadowsEnabled;
        mesh.receiveShadow = shadowsEnabled;
        mesh.visible = displayMode !== 2;
        mesh.rotation.set(0, 0, 0);
        const edgesGeo = new THREE.EdgesGeometry(geometry);
        const wire = new THREE.LineSegments(edgesGeo, getWireframeMaterial());
        wire.position.copy(mesh.position);
        wire.rotation.set(0, 0, 0);
        wire.visible = wireframeVisible;
        scene.add(mesh);
        scene.add(wire);
        const obj = { type: 'polygon', mesh, wire, position: mesh.position.clone(), color, isSelected: false,
            vertices: flatVerts, rotation: new THREE.Euler(0, 0, 0), materialKey: null };
        objects.push(obj);
        updateCount();
        if (saveHistoryFlag) saveToHistory();
        return obj;
    }

    function clearDrawingTemp() { tempPointsVisual.forEach(p => scene.remove(p)); tempPointsVisual = []; }

    function finishDrawing() {
        if (!isDrawingMode) return;
        if ((drawingType === 'triangle' && drawingPoints.length === 3) || (drawingType === 'quad' && drawingPoints.length === 4)) {
            createPolygon(drawingPoints, selectedColor, true);
            showStatus(`已建立${drawingType === 'triangle' ? '三角形' : '四邊形'}`);
        } else showStatus(`繪製失敗，需要${drawingType === 'triangle' ? 3 : 4}個頂點`);
        isDrawingMode = false;
        drawingPoints = [];
        drawingType = null;
        clearDrawingTemp();
        const triBtn = document.getElementById('drawTriangleBtn');
        const quadBtn = document.getElementById('drawQuadBtn');
        if (triBtn) triBtn.textContent = '△ 畫三角形';
        if (quadBtn) quadBtn.textContent = '□ 畫四邊形';
    }

    function createShape(type, pos = null, color = selectedColor, rotation = { x: 0, y: 0, z: 0 }, saveHistory = true) {
        let geo;
        if (type === 'cube') geo = new THREE.BoxGeometry(baseSize, baseSize, baseSize);
        else if (type === 'sphere') geo = new THREE.SphereGeometry(baseSize * 0.5, 28, 20);
        else if (type === 'cone') geo = new THREE.ConeGeometry(baseSize * 0.5, baseSize * 1.4, 28, 1);
        else if (type === 'pyramid') { const r = baseSize / Math.sqrt(2); geo = new THREE.ConeGeometry(r, baseSize, 4); geo.rotateY(Math.PI / 4); }
        else if (type === 'cylinder') geo = new THREE.CylinderGeometry(baseSize * 0.5, baseSize * 0.5, baseSize, 28, 1);
        else if (type === 'halfCylinder') geo = new THREE.CylinderGeometry(baseSize * 0.5, baseSize * 0.5, baseSize, 28, 1, false, 0, Math.PI);
        else if (type === 'triPrism') {
            const side = baseSize * Math.sqrt(4 / 3);
            const shp = new THREE.Shape();
            shp.moveTo(-side / 2, 0);
            shp.lineTo(side / 2, 0);
            shp.lineTo(0, (side * Math.sqrt(3)) / 2);
            geo = new THREE.ExtrudeGeometry(shp, { depth: baseSize, bevelEnabled: false });
            geo.rotateX(-Math.PI / 2);
            geo.translate(0, baseSize / 2, 0);
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
            diag.rotation.copy(wire.rotation);
            diag.visible = wireframeVisible;
            scene.add(diag);
        }
        scene.add(mesh);
        scene.add(wire);
        const obj = { type, mesh, wire, diagWire: diag, position: pos.clone(), color, isSelected: false,
            rotation: new THREE.Euler(rotation.x, rotation.y, rotation.z), materialKey: null };
        objects.push(obj);
        updateCount();
        if (saveHistory) saveToHistory();
        return obj;
    }

    function getNextPosition() {
        if (objects.length === 0) return new THREE.Vector3(0, baseSize / 2, 0);
        for (let i = 0; i < 30; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = (Math.floor(Math.random() * 5) + 1) * moveStep;
            const x = Math.round(Math.cos(angle) * dist / moveStep) * moveStep;
            const z = Math.round(Math.sin(angle) * dist / moveStep) * moveStep;
            const p = new THREE.Vector3(x, baseSize / 2, z);
            if (!objects.some(o => o.position.distanceTo(p) < baseSize * 0.75)) return p;
        }
        return new THREE.Vector3((Math.random() - 0.5) * 40, baseSize / 2, (Math.random() - 0.5) * 40);
    }

    function createPlayerModel(pos = null, color = 0xff0000, rotation = { x: 0, y: 0, z: 0 }, saveHistory = true) {
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
        group.traverse(child => { if (child.isMesh) { child.castShadow = shadowsEnabled; child.receiveShadow = shadowsEnabled; } });
        scene.add(group);
        const player = { type: 'player', group, position: pos.clone(), rotation: new THREE.Euler(rotation.x, rotation.y, rotation.z), color, isSelected: false, materialKey: null };
        objects.push(player);
        updateCount();
        if (saveHistory) saveToHistory();
        return player;
    }

    function addPlayerModel() {
        if (playerModel) { showStatus("只能有一個玩家角色"); return; }
        playerModel = createPlayerModel(new THREE.Vector3(0, 0.75, 0));
        showStatus("已新增玩家角色，按 Enter 進入操控模式");
    }

    function togglePlayerMode() {
        if (!playerModel) { showStatus("請先新增玩家角色"); return; }
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
            if (obj.type === 'player') objBox = new THREE.Box3().setFromObject(obj.group);
            else if (obj.type === 'objgroup') objBox = new THREE.Box3().setFromObject(obj.group);
            else objBox = new THREE.Box3().setFromObject(obj.mesh);
            if (playerBox.intersectsBox(objBox)) return true;
        }
        return false;
    }

    function refreshObjectMaterial(obj) {
        if (!obj) return;
        const isSel = obj.isSelected === true;
        let texture = null;
        if (!isSel && obj.materialKey && window.materialTextures && window.materialTextures[obj.materialKey]) {
            texture = window.materialTextures[obj.materialKey];
        }
        const material = getSurfaceMaterial(obj.color, displayMode, isSel, texture);
        if (obj.type === 'player') {
            obj.group.traverse(child => { if (child.isMesh) child.material = material; });
        } else if (obj.type === 'objgroup') {
            obj.group.traverse(child => { if (child.isMesh) child.material = material; });
        } else {
            obj.mesh.material = material;
        }
    }

    function selectObject(obj, multi = false) {
        if (!multi) {
            clearAllSelection();
            obj.isSelected = true;
            refreshObjectMaterial(obj);
            selected = obj;
            selectedObjects = [obj];
            if (obj.mesh) {
                freeRotateY = obj.mesh.rotation.y * 180 / Math.PI;
                freeRotateX = obj.mesh.rotation.x * 180 / Math.PI;
            } else if (obj.type === 'player') {
                freeRotateY = obj.group.rotation.y * 180 / Math.PI;
                freeRotateX = obj.group.rotation.x * 180 / Math.PI;
            } else if (obj.type === 'objgroup') {
                freeRotateY = obj.group.rotation.y * 180 / Math.PI;
                freeRotateX = obj.group.rotation.x * 180 / Math.PI;
            }
            updateRotationSliders();
            clearGroupRotationState();
        } else {
            const idx = selectedObjects.indexOf(obj);
            if (idx === -1) {
                obj.isSelected = true;
                refreshObjectMaterial(obj);
                selectedObjects.push(obj);
                selected = obj;
            } else {
                obj.isSelected = false;
                refreshObjectMaterial(obj);
                selectedObjects.splice(idx, 1);
                if (selected === obj) selected = selectedObjects.length > 0 ? selectedObjects[selectedObjects.length - 1] : null;
            }
            if (selectedObjects.length > 1) {
                clearGroupRotationState();
                updateRotationSlidersToZero();
            } else if (selectedObjects.length === 1) {
                const sObj = selectedObjects[0];
                if (sObj.mesh) {
                    freeRotateY = sObj.mesh.rotation.y * 180 / Math.PI;
                    freeRotateX = sObj.mesh.rotation.x * 180 / Math.PI;
                } else if (sObj.type === 'player' || sObj.type === 'objgroup') {
                    freeRotateY = sObj.group.rotation.y * 180 / Math.PI;
                    freeRotateX = sObj.group.rotation.x * 180 / Math.PI;
                }
                updateRotationSliders();
                clearGroupRotationState();
            }
        }
        recordLastSelection();
    }

    function updateRotationSliders() {
        const ySlider = document.getElementById('rotateYSlider');
        const xSlider = document.getElementById('rotateXSlider');
        const yVal = document.getElementById('rotateYValue');
        const xVal = document.getElementById('rotateXValue');
        if (ySlider) { ySlider.value = Math.round(freeRotateY); yVal.textContent = Math.round(freeRotateY) + '°'; }
        if (xSlider) { xSlider.value = Math.round(freeRotateX); xVal.textContent = Math.round(freeRotateX) + '°'; }
    }

    function updateRotationSlidersToZero() {
        const ySlider = document.getElementById('rotateYSlider');
        const xSlider = document.getElementById('rotateXSlider');
        const yVal = document.getElementById('rotateYValue');
        const xVal = document.getElementById('rotateXValue');
        if (ySlider) { ySlider.value = 0; yVal.textContent = '0°'; }
        if (xSlider) { xSlider.value = 0; xVal.textContent = '0°'; }
    }

    function clearAllSelection() {
        selectedObjects.forEach(o => {
            o.isSelected = false;
            refreshObjectMaterial(o);
        });
        selectedObjects = [];
        selected = null;
        clearGroupRotationState();
    }

    function deselectAll() { clearAllSelection(); recordLastSelection(); }

    function selectAll() {
        if (objects.length === 0) { showStatus("場景中沒有物件"); return; }
        suppressLastSelectionUpdate = true;
        clearAllSelection();
        objects.forEach(obj => selectObject(obj, true));
        suppressLastSelectionUpdate = false;
        lastSelectedObjects = selectedObjects.slice();
        showStatus(`已選取全部 ${selectedObjects.length} 個物件`);
    }

    function selectLayer() {
        if (!selected) { showStatus("請先選取至少一個物件"); return; }
        const targetY = selected.position.y;
        clearAllSelection();
        objects.forEach(o => { if (Math.abs(o.position.y - targetY) < 0.1 && o.type !== 'floor') selectObject(o, true); });
        recordLastSelection();
        showStatus("已選擇全層");
    }

    function selectAbove() {
        if (selectedObjects.length === 0) { showStatus("請先選取至少一個物件"); return; }
        const toAdd = [];
        selectedObjects.forEach(baseObj => {
            const baseX = baseObj.position.x, baseY = baseObj.position.y, baseZ = baseObj.position.z;
            objects.forEach(o => {
                if (Math.abs(o.position.x - baseX) < 0.1 && Math.abs(o.position.z - baseZ) < 0.1 && o.position.y >= baseY - 0.1 && o.type !== 'floor') {
                    if (!selectedObjects.includes(o)) toAdd.push(o);
                }
            });
        });
        toAdd.forEach(o => selectObject(o, true));
        recordLastSelection();
        showStatus("已選擇選中物件及往上的所有物件");
    }

    function removeSelected() {
        if (selectedObjects.length === 0) return;
        for (let i = selectedObjects.length - 1; i >= 0; i--) {
            const obj = selectedObjects[i];
            if (obj.type === 'player') scene.remove(obj.group);
            else if (obj.type === 'objgroup') { scene.remove(obj.group); if (obj.boundingWire) scene.remove(obj.boundingWire); }
            else if (obj.type === 'polygon') { scene.remove(obj.mesh); scene.remove(obj.wire); }
            else { scene.remove(obj.mesh); scene.remove(obj.wire); if (obj.diagWire) scene.remove(obj.diagWire); }
            const idx = objects.indexOf(obj); if (idx !== -1) objects.splice(idx, 1);
            if (obj === playerModel) playerModel = null;
        }
        selected = null;
        selectedObjects = [];
        updateCount();
        saveToHistory();
        recordLastSelection();
        showStatus("已刪除選中物件");
    }

    function removeLast() {
        if (!objects.length) return;
        const last = objects.pop();
        if (last.type === 'player') scene.remove(last.group);
        else if (last.type === 'objgroup') { scene.remove(last.group); if (last.boundingWire) scene.remove(last.boundingWire); }
        else if (last.type === 'polygon') { scene.remove(last.mesh); scene.remove(last.wire); }
        else { scene.remove(last.mesh); scene.remove(last.wire); if (last.diagWire) scene.remove(last.diagWire); }
        const idx = selectedObjects.indexOf(last); if (idx !== -1) selectedObjects.splice(idx, 1);
        if (selected === last) selected = (selectedObjects.length > 0) ? selectedObjects[selectedObjects.length - 1] : null;
        if (last === playerModel) playerModel = null;
        updateCount();
        saveToHistory();
        recordLastSelection();
    }

    // 複製功能（包含向下複製）
    function duplicate(dir) {
        if (selectedObjects.length === 0) { showStatus("請先選取至少一個物件"); return; }
        const newObjects = [];
        let dx = 0, dy = 0, dz = 0;
        switch (dir) {
            case 'right': dx = baseSize; break;
            case 'left': dx = -baseSize; break;
            case 'backward': dz = baseSize; break;
            case 'forward': dz = -baseSize; break;
            case 'upward': dy = baseSize; break;
            case 'downward': dy = -baseSize; break;
            default: return;
        }
        selectedObjects.forEach(obj => {
            const newPos = obj.position.clone();
            newPos.x += dx; newPos.y += dy; newPos.z += dz;
            if (dy < 0 && newPos.y < (obj.type === 'polygon' ? 0.1 : baseSize / 2)) {
                showStatus("無法向下複製（已達地面限制）");
                return;
            }
            const blocking = objects.find(o => o.position.equals(newPos));
            if (blocking) {
                if (blocking.type === 'player') scene.remove(blocking.group);
                else if (blocking.type === 'objgroup') { scene.remove(blocking.group); if (blocking.boundingWire) scene.remove(blocking.boundingWire); }
                else if (blocking.type === 'polygon') { scene.remove(blocking.mesh); scene.remove(blocking.wire); }
                else { scene.remove(blocking.mesh); scene.remove(blocking.wire); if (blocking.diagWire) scene.remove(blocking.diagWire); }
                const idx = objects.indexOf(blocking); if (idx !== -1) objects.splice(idx, 1);
                const selIdx = selectedObjects.indexOf(blocking); if (selIdx !== -1) selectedObjects.splice(selIdx, 1);
            }
            let rotX = 0, rotY = 0, rotZ = 0;
            if (obj.type === 'player') {
                rotX = obj.group.rotation.x;
                rotY = obj.group.rotation.y;
                rotZ = obj.group.rotation.z;
            } else if (obj.type === 'objgroup') {
                rotX = obj.group.rotation.x;
                rotY = obj.group.rotation.y;
                rotZ = obj.group.rotation.z;
            } else {
                rotX = obj.mesh.rotation.x;
                rotY = obj.mesh.rotation.y;
                rotZ = obj.mesh.rotation.z;
            }
            const rotation = { x: rotX, y: rotY, z: rotZ };
            let newObj;
            if (obj.type === 'player') {
                newObj = createPlayerModel(newPos, obj.color, rotation, false);
            } else if (obj.type === 'objgroup') {
                const clonedGroup = obj.group.clone();
                clonedGroup.position.copy(newPos);
                clonedGroup.rotation.set(rotX, rotY, rotZ);
                scene.add(clonedGroup);
                const boundingWire = createBoundingWire(clonedGroup);
                if (boundingWire) scene.add(boundingWire);
                newObj = { type: 'objgroup', group: clonedGroup, boundingWire: boundingWire, position: newPos.clone(), color: obj.color, isSelected: false, rotation: new THREE.Euler(rotX, rotY, rotZ), materialKey: obj.materialKey };
            } else if (obj.type === 'polygon' && obj.vertices) {
                const offsetVec = new THREE.Vector3(dx, dy, dz);
                const newVerts = obj.vertices.map(v => v.clone().add(offsetVec));
                newObj = createPolygon(newVerts, obj.color, false);
                if (newObj) {
                    newObj.mesh.rotation.set(rotX, rotY, rotZ);
                    newObj.wire.rotation.set(rotX, rotY, rotZ);
                    newObj.materialKey = obj.materialKey;
                    applyMaterialToObject(newObj, obj.materialKey);
                }
            } else {
                newObj = createShape(obj.type, newPos, obj.color, rotation, false);
                if (newObj) newObj.materialKey = obj.materialKey;
                if (newObj && obj.materialKey) applyMaterialToObject(newObj, obj.materialKey);
            }
            if (newObj) newObjects.push(newObj);
        });
        clearAllSelection();
        newObjects.forEach(o => selectObject(o, true));
        recordLastSelection();
        saveToHistory();
    }

    function duplicateLayer() {
        if (objects.length === 0) { showStatus("場景中沒有物件"); return; }
        let maxY = -Infinity;
        objects.forEach(obj => { if (obj.position.y > maxY && obj.type !== 'floor') maxY = obj.position.y; });
        const currentLayerObjects = objects.filter(obj => Math.abs(obj.position.y - maxY) < 0.1 && obj.type !== 'floor');
        if (currentLayerObjects.length === 0) { showStatus("沒有找到任何物件在當前層"); return; }
        const newObjects = [];
        const offsetY = baseSize;
        currentLayerObjects.forEach(obj => {
            const newPos = obj.position.clone();
            newPos.y += offsetY;
            const blocking = objects.find(o => o.position.equals(newPos));
            if (blocking) {
                if (blocking.type === 'player') scene.remove(blocking.group);
                else if (blocking.type === 'objgroup') { scene.remove(blocking.group); if (blocking.boundingWire) scene.remove(blocking.boundingWire); }
                else if (blocking.type === 'polygon') { scene.remove(blocking.mesh); scene.remove(blocking.wire); }
                else { scene.remove(blocking.mesh); scene.remove(blocking.wire); if (blocking.diagWire) scene.remove(blocking.diagWire); }
                const idx = objects.indexOf(blocking); if (idx !== -1) objects.splice(idx, 1);
                const selIdx = selectedObjects.indexOf(blocking); if (selIdx !== -1) selectedObjects.splice(selIdx, 1);
            }
            let rotX = 0, rotY = 0, rotZ = 0;
            if (obj.type === 'player') {
                rotX = obj.group.rotation.x;
                rotY = obj.group.rotation.y;
                rotZ = obj.group.rotation.z;
            } else if (obj.type === 'objgroup') {
                rotX = obj.group.rotation.x;
                rotY = obj.group.rotation.y;
                rotZ = obj.group.rotation.z;
            } else {
                rotX = obj.mesh.rotation.x;
                rotY = obj.mesh.rotation.y;
                rotZ = obj.mesh.rotation.z;
            }
            const rotation = { x: rotX, y: rotY, z: rotZ };
            let newObj;
            if (obj.type === 'player') {
                newObj = createPlayerModel(newPos, obj.color, rotation, false);
            } else if (obj.type === 'objgroup') {
                const clonedGroup = obj.group.clone();
                clonedGroup.position.copy(newPos);
                clonedGroup.rotation.set(rotX, rotY, rotZ);
                scene.add(clonedGroup);
                const boundingWire = createBoundingWire(clonedGroup);
                if (boundingWire) scene.add(boundingWire);
                newObj = { type: 'objgroup', group: clonedGroup, boundingWire: boundingWire, position: newPos.clone(), color: obj.color, isSelected: false, rotation: new THREE.Euler(rotX, rotY, rotZ), materialKey: obj.materialKey };
            } else if (obj.type === 'polygon' && obj.vertices) {
                const offsetVec = new THREE.Vector3(0, offsetY, 0);
                const newVerts = obj.vertices.map(v => v.clone().add(offsetVec));
                newObj = createPolygon(newVerts, obj.color, false);
                if (newObj) {
                    newObj.mesh.rotation.set(rotX, rotY, rotZ);
                    newObj.wire.rotation.set(rotX, rotY, rotZ);
                    newObj.materialKey = obj.materialKey;
                    applyMaterialToObject(newObj, obj.materialKey);
                }
            } else {
                newObj = createShape(obj.type, newPos, obj.color, rotation, false);
                if (newObj) newObj.materialKey = obj.materialKey;
                if (newObj && obj.materialKey) applyMaterialToObject(newObj, obj.materialKey);
            }
            if (newObj) newObjects.push(newObj);
        });
        clearAllSelection();
        newObjects.forEach(o => selectObject(o, true));
        recordLastSelection();
        saveToHistory();
    }

    function move(dir) {
        if (selectedObjects.length === 0) return;
        let dx = 0, dz = 0, dy = 0;
        switch (dir.toLowerCase()) {
            case 'w': dz = -moveStep; break;
            case 's': dz = moveStep; break;
            case 'a': dx = -moveStep; break;
            case 'd': dx = moveStep; break;
            case 'r': dy = moveStep; break;
            case 'f': dy = -moveStep; break;
            default: return;
        }
        let canMove = true;
        for (let obj of selectedObjects) {
            const newPos = obj.position.clone().add(new THREE.Vector3(dx, dy, dz));
            if (dy !== 0 && newPos.y < (obj.type === 'polygon' ? 0.1 : baseSize / 2)) { canMove = false; break; }
            for (let other of objects) {
                if (selectedObjects.includes(other)) continue;
                if (Math.abs(newPos.x - other.position.x) < baseSize * 0.7 &&
                    Math.abs(newPos.z - other.position.z) < baseSize * 0.7 &&
                    Math.abs(newPos.y - other.position.y) < baseSize * 0.7) { canMove = false; break; }
            }
            if (!canMove) break;
        }
        if (!canMove) return;
        for (let obj of selectedObjects) {
            obj.position.x += dx; obj.position.y += dy; obj.position.z += dz;
            if (obj.type === 'player') obj.group.position.copy(obj.position);
            else if (obj.type === 'objgroup') {
                obj.group.position.copy(obj.position);
                if (obj.boundingWire) obj.boundingWire.position.copy(obj.position);
            } else if (obj.type === 'polygon') {
                obj.mesh.position.copy(obj.position);
                obj.wire.position.copy(obj.position);
                if (obj.vertices) obj.vertices = obj.vertices.map(v => v.clone().add(new THREE.Vector3(dx, dy, dz)));
            } else {
                obj.mesh.position.copy(obj.position);
                obj.wire.position.copy(obj.position);
                if (obj.diagWire) obj.diagWire.position.copy(obj.position);
            }
        }
        saveToHistory();
    }

    function applyFreeRotationY(degrees) {
        if (!selectedObjects.length) return;
        if (selectedObjects.length === 1 && selected) {
            const rad = degrees * Math.PI / 180;
            if (selected.type === 'player') { selected.rotation.y = rad; selected.group.rotation.y = rad; }
            else if (selected.type === 'objgroup') { selected.rotation.y = rad; selected.group.rotation.y = rad; if (selected.boundingWire) selected.boundingWire.rotation.y = rad; }
            else { selected.mesh.rotation.y = rad; selected.wire.rotation.y = rad; if (selected.diagWire) selected.diagWire.rotation.y = rad; }
            freeRotateY = degrees;
            return;
        }
        if (!groupRotationState) initGroupRotationState();
        if (groupRotationState) applyGroupRotation(degrees, groupRotationState.currentX);
    }

    function applyFreeRotationX(degrees) {
        if (!selectedObjects.length) return;
        if (selectedObjects.length === 1 && selected) {
            const rad = degrees * Math.PI / 180;
            if (selected.type === 'player') { selected.rotation.x = rad; selected.group.rotation.x = rad; }
            else if (selected.type === 'objgroup') { selected.rotation.x = rad; selected.group.rotation.x = rad; if (selected.boundingWire) selected.boundingWire.rotation.x = rad; }
            else { selected.mesh.rotation.x = rad; selected.wire.rotation.x = rad; if (selected.diagWire) selected.diagWire.rotation.x = rad; }
            freeRotateX = degrees;
            return;
        }
        if (!groupRotationState) initGroupRotationState();
        if (groupRotationState) applyGroupRotation(groupRotationState.currentY, degrees);
    }

    function finalizeRotation() {
        if (rotateTimeout) clearTimeout(rotateTimeout);
        rotateTimeout = setTimeout(() => { if (selectedObjects.length) saveToHistory(); }, 300);
    }

    function flipGroupHorizontal() {
        if (selectedObjects.length === 0) { showStatus("請先選取物件"); return; }
        for (let obj of selectedObjects) {
            if (obj.type === 'player') { showStatus("玩家角色不支援翻轉"); return; }
            if (obj.type === 'polygon') { showStatus("多邊形不支援翻轉 (可使用旋轉)"); return; }
        }
        if (!groupRotationState) initGroupRotationState();
        if (!groupRotationState) return;
        const newY = groupRotationState.currentY + 90;
        applyGroupRotation(newY, groupRotationState.currentX);
        updateRotationSlidersForGroup();
        saveToHistory();
        showStatus("整體水平翻轉 90°");
    }

    function flipGroupVertical() {
        if (selectedObjects.length === 0) { showStatus("請先選取物件"); return; }
        for (let obj of selectedObjects) {
            if (obj.type === 'player' || obj.type === 'polygon') { showStatus("此物件類型不支援垂直翻轉"); return; }
        }
        if (!groupRotationState) initGroupRotationState();
        if (!groupRotationState) return;
        const newX = groupRotationState.currentX + 90;
        applyGroupRotation(groupRotationState.currentY, newX);
        updateRotationSlidersForGroup();
        saveToHistory();
        showStatus("整體垂直翻轉 90°");
    }

    function updateRotationSlidersForGroup() {
        const ySlider = document.getElementById('rotateYSlider');
        const xSlider = document.getElementById('rotateXSlider');
        const yVal = document.getElementById('rotateYValue');
        const xVal = document.getElementById('rotateXValue');
        if (ySlider) { ySlider.value = Math.round(multiGroupRotY); yVal.textContent = Math.round(multiGroupRotY) + '°'; }
        if (xSlider) { xSlider.value = Math.round(multiGroupRotX); xVal.textContent = Math.round(multiGroupRotX) + '°'; }
    }

    function flipVerticalOld() { if (selectedObjects.length) flipGroupVertical(); else showStatus("請先選取物件"); }
    function flipHorizontalOld() { if (selectedObjects.length) flipGroupHorizontal(); else showStatus("請先選取物件"); }

    function addFloor() { createShape('floor'); }

    function generateWalls() {
        const floorPositions = new Set();
        objects.filter(o => o.type === 'floor').forEach(o => {
            const key = `${Math.round(o.position.x / baseSize)},${Math.round(o.position.z / baseSize)}`;
            floorPositions.add(key);
        });
        const directions = [
            new THREE.Vector3(baseSize, 0, 0), new THREE.Vector3(-baseSize, 0, 0),
            new THREE.Vector3(0, 0, baseSize), new THREE.Vector3(0, 0, -baseSize),
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
                        const newWall = createShape('cube', wallPos, 0x888888, { x: 0, y: 0, z: 0 }, false);
                        newWalls.push(newWall);
                    }
                }
            });
        });
        saveToHistory();
        showStatus(`已生成 ${newWalls.length} 個牆壁`);
    }

    function updateDisplayMode() {
        displayMode = (displayMode + 1) % 3;
        const texts = ['不透明表面 + 線框', '半透明表面 + 線框', '純線框'];
        const btn = document.getElementById('toggleDisplayMode');
        if (btn) btn.textContent = '✨ ' + texts[displayMode];
        objects.forEach(o => {
            refreshObjectMaterial(o);
            if (o.type !== 'player' && o.type !== 'objgroup') {
                o.mesh.visible = displayMode !== 2;
                o.wire.visible = wireframeVisible;
                if (o.diagWire) o.diagWire.visible = wireframeVisible;
            } else if (o.type === 'objgroup' && o.boundingWire) {
                o.boundingWire.visible = wireframeVisible;
            }
        });
    }

    function toggleGrid() { gridVisible = !gridVisible; grid.visible = gridVisible; directionArrows.forEach(a => a.visible = gridVisible); const btn = document.getElementById('toggleGrid'); if (btn) btn.textContent = gridVisible ? '📏 隱藏格線' : '📏 顯示格線'; }
    function toggleDiagonals() {
        diagonalsVisible = !diagonalsVisible;
        objects.forEach(o => {
            if (o.type !== 'cube') return;
            if (o.diagWire) scene.remove(o.diagWire);
            o.diagWire = null;
            if (diagonalsVisible) {
                const geo = new THREE.BoxGeometry(baseSize, baseSize, baseSize);
                o.diagWire = new THREE.LineSegments(new THREE.WireframeGeometry(geo), getWireframeMaterial());
                o.diagWire.material.color.set(0x555555);
                o.diagWire.position.copy(o.position);
                o.diagWire.rotation.copy(o.wire.rotation);
                o.diagWire.visible = wireframeVisible;
                scene.add(o.diagWire);
            }
        });
        const btn = document.getElementById('toggleDiagonals');
        if (btn) btn.textContent = diagonalsVisible ? '📐 隱藏對角線' : '📐 顯示對角線';
    }
    function toggleShadows() {
        shadowsEnabled = !shadowsEnabled;
        directionalLight.castShadow = shadowsEnabled;
        objects.forEach(o => {
            if (o.type === 'player') o.group.traverse(child => { if (child.isMesh) { child.castShadow = shadowsEnabled; child.receiveShadow = shadowsEnabled; } });
            else if (o.type === 'objgroup') o.group.traverse(child => { if (child.isMesh) { child.castShadow = shadowsEnabled; child.receiveShadow = shadowsEnabled; } });
            else { o.mesh.castShadow = shadowsEnabled; o.mesh.receiveShadow = shadowsEnabled; }
        });
        const btn = document.getElementById('toggleShadows');
        if (btn) btn.textContent = shadowsEnabled ? '🌓 隱藏陰影' : '🌓 顯示陰影';
    }
    function toggleWireframe() {
        wireframeVisible = !wireframeVisible;
        const btn = document.getElementById('toggleWireframe');
        if (btn) btn.textContent = wireframeVisible ? '🔲 隱藏線框' : '🔲 顯示線框';
        objects.forEach(o => { 
            if (o.type !== 'player' && o.type !== 'objgroup') { 
                o.wire.visible = wireframeVisible; 
                if (o.diagWire) o.diagWire.visible = wireframeVisible; 
            } else if (o.type === 'objgroup' && o.boundingWire) {
                o.boundingWire.visible = wireframeVisible;
            }
        });
    }
    function toggleUI() { 
        uiVisible = !uiVisible; 
        const sidebar = document.getElementById('sidebar'); 
        if (uiVisible) sidebar.classList.remove('hidden-sidebar');
        else sidebar.classList.add('hidden-sidebar');
    }
    function showStatus(msg) { const el = document.getElementById('statusMessage'); el.textContent = msg; el.classList.add('active'); setTimeout(() => el.classList.remove('active'), 2600); }
    function updateCount() { document.getElementById('count').textContent = objects.length; }

    function toggleMoveButtons() {
        moveButtonsVisible = !moveButtonsVisible;
        const movePanel = document.getElementById('moveButtonsPanel');
        const toggleBtn = document.getElementById('toggleMoveButtonsBtn');
        if (movePanel) {
            if (moveButtonsVisible) movePanel.classList.remove('hidden');
            else movePanel.classList.add('hidden');
        }
        if (toggleBtn) toggleBtn.textContent = moveButtonsVisible ? '🔘 隱藏移動按鈕' : '🔘 顯示移動按鈕';
    }

    function setFrontView() {
        camera.position.set(0, 5, 20);
        orbitControls.target.set(0, 0, 0);
        orbitControls.update();
        showStatus("正視圖 (前視)");
    }
    function setLeftView() {
        camera.position.set(-20, 5, 0);
        orbitControls.target.set(0, 0, 0);
        orbitControls.update();
        showStatus("左視圖");
    }
    function setTopView() {
        camera.position.set(0, 20, 0.001);
        orbitControls.target.set(0, 0, 0);
        orbitControls.update();
        showStatus("俯視圖 (上視)");
    }

    function saveJSON() {
        const data = objects.map(o => {
            const base = { type: o.type, position: { x: o.position.x, y: o.position.y, z: o.position.z }, rotation: { x: o.rotation ? o.rotation.x : (o.mesh ? o.mesh.rotation.x : 0), y: o.rotation ? o.rotation.y : (o.mesh ? o.mesh.rotation.y : 0), z: o.rotation ? o.rotation.z : (o.mesh ? o.mesh.rotation.z : 0) }, color: o.color, materialKey: o.materialKey || null };
            if (o.type === 'polygon' && o.vertices) base.vertices = o.vertices.map(v => ({ x: v.x, y: v.y, z: v.z }));
            if (o.type === 'objgroup') base.type = 'objgroup_warning';
            return base;
        });
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const link = document.createElement('a');
        link.download = `scene_${Date.now()}.json`;
        link.href = URL.createObjectURL(blob);
        link.click();
        showStatus('已儲存 JSON');
    }

    function mergeFromJSON(data) {
        const newObjects = [];
        data.forEach(d => {
            if (d.type === 'objgroup_warning') return;
            const pos = new THREE.Vector3(d.position.x, d.position.y, d.position.z);
            const rotation = { x: d.rotation.x, y: d.rotation.y, z: d.rotation.z };
            let newObj = null;
            if (d.type === 'player') {
                newObj = createPlayerModel(pos, d.color, rotation, false);
            } else if (d.type === 'polygon' && d.vertices) {
                const verts = d.vertices.map(v => new THREE.Vector3(v.x, v.y, v.z));
                newObj = createPolygon(verts, d.color, false);
                if (newObj) {
                    newObj.mesh.rotation.set(rotation.x, rotation.y, rotation.z);
                    newObj.wire.rotation.set(rotation.x, rotation.y, rotation.z);
                }
            } else {
                newObj = createShape(d.type, pos, d.color, rotation, false);
            }
            if (newObj) {
                if (d.materialKey) {
                    newObj.materialKey = d.materialKey;
                    applyMaterialToObject(newObj, d.materialKey);
                }
                newObjects.push(newObj);
            }
        });
        if (newObjects.length > 0) {
            clearAllSelection();
            newObjects.forEach(obj => selectObject(obj, true));
            saveToHistory();
            showStatus(`已合併載入 ${newObjects.length} 個新物件`);
        } else {
            showStatus("檔案中沒有可合併的物件");
        }
    }

    function loadJSON() { document.getElementById('fileInput').click(); }

    function exportOBJFor3DPrint() {
        let scaleFactor = 1.0;
        const input = prompt("請輸入匯出縮放倍率 (1 = 1單位 = 1公分)\n例如：\n- 1.0 → 原尺寸 (邊長2的方塊輸出2cm)\n- 0.5 → 縮小一半 (邊長2的方塊輸出1cm)\n- 2.0 → 放大一倍 (邊長2的方塊輸出4cm)", "1.0");
        if (input === null) return;
        scaleFactor = parseFloat(input);
        if (isNaN(scaleFactor) || scaleFactor <= 0) {
            showStatus("無效的倍率，使用預設 1.0");
            scaleFactor = 1.0;
        }
        scene.updateMatrixWorld(true);
        let objContent = "";
        let vertexOffset = 1;
        let objectIndex = 0;

        function processMesh(mesh, objectName) {
            if (!mesh.isMesh) return;
            const geometry = mesh.geometry;
            if (!geometry) return;
            const positionAttr = geometry.attributes.position;
            if (!positionAttr) return;
            const indices = geometry.index;
            const worldMatrix = mesh.matrixWorld;

            const verticesWorld = [];
            for (let i = 0; i < positionAttr.count; i++) {
                const localVertex = new THREE.Vector3().fromBufferAttribute(positionAttr, i);
                const worldVertex = localVertex.clone().applyMatrix4(worldMatrix);
                worldVertex.multiplyScalar(scaleFactor);
                verticesWorld.push(worldVertex);
            }

            if (verticesWorld.length === 0) return;
            objContent += `o ${objectName}_${objectIndex++}\n`;
            for (let v of verticesWorld) {
                objContent += `v ${v.x} ${v.y} ${v.z}\n`;
            }

            if (indices) {
                for (let i = 0; i < indices.count; i += 3) {
                    const i1 = indices.getX(i) + vertexOffset;
                    const i2 = indices.getX(i+1) + vertexOffset;
                    const i3 = indices.getX(i+2) + vertexOffset;
                    objContent += `f ${i1} ${i2} ${i3}\n`;
                }
            } else {
                for (let i = 0; i < verticesWorld.length; i += 3) {
                    if (i+2 < verticesWorld.length) {
                        objContent += `f ${vertexOffset+i} ${vertexOffset+i+1} ${vertexOffset+i+2}\n`;
                    }
                }
            }
            vertexOffset += verticesWorld.length;
        }

        for (let obj of objects) {
            if (obj.type === 'player') {
                obj.group.children.forEach(child => {
                    if (child.isMesh) processMesh(child, 'player');
                });
            } else if (obj.type === 'objgroup') {
                obj.group.children.forEach(child => {
                    if (child.isMesh) processMesh(child, 'imported');
                });
            } else if (obj.mesh && obj.mesh.isMesh) {
                processMesh(obj.mesh, obj.type);
            }
        }

        if (objContent === "") {
            showStatus("場景中沒有可匯出的幾何物件");
            return;
        }

        const blob = new Blob([objContent], {type: 'text/plain'});
        const link = document.createElement('a');
        link.download = `3dprint_${Date.now()}.obj`;
        link.href = URL.createObjectURL(blob);
        link.click();
        showStatus(`已匯出 OBJ (縮放倍率: ${scaleFactor})`);
    }

    function importOBJFile(file) {
        const loader = new THREE.OBJLoader();
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const objContent = e.target.result;
                const group = loader.parse(objContent);
                const box = new THREE.Box3().setFromObject(group);
                const minY = box.min.y;
                const offsetY = -minY;
                const centerX = (box.min.x + box.max.x) / 2;
                const centerZ = (box.min.z + box.max.z) / 2;
                group.position.set(-centerX, offsetY, -centerZ);
                group.updateMatrixWorld(true);
                group.traverse(child => {
                    if (child.isMesh) {
                        child.material = getSurfaceMaterial(selectedColor, displayMode);
                        child.castShadow = shadowsEnabled;
                        child.receiveShadow = shadowsEnabled;
                        child.visible = displayMode !== 2;
                    }
                });
                scene.add(group);
                const boundingWire = createBoundingWire(group);
                if (boundingWire) scene.add(boundingWire);
                const objWrapper = {
                    type: 'objgroup',
                    group: group,
                    boundingWire: boundingWire,
                    position: group.position.clone(),
                    color: selectedColor,
                    isSelected: false,
                    rotation: group.rotation.clone(),
                    materialKey: null
                };
                objects.push(objWrapper);
                updateCount();
                clearAllSelection();
                selectObject(objWrapper, false);
                saveToHistory();
                showStatus(`已合併匯入 OBJ，共 ${group.children.filter(c => c.isMesh).length} 個網格，已自動選取`);
            } catch(err) {
                console.error(err);
                showStatus("OBJ 解析失敗：" + err.message);
            }
        };
        reader.onerror = () => { showStatus("讀取 OBJ 檔案失敗"); };
        reader.readAsText(file);
    }

    function openOBJFileDialog() {
        document.getElementById('objFileInput').click();
    }

    function createBoundingWire(group) {
        const box = new THREE.Box3().setFromObject(group);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
        const wire = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), new THREE.LineBasicMaterial({ color: 0x000000 }));
        wire.position.copy(center);
        wire.scale.set(1,1,1);
        wire.visible = wireframeVisible;
        return wire;
    }

    function updateSelectedColor(hex) {
        const color = parseInt(hex.replace('#', '0x'), 16);
        selectedColor = color;
        const colorInput = document.getElementById('colorInput');
        if (colorInput) colorInput.value = hex;
        colorHistory.unshift(hex); if (colorHistory.length > 4) colorHistory.pop();
        updateColorHistoryUI();
        selectedObjects.forEach(o => {
            o.color = color;
            if (o.materialKey) {
                o.materialKey = null;
                refreshObjectMaterial(o);
            } else {
                refreshObjectMaterial(o);
            }
        });
        if (selectedObjects.length > 0) saveToHistory();
    }

    function updateColorHistoryUI() {
        for (let i = 0; i < 4; i++) {
            const el = document.getElementById(`history${i}`);
            if (el && colorHistory[i]) { el.style.background = colorHistory[i]; el.dataset.color = colorHistory[i]; }
            else if (el) { el.style.background = '#ffffff'; el.dataset.color = '#ffffff'; }
        }
    }

    function startDragObject(obj, mouseWorldPos) {
        if (!obj || isDragging) return;
        isDragging = true;
        dragTargetObj = obj;
        dragStartObjPos.copy(obj.position);
        dragStartMouseWorld.copy(mouseWorldPos);
        if (dragProxy) scene.remove(dragProxy);
        if (obj.type === 'polygon') {
            const cloneGeo = obj.mesh.geometry.clone();
            dragProxy = new THREE.Mesh(cloneGeo, new THREE.MeshPhongMaterial({ color: 0x888888, transparent: true, opacity: 0.4, depthTest: true }));
            dragProxy.position.copy(obj.position);
            dragProxy.position.y = 0.02;
            dragProxy.scale.copy(obj.mesh.scale);
            dragProxy.rotation.copy(obj.mesh.rotation);
            scene.add(dragProxy);
        } else if (obj.type === 'player') {
            const circleGeo = new THREE.CylinderGeometry(0.7, 0.7, 0.05, 16);
            dragProxy = new THREE.Mesh(circleGeo, new THREE.MeshPhongMaterial({ color: 0x888888, transparent: true, opacity: 0.5 }));
            dragProxy.position.copy(obj.position);
            dragProxy.position.y = 0.02;
            scene.add(dragProxy);
        } else if (obj.type === 'objgroup') {
            const box = new THREE.Box3().setFromObject(obj.group);
            const size = box.getSize(new THREE.Vector3());
            const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
            dragProxy = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({ color: 0x888888, transparent: true, opacity: 0.3 }));
            dragProxy.position.copy(obj.position);
            dragProxy.position.y = obj.position.y;
            scene.add(dragProxy);
        } else {
            const edgesGeo = new THREE.EdgesGeometry(obj.mesh.geometry);
            dragProxy = new THREE.LineSegments(edgesGeo, new THREE.LineBasicMaterial({ color: 0x666666 }));
            dragProxy.position.copy(obj.position);
            dragProxy.position.y = 0.02;
            dragProxy.rotation.copy(obj.mesh.rotation);
            scene.add(dragProxy);
        }
        orbitControls.enabled = false;
    }

    function updateDrag(mouseWorldPos) {
        if (!isDragging || !dragTargetObj) return;
        const delta = mouseWorldPos.clone().sub(dragStartMouseWorld);
        const newPos = dragStartObjPos.clone().add(delta);
        if (dragTargetObj.type === 'polygon') newPos.y = 0.1;
        else if (dragTargetObj.type === 'player') newPos.y = dragTargetObj.position.y;
        else if (dragTargetObj.type === 'objgroup') newPos.y = dragTargetObj.position.y;
        else newPos.y = dragTargetObj.position.y;
        dragTargetObj.position.copy(newPos);
        if (dragTargetObj.type === 'player') dragTargetObj.group.position.copy(newPos);
        else if (dragTargetObj.type === 'objgroup') {
            dragTargetObj.group.position.copy(newPos);
            if (dragTargetObj.boundingWire) dragTargetObj.boundingWire.position.copy(newPos);
        } else if (dragTargetObj.type === 'polygon') {
            dragTargetObj.mesh.position.copy(newPos);
            dragTargetObj.wire.position.copy(newPos);
            const deltaVec = newPos.clone().sub(dragStartObjPos);
            if (dragTargetObj.vertices) dragTargetObj.vertices = dragTargetObj.vertices.map(v => v.clone().add(deltaVec));
        } else {
            dragTargetObj.mesh.position.copy(newPos);
            dragTargetObj.wire.position.copy(newPos);
            if (dragTargetObj.diagWire) dragTargetObj.diagWire.position.copy(newPos);
        }
        if (dragProxy) { dragProxy.position.copy(newPos); dragProxy.position.y = newPos.y; }
        dragStartObjPos.copy(newPos);
        dragStartMouseWorld.copy(mouseWorldPos);
    }

    function endDrag() {
        if (!isDragging) return;
        if (dragProxy) { scene.remove(dragProxy); dragProxy = null; }
        if (dragTargetObj) saveToHistory();
        isDragging = false;
        dragTargetObj = null;
    }

    function initColorUI() {
        const presetColors = ['#000000', '#666666', '#aaaaaa', '#ffffff', '#ff0000', '#ffff00', '#00ff00', '#0000ff'];
        const presetDiv = document.getElementById('presetContainer');
        if (presetDiv) {
            presetDiv.innerHTML = '';
            presetColors.forEach(c => {
                const sw = document.createElement('div');
                sw.className = 'color-preset';
                sw.style.backgroundColor = c;
                if (c === '#ffffff') sw.style.border = '1px solid #ccc';
                sw.dataset.color = c;
                sw.addEventListener('click', () => updateSelectedColor(c));
                presetDiv.appendChild(sw);
            });
        }
        const historyDiv = document.getElementById('colorHistoryContainer');
        if (historyDiv) {
            historyDiv.innerHTML = '';
            for (let i = 0; i < 4; i++) {
                const hist = document.createElement('div');
                hist.className = 'color-history-item';
                hist.id = `history${i}`;
                hist.style.backgroundColor = colorHistory[i] || '#ffffff';
                hist.dataset.color = colorHistory[i] || '#ffffff';
                hist.addEventListener('click', () => updateSelectedColor(hist.dataset.color));
                historyDiv.appendChild(hist);
            }
        }
    }

    // 匯出核心函數
    window.getSurfaceMaterial = getSurfaceMaterial;
    window.getWireframeMaterial = getWireframeMaterial;
    window.getMouseGroundPosition = getMouseGroundPosition;
    window.getGroupCenter = getGroupCenter;
    window.recordLastSelection = recordLastSelection;
    window.initGroupRotationState = initGroupRotationState;
    window.applyGroupRotation = applyGroupRotation;
    window.clearGroupRotationState = clearGroupRotationState;
    window.saveToHistory = saveToHistory;
    window.loadFromHistory = loadFromHistory;
    window.undo = undo;
    window.redo = redo;
    window.createPolygon = createPolygon;
    window.clearDrawingTemp = clearDrawingTemp;
    window.finishDrawing = finishDrawing;
    window.createShape = createShape;
    window.getNextPosition = getNextPosition;
    window.createPlayerModel = createPlayerModel;
    window.addPlayerModel = addPlayerModel;
    window.togglePlayerMode = togglePlayerMode;
    window.updatePlayer = updatePlayer;
    window.checkCollision = checkCollision;
    window.selectObject = selectObject;
    window.updateRotationSliders = updateRotationSliders;
    window.updateRotationSlidersToZero = updateRotationSlidersToZero;
    window.clearAllSelection = clearAllSelection;
    window.deselectAll = deselectAll;
    window.selectAll = selectAll;
    window.selectLayer = selectLayer;
    window.selectAbove = selectAbove;
    window.removeSelected = removeSelected;
    window.removeLast = removeLast;
    window.duplicate = duplicate;
    window.duplicateLayer = duplicateLayer;
    window.move = move;
    window.applyFreeRotationY = applyFreeRotationY;
    window.applyFreeRotationX = applyFreeRotationX;
    window.finalizeRotation = finalizeRotation;
    window.flipGroupHorizontal = flipGroupHorizontal;
    window.flipGroupVertical = flipGroupVertical;
    window.flipVerticalOld = flipVerticalOld;
    window.flipHorizontalOld = flipHorizontalOld;
    window.addFloor = addFloor;
    window.generateWalls = generateWalls;
    window.updateDisplayMode = updateDisplayMode;
    window.toggleGrid = toggleGrid;
    window.toggleDiagonals = toggleDiagonals;
    window.toggleShadows = toggleShadows;
    window.toggleWireframe = toggleWireframe;
    window.toggleUI = toggleUI;
    window.showStatus = showStatus;
    window.updateCount = updateCount;
    window.toggleMoveButtons = toggleMoveButtons;
    window.setFrontView = setFrontView;
    window.setLeftView = setLeftView;
    window.setTopView = setTopView;
    window.saveJSON = saveJSON;
    window.mergeFromJSON = mergeFromJSON;
    window.loadJSON = loadJSON;
    window.exportOBJFor3DPrint = exportOBJFor3DPrint;
    window.importOBJFile = importOBJFile;
    window.openOBJFileDialog = openOBJFileDialog;
    window.createBoundingWire = createBoundingWire;
    window.updateSelectedColor = updateSelectedColor;
    window.updateColorHistoryUI = updateColorHistoryUI;
    window.startDragObject = startDragObject;
    window.updateDrag = updateDrag;
    window.endDrag = endDrag;
    window.initColorUI = initColorUI;
    window.refreshObjectMaterial = refreshObjectMaterial;
})();