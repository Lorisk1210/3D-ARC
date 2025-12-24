import 'dotenv/config';
import OpenAI from 'openai';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  readJsonFile,
  writeJsonFile,
  listJsonFiles,
  sanitizeForPathSegment,
  deepEqual,
  is3DIntGrid,
  extractFirstJsonObject,
} from '../utils.mjs';
import {
  header,
  subHeader,
  success,
  error,
  info,
  warn,
  item,
  spinner,
  progressBar,
  divider,
  emptyLine,
  formatDuration,
  formatCost,
  c,
  bold,
  dim,
  SYMBOLS,
  BOX,
} from '../cli.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');
const PUZZLES_DIR = path.join(ROOT_DIR, 'puzzles');
const CACHE_DIR = path.join(ROOT_DIR, 'benchmark', 'cache');
const CONFIG_PATH = path.join(ROOT_DIR, 'benchmark', 'config', 'models.json');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
if (!OPENROUTER_API_KEY) {
  console.log('');
  error('OPENROUTER_API_KEY environment variable is not set');
  item('Fix', 'Create a .env file with: OPENROUTER_API_KEY=your_key_here');
  console.log('');
  process.exit(1);
}

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: OPENROUTER_API_KEY,
});

function format3DGrid(grid) {
  if (!Array.isArray(grid)) return '[]';
  return grid
    .map((layer) => {
      if (!Array.isArray(layer)) return '[]';
      return layer
        .map((row) => {
          if (!Array.isArray(row)) return '[]';
          return '[' + row.join(', ') + ']';
        })
        .join(',\n        ');
    })
    .map((layerStr, idx) => `      [\n        ${layerStr}\n      ]`)
    .join(',\n');
}

function buildPrompt(puzzle) {
  let prompt = `You are solving a 3D ARC (Abstraction and Reasoning Corpus) puzzle. Given training examples of input-output pairs, predict the output for a test input.

The puzzle uses 3D grids (layers × rows × columns). Each cell contains an integer (0-9).

Training Examples:
`;

  for (let i = 0; i < puzzle.train.length; i++) {
    const example = puzzle.train[i];
    prompt += `\nExample ${i + 1}:\n`;
    prompt += `Input:\n${format3DGrid(example.input)}\n`;
    prompt += `Output:\n${format3DGrid(example.output)}\n`;
  }

  prompt += `\nTest Input:\n${format3DGrid(puzzle.test[0].input)}\n`;

  prompt += `\nPredict the output for the test input. 

IMPORTANT: Return ONLY a valid JSON array (starting with [) representing the 3D output grid. The format should be exactly like the examples above - a nested array structure [[[...]]] where the outer array represents layers (Z dimension), middle arrays represent rows (Y dimension), and inner arrays represent columns (X dimension) with integer values.

Do NOT include any explanation, markdown code blocks, or text before or after the JSON. Return ONLY the raw JSON array.`;

  return prompt;
}

async function getCachedResult(modelId, puzzleId) {
  const modelDir = path.join(CACHE_DIR, sanitizeForPathSegment(modelId));
  const cachePath = path.join(modelDir, `${puzzleId}.json`);
  try {
    return await readJsonFile(cachePath);
  } catch {
    return null;
  }
}

async function saveCachedResult(modelId, puzzleId, result) {
  const modelDir = path.join(CACHE_DIR, sanitizeForPathSegment(modelId));
  const cachePath = path.join(modelDir, `${puzzleId}.json`);
  await writeJsonFile(cachePath, result);
}

async function runModelOnPuzzle(modelConfig, puzzle, puzzleId, puzzleIndex, totalPuzzles) {
  const modelId = modelConfig.id;
  const shortId = puzzleId.substring(0, 8);
  
  const cached = await getCachedResult(modelId, puzzleId);
  if (cached) {
    if (cached.finishReason !== 'stop') {
      const reason = cached.finishReason || 'unknown';
      process.stdout.write(`\r    ${c('yellow', SYMBOLS.circle)} ${dim(shortId)} Rerunning (${reason})...\x1b[K`);
    } else {
      const icon = cached.correct ? c('green', SYMBOLS.check) : c('red', SYMBOLS.cross);
      const status = cached.correct ? c('green', 'correct') : c('red', 'wrong');
      process.stdout.write(`\r    ${icon} ${dim(shortId)} ${status} ${dim('(cached)')}\n`);
      return cached;
    }
  } else {
    process.stdout.write(`\r    ${c('cyan', SYMBOLS.circle)} ${dim(shortId)} Running...\x1b[K`);
  }

  const prompt = buildPrompt(puzzle);
  const startTime = Date.now();

  try {
    const config = await readJsonFile(CONFIG_PATH);
    const model = config.models.find((m) => m.id === modelId);
    const temperature = model?.temperature ?? 0;

    const requestParams = {
      model: modelId,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature,
    };

    if (model?.max_tokens) {
      requestParams.max_tokens = model.max_tokens;
    }

    const response = await openai.chat.completions.create(requestParams);

    const elapsedMs = Date.now() - startTime;
    const choice = response.choices?.[0];
    const content = choice?.message?.content || '';
    const finishReason = choice?.finish_reason || 'unknown';
    const usage = response.usage || {};
    const promptTokens = usage.prompt_tokens || 0;
    const completionTokens = usage.completion_tokens || 0;

    let prediction = null;
    let parseError = null;

    try {
      const extracted = extractFirstJsonObject(content);
      if (extracted) {
        if (is3DIntGrid(extracted)) {
          prediction = extracted;
        } else {
          parseError = `Invalid 3D grid structure`;
        }
      } else {
        try {
          const directParse = JSON.parse(content.trim());
          if (is3DIntGrid(directParse)) {
            prediction = directParse;
          } else {
            parseError = `Not a valid 3D grid`;
          }
        } catch (parseErr) {
          const trimmed = content.trim();
          if (trimmed.startsWith('[') && !trimmed.endsWith(']')) {
            parseError = `Truncated response (token limit)`;
          } else {
            parseError = `JSON parse failed`;
          }
        }
      }
    } catch (err) {
      parseError = err.message;
    }

    const rawResponse = content.substring(0, 2000);
    const correct = prediction !== null && deepEqual(prediction, puzzle.solution);
    const cost = await calculateCost(modelId, promptTokens, completionTokens);

    const result = {
      puzzleId,
      modelId,
      correct,
      elapsedMs,
      promptTokens,
      completionTokens,
      cost,
      prediction,
      parseError: parseError || null,
      rawResponse: rawResponse || null,
      finishReason: finishReason || null,
      timestamp: new Date().toISOString(),
    };

    await saveCachedResult(modelId, puzzleId, result);

    const icon = correct ? c('green', SYMBOLS.check) : c('red', SYMBOLS.cross);
    const status = correct ? c('green', 'correct') : c('red', 'wrong');
    const timeStr = formatDuration(elapsedMs);
    const costStr = formatCost(cost);
    
    process.stdout.write(`\r    ${icon} ${dim(shortId)} ${status} ${dim('|')} ${timeStr} ${dim('|')} ${costStr}\x1b[K\n`);
    
    if (parseError && !correct) {
      console.log(`      ${c('yellow', SYMBOLS.arrowRight)} ${dim(parseError)}`);
    }

    return result;
  } catch (err) {
    const elapsedMs = Date.now() - startTime;
    process.stdout.write(`\r    ${c('red', SYMBOLS.cross)} ${dim(shortId)} ${c('red', 'error')}\x1b[K\n`);
    console.log(`      ${c('red', SYMBOLS.arrowRight)} ${dim(err.message)}`);
    
    const result = {
      puzzleId,
      modelId,
      correct: false,
      elapsedMs,
      error: err.message,
      timestamp: new Date().toISOString(),
    };
    await saveCachedResult(modelId, puzzleId, result);
    return result;
  }
}

async function calculateCost(modelId, promptTokens, completionTokens) {
  const config = await readJsonFile(CONFIG_PATH);
  const model = config.models.find((m) => m.id === modelId);
  
  if (!model?.pricing) {
    return 0;
  }

  const promptPerMillion = model.pricing.prompt_per_million_usd;
  const completionPerMillion = model.pricing.completion_per_million_usd;

  let cost = 0;
  if (promptPerMillion !== null && promptPerMillion !== undefined) {
    cost += (promptTokens / 1_000_000) * promptPerMillion;
  }
  if (completionPerMillion !== null && completionPerMillion !== undefined) {
    cost += (completionTokens / 1_000_000) * completionPerMillion;
  }

  return cost;
}

async function main() {
  header('3D-ARC Benchmark');
  
  const loadSpinner = spinner('Loading configuration...').start();
  
  let config, models, puzzleFiles;
  try {
    config = await readJsonFile(CONFIG_PATH);
    models = config.models;
    puzzleFiles = await listJsonFiles(PUZZLES_DIR);
    loadSpinner.stop('Configuration loaded', 'success');
  } catch (err) {
    loadSpinner.stop('Failed to load configuration', 'error');
    error(err.message);
    process.exit(1);
  }

  info(`${bold(models.length)} model${models.length !== 1 ? 's' : ''} configured`);
  info(`${bold(puzzleFiles.length)} puzzle${puzzleFiles.length !== 1 ? 's' : ''} found`);
  emptyLine();
  
  const totalRuns = models.length * puzzleFiles.length;
  let completedRuns = 0;
  const startTime = Date.now();
  
  const allResults = [];

  for (let modelIdx = 0; modelIdx < models.length; modelIdx++) {
    const modelConfig = models[modelIdx];
    const modelName = modelConfig.name || modelConfig.id.split('/').pop();
    
    subHeader(`Model ${modelIdx + 1}/${models.length}: ${modelName}`);
    console.log(`  ${dim(modelConfig.id)}`);
    emptyLine();
    
    const modelResults = [];
    
    for (let i = 0; i < puzzleFiles.length; i++) {
      const puzzlePath = puzzleFiles[i];
      const puzzleId = path.basename(puzzlePath, '.json');
      const puzzle = await readJsonFile(puzzlePath);
      
      const result = await runModelOnPuzzle(modelConfig, puzzle, puzzleId, i, puzzleFiles.length);
      modelResults.push(result);
      completedRuns++;
    }
    
    const correct = modelResults.filter(r => r.correct).length;
    const totalTime = modelResults.reduce((sum, r) => sum + (r.elapsedMs || 0), 0);
    const totalCost = modelResults.reduce((sum, r) => sum + (r.cost || 0), 0);
    
    emptyLine();
    console.log(`  ${c('cyan', BOX.horizontal.repeat(40))}`);
    console.log(`  ${dim('Results:')} ${bold(correct)}/${puzzleFiles.length} correct ${dim('|')} ${formatDuration(totalTime)} ${dim('|')} ${formatCost(totalCost)}`);
    
    allResults.push(...modelResults);
  }
  
  const totalTime = Date.now() - startTime;
  const totalCorrect = allResults.filter(r => r.correct).length;
  const totalCost = allResults.reduce((sum, r) => sum + (r.cost || 0), 0);
  
  emptyLine();
  divider(50);
  emptyLine();
  success(`Benchmark complete in ${formatDuration(totalTime)}`);
  item('Total', `${totalCorrect}/${allResults.length} correct`);
  item('Cost', formatCost(totalCost));
  emptyLine();
  info(`Run ${bold('npm run benchmark:report')} for detailed results`);
  emptyLine();
}

main().catch((err) => {
  emptyLine();
  error(`Fatal error: ${err.message}`);
  emptyLine();
  process.exit(1);
});
