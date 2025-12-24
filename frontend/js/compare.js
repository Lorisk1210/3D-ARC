import { Grid3D } from './grid3d.js';
import { initializeColorPalette } from './colors.js';

class ComparisonApp {
    constructor() {
        this.puzzle = null;
        this.cacheResult = null;
        this.predictionGrid = null;
        this.solutionGrid = null;
        this.currentLayer = 0;
        this.viewMode = 'all';
        
        this.init();
    }
    
    async init() {
        const predictionCanvas = document.getElementById('canvas-prediction');
        const solutionCanvas = document.getElementById('canvas-solution');
        
        // Ensure canvases have proper CSS styling
        predictionCanvas.style.width = '100%';
        predictionCanvas.style.height = '100%';
        predictionCanvas.style.display = 'block';
        solutionCanvas.style.width = '100%';
        solutionCanvas.style.height = '100%';
        solutionCanvas.style.display = 'block';
        
        // Function to resize canvases
        const resizeCanvases = () => {
            const container = document.querySelector('.split-canvas-container');
            if (!container) return;
            
            const width = container.clientWidth / 2;
            const height = container.clientHeight;
            
            // Set actual canvas dimensions (not just CSS)
            predictionCanvas.width = width;
            predictionCanvas.height = height;
            solutionCanvas.width = width;
            solutionCanvas.height = height;
            
            if (this.predictionGrid3d) {
                this.predictionGrid3d.onWindowResize();
            }
            if (this.solutionGrid3d) {
                this.solutionGrid3d.onWindowResize();
            }
        };
        
        // Initialize grids first
        this.predictionGrid3d = new Grid3D(predictionCanvas);
        this.solutionGrid3d = new Grid3D(solutionCanvas);
        
        // Wait a bit for layout to settle, then resize
        setTimeout(() => {
            resizeCanvases();
        }, 100);
        
        window.addEventListener('resize', resizeCanvases);
        
        // Initialize simple palette (no interaction needed, just for colors)
        initializeColorPalette(null, () => {});
        
        // Load data
        await this.loadPuzzles();
        await this.loadModels();
        this.setupEventListeners();
        
        console.log('3D ARC Puzzle Comparison initialized!');
    }
    
    async loadPuzzles() {
        try {
            const response = await fetch('/api/puzzles');
            const data = await response.json();
            
            const select = document.getElementById('puzzle-select');
            select.innerHTML = '<option value="">Select a puzzle...</option>';
            
            data.puzzles.forEach(puzzle => {
                const option = document.createElement('option');
                option.value = puzzle.id;
                option.textContent = puzzle.filename;
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading puzzles:', error);
            const select = document.getElementById('puzzle-select');
            select.innerHTML = '<option value="">Error loading puzzles</option>';
        }
    }
    
    unsanitizeModelId(sanitized) {
        return sanitized.replace(/__/g, '/').replace(/--/g, ':');
    }
    
    async loadModels() {
        try {
            const response = await fetch('/api/cache/models');
            const data = await response.json();
            
            const select = document.getElementById('model-select');
            select.innerHTML = '<option value="">Select a model...</option>';
            
            data.models.forEach(model => {
                const option = document.createElement('option');
                option.value = model.id;
                option.textContent = this.unsanitizeModelId(model.id);
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading models:', error);
            const select = document.getElementById('model-select');
            select.innerHTML = '<option value="">Error loading models</option>';
        }
    }
    
    async loadResult() {
        const puzzleId = document.getElementById('puzzle-select').value;
        const modelId = document.getElementById('model-select').value;
        
        if (!puzzleId || !modelId) {
            alert('Please select both a puzzle and a model.');
            return;
        }
        
        // 1. Load Puzzle Data (for solution)
        try {
            const response = await fetch(`/api/puzzles/${puzzleId}`);
            if (!response.ok) throw new Error('Failed to load puzzle');
            const data = await response.json();
            this.puzzle = data.puzzle;
        } catch (error) {
            console.error('Error loading puzzle:', error);
            alert('Failed to load puzzle: ' + error.message);
            return;
        }
        
        // 2. Load Cache Result (for prediction)
        try {
            const response = await fetch(`/api/cache/${encodeURIComponent(modelId)}/${puzzleId}`);
            const data = await response.json();
            
            if (!data.success) {
                alert('No result found for this model on this puzzle.');
                return;
            }
            
            this.cacheResult = data.result;
            
            if (!this.cacheResult.prediction) {
                alert('This result has no prediction data (possibly a parse error).');
                return;
            }
            
            this.updateResultInfo();
            this.displayComparison();
            
        } catch (error) {
            console.error('Error loading cache result:', error);
            alert('Failed to load result: ' + error.message);
        }
    }
    
    updateResultInfo() {
        const info = document.getElementById('result-info');
        const statusBadge = document.getElementById('status-badge');
        const statusText = document.getElementById('status-text');
        const timeText = document.getElementById('time-text');
        const tokensText = document.getElementById('tokens-text');
        const costText = document.getElementById('cost-text');
        
        info.style.display = 'block';
        
        if (this.cacheResult.correct) {
            statusBadge.className = 'status-badge correct';
            statusText.textContent = 'Correct';
        } else {
            statusBadge.className = 'status-badge incorrect';
            statusText.textContent = 'Incorrect';
        }
        
        const seconds = (this.cacheResult.elapsedMs / 1000).toFixed(2);
        timeText.textContent = `${seconds}s`;
        
        const totalTokens = (this.cacheResult.promptTokens || 0) + (this.cacheResult.completionTokens || 0);
        tokensText.textContent = `${totalTokens.toLocaleString()} (${this.cacheResult.promptTokens || 0} + ${this.cacheResult.completionTokens || 0})`;
        
        const cost = this.cacheResult.cost || 0;
        costText.textContent = cost > 0 ? `$${cost.toFixed(6)}` : 'Free';
    }
    
    displayComparison() {
        if (!this.puzzle || !this.cacheResult || !this.cacheResult.prediction) {
            return;
        }
        
        const prediction = this.cacheResult.prediction;
        const solution = this.puzzle.solution;
        
        // Calculate dimensions
        const predDims = {
            z: prediction.length,
            y: prediction[0]?.length || 0,
            x: prediction[0]?.[0]?.length || 0
        };
        
        const solDims = {
            z: solution.length,
            y: solution[0]?.length || 0,
            x: solution[0]?.[0]?.length || 0
        };
        
        // Load grids
        this.predictionGrid3d.createGrid(predDims, prediction);
        this.solutionGrid3d.createGrid(solDims, solution);
        
        // Resize canvases after loading grids
        setTimeout(() => {
            const container = document.querySelector('.split-canvas-container');
            if (container) {
                const width = container.clientWidth / 2;
                const height = container.clientHeight;
                
                const predictionCanvas = document.getElementById('canvas-prediction');
                const solutionCanvas = document.getElementById('canvas-solution');
                
                predictionCanvas.width = width;
                predictionCanvas.height = height;
                solutionCanvas.width = width;
                solutionCanvas.height = height;
                
                this.predictionGrid3d.onWindowResize();
                this.solutionGrid3d.onWindowResize();
            }
        }, 50);
        
        this.updateLayerControls();
        this.syncViewMode();
    }
    
    updateLayerControls() {
        if (!this.puzzle || !this.puzzle.solution) return;
        
        const z = this.puzzle.solution.length;
        document.getElementById('total-layers').textContent = z;
        document.getElementById('current-layer').textContent = this.currentLayer + 1;
        
        this.predictionGrid3d.setCurrentLayer(this.currentLayer);
        this.solutionGrid3d.setCurrentLayer(this.currentLayer);
        
        // Disable/Enable buttons
        document.getElementById('prev-layer').disabled = this.currentLayer <= 0;
        document.getElementById('next-layer').disabled = this.currentLayer >= z - 1;
    }
    
    syncViewMode() {
        this.predictionGrid3d.setViewMode(this.viewMode);
        this.solutionGrid3d.setViewMode(this.viewMode);
        
        const layerControl = document.getElementById('layer-control-section');
        layerControl.style.display = this.viewMode === 'all' ? 'none' : 'block';
    }
    
    setupEventListeners() {
        document.getElementById('load-result-btn').addEventListener('click', () => {
            this.loadResult();
        });
        
        // Also auto-load if both are selected? Maybe better to keep explicit for now.
        
        document.querySelectorAll('input[name="view-mode"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.viewMode = e.target.value;
                this.syncViewMode();
            });
        });
        
        document.getElementById('prev-layer').addEventListener('click', () => {
            if (this.puzzle && this.puzzle.solution) {
                this.currentLayer = Math.max(0, this.currentLayer - 1);
                this.updateLayerControls();
            }
        });
        
        document.getElementById('next-layer').addEventListener('click', () => {
            if (this.puzzle && this.puzzle.solution) {
                const maxLayer = this.puzzle.solution.length - 1;
                this.currentLayer = Math.min(maxLayer, this.currentLayer + 1);
                this.updateLayerControls();
            }
        });
        
        window.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') {
                document.getElementById('prev-layer').click();
            } else if (e.key === 'ArrowRight') {
                document.getElementById('next-layer').click();
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ComparisonApp();
});
