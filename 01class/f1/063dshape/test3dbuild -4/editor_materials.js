// 材質包管理模組 (支援外部貼圖 + 程序化備用)
(function() {
    // 備用程序化紋理 (當外部圖片載入失敗時使用)
    function createFallbackWood() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#c79a6e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#8b5a2b';
        ctx.lineWidth = 8;
        for (let i = 0; i < 200; i++) {
            ctx.beginPath();
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            ctx.moveTo(x, y);
            ctx.lineTo(x + (Math.random() - 0.5) * 30, y + (Math.random() - 0.5) * 30);
            ctx.stroke();
        }
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(2, 2);
        return texture;
    }

    function createFallbackBrick() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#b54c2c';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#6a2e1a';
        ctx.lineWidth = 6;
        const brickW = 80;
        const brickH = 40;
        for (let y = 0; y < canvas.height; y += brickH) {
            const offset = (Math.floor(y / brickH) % 2) * (brickW / 2);
            for (let x = offset; x < canvas.width + brickW; x += brickW) {
                ctx.strokeRect(x, y, brickW - 4, brickH - 4);
                ctx.fillStyle = '#8c3a1c';
                ctx.fillRect(x + 2, y + 2, brickW - 8, brickH - 8);
            }
        }
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(3, 3);
        return texture;
    }

    function createFallbackMetal() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        grad.addColorStop(0, '#7f8f9f');
        grad.addColorStop(0.5, '#9fb0c0');
        grad.addColorStop(1, '#6f7f8f');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < 800; i++) {
            ctx.fillStyle = `rgba(200,200,220,${Math.random() * 0.3})`;
            ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 2, Math.random() * 8);
        }
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(2, 2);
        return texture;
    }

    function createFallbackMarble() {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#f0ede6';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        for (let i = 0; i < 200; i++) {
            ctx.beginPath();
            ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
            ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
            ctx.strokeStyle = `rgba(100,80,60,${Math.random() * 0.5})`;
            ctx.lineWidth = Math.random() * 4 + 1;
            ctx.stroke();
        }
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(2, 2);
        return texture;
    }

    // 外部貼圖路徑 (與 HTML 同目錄)
    const texturePaths = {
        wood: 'wood.jpg',
        brick: 'brick.jpg',
        metal: 'metal.jpg',
        marble: 'marble.jpg'
    };

    // 儲存最終紋理 (非同步載入)
    window.materialTextures = {
        wood: null,
        brick: null,
        metal: null,
        marble: null
    };

    // 載入外部貼圖，失敗時使用備用紋理
    function loadTexture(key, url, fallbackCreator) {
        const loader = new THREE.TextureLoader();
        loader.load(url, 
            (texture) => {
                texture.wrapS = THREE.RepeatWrapping;
                texture.wrapT = THREE.RepeatWrapping;
                texture.repeat.set(2, 2);
                window.materialTextures[key] = texture;
                console.log(`✅ 材質載入成功: ${key}`);
                // 重新整理已套用該材質的物體 (若需要即時更新)
                if (window.refreshAllMaterials) window.refreshAllMaterials();
            },
            undefined,
            (err) => {
                console.warn(`⚠️ 載入外部貼圖失敗 ${url}，改用程序化備用紋理`, err);
                const fallback = fallbackCreator();
                fallback.wrapS = THREE.RepeatWrapping;
                fallback.wrapT = THREE.RepeatWrapping;
                fallback.repeat.set(2, 2);
                window.materialTextures[key] = fallback;
                if (window.refreshAllMaterials) window.refreshAllMaterials();
            }
        );
    }

    // 啟動所有紋理載入
    function initMaterials() {
        loadTexture('wood', texturePaths.wood, createFallbackWood);
        loadTexture('brick', texturePaths.brick, createFallbackBrick);
        loadTexture('metal', texturePaths.metal, createFallbackMetal);
        loadTexture('marble', texturePaths.marble, createFallbackMarble);
    }

    // 將特定材質應用到物體
    function applyMaterialToObject(obj, materialKey) {
        if (!obj || !materialKey) return;
        const texture = window.materialTextures[materialKey];
        if (!texture) {
            console.warn(`材質 ${materialKey} 尚未載入完成`);
            return;
        }
        obj.materialKey = materialKey;
        if (window.refreshObjectMaterial) {
            window.refreshObjectMaterial(obj);
        }
    }

    function clearMaterialFromObject(obj) {
        if (!obj) return;
        obj.materialKey = null;
        if (window.refreshObjectMaterial) window.refreshObjectMaterial(obj);
    }

    function applyMaterialToSelected(materialKey) {
        if (selectedObjects.length === 0) {
            showStatus("請先選取物件");
            return;
        }
        if (materialKey === 'clear') {
            selectedObjects.forEach(obj => clearMaterialFromObject(obj));
            showStatus("已清除選中物件的材質");
        } else {
            if (!window.materialTextures[materialKey]) {
                showStatus(`材質 ${materialKey} 載入中，請稍後再試`);
                return;
            }
            selectedObjects.forEach(obj => applyMaterialToObject(obj, materialKey));
            showStatus(`已套用材質: ${materialKey}`);
        }
        saveToHistory();
    }

    function initMaterialButtons() {
        const container = document.getElementById('materialButtons');
        if (!container) return;
        const buttons = container.querySelectorAll('[data-material]');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                const mat = btn.getAttribute('data-material');
                applyMaterialToSelected(mat);
            });
        });
    }

    // 輔助：刷新所有物件的材質 (貼圖載入完成後調用)
    function refreshAllMaterials() {
        if (!window.objects) return;
        window.objects.forEach(obj => {
            if (obj.materialKey && window.materialTextures[obj.materialKey]) {
                if (window.refreshObjectMaterial) window.refreshObjectMaterial(obj);
            }
        });
    }

    window.initMaterials = initMaterials;
    window.applyMaterialToObject = applyMaterialToObject;
    window.clearMaterialFromObject = clearMaterialFromObject;
    window.applyMaterialToSelected = applyMaterialToSelected;
    window.initMaterialButtons = initMaterialButtons;
    window.refreshAllMaterials = refreshAllMaterials;
})();