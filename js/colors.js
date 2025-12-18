export const COLORS = {
    0: { hex: 0x000000, rgb: [0, 0, 0], name: 'Empty' },
    1: { hex: 0x0074D9, rgb: [0, 116, 217], name: 'Blue' },
    2: { hex: 0xFF4136, rgb: [255, 65, 54], name: 'Red' },
    3: { hex: 0x2ECC40, rgb: [46, 204, 64], name: 'Green' },
    4: { hex: 0xFFDC00, rgb: [255, 220, 0], name: 'Yellow' },
    5: { hex: 0xF012BE, rgb: [240, 18, 190], name: 'Magenta' },
    6: { hex: 0xFF851B, rgb: [255, 133, 27], name: 'Orange' },
    7: { hex: 0x7FDBFF, rgb: [127, 219, 255], name: 'Cyan' },
    8: { hex: 0xB10DC9, rgb: [177, 13, 201], name: 'Purple' },
    9: { hex: 0x39CCCC, rgb: [57, 204, 204], name: 'Teal' }
};

export function getColorHex(colorId) {
    return COLORS[colorId]?.hex || COLORS[0].hex;
}

export function getColorName(colorId) {
    return `${colorId} (${COLORS[colorId]?.name || 'Empty'})`;
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

