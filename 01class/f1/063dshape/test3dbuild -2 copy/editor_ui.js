// 完整 editor_ui.js (優化：單鍵 Z 撤銷 / X 重做，無需 Ctrl 組合鍵，確保流暢運行)
(function() {
    window.addEventListener('DOMContentLoaded', () => {
        // 材质包初始化
        if (window.initMaterials) window.initMaterials();
        if (window.initMaterialButtons) window.initMaterialButtons();

        // 原有按钮绑定
        document.getElementById('addCube').onclick = () => { if (isDrawingMode) finishDrawing(); clearAllSelection(); const obj = createShape('cube'); selectObject(obj); };
        document.getElementById('addSphere').onclick = () => { if (isDrawingMode) finishDrawing(); createShape('sphere'); };
        document.getElementById('addCone').onclick = () => { if (isDrawingMode) finishDrawing(); createShape('cone'); };
        document.getElementById('addPyramid').onclick = () => { if (isDrawingMode) finishDrawing(); createShape('pyramid'); };
        document.getElementById('addCylinder').onclick = () => { if (isDrawingMode) finishDrawing(); createShape('cylinder'); };
        document.getElementById('addHalfCylinder').onclick = () => { if (isDrawingMode) finishDrawing(); createShape('halfCylinder'); };
        document.getElementById('addTriPrism').onclick = () => { if (isDrawingMode) finishDrawing(); createShape('triPrism'); };
        document.getElementById('addFloor').onclick = addFloor;
        document.getElementById('generateWalls').onclick = generateWalls;
        document.getElementById('addPlayerModel').onclick = addPlayerModel;
        document.getElementById('removeSelected').onclick = removeSelected;
        document.getElementById('removeLast').onclick = removeLast;
        document.getElementById('flipVertical').onclick = flipVerticalOld;
        document.getElementById('flipHorizontal').onclick = flipHorizontalOld;
        document.getElementById('toggleDisplayMode').onclick = updateDisplayMode;
        document.getElementById('toggleGrid').onclick = toggleGrid;
        document.getElementById('toggleDiagonals').onclick = toggleDiagonals;
        document.getElementById('toggleShadows').onclick = toggleShadows;
        document.getElementById('toggleWireframe').onclick = toggleWireframe;
        document.getElementById('viewFront').onclick = setFrontView;
        document.getElementById('viewLeft').onclick = setLeftView;
        document.getElementById('viewTop').onclick = setTopView;
        document.getElementById('toggleMoveButtonsBtn').onclick = toggleMoveButtons;

        const colorInput = document.getElementById('colorInput');
        if (colorInput) colorInput.addEventListener('input', e => updateSelectedColor(e.target.value));

        const fileInput = document.getElementById('fileInput');
        if (fileInput) {
            fileInput.addEventListener('change', e => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = ev => { try { mergeFromJSON(JSON.parse(ev.target.result)); } catch (err) { showStatus('载入失败：' + err.message); } };
                reader.readAsText(file);
                e.target.value = '';
            });
        }

        const objFileInput = document.getElementById('objFileInput');
        if (objFileInput) {
            objFileInput.addEventListener('change', e => {
                const file = e.target.files[0];
                if (!file) return;
                importOBJFile(file);
                e.target.value = '';
            });
        }

        const drawTriangleBtn = document.getElementById('drawTriangleBtn');
        const drawQuadBtn = document.getElementById('drawQuadBtn');
        const cancelDrawBtn = document.getElementById('cancelDrawBtn');
        if (drawTriangleBtn) {
            drawTriangleBtn.onclick = () => {
                if (isDrawingMode) finishDrawing();
                isDrawingMode = true;
                drawingType = 'triangle';
                drawingPoints = [];
                clearDrawingTemp();
                showStatus('点击地面选择3个顶点 (三角形)');
                drawTriangleBtn.textContent = '⏹️ 取消绘制';
                if (drawQuadBtn) drawQuadBtn.textContent = '□ 画四边形';
            };
        }
        if (drawQuadBtn) {
            drawQuadBtn.onclick = () => {
                if (isDrawingMode) finishDrawing();
                isDrawingMode = true;
                drawingType = 'quad';
                drawingPoints = [];
                clearDrawingTemp();
                showStatus('点击地面选择4个顶点 (四边形)');
                drawQuadBtn.textContent = '⏹️ 取消绘制';
                if (drawTriangleBtn) drawTriangleBtn.textContent = '△ 画三角形';
            };
        }
        if (cancelDrawBtn) {
            cancelDrawBtn.onclick = () => {
                if (isDrawingMode) {
                    isDrawingMode = false;
                    drawingPoints = [];
                    drawingType = null;
                    clearDrawingTemp();
                    showStatus('已取消绘制');
                    if (drawTriangleBtn) drawTriangleBtn.textContent = '△ 画三角形';
                    if (drawQuadBtn) drawQuadBtn.textContent = '□ 画四边形';
                }
            };
        }

        const dragToggleBtn = document.getElementById('dragToggleBtn');
        if (dragToggleBtn) {
            dragToggleBtn.onclick = () => {
                dragModeActive = !dragModeActive;
                if (dragModeActive) {
                    dragToggleBtn.textContent = '✅ 拖曳模式启用中 (点击物件拖曳)';
                    dragToggleBtn.style.background = '#ff9800';
                    dragToggleBtn.style.color = '#fff';
                    orbitControls.enabled = false;
                    showStatus('拖曳模式已启用，点击物件并拖动可移动，放开鼠标完成');
                } else {
                    dragToggleBtn.textContent = '🖱️ 启用拖曳移动 (投影辅助)';
                    dragToggleBtn.style.background = '#d9f0ec';
                    dragToggleBtn.style.color = '#1e2a3a';
                    if (isDragging) endDrag();
                    orbitControls.enabled = true;
                    showStatus('拖曳模式已关闭');
                }
            };
        }

        const rotateYSlider = document.getElementById('rotateYSlider');
        const rotateXSlider = document.getElementById('rotateXSlider');
        if (rotateYSlider) {
            rotateYSlider.oninput = (e) => { if (!selectedObjects.length) return; applyFreeRotationY(parseInt(e.target.value)); document.getElementById('rotateYValue').textContent = e.target.value + '°'; };
            rotateYSlider.onchange = () => finalizeRotation();
        }
        if (rotateXSlider) {
            rotateXSlider.oninput = (e) => { if (!selectedObjects.length) return; applyFreeRotationX(parseInt(e.target.value)); document.getElementById('rotateXValue').textContent = e.target.value + '°'; };
            rotateXSlider.onchange = () => finalizeRotation();
        }

        document.getElementById('flipGroupHorizBtn').onclick = flipGroupHorizontal;
        document.getElementById('flipGroupVertBtn').onclick = flipGroupVertical;

        // 移动按钮
        const moveBtns = document.querySelectorAll('.move-btn');
        moveBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const dir = btn.getAttribute('data-move');
                if (dir) move(dir);
            });
            btn.addEventListener('touchstart', (e) => { e.stopPropagation(); });
        });

        // 复制按钮事件
        const copyBtns = document.querySelectorAll('.copy-btn');
        copyBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const dir = btn.getAttribute('data-copy');
                if (dir) duplicate(dir);
            });
            btn.addEventListener('touchstart', (e) => { e.stopPropagation(); });
        });

        // 点击选取物件 / 绘图模式处理
        renderer.domElement.addEventListener('click', e => {
            if (playerMode !== 0) return;
            if (isDrawingMode) {
                const groundPoint = getMouseGroundPosition(e);
                if (groundPoint) {
                    groundPoint.y = 0;
                    if (drawingPoints.length > 0 && drawingPoints[drawingPoints.length - 1].distanceTo(groundPoint) < 0.3) {
                        showStatus('点太近');
                        return;
                    }
                    drawingPoints.push(groundPoint);
                    const marker = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0x442200 }));
                    marker.position.copy(groundPoint);
                    scene.add(marker);
                    tempPointsVisual.push(marker);
                    showStatus(`已记录点 ${drawingPoints.length}/${drawingType === 'triangle' ? 3 : 4}`);
                    if ((drawingType === 'triangle' && drawingPoints.length === 3) || (drawingType === 'quad' && drawingPoints.length === 4)) finishDrawing();
                }
                return;
            }
            pointer.x = (e.clientX / innerWidth) * 2 - 1;
            pointer.y = -(e.clientY / innerHeight) * 2 + 1;
            raycaster.setFromCamera(pointer, camera);
            const meshes = [];
            objects.forEach(o => {
                if (o.type === 'player') meshes.push(...o.group.children);
                else if (o.type === 'objgroup') meshes.push(...o.group.children);
                else meshes.push(o.mesh);
            });
            const hits = raycaster.intersectObjects(meshes);
            if (hits.length) {
                const hitMesh = hits[0].object;
                let foundObj = null;
                for (let o of objects) {
                    if (o.type === 'player' && o.group.children.includes(hitMesh)) { foundObj = o; break; }
                    if (o.type === 'objgroup' && o.group.children.includes(hitMesh)) { foundObj = o; break; }
                    if (o.mesh === hitMesh) { foundObj = o; break; }
                }
                if (foundObj) selectObject(foundObj, e.shiftKey);
            } else if (!e.shiftKey) deselectAll();
        });

        // 拖曳模式鼠标事件
        renderer.domElement.addEventListener('mousedown', e => {
            if (playerMode !== 0) return;
            if (!dragModeActive) return;
            if (e.button !== 0) return;
            pointer.x = (e.clientX / innerWidth) * 2 - 1;
            pointer.y = -(e.clientY / innerHeight) * 2 + 1;
            raycaster.setFromCamera(pointer, camera);
            const meshes = [];
            objects.forEach(o => {
                if (o.type === 'player') meshes.push(...o.group.children);
                else if (o.type === 'objgroup') meshes.push(...o.group.children);
                else meshes.push(o.mesh);
            });
            const hits = raycaster.intersectObjects(meshes);
            if (hits.length) {
                const hitMesh = hits[0].object;
                let foundObj = null;
                for (let o of objects) {
                    if (o.type === 'player' && o.group.children.includes(hitMesh)) { foundObj = o; break; }
                    if (o.type === 'objgroup' && o.group.children.includes(hitMesh)) { foundObj = o; break; }
                    if (o.mesh === hitMesh) { foundObj = o; break; }
                }
                if (foundObj) {
                    e.stopPropagation();
                    const gp = getMouseGroundPosition(e);
                    if (gp) startDragObject(foundObj, gp);
                }
            }
        });

        window.addEventListener('mousemove', e => {
            if (dragModeActive && isDragging) {
                const gp = getMouseGroundPosition(e);
                if (gp) updateDrag(gp);
            }
        });
        window.addEventListener('mouseup', e => {
            if (dragModeActive && isDragging) endDrag();
        });

        // 键盘事件 (優化：單鍵 Z 撤銷 / X 重做，無需 Ctrl 組合鍵)
        window.addEventListener('keydown', e => {
            const k = e.key.toLowerCase();
            keys[k] = true;

            // 处理 Enter 键
            if (e.key === 'Enter') {
                if (isDrawingMode) finishDrawing();
                togglePlayerMode();
                e.preventDefault();
                return;
            }

            if (playerMode === 0) {
                // 優先處理單鍵 Z 撤銷 (上一步)
                if (k === 'z') {
                    e.preventDefault();
                    undo();
                }
                // 優先處理單鍵 X 重做 (還原)
                else if (k === 'x') {
                    e.preventDefault();
                    redo();
                }
                // Ctrl+A 全选
                else if (e.ctrlKey && k === 'a') {
                    e.preventDefault();
                    selectAll();
                }
                // 其他按键
                else if (k === 'c') {
                    if (lastSelectedObjects.length > 0) {
                        suppressLastSelectionUpdate = true;
                        clearAllSelection();
                        lastSelectedObjects.forEach(obj => {
                            if (objects.includes(obj)) selectObject(obj, true);
                        });
                        suppressLastSelectionUpdate = false;
                        lastSelectedObjects = selectedObjects.slice();
                        showStatus('已恢复上次选取');
                    } else {
                        showStatus('没有上次选取记录');
                    }
                } else if (k === '1') toggleUI();
                else if (k === '2') {
                    const link = document.createElement('a');
                    link.download = `capture_${Date.now()}.png`;
                    link.href = renderer.domElement.toDataURL('image/png');
                    link.click();
                } else if (k === '3') saveJSON();
                else if (k === '4') loadJSON();
                else if (k === '5') exportOBJFor3DPrint();
                else if (k === '6') openOBJFileDialog();
                else if (k === 'delete' || k === 'backspace') removeLast();
                else if (k === 'q') {
                    if (isDrawingMode) finishDrawing();
                    const obj = createShape('cube');
                    clearAllSelection();
                    selectObject(obj);
                } else if (k === 'g') addFloor();
                else if (k === 'h') generateWalls();
                else if (k === 'l') duplicate('right');
                else if (k === 'k') duplicate('backward');
                else if (k === 'j') duplicate('left');
                else if (k === 'i') duplicate('forward');
                else if (k === 'o') duplicate('upward');
                else if (k === ';') duplicate('downward');
                else if (k === 'v') removeSelected();
                else if (k === 'p') duplicateLayer();
                else if (k === '9') selectLayer();
                else if (k === '0') selectAbove();
                else if ('wasdrf'.includes(k)) move(k);
                else if (e.key === 'ArrowUp') move('w');
                else if (e.key === 'ArrowDown') move('s');
                else if (e.key === 'ArrowLeft') move('a');
                else if (e.key === 'ArrowRight') move('d');
            }
        });

        window.addEventListener('keyup', e => {
            const k = e.key.toLowerCase();
            keys[k] = false;
        });

        // 第一人称鼠标控制
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

        // 初始场景设定
        createShape('cube');
        updateDisplayMode();
        saveToHistory();          // 保存初始状态
        initColorUI();
        updateColorHistoryUI();
        moveButtonsVisible = true;
        const movePanel = document.getElementById('moveButtonsPanel');
        if (movePanel) movePanel.classList.remove('hidden');
        const toggleMoveBtn = document.getElementById('toggleMoveButtonsBtn');
        if (toggleMoveBtn) toggleMoveBtn.textContent = '🔘 隐藏移动按钮';
    });

    // 动画循环
    function animate() {
        requestAnimationFrame(animate);
        const delta = clock.getDelta();
        if (playerMode !== 0) updatePlayer(delta);
        else orbitControls.update();
        renderer.render(scene, camera);
    }
    animate();
    window.addEventListener('resize', () => {
        camera.aspect = innerWidth / innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(innerWidth, innerHeight);
    });
})();