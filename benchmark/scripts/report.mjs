import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';
import { readJsonFile, sanitizeForPathSegment } from '../utils.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');
const CACHE_DIR = path.join(ROOT_DIR, 'benchmark', 'cache');
const CONFIG_PATH = path.join(ROOT_DIR, 'benchmark', 'config', 'models.json');

async function getAllCachedResults() {
  const results = new Map();

  try {
    const entries = await fs.readdir(CACHE_DIR, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const sanitizedModelId = entry.name;
      const modelDir = path.join(CACHE_DIR, sanitizedModelId);

      try {
        const files = await fs.readdir(modelDir);
        for (const file of files) {
          if (!file.endsWith('.json')) continue;

          const cachePath = path.join(modelDir, file);
          try {
            const result = await readJsonFile(cachePath);
            // Use the original modelId from the result, or fall back to unsanitized directory name
            const modelId = result.modelId || sanitizedModelId.replace(/__/g, '/').replace(/--/g, ':');
            
            // Only include completed results (have prediction and not truncated)
            const isCompleted = result.prediction !== null && result.prediction !== undefined && result.finishReason !== 'length';
            
            if (isCompleted) {
              if (!results.has(modelId)) {
                results.set(modelId, []);
              }
              results.get(modelId).push(result);
            }
          } catch (err) {
            console.warn(`Failed to read ${cachePath}: ${err.message}`);
          }
        }
      } catch (err) {
        console.warn(`Failed to read model directory ${sanitizedModelId}: ${err.message}`);
      }
    }
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log('No cache directory found. Run "npm run benchmark" first.');
      return results;
    }
    throw err;
  }

  return results;
}

function formatPercentage(value, total) {
  if (total === 0) return '0.00%';
  return ((value / total) * 100).toFixed(2) + '%';
}

function formatCost(cost) {
  if (cost === 0) return '$0.0000';
  return '$' + cost.toFixed(6);
}

function formatTime(ms) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

async function main() {
  console.log('Generating benchmark report...\n');

  const config = await readJsonFile(CONFIG_PATH);
  const models = config.models;
  const allResults = await getAllCachedResults();

  if (allResults.size === 0) {
    console.log('No cached results found.');
    console.log('Run "npm run benchmark" first to generate results.');
    return;
  }

  for (const modelConfig of models) {
    const modelId = modelConfig.id;
    const results = allResults.get(modelId) || [];

    if (results.length === 0) {
      console.log(`Model: ${modelId}`);
      console.log('  No results found.\n');
      continue;
    }

    const correct = results.filter((r) => r.correct).length;
    const total = results.length;
    const totalCost = results.reduce((sum, r) => sum + (r.cost || 0), 0);
    const avgCost = totalCost / total;
    const totalTime = results.reduce((sum, r) => sum + (r.elapsedMs || 0), 0);
    const avgTime = totalTime / total;

    console.log(`Model: ${modelId}`);
    console.log(`  Score: ${correct}/${total} (${formatPercentage(correct, total)})`);
    console.log(`  Average Cost: ${formatCost(avgCost)}`);
    console.log(`  Average Time: ${formatTime(avgTime)}`);
    console.log('');
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

