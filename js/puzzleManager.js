export class PuzzleManager {
    constructor() {
        this.puzzle = this.createEmptyPuzzle();
        this.currentExample = 0;
        this.currentView = 'input';
        this.inputDimensions = { x: 3, y: 3, z: 3 };
        this.outputDimensions = { x: 3, y: 3, z: 3 };
    }
    
    createEmptyPuzzle() {
        return {
            train: [
                {
                    input: this.createEmptyGrid(3, 3, 3),
                    output: this.createEmptyGrid(3, 3, 3)
                },
                {
                    input: this.createEmptyGrid(3, 3, 3),
                    output: this.createEmptyGrid(3, 3, 3)
                }
            ],
            test: [
                {
                    input: this.createEmptyGrid(3, 3, 3)
                }
            ],
            solution: this.createEmptyGrid(3, 3, 3)
        };
    }
    
    createEmptyGrid(x, y, z) {
        const grid = [];
        for (let zi = 0; zi < z; zi++) {
            const layer = [];
            for (let yi = 0; yi < y; yi++) {
                const row = [];
                for (let xi = 0; xi < x; xi++) {
                    row.push(0);
                }
                layer.push(row);
            }
            grid.push(layer);
        }
        return grid;
    }
    
    getCurrentGrid() {
        if (this.currentExample === 2) {
            return this.currentView === 'input' 
                ? this.puzzle.test[0].input 
                : this.puzzle.solution;
        } else {
            const example = this.puzzle.train[this.currentExample];
            return this.currentView === 'input' 
                ? example.input 
                : example.output;
        }
    }
    
    setCurrentGrid(data) {
        if (this.currentExample === 2) {
            if (this.currentView === 'input') {
                this.puzzle.test[0].input = data;
            } else {
                this.puzzle.solution = data;
            }
        } else {
            const example = this.puzzle.train[this.currentExample];
            if (this.currentView === 'input') {
                example.input = data;
            } else {
                example.output = data;
            }
        }
    }
    
    getCurrentDimensions() {
        return this.currentView === 'input' 
            ? this.inputDimensions 
            : this.outputDimensions;
    }
    
    setCurrentExample(index) {
        this.currentExample = index;
    }
    
    setCurrentView(view) {
        this.currentView = view;
    }
    
    setDimensions(view, dimensions) {
        if (view === 'input') {
            this.inputDimensions = { ...dimensions };
            this.puzzle.train[0].input = this.resizeGrid(
                this.puzzle.train[0].input, 
                dimensions
            );
            this.puzzle.train[1].input = this.resizeGrid(
                this.puzzle.train[1].input, 
                dimensions
            );
            this.puzzle.test[0].input = this.resizeGrid(
                this.puzzle.test[0].input, 
                dimensions
            );
        } else {
            this.outputDimensions = { ...dimensions };
            this.puzzle.train[0].output = this.resizeGrid(
                this.puzzle.train[0].output, 
                dimensions
            );
            this.puzzle.train[1].output = this.resizeGrid(
                this.puzzle.train[1].output, 
                dimensions
            );
            this.puzzle.solution = this.resizeGrid(
                this.puzzle.solution, 
                dimensions
            );
        }
    }
    
    resizeGrid(oldGrid, newDimensions) {
        const newGrid = this.createEmptyGrid(
            newDimensions.x, 
            newDimensions.y, 
            newDimensions.z
        );
        
        const oldDims = {
            z: oldGrid.length,
            y: oldGrid[0].length,
            x: oldGrid[0][0].length
        };
        
        const copyZ = Math.min(oldDims.z, newDimensions.z);
        const copyY = Math.min(oldDims.y, newDimensions.y);
        const copyX = Math.min(oldDims.x, newDimensions.x);
        
        for (let z = 0; z < copyZ; z++) {
            for (let y = 0; y < copyY; y++) {
                for (let x = 0; x < copyX; x++) {
                    newGrid[z][y][x] = oldGrid[z][y][x];
                }
            }
        }
        
        return newGrid;
    }
    
    clearCurrentGrid() {
        const dims = this.getCurrentDimensions();
        const emptyGrid = this.createEmptyGrid(dims.x, dims.y, dims.z);
        this.setCurrentGrid(emptyGrid);
        return emptyGrid;
    }
    
    newPuzzle() {
        this.puzzle = this.createEmptyPuzzle();
        this.inputDimensions = { x: 3, y: 3, z: 3 };
        this.outputDimensions = { x: 3, y: 3, z: 3 };
        this.currentExample = 0;
        this.currentView = 'input';
    }
    
    exportToJSON() {
        return JSON.stringify(this.puzzle, null, 2);
    }
    
    importFromJSON(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            
            if (!data.train || data.train.length !== 2) {
                throw new Error('Invalid puzzle format: must have exactly 2 training examples');
            }
            
            if (!data.test || data.test.length !== 1) {
                throw new Error('Invalid puzzle format: must have exactly 1 test example');
            }
            
            if (!data.solution) {
                throw new Error('Invalid puzzle format: must have a solution');
            }
            
            this.puzzle = data;
            
            const input0 = data.train[0].input;
            this.inputDimensions = {
                z: input0.length,
                y: input0[0].length,
                x: input0[0][0].length
            };
            
            const output0 = data.train[0].output;
            this.outputDimensions = {
                z: output0.length,
                y: output0[0].length,
                x: output0[0][0].length
            };
            
            return true;
        } catch (error) {
            console.error('Failed to import puzzle:', error);
            alert('Failed to import puzzle: ' + error.message);
            return false;
        }
    }
    
    validatePuzzle() {
        try {
            if (this.puzzle.train.length !== 2) return false;
            if (this.puzzle.test.length !== 1) return false;
            if (!this.puzzle.solution) return false;
            
            for (const example of this.puzzle.train) {
                if (!example.input || !example.output) return false;
            }
            
            if (!this.puzzle.test[0].input) return false;
            
            return true;
        } catch (error) {
            return false;
        }
    }
}

