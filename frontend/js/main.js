import { Grid3D } from './grid3d.js';
import { PuzzleManager } from './puzzleManager.js';
import { UIManager } from './ui.js';
import { initializeColorPalette } from './colors.js';

class App {
    constructor() {
        this.init();
    }
    
    init() {
        const canvas = document.getElementById('canvas3d');
        
        this.grid3d = new Grid3D(canvas);
        this.puzzleManager = new PuzzleManager();
        this.uiManager = new UIManager(this.grid3d, this.puzzleManager);
        
        const colorPalette = document.getElementById('color-palette');
        initializeColorPalette(colorPalette, (colorId) => {
            this.uiManager.selectColor(colorId);
        });
        
        this.uiManager.selectColor(0);
        this.uiManager.loadCurrentGrid();
        this.uiManager.updateUI();
        
        console.log('3D ARC Puzzle Builder initialized!');
        console.log('Controls:');
        console.log('- Left-click: Set cell to selected color');
        console.log('- Right-click: Clear cell (set to 0)');
        console.log('- Mouse drag: Rotate camera');
        console.log('- Mouse wheel: Zoom');
        console.log('- Arrow keys: Change layer');
        console.log('- Number keys 0-9: Select color');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new App();
});

