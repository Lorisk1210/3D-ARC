const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3000;
const PUZZLES_DIR = path.join(__dirname, 'puzzles');
const FRONTEND_DIR = path.join(__dirname, 'frontend');
const CACHE_DIR = path.join(__dirname, 'benchmark', 'cache');

function isNumberArray(arr) {
    return Array.isArray(arr) && arr.every(item => typeof item === 'number');
}

function formatCompactJSON(obj, indent = 0) {
    const indentStr = ' '.repeat(indent);
    const nextIndent = indent + 2;
    const nextIndentStr = ' '.repeat(nextIndent);
    
    if (Array.isArray(obj)) {
        if (isNumberArray(obj)) {
            return '[' + obj.join(', ') + ']';
        }
        if (obj.length === 0) return '[]';
        
        const items = obj.map(item => {
            if (isNumberArray(item)) {
                return nextIndentStr + '[' + item.join(', ') + ']';
            }
            return nextIndentStr + formatCompactJSON(item, nextIndent).trim();
        });
        return '[\n' + items.join(',\n') + '\n' + indentStr + ']';
    }
    
    if (obj !== null && typeof obj === 'object') {
        const keys = Object.keys(obj);
        if (keys.length === 0) return '{}';
        
        const items = keys.map(key => {
            const value = obj[key];
            let formattedValue;
            if (isNumberArray(value)) {
                formattedValue = '[' + value.join(', ') + ']';
            } else {
                formattedValue = formatCompactJSON(value, nextIndent);
            }
            return nextIndentStr + '"' + key + '": ' + formattedValue;
        });
        return '{\n' + items.join(',\n') + '\n' + indentStr + '}';
    }
    
    return JSON.stringify(obj);
}

app.use(cors());
app.use(express.json());
app.use(express.static(FRONTEND_DIR));

async function ensurePuzzlesDir() {
    try {
        await fs.access(PUZZLES_DIR);
    } catch {
        await fs.mkdir(PUZZLES_DIR, { recursive: true });
    }
}

app.post('/api/puzzles', async (req, res) => {
    try {
        await ensurePuzzlesDir();
        
        const puzzle = req.body;
        const id = uuidv4();
        const filePath = path.join(PUZZLES_DIR, `${id}.json`);
        
        await fs.writeFile(filePath, formatCompactJSON(puzzle) + '\n', 'utf8');
        
        res.json({ success: true, id: id });
    } catch (error) {
        console.error('Error saving puzzle:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/puzzles', async (req, res) => {
    try {
        await ensurePuzzlesDir();
        
        const files = await fs.readdir(PUZZLES_DIR);
        const puzzles = files
            .filter(file => file.endsWith('.json'))
            .map(file => ({
                id: file.replace('.json', ''),
                filename: file
            }));
        
        res.json({ success: true, puzzles: puzzles });
    } catch (error) {
        console.error('Error listing puzzles:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/puzzles/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const filePath = path.join(PUZZLES_DIR, `${id}.json`);
        
        const data = await fs.readFile(filePath, 'utf8');
        const puzzle = JSON.parse(data);
        
        res.json({ success: true, puzzle: puzzle });
    } catch (error) {
        console.error('Error loading puzzle:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/puzzles/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const filePath = path.join(PUZZLES_DIR, `${id}.json`);
        
        await fs.unlink(filePath);
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting puzzle:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/cache/models', async (req, res) => {
    try {
        const models = [];
        
        if (await fs.access(CACHE_DIR).then(() => true).catch(() => false)) {
            const entries = await fs.readdir(CACHE_DIR, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    models.push({ id: entry.name });
                }
            }
        }
        
        res.json({ success: true, models: models });
    } catch (error) {
        console.error('Error listing cache models:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/cache/:modelId/:puzzleId', async (req, res) => {
    try {
        const modelId = req.params.modelId;
        const puzzleId = req.params.puzzleId;
        const cachePath = path.join(CACHE_DIR, modelId, `${puzzleId}.json`);
        
        const data = await fs.readFile(cachePath, 'utf8');
        const result = JSON.parse(data);
        
        res.json({ success: true, result: result });
    } catch (error) {
        if (error.code === 'ENOENT') {
            res.status(404).json({ success: false, error: 'Cache result not found' });
        } else {
            console.error('Error loading cache result:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    ensurePuzzlesDir().then(() => {
        console.log(`Puzzles directory ready at ${PUZZLES_DIR}`);
    });
});

