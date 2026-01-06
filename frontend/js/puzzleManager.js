export class PuzzleManager {
    constructor() {
        this.numExamples = 2;
        this.puzzle = this.createEmptyPuzzle();
        this.currentExample = 0;
        this.currentView = 'input';
        this.inputDimensions = { x: 3, y: 3, z: 3 };
        this.outputDimensions = { x: 3, y: 3, z: 3 };
        this.exampleViewState = {}; // Track last view for each example
        this.advancedMode = false;
        this.exampleDimensions = {}; // Store per-example dimensions: { exampleIndex: { input: {x,y,z}, output: {x,y,z} } }
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
        if (this.advancedMode) {
            const exampleKey = this.currentExample;
            if (this.exampleDimensions[exampleKey]) {
                return this.currentView === 'input'
                    ? this.exampleDimensions[exampleKey].input || this.inputDimensions
                    : this.exampleDimensions[exampleKey].output || this.outputDimensions;
            }
        }
        return this.currentView === 'input' 
            ? this.inputDimensions 
            : this.outputDimensions;
    }
    
    getExampleDimensions(exampleIndex) {
        if (this.exampleDimensions[exampleIndex]) {
            return this.exampleDimensions[exampleIndex];
        }
        return {
            input: { ...this.inputDimensions },
            output: { ...this.outputDimensions }
        };
    }
    
    setExampleDimensions(exampleIndex, view, dimensions) {
        if (!this.exampleDimensions[exampleIndex]) {
            this.exampleDimensions[exampleIndex] = {
                input: { ...this.inputDimensions },
                output: { ...this.outputDimensions }
            };
        }
        this.exampleDimensions[exampleIndex][view] = { ...dimensions };
        
        const example = exampleIndex === this.numExamples 
            ? (view === 'input' ? this.puzzle.test[0] : null)
            : this.puzzle.train[exampleIndex];
        
        if (view === 'input') {
            if (exampleIndex === this.numExamples) {
                this.puzzle.test[0].input = this.resizeGrid(
                    this.puzzle.test[0].input,
                    dimensions
                );
            } else {
                example.input = this.resizeGrid(example.input, dimensions);
            }
        } else {
            if (exampleIndex === this.numExamples) {
                this.puzzle.solution = this.resizeGrid(
                    this.puzzle.solution,
                    dimensions
                );
            } else {
                example.output = this.resizeGrid(example.output, dimensions);
            }
        }
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
        if (this.advancedMode) {
            const currentExample = this.currentExample;
            this.setExampleDimensions(currentExample, view, dimensions);
        } else {
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
        this.exampleDimensions = {}; // Reset per-example dimensions
    }
    
    setNumExamples(count) {
        const oldCount = this.numExamples;
        this.numExamples = count;
        
        if (count > oldCount) {
            // Add new examples
            for (let i = oldCount; i < count; i++) {
                const inputDims = this.advancedMode && this.exampleDimensions[i]?.input
                    ? this.exampleDimensions[i].input
                    : this.inputDimensions;
                const outputDims = this.advancedMode && this.exampleDimensions[i]?.output
                    ? this.exampleDimensions[i].output
                    : this.outputDimensions;
                
                this.puzzle.train.push({
                    input: this.createEmptyGrid(
                        inputDims.x,
                        inputDims.y,
                        inputDims.z
                    ),
                    output: this.createEmptyGrid(
                        outputDims.x,
                        outputDims.y,
                        outputDims.z
                    )
                });
            }
        } else if (count < oldCount) {
            // Remove examples
            this.puzzle.train = this.puzzle.train.slice(0, count);
            
            // Clean up dimensions for removed examples
            for (let i = count; i < oldCount; i++) {
                delete this.exampleDimensions[i];
            }
            
            // Adjust current example if needed
            if (this.currentExample >= count) {
                this.currentExample = Math.max(0, count - 1);
            }
        }
    }
    
    exportToJSON() {
        const exportData = { ...this.puzzle };

        // Add metadata if in advanced mode
        if (this.advancedMode && Object.keys(this.exampleDimensions).length > 0) {
            exportData._metadata = {
                advancedMode: true,
                exampleDimensions: this.exampleDimensions,
                inputDimensions: this.inputDimensions,
                outputDimensions: this.outputDimensions
            };
        }

        return this.formatCompactJSON(exportData);
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

            // Check if this was saved in advanced mode
            let wasAdvancedMode = false;
            if (data._metadata && data._metadata.advancedMode) {
                wasAdvancedMode = true;
                this.advancedMode = true;
                this.exampleDimensions = { ...data._metadata.exampleDimensions };
                this.inputDimensions = { ...data._metadata.inputDimensions };
                this.outputDimensions = { ...data._metadata.outputDimensions };

                // Remove metadata from puzzle data
                delete this.puzzle._metadata;
            } else {
                // Extract dimensions from actual grid data for each example
                const allDimensions = [];
                
                for (let i = 0; i < data.train.length; i++) {
                    const input = data.train[i].input;
                    const output = data.train[i].output;
                    allDimensions.push({
                        input: {
                            z: input.length,
                            y: input[0].length,
                            x: input[0][0].length
                        },
                        output: {
                            z: output.length,
                            y: output[0].length,
                            x: output[0][0].length
                        }
                    });
                }
                
                // Add test dimensions
                const testInput = data.test[0].input;
                const solution = data.solution;
                const testDims = {
                    input: {
                        z: testInput.length,
                        y: testInput[0].length,
                        x: testInput[0][0].length
                    },
                    output: {
                        z: solution.length,
                        y: solution[0].length,
                        x: solution[0][0].length
                    }
                };
                
                // Check if all examples have the same dimensions
                const firstInput = allDimensions[0].input;
                const firstOutput = allDimensions[0].output;
                let hasDifferentDimensions = false;
                
                for (let i = 1; i < allDimensions.length; i++) {
                    const dims = allDimensions[i];
                    if (dims.input.x !== firstInput.x || dims.input.y !== firstInput.y || dims.input.z !== firstInput.z ||
                        dims.output.x !== firstOutput.x || dims.output.y !== firstOutput.y || dims.output.z !== firstOutput.z) {
                        hasDifferentDimensions = true;
                        break;
                    }
                }
                
                // Also check test dimensions
                if (!hasDifferentDimensions) {
                    if (testDims.input.x !== firstInput.x || testDims.input.y !== firstInput.y || testDims.input.z !== firstInput.z ||
                        testDims.output.x !== firstOutput.x || testDims.output.y !== firstOutput.y || testDims.output.z !== firstOutput.z) {
                        hasDifferentDimensions = true;
                    }
                }
                
                if (hasDifferentDimensions) {
                    // Enable advanced mode with per-example dimensions
                    wasAdvancedMode = true;
                    this.advancedMode = true;
                    this.exampleDimensions = {};
                    
                    for (let i = 0; i < allDimensions.length; i++) {
                        this.exampleDimensions[i] = allDimensions[i];
                    }
                    this.exampleDimensions[data.train.length] = testDims; // Test index
                    
                    // Use first example as global default
                    this.inputDimensions = { ...firstInput };
                    this.outputDimensions = { ...firstOutput };
                } else {
                    // All examples have same dimensions - standard mode
                    this.inputDimensions = { ...firstInput };
                    this.outputDimensions = { ...firstOutput };
                    this.exampleDimensions = {};
                    this.advancedMode = false;
                }
            }

            return { success: true, advancedMode: wasAdvancedMode };
        } catch (error) {
            console.error('Failed to import puzzle:', error);
            alert('Failed to import puzzle: ' + error.message);
            return { success: false, advancedMode: false };
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

