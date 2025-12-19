export class UIManager {
    constructor(grid3d, puzzleManager) {
        this.grid3d = grid3d;
        this.puzzleManager = puzzleManager;
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const example = parseInt(e.target.dataset.example);
                this.selectExample(example);
            });
        });
        
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
                }
            });
        });
        
        document.getElementById('apply-dimensions').addEventListener('click', () => {
            this.applyDimensions();
        });
        
        document.getElementById('copy-from-input').addEventListener('click', () => {
            this.copyFromInput();
        });
        
        document.getElementById('new-puzzle').addEventListener('click', () => {
            if (confirm('Create a new puzzle? Current puzzle will be lost.')) {
                this.newPuzzle();
            }
        });
        
        document.getElementById('clear-current').addEventListener('click', () => {
            if (confirm('Clear the current grid?')) {
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
    
    selectExample(index) {
        this.saveCurrentGrid();
        
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-example="${index}"]`).classList.add('active');
        
        this.puzzleManager.setCurrentExample(index);
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
    
    newPuzzle() {
        this.puzzleManager.newPuzzle();
        this.puzzleManager.setCurrentExample(0);
        this.puzzleManager.setCurrentView('input');
        
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector('[data-example="0"]').classList.add('active');
        
        document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector('[data-view="input"]').classList.add('active');
        
        document.getElementById('input-x').value = 3;
        document.getElementById('input-y').value = 3;
        document.getElementById('input-z').value = 3;
        document.getElementById('output-x').value = 3;
        document.getElementById('output-y').value = 3;
        document.getElementById('output-z').value = 3;
        
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
        
        if (view === 'input') {
            document.getElementById('input-x').value = dims.x;
            document.getElementById('input-y').value = dims.y;
            document.getElementById('input-z').value = dims.z;
        } else {
            document.getElementById('output-x').value = dims.x;
            document.getElementById('output-y').value = dims.y;
            document.getElementById('output-z').value = dims.z;
        }
        
        this.updateLayerDisplay();
        this.updateLayerControlVisibility();
        this.updateCopyButtonVisibility();
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
            alert('Puzzle is incomplete or invalid. Please ensure all grids are properly configured.');
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
                alert(`Puzzle saved successfully! ID: ${result.id}`);
            } else {
                alert('Failed to save puzzle: ' + result.error);
            }
        } catch (error) {
            console.error('Error saving puzzle:', error);
            alert('Failed to save puzzle. Make sure the server is running on http://localhost:3000');
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
                        info.innerHTML = `<div>Puzzle</div><div class="puzzle-item-id">${puzzle.id}</div>`;
                        
                        const deleteBtn = document.createElement('button');
                        deleteBtn.className = 'puzzle-item-delete';
                        deleteBtn.textContent = 'Delete';
                        deleteBtn.addEventListener('click', async (e) => {
                            e.stopPropagation();
                            if (confirm('Delete this puzzle?')) {
                                await this.deletePuzzle(puzzle.id);
                                this.showPuzzleList();
                            }
                        });
                        
                        item.appendChild(info);
                        item.appendChild(deleteBtn);
                        
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
                const success = this.puzzleManager.importFromJSON(JSON.stringify(result.puzzle));
                
                if (success) {
                    this.puzzleManager.setCurrentExample(0);
                    this.puzzleManager.setCurrentView('input');
                    
                    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
                    document.querySelector('[data-example="0"]').classList.add('active');
                    
                    document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
                    document.querySelector('[data-view="input"]').classList.add('active');
                    
                    this.loadCurrentGrid();
                    this.updateUI();
                    
                    document.getElementById('puzzle-list-modal').style.display = 'none';
                    alert('Puzzle loaded successfully!');
                }
            } else {
                alert('Failed to load puzzle: ' + result.error);
            }
        } catch (error) {
            console.error('Error loading puzzle:', error);
            alert('Failed to load puzzle. Make sure the server is running.');
        }
    }
    
    async deletePuzzle(id) {
        try {
            const response = await fetch(`http://localhost:3000/api/puzzles/${id}`, {
                method: 'DELETE'
            });
            const result = await response.json();
            
            if (!result.success) {
                alert('Failed to delete puzzle: ' + result.error);
            }
        } catch (error) {
            console.error('Error deleting puzzle:', error);
            alert('Failed to delete puzzle.');
        }
    }
    
    importJSON(file) {
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const jsonString = e.target.result;
            const success = this.puzzleManager.importFromJSON(jsonString);
            
            if (success) {
                this.puzzleManager.setCurrentExample(0);
                this.puzzleManager.setCurrentView('input');
                
                document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
                document.querySelector('[data-example="0"]').classList.add('active');
                
                document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
                document.querySelector('[data-view="input"]').classList.add('active');
                
                this.loadCurrentGrid();
                this.updateUI();
                
                alert('Puzzle imported successfully!');
            }
        };
        reader.readAsText(file);
        
        document.getElementById('file-input').value = '';
    }
}

