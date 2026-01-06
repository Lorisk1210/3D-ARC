import { getColorHex } from './colors.js';

export class Grid3D {
    constructor(canvas) {
        this.canvas = canvas;
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a1a);
        
        this.camera = new THREE.PerspectiveCamera(
            60,
            canvas.clientWidth / canvas.clientHeight,
            0.1,
            1000
        );
        
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: canvas, 
            antialias: true 
        });
        this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        
        this.controls = new THREE.OrbitControls(this.camera, this.canvas);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = false;
        this.controls.minDistance = 5;
        this.controls.maxDistance = 50;
        
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        this.gridGroup = new THREE.Group();
        this.scene.add(this.gridGroup);
        
        this.cubes = [];
        this.gridData = null;
        this.dimensions = { x: 3, y: 3, z: 3 };
        this.currentLayer = 0;
        this.viewMode = 'all';
        this.hoveredCube = null;
        this.selectedColor = 0;
        
        this.multiselectMode = false;
        this.isSelecting = false;
        this.selectionStart = null;
        this.selectionOverlay = document.getElementById('selection-overlay');
        this.canvasContainer = this.canvas.parentElement;
        
        this.setupLighting();
        this.setupEventListeners();
        this.animate();
    }
    
    setupLighting() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.4);
        directionalLight1.position.set(5, 10, 5);
        this.scene.add(directionalLight1);
        
        const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.3);
        directionalLight2.position.set(-5, 5, -5);
        this.scene.add(directionalLight2);
    }
    
    setupEventListeners() {
        window.addEventListener('resize', () => this.onWindowResize());
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('click', (e) => this.onMouseClick(e));
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.onRightClick(e);
        });
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
        this.canvas.addEventListener('mouseleave', (e) => this.onMouseLeave(e));
    }
    
    onWindowResize() {
        this.camera.aspect = this.canvas.clientWidth / this.canvas.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight);
    }
    
    createGrid(dimensions, data) {
        this.clearGrid();
        this.dimensions = dimensions;
        this.gridData = data || this.createEmptyData(dimensions);
        this.currentLayer = 0;
        
        const cubeSize = 0.9;
        const spacing = 1.1;
        
        const offsetX = (dimensions.x - 1) * spacing / 2;
        const offsetY = (dimensions.y - 1) * spacing / 2;
        const offsetZ = (dimensions.z - 1) * spacing / 2;
        
        for (let z = 0; z < dimensions.z; z++) {
            for (let y = 0; y < dimensions.y; y++) {
                for (let x = 0; x < dimensions.x; x++) {
                    const geometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
                    const colorValue = this.gridData[z][y][x];
                    
                    const material = this.createCubeMaterial(x, y, z, colorValue);
                    
                    const cube = new THREE.Mesh(geometry, material);
                    
                    // x=0 is left, y=0 is top, z=0 is front
                    const xPos = x * spacing - offsetX;
                    const yPos = (dimensions.y - 1 - y) * spacing - offsetY;
                    const zPos = (dimensions.z - 1 - z) * spacing - offsetZ;
                    
                    cube.position.set(xPos, yPos, zPos);
                    
                    const edges = new THREE.EdgesGeometry(geometry);
                    const lineMaterial = new THREE.LineBasicMaterial({ 
                        color: 0x444444,
                        transparent: true,
                        opacity: 1
                    });
                    const wireframe = new THREE.LineSegments(edges, lineMaterial);
                    cube.add(wireframe);
                    
                    cube.userData = { x, y, z, wireframe };
                    
                    this.gridGroup.add(cube);
                    this.cubes.push(cube);
                }
            }
        }
        
        this.updateCameraPosition();
        this.updateLayerVisibility();
    }
    
    createEmptyData(dimensions) {
        const data = [];
        for (let z = 0; z < dimensions.z; z++) {
            const layer = [];
            for (let y = 0; y < dimensions.y; y++) {
                const row = [];
                for (let x = 0; x < dimensions.x; x++) {
                    row.push(0);
                }
                layer.push(row);
            }
            data.push(layer);
        }
        return data;
    }
    
    clearGrid() {
        while (this.gridGroup.children.length > 0) {
            const child = this.gridGroup.children[0];
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (child.material.map) child.material.map.dispose();
                child.material.dispose();
            }
            this.gridGroup.remove(child);
        }
        this.cubes = [];
    }
    
    updateCameraPosition() {
        const maxDim = Math.max(this.dimensions.x, this.dimensions.y, this.dimensions.z);
        // Increase distance multiplier to make grids more visible
        const distance = Math.max(maxDim * 3.5, 10);
        // Position camera to look directly from the front
        this.camera.position.set(0, 0, distance);
        this.camera.lookAt(0, 0, 0);
        this.controls.target.set(0, 0, 0);
        // Adjust controls to allow closer zoom
        this.controls.minDistance = Math.max(maxDim * 1.5, 5);
        this.controls.maxDistance = Math.max(maxDim * 8, 50);
        this.controls.update();
    }
    
    setViewMode(mode) {
        this.viewMode = mode;
        this.updateLayerVisibility();
    }
    
    setCurrentLayer(layer) {
        this.currentLayer = Math.max(0, Math.min(layer, this.dimensions.z - 1));
        this.updateLayerVisibility();
    }
    
    updateLayerVisibility() {
        this.cubes.forEach(cube => {
            const z = cube.userData.z;
            
            if (this.viewMode === 'xray') {
                // Show all layers but mute non-selected ones (Xray Mode)
                cube.visible = true;
                if (z === this.currentLayer) {
                    cube.material.opacity = 1;
                    cube.userData.wireframe.material.opacity = 1;
                } else {
                    cube.material.opacity = 0.15;
                    cube.userData.wireframe.material.opacity = 0.1;
                }
            } else if (this.viewMode === 'single') {
                // Show only the selected layer (Single Layer Mode)
                cube.visible = z === this.currentLayer;
                if (cube.visible) {
                    cube.material.opacity = 1;
                    cube.userData.wireframe.material.opacity = 1;
                }
            } else if (this.viewMode === 'all') {
                cube.visible = true;
                // Black cubes (color 0) should have lower opacity
                const colorValue = this.gridData[z][cube.userData.y][cube.userData.x];
                if (colorValue === 0) {
                    cube.material.opacity = 0.2;
                    cube.userData.wireframe.material.opacity = 0.15;
                } else {
                    cube.material.opacity = 0.9;
                    cube.userData.wireframe.material.opacity = 0.9;
                }
            }
        });
    }

    createCubeMaterial(x, y, z, colorValue) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 128;
        canvas.height = 128;

        const hexColor = '#' + getColorHex(colorValue).toString(16).padStart(6, '0');
        
        // Background
        context.fillStyle = hexColor;
        context.fillRect(0, 0, canvas.width, canvas.height);

        // Grid coordinates text: Z,Y,X (Layer, Row, Col)
        // This follows the "Top to Down, Left to Right" request for the primary slices
        const isDark = colorValue === 0 || colorValue === 1 || colorValue === 2 || colorValue === 8;
        context.fillStyle = isDark ? '#ffffff' : '#000000';
        context.font = 'bold 24px monospace';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(`${z},${y},${x}`, canvas.width / 2, canvas.height / 2);

        // Subtle border to see faces better
        context.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        context.lineWidth = 4;
        context.strokeRect(0, 0, canvas.width, canvas.height);

        const texture = new THREE.CanvasTexture(canvas);
        return new THREE.MeshStandardMaterial({
            map: texture,
            transparent: true,
            opacity: 1
        });
    }
    
    onMouseMove(event) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        if (this.isSelecting) {
            const currentX = event.clientX - rect.left;
            const currentY = event.clientY - rect.top;
            
            const left = Math.min(this.selectionStart.x, currentX);
            const top = Math.min(this.selectionStart.y, currentY);
            const width = Math.abs(currentX - this.selectionStart.x);
            const height = Math.abs(currentY - this.selectionStart.y);
            
            this.selectionOverlay.style.left = left + 'px';
            this.selectionOverlay.style.top = top + 'px';
            this.selectionOverlay.style.width = width + 'px';
            this.selectionOverlay.style.height = height + 'px';
            return;
        }
        
        this.updateHover();
    }
    
    updateHover() {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.cubes, false);
        
        if (this.hoveredCube) {
            this.hoveredCube.userData.wireframe.material.color.setHex(0x444444);
            this.hoveredCube.userData.wireframe.material.linewidth = 1;
        }
        
        if (intersects.length > 0) {
            let cube = null;
            
            if (this.viewMode === 'xray' || this.viewMode === 'single') {
                // In xray or single layer mode, find the first cube from the current layer
                // This allows clicking through other layers to reach the selected layer
                for (const intersect of intersects) {
                    if (intersect.object.userData.z === this.currentLayer) {
                        cube = intersect.object;
                        break;
                    }
                }
            } else {
                // In all layers mode, use the first intersection
                cube = intersects[0].object;
            }
            
            if (cube) {
                this.hoveredCube = cube;
                this.hoveredCube.userData.wireframe.material.color.setHex(0xffffff);
                this.canvas.style.cursor = 'pointer';
            } else {
                this.hoveredCube = null;
                this.canvas.style.cursor = 'default';
            }
        } else {
            this.hoveredCube = null;
            this.canvas.style.cursor = 'default';
        }
    }
    
    onMouseClick(event) {
        if (this.multiselectMode) return;
        if (!this.hoveredCube) return;
        
        const { x, y, z } = this.hoveredCube.userData;
        this.setCellColor(x, y, z, this.selectedColor);
    }
    
    onRightClick(event) {
        if (this.multiselectMode) return;
        if (!this.hoveredCube) return;
        
        const { x, y, z } = this.hoveredCube.userData;
        this.setCellColor(x, y, z, 0);
    }
    
    setCellColor(x, y, z, colorValue) {
        this.gridData[z][y][x] = colorValue;
        
        const cube = this.cubes.find(c => 
            c.userData.x === x && c.userData.y === y && c.userData.z === z
        );
        
        if (cube) {
            const oldMaterial = cube.material;
            cube.material = this.createCubeMaterial(x, y, z, colorValue);
            
            // Cleanup old material and texture
            if (oldMaterial.map) oldMaterial.map.dispose();
            oldMaterial.dispose();
        }
    }
    
    setSelectedColor(colorValue) {
        this.selectedColor = colorValue;
    }
    
    setMultiselectMode(enabled) {
        this.multiselectMode = enabled;
        if (enabled) {
            this.controls.enabled = false;
            this.canvas.style.cursor = 'crosshair';
        } else {
            this.controls.enabled = true;
            this.canvas.style.cursor = 'default';
            this.cancelSelection();
        }
    }
    
    onMouseDown(event) {
        if (!this.multiselectMode || event.button !== 0) return;
        if (this.viewMode !== 'single') return;
        
        const rect = this.canvas.getBoundingClientRect();
        this.isSelecting = true;
        this.selectionStart = {
            x: event.clientX - rect.left,
            y: event.clientY - rect.top,
            clientX: event.clientX,
            clientY: event.clientY
        };
        
        this.selectionOverlay.style.display = 'block';
        this.selectionOverlay.style.left = this.selectionStart.x + 'px';
        this.selectionOverlay.style.top = this.selectionStart.y + 'px';
        this.selectionOverlay.style.width = '0px';
        this.selectionOverlay.style.height = '0px';
    }
    
    onMouseUp(event) {
        if (!this.isSelecting) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const endX = event.clientX - rect.left;
        const endY = event.clientY - rect.top;
        
        this.applyRectangleSelection(this.selectionStart.x, this.selectionStart.y, endX, endY);
        this.cancelSelection();
    }
    
    onMouseLeave(event) {
        if (this.isSelecting) {
            this.cancelSelection();
        }
    }
    
    cancelSelection() {
        this.isSelecting = false;
        this.selectionStart = null;
        this.selectionOverlay.style.display = 'none';
    }
    
    applyRectangleSelection(startX, startY, endX, endY) {
        const minX = Math.min(startX, endX);
        const maxX = Math.max(startX, endX);
        const minY = Math.min(startY, endY);
        const maxY = Math.max(startY, endY);
        
        const currentLayerCubes = this.cubes.filter(cube => cube.userData.z === this.currentLayer);
        
        currentLayerCubes.forEach(cube => {
            const screenPos = this.getScreenPosition(cube);
            if (screenPos.x >= minX && screenPos.x <= maxX && 
                screenPos.y >= minY && screenPos.y <= maxY) {
                const { x, y, z } = cube.userData;
                this.setCellColor(x, y, z, this.selectedColor);
            }
        });
    }
    
    getScreenPosition(cube) {
        const vector = new THREE.Vector3();
        cube.getWorldPosition(vector);
        vector.project(this.camera);
        
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: (vector.x * 0.5 + 0.5) * rect.width,
            y: (-vector.y * 0.5 + 0.5) * rect.height
        };
    }
    
    getData() {
        return this.gridData;
    }
    
    setData(data) {
        this.gridData = data;
        this.cubes.forEach(cube => {
            const { x, y, z } = cube.userData;
            const colorValue = data[z][y][x];
            
            const oldMaterial = cube.material;
            cube.material = this.createCubeMaterial(x, y, z, colorValue);
            
            if (oldMaterial.map) oldMaterial.map.dispose();
            oldMaterial.dispose();
        });
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}

