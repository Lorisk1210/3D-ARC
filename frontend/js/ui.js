import { showAlert, showConfirm } from './alert.js';

export class UIManager {
    constructor(grid3d, puzzleManager) {
        this.grid3d = grid3d;
        this.puzzleManager = puzzleManager;
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Tab switching for right panel
        document.querySelectorAll('.panel-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchTab(tabName);
            });
        });
        
        // Example buttons (will be regenerated dynamically)
        this.updateExampleButtons();
        
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.target.dataset.view;
                this.selectView(view);
            });
        });
        
        document.getElementById('prev-layer').addEventListener('click', () => {
            this.changeLayer(-1);
        });
        
        document.getElementById('next-layer').addEventListener('click', () => {
            this.changeLayer(1);
        });
        
        document.querySelectorAll('input[name="view-mode"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.grid3d.setViewMode(e.target.value);
                    this.updateLayerControlVisibility();
                    this.updateMultiselectVisibility();
                }
            });
        });
        
        document.getElementById('toggle-multiselect').addEventListener('click', () => {
            this.toggleMultiselect();
        });
        
        document.getElementById('apply-dimensions').addEventListener('click', () => {
            this.applyDimensions();
        });
        
        document.getElementById('apply-example-count').addEventListener('click', () => {
            this.applyExampleCount();
        });
        
        const advancedButton = document.getElementById('advanced-grid-mode');
        advancedButton.addEventListener('click', () => {
            const isCurrentlyAdvanced = this.puzzleManager.advancedMode;
            this.toggleAdvancedMode(!isCurrentlyAdvanced);
        });
        
        const advancedButtonAdvanced = document.getElementById('advanced-grid-mode-advanced');
        advancedButtonAdvanced.addEventListener('click', () => {
            this.toggleAdvancedMode(false);
        });
        
        document.getElementById('apply-advanced-dimensions').addEventListener('click', () => {
            this.applyAdvancedDimensions();
        });
        
        document.getElementById('copy-from-input').addEventListener('click', () => {
            this.copyFromInput();
        });
        
        document.getElementById('new-puzzle').addEventListener('click', async () => {
            if (await showConfirm('Create a new puzzle? Current puzzle will be lost.')) {
                this.newPuzzle();
            }
        });
        
        document.getElementById('clear-current').addEventListener('click', async () => {
            if (await showConfirm('Clear the current grid?')) {
                this.clearCurrent();
            }
        });
        
        document.getElementById('load-puzzle').addEventListener('click', () => {
            this.showPuzzleList();
        });
        
        document.getElementById('import-json').addEventListener('click', () => {
            document.getElementById('file-input').click();
        });
        
        document.getElementById('file-input').addEventListener('change', (e) => {
            this.importJSON(e.target.files[0]);
        });
        
        document.getElementById('export-json').addEventListener('click', () => {
            this.exportJSON();
        });
        
        document.getElementById('close-modal').addEventListener('click', () => {
            document.getElementById('puzzle-list-modal').style.display = 'none';
        });
        
        document.getElementById('puzzle-list-modal').addEventListener('click', (e) => {
            if (e.target.id === 'puzzle-list-modal') {
                document.getElementById('puzzle-list-modal').style.display = 'none';
            }
        });
        
        window.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') {
                this.changeLayer(-1);
            } else if (e.key === 'ArrowRight') {
                this.changeLayer(1);
            } else if (e.key >= '0' && e.key <= '9') {
                this.selectColorByKey(parseInt(e.key));
            }
        });
    }
    
    switchTab(tabName) {
        document.querySelectorAll('.panel-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`tab-${tabName}`).classList.add('active');
    }
    
    updateExampleButtons() {
        const navContainer = document.getElementById('puzzle-nav');
        navContainer.innerHTML = '';
        
        const numExamples = this.puzzleManager.numExamples;
        
        for (let i = 0; i < numExamples; i++) {
            const btn = document.createElement('button');
            btn.className = 'nav-btn';
            if (i === 0) btn.classList.add('active');
            btn.dataset.example = i;
            btn.textContent = `Example ${i + 1}`;
            btn.addEventListener('click', (e) => {
                const example = parseInt(e.target.dataset.example);
                this.selectExample(example);
            });
            navContainer.appendChild(btn);
        }
        
        const testBtn = document.createElement('button');
        testBtn.className = 'nav-btn';
        testBtn.dataset.example = numExamples;
        testBtn.textContent = 'Test';
        testBtn.addEventListener('click', (e) => {
            const example = parseInt(e.target.dataset.example);
            this.selectExample(example);
        });
        navContainer.appendChild(testBtn);
    }
    
    applyExampleCount() {
        const count = parseInt(document.getElementById('example-count').value);
        if (count < 1 || count > 10) {
            showAlert('Number of examples must be between 1 and 10');
            return;
        }
        
        this.saveCurrentGrid();
        this.puzzleManager.setNumExamples(count);
        this.updateExampleButtons();
        this.loadCurrentGrid();
        this.updateUI();
        
        if (this.puzzleManager.advancedMode) {
            this.updateAdvancedDimensionsUI();
        }
    }
    
    selectExample(index) {
        this.saveCurrentGrid();
        
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const btn = document.querySelector(`[data-example="${index}"]`);
        if (btn) {
            btn.classList.add('active');
        }
        
        this.puzzleManager.setCurrentExample(index);
        
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-view="${this.puzzleManager.currentView}"]`).classList.add('active');
        
        this.loadCurrentGrid();
        this.updateUI();
        this.updateCopyButtonVisibility();
    }
    
    selectView(view) {
        this.saveCurrentGrid();
        
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-view="${view}"]`).classList.add('active');
        
        this.puzzleManager.setCurrentView(view);
        this.loadCurrentGrid();
        this.updateUI();
        this.updateCopyButtonVisibility();
    }
    
    changeLayer(delta) {
        const newLayer = this.grid3d.currentLayer + delta;
        const maxLayer = this.grid3d.dimensions.z - 1;
        
        if (newLayer >= 0 && newLayer <= maxLayer) {
            this.setLayer(newLayer);
        }
    }
    
    setLayer(layer) {
        this.grid3d.setCurrentLayer(layer);
        this.updateLayerDisplay();
    }
    
    updateLayerDisplay() {
        const currentLayer = this.grid3d.currentLayer + 1;
        const totalLayers = this.grid3d.dimensions.z;
        
        document.getElementById('current-layer').textContent = currentLayer;
        document.getElementById('total-layers').textContent = totalLayers;
        
        document.getElementById('prev-layer').disabled = currentLayer === 1;
        document.getElementById('next-layer').disabled = currentLayer === totalLayers;
    }
    
    updateLayerControlVisibility() {
        const layerControlSection = document.getElementById('layer-control-section');
        if (this.grid3d.viewMode === 'all') {
            layerControlSection.style.display = 'none';
        } else {
            layerControlSection.style.display = 'block';
        }
    }
    
    updateMultiselectVisibility() {
        const multiselectControl = document.getElementById('multiselect-control');
        const toggleBtn = document.getElementById('toggle-multiselect');
        
        if (this.grid3d.viewMode === 'single') {
            multiselectControl.style.display = 'block';
        } else {
            multiselectControl.style.display = 'none';
            toggleBtn.classList.remove('active');
            this.grid3d.setMultiselectMode(false);
        }
    }
    
    toggleMultiselect() {
        const toggleBtn = document.getElementById('toggle-multiselect');
        const isActive = toggleBtn.classList.contains('active');
        
        if (isActive) {
            toggleBtn.classList.remove('active');
            this.grid3d.setMultiselectMode(false);
        } else {
            toggleBtn.classList.add('active');
            this.grid3d.setMultiselectMode(true);
        }
    }
    
    updateCopyButtonVisibility() {
        const copyButton = document.getElementById('copy-from-input');
        const view = this.puzzleManager.currentView;
        const inputDims = this.puzzleManager.inputDimensions;
        const outputDims = this.puzzleManager.outputDimensions;
        
        const sizesMatch = inputDims.x === outputDims.x && 
                          inputDims.y === outputDims.y && 
                          inputDims.z === outputDims.z;
        
        if (view === 'output' && sizesMatch) {
            copyButton.style.display = 'block';
        } else {
            copyButton.style.display = 'none';
        }
    }
    
    copyFromInput() {
        const inputGrid = this.puzzleManager.getCurrentInputGrid();
        const copiedGrid = this.puzzleManager.deepCopyGrid(inputGrid);
        this.puzzleManager.setCurrentGrid(copiedGrid);
        this.loadCurrentGrid();
    }
    
    applyDimensions() {
        const inputX = parseInt(document.getElementById('input-x').value);
        const inputY = parseInt(document.getElementById('input-y').value);
        const inputZ = parseInt(document.getElementById('input-z').value);
        
        const outputX = parseInt(document.getElementById('output-x').value);
        const outputY = parseInt(document.getElementById('output-y').value);
        const outputZ = parseInt(document.getElementById('output-z').value);
        
        this.puzzleManager.setDimensions('input', { x: inputX, y: inputY, z: inputZ });
        this.puzzleManager.setDimensions('output', { x: outputX, y: outputY, z: outputZ });
        
        this.loadCurrentGrid();
        this.updateUI();
        this.updateCopyButtonVisibility();
    }
    
    toggleAdvancedMode(enabled) {
        if (enabled && !this.puzzleManager.advancedMode) {
            const numExamples = this.puzzleManager.numExamples;
            const testIndex = numExamples;
            
            for (let i = 0; i < numExamples; i++) {
                if (!this.puzzleManager.exampleDimensions[i]) {
                    this.puzzleManager.exampleDimensions[i] = {
                        input: { ...this.puzzleManager.inputDimensions },
                        output: { ...this.puzzleManager.outputDimensions }
                    };
                }
            }
            
            if (!this.puzzleManager.exampleDimensions[testIndex]) {
                this.puzzleManager.exampleDimensions[testIndex] = {
                    input: { ...this.puzzleManager.inputDimensions },
                    output: { ...this.puzzleManager.outputDimensions }
                };
            }
        }
        
        this.puzzleManager.advancedMode = enabled;
        const standardControls = document.getElementById('standard-dimension-controls');
        const advancedControls = document.getElementById('advanced-dimension-controls');
        const advancedButton = document.getElementById('advanced-grid-mode');
        const advancedButtonAdvanced = document.getElementById('advanced-grid-mode-advanced');
        
        if (enabled) {
            standardControls.style.display = 'none';
            advancedControls.style.display = 'block';
            advancedButton.textContent = 'Disable Advanced Mode';
            if (advancedButtonAdvanced) {
                advancedButtonAdvanced.textContent = 'Disable Advanced Mode';
            }
            this.updateAdvancedDimensionsUI();
        } else {
            standardControls.style.display = 'block';
            advancedControls.style.display = 'none';
            advancedButton.textContent = 'Enable Advanced Mode';
            if (advancedButtonAdvanced) {
                advancedButtonAdvanced.textContent = 'Disable Advanced Mode';
            }
        }
    }
    
    updateAdvancedDimensionsUI() {
        const container = document.getElementById('advanced-dimensions-list');
        container.innerHTML = '';
        
        const numExamples = this.puzzleManager.numExamples;
        
        for (let i = 0; i < numExamples; i++) {
            const exampleDims = this.puzzleManager.getExampleDimensions(i);
            
            const exampleDiv = document.createElement('div');
            exampleDiv.className = 'advanced-example-group';
            
            const title = document.createElement('h4');
            title.textContent = `Example ${i + 1}`;
            title.className = 'advanced-example-title';
            exampleDiv.appendChild(title);
            
            const inputGroup = this.createDimensionInputGroup(
                `example-${i}-input`,
                'Input',
                exampleDims.input
            );
            exampleDiv.appendChild(inputGroup);
            
            const outputGroup = this.createDimensionInputGroup(
                `example-${i}-output`,
                'Output',
                exampleDims.output
            );
            exampleDiv.appendChild(outputGroup);
            
            container.appendChild(exampleDiv);
        }
        
        const testDiv = document.createElement('div');
        testDiv.className = 'advanced-example-group';
        
        const testTitle = document.createElement('h4');
        testTitle.textContent = 'Test';
        testTitle.className = 'advanced-example-title';
        testDiv.appendChild(testTitle);
        
        const testDims = this.puzzleManager.getExampleDimensions(numExamples);
        
        const testInputGroup = this.createDimensionInputGroup(
            `example-${numExamples}-input`,
            'Input',
            testDims.input
        );
        testDiv.appendChild(testInputGroup);
        
        const testOutputGroup = this.createDimensionInputGroup(
            `example-${numExamples}-output`,
            'Output',
            testDims.output
        );
        testDiv.appendChild(testOutputGroup);
        
        container.appendChild(testDiv);
    }
    
    createDimensionInputGroup(idPrefix, label, dimensions) {
        const group = document.createElement('div');
        group.className = 'dim-group';
        
        const labelEl = document.createElement('label');
        labelEl.textContent = `${label} Grid (Z, Y, X):`;
        group.appendChild(labelEl);
        
        const inputs = document.createElement('div');
        inputs.className = 'dim-inputs';
        
        const zInput = document.createElement('input');
        zInput.type = 'number';
        zInput.id = `${idPrefix}-z`;
        zInput.min = '1';
        zInput.max = '10';
        zInput.value = dimensions.z;
        zInput.title = 'Layers (Z)';
        inputs.appendChild(zInput);
        
        const yInput = document.createElement('input');
        yInput.type = 'number';
        yInput.id = `${idPrefix}-y`;
        yInput.min = '1';
        yInput.max = '10';
        yInput.value = dimensions.y;
        yInput.title = 'Rows (Y)';
        inputs.appendChild(yInput);
        
        const xInput = document.createElement('input');
        xInput.type = 'number';
        xInput.id = `${idPrefix}-x`;
        xInput.min = '1';
        xInput.max = '10';
        xInput.value = dimensions.x;
        xInput.title = 'Columns (X)';
        inputs.appendChild(xInput);
        
        group.appendChild(inputs);
        return group;
    }
    
    applyAdvancedDimensions() {
        const numExamples = this.puzzleManager.numExamples;
        
        for (let i = 0; i < numExamples; i++) {
            const inputX = parseInt(document.getElementById(`example-${i}-input-x`).value);
            const inputY = parseInt(document.getElementById(`example-${i}-input-y`).value);
            const inputZ = parseInt(document.getElementById(`example-${i}-input-z`).value);
            
            const outputX = parseInt(document.getElementById(`example-${i}-output-x`).value);
            const outputY = parseInt(document.getElementById(`example-${i}-output-y`).value);
            const outputZ = parseInt(document.getElementById(`example-${i}-output-z`).value);
            
            this.puzzleManager.setExampleDimensions(i, 'input', { x: inputX, y: inputY, z: inputZ });
            this.puzzleManager.setExampleDimensions(i, 'output', { x: outputX, y: outputY, z: outputZ });
        }
        
        const testIndex = numExamples;
        const testInputX = parseInt(document.getElementById(`example-${testIndex}-input-x`).value);
        const testInputY = parseInt(document.getElementById(`example-${testIndex}-input-y`).value);
        const testInputZ = parseInt(document.getElementById(`example-${testIndex}-input-z`).value);
        
        const testOutputX = parseInt(document.getElementById(`example-${testIndex}-output-x`).value);
        const testOutputY = parseInt(document.getElementById(`example-${testIndex}-output-y`).value);
        const testOutputZ = parseInt(document.getElementById(`example-${testIndex}-output-z`).value);
        
        this.puzzleManager.setExampleDimensions(testIndex, 'input', { x: testInputX, y: testInputY, z: testInputZ });
        this.puzzleManager.setExampleDimensions(testIndex, 'output', { x: testOutputX, y: testOutputY, z: testOutputZ });
        
        this.loadCurrentGrid();
        this.updateUI();
        this.updateCopyButtonVisibility();
    }
    
    newPuzzle() {
        this.puzzleManager.newPuzzle();
        this.puzzleManager.setCurrentExample(0);
        this.puzzleManager.setCurrentView('input');
        
        this.updateExampleButtons();
        document.querySelector('[data-example="0"]').classList.add('active');
        
        document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector('[data-view="input"]').classList.add('active');
        
        document.getElementById('input-x').value = 3;
        document.getElementById('input-y').value = 3;
        document.getElementById('input-z').value = 3;
        document.getElementById('output-x').value = 3;
        document.getElementById('output-y').value = 3;
        document.getElementById('output-z').value = 3;
        document.getElementById('example-count').value = this.puzzleManager.numExamples;
        this.toggleAdvancedMode(false);
        
        this.loadCurrentGrid();
        this.updateUI();
    }
    
    clearCurrent() {
        const clearedGrid = this.puzzleManager.clearCurrentGrid();
        this.grid3d.setData(clearedGrid);
    }
    
    saveCurrentGrid() {
        const currentData = this.grid3d.getData();
        if (currentData) {
            this.puzzleManager.setCurrentGrid(currentData);
        }
    }
    
    loadCurrentGrid() {
        const grid = this.puzzleManager.getCurrentGrid();
        const dims = this.puzzleManager.getCurrentDimensions();
        this.grid3d.createGrid(dims, grid);
        this.updateLayerDisplay();
        this.updateLayerControlVisibility();
        this.updateCopyButtonVisibility();
    }
    
    updateUI() {
        const dims = this.puzzleManager.getCurrentDimensions();
        const view = this.puzzleManager.currentView;
        const example = this.puzzleManager.currentExample;
        
        if (!this.puzzleManager.advancedMode) {
            if (view === 'input') {
                document.getElementById('input-x').value = dims.x;
                document.getElementById('input-y').value = dims.y;
                document.getElementById('input-z').value = dims.z;
            } else {
                document.getElementById('output-x').value = dims.x;
                document.getElementById('output-y').value = dims.y;
                document.getElementById('output-z').value = dims.z;
            }
        } else {
            this.updateAdvancedDimensionsUI();
        }
        
        const exampleCountInput = document.getElementById('example-count');
        if (exampleCountInput) {
            exampleCountInput.value = this.puzzleManager.numExamples;
        }
        
        this.updateLayerDisplay();
        this.updateLayerControlVisibility();
        this.updateCopyButtonVisibility();
        this.updateMultiselectVisibility();
    }
    
    selectColor(colorId) {
        this.grid3d.setSelectedColor(colorId);
    }
    
    selectColorByKey(colorId) {
        document.querySelectorAll('.color-swatch').forEach(swatch => {
            swatch.classList.remove('selected');
        });
        document.querySelectorAll('.color-swatch')[colorId].classList.add('selected');
        this.selectColor(colorId);
    }
    
    async exportJSON() {
        this.saveCurrentGrid();
        
        if (!this.puzzleManager.validatePuzzle()) {
            showAlert('Puzzle is incomplete or invalid. Please ensure all grids are properly configured.');
            return;
        }
        
        const puzzle = JSON.parse(this.puzzleManager.exportToJSON());
        
        try {
            const response = await fetch('http://localhost:3000/api/puzzles', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(puzzle)
            });
            
            const result = await response.json();
            
            if (result.success) {
                showAlert(`Puzzle saved successfully! ID: ${result.id}`);
            } else {
                showAlert('Failed to save puzzle: ' + result.error);
            }
        } catch (error) {
            console.error('Error saving puzzle:', error);
            showAlert('Failed to save puzzle. Make sure the server is running on http://localhost:3000');
        }
    }
    
    async showPuzzleList() {
        const modal = document.getElementById('puzzle-list-modal');
        const listContainer = document.getElementById('puzzle-list');
        
        modal.style.display = 'flex';
        listContainer.innerHTML = '<p>Loading puzzles...</p>';
        
        try {
            const response = await fetch('http://localhost:3000/api/puzzles');
            const result = await response.json();
            
            if (result.success) {
                if (result.puzzles.length === 0) {
                    listContainer.innerHTML = '<p style="text-align: center; color: #999;">No saved puzzles found.</p>';
                } else {
                    listContainer.innerHTML = '';
                    result.puzzles.forEach(puzzle => {
                        const item = document.createElement('div');
                        item.className = 'puzzle-item';
                        
                        const info = document.createElement('div');
                        info.className = 'puzzle-item-info';
                        info.innerHTML = `<div class="puzzle-item-id">${puzzle.id}</div>`;
                        
                        item.appendChild(info);
                        
                        item.addEventListener('click', () => {
                            this.loadPuzzle(puzzle.id);
                        });
                        
                        listContainer.appendChild(item);
                    });
                }
            } else {
                listContainer.innerHTML = '<p style="color: #ff4136;">Error loading puzzles: ' + result.error + '</p>';
            }
        } catch (error) {
            console.error('Error loading puzzle list:', error);
            listContainer.innerHTML = '<p style="color: #ff4136;">Failed to load puzzles. Make sure the server is running on http://localhost:3000</p>';
        }
    }
    
    async loadPuzzle(id) {
        try {
            const response = await fetch(`http://localhost:3000/api/puzzles/${id}`);
            const result = await response.json();
            
            if (result.success) {
                const importResult = this.puzzleManager.importFromJSON(JSON.stringify(result.puzzle));
                
                if (importResult.success) {
                    this.puzzleManager.setCurrentExample(0);
                    this.puzzleManager.setCurrentView('input');

                    this.updateExampleButtons();
                    document.querySelector('[data-example="0"]').classList.add('active');

                    document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
                    document.querySelector('[data-view="input"]').classList.add('active');

                    document.getElementById('example-count').value = this.puzzleManager.numExamples;

                    // Enable advanced mode if the puzzle was saved in advanced mode
                    this.toggleAdvancedMode(importResult.advancedMode);

                    this.loadCurrentGrid();
                    this.updateUI();

                    document.getElementById('puzzle-list-modal').style.display = 'none';
                }
            } else {
                showAlert('Failed to load puzzle: ' + result.error);
            }
        } catch (error) {
            console.error('Error loading puzzle:', error);
            showAlert('Failed to load puzzle. Make sure the server is running.');
        }
    }
    
    async deletePuzzle(id) {
        try {
            const response = await fetch(`http://localhost:3000/api/puzzles/${id}`, {
                method: 'DELETE'
            });
            const result = await response.json();
            
            if (!result.success) {
                showAlert('Failed to delete puzzle: ' + result.error);
            }
        } catch (error) {
            console.error('Error deleting puzzle:', error);
            showAlert('Failed to delete puzzle.');
        }
    }
    
    importJSON(file) {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const jsonString = e.target.result;
            const result = this.puzzleManager.importFromJSON(jsonString);

            if (result.success) {
                this.puzzleManager.setCurrentExample(0);
                this.puzzleManager.setCurrentView('input');

                this.updateExampleButtons();
                document.querySelector('[data-example="0"]').classList.add('active');

                document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
                document.querySelector('[data-view="input"]').classList.add('active');

                document.getElementById('example-count').value = this.puzzleManager.numExamples;

                // Enable advanced mode if the puzzle was saved in advanced mode
                this.toggleAdvancedMode(result.advancedMode);

                this.loadCurrentGrid();
                this.updateUI();

                showAlert('Puzzle imported successfully!');
            }
        };
        reader.readAsText(file);

        document.getElementById('file-input').value = '';
    }
}

