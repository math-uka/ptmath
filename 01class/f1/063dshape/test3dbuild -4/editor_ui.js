// 完整 editor_ui.js (優化：單鍵 Z 撤銷 / X 重做，無需 Ctrl 組合鍵，行動端自動隱藏左欄 + 強制純線框優化效能)
(function() {
    window.addEventListener('DOMContentLoaded', () => {
        // 移动端隐藏左侧边栏
        if (window.isMobileMode) {
            const sidebar = document.getElementById('sidebar');
            if (sidebar) sidebar.style.display = 'none';
            const movePanel = document.getElementById('moveButtonsPanel');
            if (movePanel) {
                movePanel.style.bottom = '20px';
                movePanel.style.right = '20px';
            }
        }

        // ========== 行動端 / 平板 自動偵測與基礎效能優化 ==========
        const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        if (isMobile) {
            // 1. 自動隱藏左側側邊欄
            const sidebar = document.getElementById('sidebar');
            if (sidebar) sidebar.classList.add('hidden-sidebar');
            window.uiVisible = false;   // 同步核心狀態變數

            // 2. 預設關閉全域陰影（大幅提升行動端幀率）
            window.shadowsEnabled = false;
            if (window.directionalLight) {
                window.directionalLight.castShadow = false;
            }
            const shadowBtn = document.getElementById('toggleShadows');
            if (shadowBtn) shadowBtn.textContent = '🌓 顯示陰影';

            // 3. 預設關閉網格與輔助線（減少行動端頂點與線段渲染負擔）
            if (window.grid) window.grid.visible = false;
            if (window.directionArrows) window.directionArrows.forEach(arr => arr.visible = false);
        }

        // 材質包初始化
        if (window.initMaterials) window.initMaterials();
        if (window.initMaterialButtons) window.initMaterialButtons();

        // ========== 右側面板快速操作按鈕事件綁定 ==========
        document.getElementById('addCubeQuickRight').onclick = () => {
            if (isDrawingMode) finishDrawing();
            clearAllSelection();
            const obj = createShape('cube');
            selectObject(obj);
        };
        document.getElementById('removeSelectedQuickRight').onclick = () => {
            removeSelected();
        };
        // 新增 📸 快速截圖功能
        document.getElementById('screenshotQuickRight').onclick = () => {
            const link = document.createElement('a');
            link.download = `capture_${Date.now()}.png`;
            link.href = renderer.domElement.toDataURL('image/png');
            link.click();
        };
        // 新增 💾 快速儲存功能
        document.getElementById('saveQuickRight').onclick = () => {
            saveJSON();
        };
        // 新增 📂 快速載入功能
        document.getElementById('loadQuickRight').onclick = () => {
            loadJSON();
        };

        // 原有按鈕綁定
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
                reader.onload = ev => { try { mergeFromJSON(JSON.parse(ev.target.result)); } catch (err) { showStatus('載入失敗：' + err.message); } };
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
                showStatus('點擊地面選擇3個頂點 (三角形)');
                drawTriangleBtn.textContent = '⏹️ 取消繪製';
                if (drawQuadBtn) drawQuadBtn.textContent = '□ 畫四邊形';
            };
        }
        if (drawQuadBtn) {
            drawQuadBtn.onclick = () => {
                if (isDrawingMode) finishDrawing();
                isDrawingMode = true;
                drawingType = 'quad';
                drawingPoints = [];
                clearDrawingTemp();
                showStatus('點擊地面選擇4個頂點 (四邊形)');
                drawQuadBtn.textContent = '⏹️ 取消繪製';
                if (drawTriangleBtn) drawTriangleBtn.textContent = '△ 畫三角形';
            };
        }
        if (cancelDrawBtn) {
            cancelDrawBtn.onclick = () => {
                if (isDrawingMode) {
                    isDrawingMode = false;
                    drawingPoints = [];
                    drawingType = null;
                    clearDrawingTemp();
                    showStatus('已取消繪製');
                    if (drawTriangleBtn) drawTriangleBtn.textContent = '△ 畫三角形';
                    if (drawQuadBtn) drawQuadBtn.textContent = '□ 畫四邊形';
                }
            };
        }

        const dragToggleBtn = document.getElementById('dragToggleBtn');
        if (dragToggleBtn) {
            dragToggleBtn.onclick = () => {
                dragModeActive = !dragModeActive;
                if (dragModeActive) {
                    dragToggleBtn.textContent = '✅ 拖曳模式啟用中 (點擊物件拖曳)';
                    dragToggleBtn.style.background = '#ff9800';
                    dragToggleBtn.style.color = '#fff';
                    orbitControls.enabled = false;
                    showStatus('拖曳模式已啟用，點擊物件並拖動可移動，放開滑鼠完成');
                } else {
                    dragToggleBtn.textContent = '🖱️ 啟用拖曳移動 (投影輔助)';
                    dragToggleBtn.style.background = '#d9f0ec';
                    dragToggleBtn.style.color = '#1e2a3a';
                    if (isDragging) endDrag();
                    orbitControls.enabled = true;
                    showStatus('拖曳模式已關閉');
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

        // 移動按鈕
        const moveBtns = document.querySelectorAll('.move-btn');
        moveBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const dir = btn.getAttribute('data-move');
                if (dir) move(dir);
            });
            btn.addEventListener('touchstart', (e) => { e.stopPropagation(); });
        });

        // 複製按鈕事件
        const copyBtns = document.querySelectorAll('.copy-btn');
        copyBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const dir = btn.getAttribute('data-copy');
                if (dir) duplicate(dir);
            });
            btn.addEventListener('touchstart', (e) => { e.stopPropagation(); });
        });

        // 點擊選取物件 / 繪圖模式處理
        renderer.domElement.addEventListener('click', e => {
            if (playerMode !== 0) return;
            if (isDrawingMode) {
                const groundPoint = getMouseGroundPosition(e);
                if (groundPoint) {
                    groundPoint.y = 0;
                    if (drawingPoints.length > 0 && drawingPoints[drawingPoints.length - 1].distanceTo(groundPoint) < 0.3) {
                        showStatus('點太近');
                        return;
                    }
                    drawingPoints.push(groundPoint);
                    const marker = new THREE.Mesh(new THREE.SphereGeometry(0.1, 4, 4), new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0x442200 }));
                    marker.position.copy(groundPoint);
                    scene.add(marker);
                    tempPointsVisual.push(marker);
                    showStatus(`已記錄點 ${drawingPoints.length}/${drawingType === 'triangle' ? 3 : 4}`);
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

        // 拖曳模式滑鼠事件
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

        // 優化：mousemove 節流
        let lastMoveTime = 0;
        window.addEventListener('mousemove', e => {
            if (dragModeActive && isDragging) {
                const now = performance.now();
                if (now - lastMoveTime > 16) { // 約 60fps
                    const gp = getMouseGroundPosition(e);
                    if (gp) updateDrag(gp);
                    lastMoveTime = now;
                }
            }
        });
        window.addEventListener('mouseup', e => {
            if (dragModeActive && isDragging) endDrag();
        });

        // 鍵盤事件 (優化：單鍵 Z 撤銷 / X 重做，無需 Ctrl 組合鍵)
        window.addEventListener('keydown', e => {
            const k = e.key.toLowerCase();
            keys[k] = true;

            if (e.key === 'Enter') {
                if (isDrawingMode) finishDrawing();
                togglePlayerMode();
                e.preventDefault();
                return;
            }

            if (playerMode === 0) {
                if (k === 'z') {
                    e.preventDefault();
                    undo();
                } else if (k === 'x') {
                    e.preventDefault();
                    redo();
                } else if (e.ctrlKey && k === 'a') {
                    e.preventDefault();
                    selectAll();
                } else if (k === 'c') {
                    if (lastSelectedObjects.length > 0) {
                        suppressLastSelectionUpdate = true;
                        clearAllSelection();
                        lastSelectedObjects.forEach(obj => {
                            if (objects.includes(obj)) selectObject(obj, true);
                        });
                        suppressLastSelectionUpdate = false;
                        lastSelectedObjects = selectedObjects.slice();
                        showStatus('已恢復上次選取');
                    } else {
                        showStatus('沒有上次選取記錄');
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

        // 第一人稱滑鼠控制
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

        // 初始場景設定
        createShape('cube');

        // ========== 根據平台覆蓋初始顯示模式 (行動端極致優化核心) ==========
        if (isMobile) {
            // 4. 強制純線框模式（不顯示表面顏色/材質）
            window.displayMode = 2;                     // 2 表示純線框
            window.wireframeVisible = true;             // 確保線框可見

            // 更新介面按鈕文字
            const modeBtn = document.getElementById('toggleDisplayMode');
            if (modeBtn) modeBtn.textContent = '✨ 純線框';

            // 刷新與設定所有現有物件（包含剛生成的 cube）的材質、可見性與陰影
            objects.forEach(obj => {
                if (window.refreshObjectMaterial) window.refreshObjectMaterial(obj);
                if (obj.type !== 'player' && obj.type !== 'objgroup') {
                    obj.mesh.visible = false;           // 純線框模式下隱藏實體網格面
                    obj.wire.visible = true;
                    if (obj.diagWire) obj.diagWire.visible = true;
                } else if (obj.type === 'objgroup' && obj.boundingWire) {
                    obj.boundingWire.visible = true;
                }

                // 徹底關閉陰影渲染計算
                if (obj.type === 'player' && obj.group) {
                    obj.group.traverse(child => { if (child.isMesh) { child.castShadow = false; child.receiveShadow = false; } });
                } else if (obj.type === 'objgroup' && obj.group) {
                    obj.group.traverse(child => { if (child.isMesh) { child.castShadow = false; child.receiveShadow = false; } });
                } else if (obj.mesh) {
                    obj.mesh.castShadow = false;
                    obj.mesh.receiveShadow = false;
                }
            });
        } else {
            // 電腦端：確保預設顯示模式為 0（不透明+線框），並同步按鈕文字
            displayMode = 0;
            const modeBtn = document.getElementById('toggleDisplayMode');
            if (modeBtn) modeBtn.textContent = '✨ 不透明表面 + 線框';

            // 正常刷新已有物件的材質
            objects.forEach(o => {
                if (window.refreshObjectMaterial) refreshObjectMaterial(o);
            });
        }

        saveToHistory();
        initColorUI();
        updateColorHistoryUI();
        moveButtonsVisible = true;
        
        const movePanel = document.getElementById('moveButtonsPanel');
        if (movePanel) movePanel.classList.remove('hidden');
        const toggleMoveBtn = document.getElementById('toggleMoveButtonsBtn');
        if (toggleMoveBtn) toggleMoveBtn.textContent = '🔘 隱藏移動按鈕';
    });

    // 動畫循環
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