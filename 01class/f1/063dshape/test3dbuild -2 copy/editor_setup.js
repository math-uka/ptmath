// 場景基本設定與全域變數初始化
(function() {
    // 基本 Three.js 元件
    window.scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf4f7f2);
    scene.fog = new THREE.FogExp2(0xf4f7f2, 0.006);
    window.camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 3000);
    window.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(innerWidth, innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);
    window.orbitControls = new THREE.OrbitControls(camera, renderer.domElement);
    orbitControls.enableDamping = true;
    orbitControls.dampingFactor = 0.08;
    orbitControls.minDistance = 6;
    orbitControls.maxDistance = 180;

    // 光源與輔助物件
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    window.directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(0, 20, 0);
    directionalLight.target.position.set(0, 0, 0);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 60;
    directionalLight.shadow.camera.left = -30;
    directionalLight.shadow.camera.right = 30;
    directionalLight.shadow.camera.top = 30;
    directionalLight.shadow.camera.bottom = -30;
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
    window.diagonalsVisible = false;
    window.uiVisible = true;
    window.shadowsEnabled = true;
    window.wireframeVisible = true;
    window.selectedColor = 0x3366ff;
    
    // 歷史記錄 (使用自定義變數，避開原生 window.history)
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
})();