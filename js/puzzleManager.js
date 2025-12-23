export class PuzzleManager {
    constructor() {
        this.numExamples = 2;
        this.puzzle = this.createEmptyPuzzle();
        this.currentExample = 0;
        this.currentView = 'input';
        this.inputDimensions = { x: 3, y: 3, z: 3 };
        this.outputDimensions = { x: 3, y: 3, z: 3 };
        this.exampleViewState = {}; // Track last view for each example
    }
    
    createEmptyPuzzle() {
        const train = [];
        for (let i = 0; i < this.numExamples; i++) {
            train.push({
                input: this.createEmptyGrid(3, 3, 3),
                output: this.createEmptyGrid(3, 3, 3)
            });
        }
        return {
            train: train,
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
        const testIndex = this.numExamples;
        if (this.currentExample === testIndex) {
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
    
    getCurrentInputGrid() {
        const testIndex = this.numExamples;
        if (this.currentExample === testIndex) {
            return this.puzzle.test[0].input;
        } else {
            const example = this.puzzle.train[this.currentExample];
            return example.input;
        }
    }
    
    deepCopyGrid(grid) {
        return grid.map(layer => 
            layer.map(row => 
                row.slice()
            )
        );
    }
    
    setCurrentGrid(data) {
        const testIndex = this.numExamples;
        if (this.currentExample === testIndex) {
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
        // Restore the last view for this example, or default to 'input' if first time
        if (this.exampleViewState[index] !== undefined) {
            this.currentView = this.exampleViewState[index];
        } else {
            this.currentView = 'input';
            this.exampleViewState[index] = 'input';
        }
    }
    
    setCurrentView(view) {
        this.currentView = view;
        // Remember this view for the current example
        this.exampleViewState[this.currentExample] = view;
    }
    
    setDimensions(view, dimensions) {
        if (view === 'input') {
            this.inputDimensions = { ...dimensions };
            for (let i = 0; i < this.puzzle.train.length; i++) {
                this.puzzle.train[i].input = this.resizeGrid(
                    this.puzzle.train[i].input, 
                    dimensions
                );
            }
            this.puzzle.test[0].input = this.resizeGrid(
                this.puzzle.test[0].input, 
                dimensions
            );
        } else {
            this.outputDimensions = { ...dimensions };
            for (let i = 0; i < this.puzzle.train.length; i++) {
                this.puzzle.train[i].output = this.resizeGrid(
                    this.puzzle.train[i].output, 
                    dimensions
                );
            }
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
        this.exampleViewState = {}; // Reset view state tracking
    }
    
    setNumExamples(count) {
        const oldCount = this.numExamples;
        this.numExamples = count;
        
        if (count > oldCount) {
            // Add new examples
            for (let i = oldCount; i < count; i++) {
                this.puzzle.train.push({
                    input: this.createEmptyGrid(
                        this.inputDimensions.x,
                        this.inputDimensions.y,
                        this.inputDimensions.z
                    ),
                    output: this.createEmptyGrid(
                        this.outputDimensions.x,
                        this.outputDimensions.y,
                        this.outputDimensions.z
                    )
                });
            }
        } else if (count < oldCount) {
            // Remove examples
            this.puzzle.train = this.puzzle.train.slice(0, count);
            
            // Adjust current example if needed
            if (this.currentExample >= count) {
                this.currentExample = Math.max(0, count - 1);
            }
        }
    }
    
    exportToJSON() {
        return this.formatCompactJSON(this.puzzle);
    }
    
    isNumberArray(arr) {
        return Array.isArray(arr) && arr.every(item => typeof item === 'number');
    }
    
    formatCompactJSON(obj, indent = 0) {
        const indentStr = ' '.repeat(indent);
        const nextIndent = indent + 2;
        const nextIndentStr = ' '.repeat(nextIndent);
        
        if (Array.isArray(obj)) {
            if (this.isNumberArray(obj)) {
                return '[' + obj.join(', ') + ']';
            }
            if (obj.length === 0) return '[]';
            
            const items = obj.map(item => {
                if (this.isNumberArray(item)) {
                    return nextIndentStr + '[' + item.join(', ') + ']';
                }
                return nextIndentStr + this.formatCompactJSON(item, nextIndent).trim();
            });
            return '[\n' + items.join(',\n') + '\n' + indentStr + ']';
        }
        
        if (obj !== null && typeof obj === 'object') {
            const keys = Object.keys(obj);
            if (keys.length === 0) return '{}';
            
            const items = keys.map(key => {
                const value = obj[key];
                let formattedValue;
                if (this.isNumberArray(value)) {
                    formattedValue = '[' + value.join(', ') + ']';
                } else {
                    formattedValue = this.formatCompactJSON(value, nextIndent);
                }
                return nextIndentStr + '"' + key + '": ' + formattedValue;
            });
            return '{\n' + items.join(',\n') + '\n' + indentStr + '}';
        }
        
        return JSON.stringify(obj);
    }
    
    importFromJSON(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            
            if (!data.train || data.train.length < 1) {
                throw new Error('Invalid puzzle format: must have at least 1 training example');
            }
            
            if (!data.test || data.test.length !== 1) {
                throw new Error('Invalid puzzle format: must have exactly 1 test example');
            }
            
            if (!data.solution) {
                throw new Error('Invalid puzzle format: must have a solution');
            }
            
            this.numExamples = data.train.length;
            this.puzzle = data;
            this.exampleViewState = {}; // Reset view state tracking when importing
            
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
            if (this.puzzle.train.length < 1) return false;
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

