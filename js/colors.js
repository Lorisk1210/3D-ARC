export const COLORS = {
    0: { hex: 0x000000, rgb: [0, 0, 0], name: 'Empty' },
    1: { hex: 0x0066FF, rgb: [0, 102, 255], name: 'Blue' },
    2: { hex: 0xFF0000, rgb: [255, 0, 0], name: 'Red' },
    3: { hex: 0x00FF00, rgb: [0, 255, 0], name: 'Green' },
    4: { hex: 0xFFFF00, rgb: [255, 255, 0], name: 'Yellow' },
    5: { hex: 0xFF00FF, rgb: [255, 0, 255], name: 'Magenta' },
    6: { hex: 0xFF6600, rgb: [255, 102, 0], name: 'Orange' },
    7: { hex: 0x00FFFF, rgb: [0, 255, 255], name: 'Cyan' },
    8: { hex: 0x9900FF, rgb: [153, 0, 255], name: 'Purple' },
    9: { hex: 0x8B4513, rgb: [139, 69, 19], name: 'Brown' }
};

export function getColorHex(colorId) {
    return COLORS[colorId]?.hex || COLORS[0].hex;
}

export function getColorName(colorId) {
    return COLORS[colorId]?.name || 'Empty';
}

export function getColorRGB(colorId) {
    return COLORS[colorId]?.rgb || COLORS[0].rgb;
}

export function initializeColorPalette(container, onColorSelect) {
    container.innerHTML = '';
    
    for (let i = 0; i < 10; i++) {
        const swatch = document.createElement('div');
        swatch.className = 'color-swatch';
        if (i === 0) swatch.classList.add('selected');
        
        const rgb = getColorRGB(i);
        swatch.style.backgroundColor = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
        
        if (i === 0) {
            swatch.style.border = '3px solid #666';
            swatch.style.backgroundImage = 
                'repeating-linear-gradient(45deg, transparent, transparent 2px, #333 2px, #333 4px)';
        }
        
        const label = document.createElement('span');
        label.className = 'color-swatch-label';
        label.textContent = i;
        swatch.appendChild(label);
        
        swatch.addEventListener('click', () => {
            document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
            swatch.classList.add('selected');
            onColorSelect(i);
        });
        
        container.appendChild(swatch);
    }
}

