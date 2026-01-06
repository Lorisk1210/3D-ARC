import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';
import { readJsonFile, sanitizeForPathSegment, listJsonFiles } from '../utils.mjs';
import {
  error,
  warn,
  table,
  emptyLine,
  formatDuration,
  formatCost,
  formatAccuracy,
  c,
  dim,
  SYMBOLS,
} from '../cli.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');
const CACHE_DIR = path.join(ROOT_DIR, 'benchmark', 'cache');
const CONFIG_PATH = path.join(ROOT_DIR, 'benchmark', 'config', 'models.json');
const PUZZLES_DIR = path.join(ROOT_DIR, 'puzzles');

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
            const modelId = result.modelId || sanitizedModelId.replace(/__/g, '/').replace(/--/g, ':');
            
            if (!results.has(modelId)) {
              results.set(modelId, []);
            }
            results.get(modelId).push(result);
          } catch (err) {
            // Silently skip invalid files
          }
        }
      } catch (err) {
        // Silently skip inaccessible directories
      }
    }
  } catch (err) {
    if (err.code === 'ENOENT') {
      return results;
    }
    throw err;
  }

  return results;
}

function getLeaderboard(allResults, models, totalPuzzles) {
  const leaderboard = [];
  
  for (const modelConfig of models) {
    const modelId = modelConfig.id;
    const results = allResults.get(modelId) || [];
    
    if (results.length === 0) continue;
    
    const correct = results.filter((r) => r.correct === true).length;
    const total = totalPuzzles;
    const accuracy = total > 0 ? correct / total : 0;
    const totalCost = results.reduce((sum, r) => sum + (r.cost || 0), 0);
    const avgCost = results.length > 0 ? totalCost / results.length : 0;
    const totalTime = results.reduce((sum, r) => sum + (r.elapsedMs || 0), 0);
    const avgTime = results.length > 0 ? totalTime / results.length : 0;
    
    leaderboard.push({
      modelId,
      name: modelConfig.name || modelConfig.id.split('/').pop(),
      correct,
      total,
      accuracy,
      avgCost,
      avgTime,
      totalCost,
      totalTime,
    });
  }
  
  return leaderboard.sort((a, b) => b.accuracy - a.accuracy || a.avgCost - b.avgCost);
}

async function main() {
  let config, models, allResults, puzzleFiles;
  try {
    config = await readJsonFile(CONFIG_PATH);
    models = config.models;
    allResults = await getAllCachedResults();
    puzzleFiles = await listJsonFiles(PUZZLES_DIR);
  } catch (err) {
    error(err.message);
    process.exit(1);
  }

  if (allResults.size === 0) {
    warn('No benchmark results found');
    return;
  }

  const totalPuzzles = puzzleFiles.length;
  const leaderboard = getLeaderboard(allResults, models, totalPuzzles);
  
  if (leaderboard.length === 0) {
    warn('No completed results to display');
    return;
  }
  
  const tableHeaders = ['#', 'Model', 'Score', 'Accuracy', 'Avg Time', 'Total Cost'];
  const tableRows = leaderboard.map((entry, idx) => {
    const rank = idx === 0 ? c('yellow', SYMBOLS.star) : dim(`${idx + 1}`);
    const score = `${entry.correct}/${entry.total}`;
    const accuracy = formatAccuracy(entry.correct, entry.total);
    const avgTime = formatDuration(Math.round(entry.avgTime));
    const totalCost = formatCost(entry.totalCost);
    
    return [rank, entry.name, score, accuracy, avgTime, totalCost];
  });
  
  table(tableHeaders, tableRows);
}

main().catch((err) => {
  error(`Fatal error: ${err.message}`);
  process.exit(1);
});
