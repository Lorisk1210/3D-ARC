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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');
const PUZZLES_DIR = path.join(ROOT_DIR, 'puzzles');
const CACHE_DIR = path.join(ROOT_DIR, 'benchmark', 'cache');
const CONFIG_PATH = path.join(ROOT_DIR, 'benchmark', 'config', 'models.json');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
if (!OPENROUTER_API_KEY) {
  console.error('Error: OPENROUTER_API_KEY environment variable is not set.');
  console.error('Please create a .env file with: OPENROUTER_API_KEY=your_key_here');
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

async function runModelOnPuzzle(modelConfig, puzzle, puzzleId) {
  const modelId = modelConfig.id;
  console.log(`  Running ${modelId} on puzzle ${puzzleId}...`);

  const cached = await getCachedResult(modelId, puzzleId);
  if (cached) {
    // Rerun if the cached result doesn't have finishReason === 'stop' (completed successfully)
    if (cached.finishReason !== 'stop') {
      const reason = cached.finishReason || 'unknown';
      console.log(`    Cached result has finishReason: ${reason}, rerunning...`);
    } else {
      console.log(`    Using cached result (correct: ${cached.correct})`);
      return cached;
    }
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

    // Debug: log if content is empty or truncated
    if (!content || content.length === 0) {
      console.log(`    Warning: Empty response content. Finish reason: ${finishReason}`);
      if (finishReason === 'length') {
        console.log(`    Response was truncated at ${completionTokens} tokens. This appears to be a hard limit for free models (4096 tokens).`);
        console.log(`    Consider using a paid model or breaking the puzzle into smaller parts.`);
      }
    }

    let prediction = null;
    let parseError = null;

    try {
      const extracted = extractFirstJsonObject(content);
      if (extracted) {
        if (is3DIntGrid(extracted)) {
          prediction = extracted;
        } else {
          parseError = `Extracted JSON but it's not a valid 3D integer grid. Type: ${Array.isArray(extracted) ? 'array' : typeof extracted}, Structure: ${Array.isArray(extracted) ? `${extracted.length} layers` : 'not array'}`;
        }
      } else {
        // Try direct JSON parse as fallback
        try {
          const directParse = JSON.parse(content.trim());
          if (is3DIntGrid(directParse)) {
            prediction = directParse;
          } else {
            parseError = `Direct JSON parse succeeded but not a valid 3D grid`;
          }
        } catch (parseErr) {
          // Check if response looks like JSON but is truncated
          const trimmed = content.trim();
          if (trimmed.startsWith('[') && !trimmed.endsWith(']')) {
            parseError = `JSON appears truncated (starts with [ but doesn't end with ]). Response was cut off at ${content.length} chars. Finish reason: ${finishReason}. This suggests the model hit a token limit.`;
          } else {
            // Log first 500 chars of response for debugging
            const preview = content.substring(0, 500).replace(/\n/g, '\\n');
            const hasArray = content.includes('[');
            const hasObject = content.includes('{');
            parseError = `Failed to extract valid JSON. Has '[': ${hasArray}, Has '{': ${hasObject}. Response length: ${content.length} chars. Parse error: ${parseErr.message}. Preview: ${preview}${content.length > 500 ? '...' : ''}`;
          }
        }
      }
    } catch (err) {
      parseError = err.message;
    }

    // Store raw response for debugging
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

    console.log(
      `    ${correct ? '✓ Correct' : '✗ Incorrect'} (${elapsedMs}ms, $${cost.toFixed(6)})`
    );
    if (parseError) {
      console.log(`    Parse error: ${parseError}`);
    }

    return result;
  } catch (error) {
    const elapsedMs = Date.now() - startTime;
    console.error(`    Error: ${error.message}`);
    const result = {
      puzzleId,
      modelId,
      correct: false,
      elapsedMs,
      error: error.message,
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
  console.log('Loading configuration...');
  const config = await readJsonFile(CONFIG_PATH);
  const models = config.models;

  console.log(`Found ${models.length} model(s) to test`);
  console.log('Loading puzzles...');
  const puzzleFiles = await listJsonFiles(PUZZLES_DIR);
  console.log(`Found ${puzzleFiles.length} puzzle(s)\n`);

  for (const modelConfig of models) {
    console.log(`Testing model: ${modelConfig.id}`);
    for (const puzzlePath of puzzleFiles) {
      const puzzleId = path.basename(puzzlePath, '.json');
      const puzzle = await readJsonFile(puzzlePath);
      await runModelOnPuzzle(modelConfig, puzzle, puzzleId);
    }
    console.log('');
  }

  console.log('Benchmark run complete!');
  console.log('Run "npm run benchmark:report" to see results.');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

