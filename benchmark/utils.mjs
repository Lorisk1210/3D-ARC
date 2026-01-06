import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

export function stableStringify(value) {
  return JSON.stringify(value, (_k, v) => v, 2);
}

export async function readJsonFile(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

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
      } else if (Array.isArray(value) && value.length > 0 && Array.isArray(value[0]) && value[0].length > 0 && Array.isArray(value[0][0])) {
        // This is a 3D grid (prediction), format it compactly
        formattedValue = formatCompactJSON(value, nextIndent);
      } else {
        formattedValue = formatCompactJSON(value, nextIndent);
      }
      return nextIndentStr + '"' + key + '": ' + formattedValue;
    });
    return '{\n' + items.join(',\n') + '\n' + indentStr + '}';
  }
  
  return JSON.stringify(obj);
}

export async function writeJsonFile(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, formatCompactJSON(data) + '\n', 'utf8');
}

export async function listJsonFiles(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && e.name.endsWith('.json'))
    .map((e) => path.join(dirPath, e.name));
}

export function sanitizeForPathSegment(value) {
  return String(value)
    .replaceAll('/', '__')
    .replaceAll('\\', '__')
    .replaceAll(':', '--')
    .replaceAll('?', '_')
    .replaceAll('#', '_')
    .replaceAll('&', '_')
    .replaceAll('=', '_')
    .replaceAll(' ', '_');
}

export function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

export function deepEqual(a, b) {
  if (a === b) return true;
  if (a === null || b === null) return a === b;
  if (typeof a !== typeof b) return false;
  
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  
  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
      if (!keysB.includes(key)) return false;
      if (!deepEqual(a[key], b[key])) return false;
    }
    return true;
  }
  
  return false;
}

export function is3DIntGrid(grid) {
  if (!Array.isArray(grid)) return false; // z
  for (const layer of grid) {
    if (!Array.isArray(layer)) return false; // y
    for (const row of layer) {
      if (!Array.isArray(row)) return false; // x
      for (const cell of row) {
        if (!Number.isInteger(cell)) return false;
      }
    }
  }
  return true;
}

export function extractFirstJsonObject(text) {
  if (typeof text !== 'string') return null;

  // Try to find JSON array first (most common for our use case)
  let start = text.indexOf('[');
  let openChar = '[';
  let closeChar = ']';
  
  // If no array found, try object
  if (start === -1) {
    start = text.indexOf('{');
    openChar = '{';
    closeChar = '}';
  }
  
  if (start === -1) return null;

  // Simple bracket/brace matching
  let depth = 0;
  let lastValidEnd = -1;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (ch === openChar) depth++;
    if (ch === closeChar) depth--;
    if (depth === 0) {
      lastValidEnd = i + 1;
      const candidate = text.slice(start, lastValidEnd);
      try {
        return JSON.parse(candidate);
      } catch {
        // Continue to try to find a complete JSON
      }
    }
  }
  
  // If we didn't find complete JSON, try parsing what we have (might be truncated)
  if (lastValidEnd === -1 && depth > 0) {
    // Try to close the JSON by adding missing closing brackets
    let candidate = text.slice(start);
    let missingCloses = depth;
    while (missingCloses > 0) {
      candidate += closeChar;
      missingCloses--;
    }
    try {
      return JSON.parse(candidate);
    } catch {
      // Still failed, return null
    }
  }
  
  return null;
}



