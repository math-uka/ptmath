// 場景基本設定與全域變數初始化（性能優化版：較低細分、陰影品質降低、預設關閉線框/對角線）
(function() {
    // 基本 Three.js 元件
    window.scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf4f7f2);
    scene.fog = new THREE.FogExp2(0xf4f7f2, 0.006);
    window.camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 3000);
    window.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(innerWidth, innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // 限制最高2倍像素比，提升平板性能
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);
    window.orbitControls = new THREE.OrbitControls(camera, renderer.domElement);
    orbitControls.enableDamping = true;
    orbitControls.dampingFactor = 0.08;
    orbitControls.minDistance = 6;
    orbitControls.maxDistance = 180;

    // 光源與輔助物件（降低陰影貼圖解析度與範圍）
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    window.directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(0, 20, 0);
    directionalLight.target.position.set(0, 0, 0);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 60;
    directionalLight.shadow.camera.left = -20;
    directionalLight.shadow.camera.right = 20;
    directionalLight.shadow.camera.top = 20;
    directionalLight.shadow.camera.bottom = -20;
    directionalLight.shadow.bias = -0.0001;
    directionalLight.shadow.normalBias = 0.05;
    scene.add(directionalLight);
    scene.add(directionalLight.target);

    const fillLight = new THREE.PointLight(0xccddff, 0.4);
    fillLight.position.set(5, 10, 7);
    scene.add(fillLight);

    window.grid = new THREE.GridHelper(80, 40, 0x888888, 0xdddddd);
    grid.position.y = 0.01;
    grid.receiveShadow = false;
    scene.add(grid);

    const arrowX = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0.1, 0), 4, 0xff0000);
    const arrowZ = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0.1, 0), 4, 0x00ff00);
    scene.add(arrowX);
    scene.add(arrowZ);
    window.directionArrows = [arrowX, arrowZ];

    const shadowReceiver = new THREE.Mesh(
        new THREE.PlaneGeometry(120, 120),
        new THREE.ShadowMaterial({ opacity: 0.5, color: 0x000000, transparent: true, side: THREE.DoubleSide })
    );
    shadowReceiver.rotation.x = -Math.PI / 2;
    shadowReceiver.position.y = 0;
    shadowReceiver.receiveShadow = true;
    scene.add(shadowReceiver);

    camera.position.set(20, 16, 28);
    orbitControls.update();
    window.clock = new THREE.Clock();

    // 全域變數
    window.baseSize = 2;
    window.moveStep = window.baseSize / 2;
    window.objects = [];
    window.selected = null;
    window.selectedObjects = [];
    window.lastSelectedObjects = [];
    window.suppressLastSelectionUpdate = false;
    window.displayMode = 0;
    window.gridVisible = true;
    window.diagonalsVisible = false;          // 預設關閉對角線，提升性能
    window.uiVisible = true;
    window.shadowsEnabled = true;
    window.wireframeVisible = false;           // 平板預設關閉線框，提升性能
    window.selectedColor = 0x3366ff;
    
    // 歷史記錄
    window.historyStack = [];
    window.historyStackIndex = -1;
    
    window.playerModel = null;
    window.playerMode = 0;
    window.designCameraPos = new THREE.Vector3();
    window.designTarget = new THREE.Vector3();
    window.moveSpeed = 20;
    window.rotationSpeed = 0.05;
    window.keys = {};
    window.isPointerLocked = false;
    window.colorHistory = ['#3366ff', '#ffffff', '#ffffff', '#ffffff'];

    window.dragModeActive = false;
    window.isDragging = false;
    window.dragTargetObj = null;
    window.dragProxy = null;
    window.dragStartMouseWorld = new THREE.Vector3();
    window.dragStartObjPos = new THREE.Vector3();

    window.isDrawingMode = false;
    window.drawingPoints = [];
    window.drawingType = null;
    window.tempPointsVisual = [];

    window.freeRotateY = 0;
    window.freeRotateX = 0;
    window.multiGroupRotY = 0;
    window.multiGroupRotX = 0;
    window.groupRotationState = null;
    window.rotateTimeout;

    window.raycaster = new THREE.Raycaster();
    window.pointer = new THREE.Vector2();

    window.moveButtonsVisible = true;
    
    // 性能優化：碰撞檢測空間網格（邊長2米）
    window.collisionGrid = { cellSize: 2, map: new Map() };
    function updateCollisionGrid() {
        objects.forEach(obj => {
            if (obj === playerModel) return;
            const cellX = Math.floor(obj.position.x / collisionGrid.cellSize);
            const cellZ = Math.floor(obj.position.z / collisionGrid.cellSize);
            const key = `${cellX},${cellZ}`;
            if (!collisionGrid.map.has(key)) collisionGrid.map.set(key, []);
            collisionGrid.map.get(key).push(obj);
        });
    }
    window.updateCollisionGrid = updateCollisionGrid;

    // ========== 行動端 / 平板偵測與底層環境性能優化 ==========
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    if (isMobile) {
        console.log("行動端模式：簡化環境渲染、關閉底層陰影映射、準備純線框優化");
        window.shadowsEnabled = false;
        if (directionalLight) directionalLight.castShadow = false;
        
        // 直接從底層禁用 WebGL 陰影貼圖計算，大幅節省 GPU 頻寬
        renderer.shadowMap.enabled = false;
        // 調低行動端最大像素比（避免 Retina / 高刷螢幕解析度過高導致渲染卡頓）
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.2));
        
        // 移除霧氣計算，減少 Fragment Shader 的片元運算負擔
        scene.fog = null;
        
        // 預先隱藏場景輔助物件
        if (grid) grid.visible = false;
        if (directionArrows) directionArrows.forEach(a => a.visible = false);
        
        window.isMobileMode = true;
    } else {
        window.isMobileMode = false;
    }
})();