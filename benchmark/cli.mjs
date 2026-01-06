const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
  
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m',
};

const BOX = {
  topLeft: '╭',
  topRight: '╮',
  bottomLeft: '╰',
  bottomRight: '╯',
  horizontal: '─',
  vertical: '│',
  leftT: '├',
  rightT: '┤',
  topT: '┬',
  bottomT: '┴',
  cross: '┼',
};

const SYMBOLS = {
  check: '✓',
  cross: '✗',
  bullet: '●',
  circle: '○',
  arrow: '→',
  arrowRight: '▸',
  star: '★',
  dot: '·',
  block: '█',
  blockLight: '░',
  blockMed: '▒',
  spark: '◆',
};

export function c(color, text) {
  return `${COLORS[color]}${text}${COLORS.reset}`;
}

export function bold(text) {
  return `${COLORS.bold}${text}${COLORS.reset}`;
}

export function dim(text) {
  return `${COLORS.dim}${text}${COLORS.reset}`;
}

function stripAnsi(str) {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

function pad(str, len, align = 'left', char = ' ') {
  const stripped = stripAnsi(str);
  const diff = len - stripped.length;
  if (diff <= 0) return str;
  if (align === 'left') return str + char.repeat(diff);
  if (align === 'right') return char.repeat(diff) + str;
  const left = Math.floor(diff / 2);
  return char.repeat(left) + str + char.repeat(diff - left);
}

export function box(content, options = {}) {
  const { title = '', padding = 1, minWidth = 0, indent = 2 } = options;
  const lines = content.split('\n');
  const maxLen = Math.max(
    minWidth,
    ...lines.map(l => stripAnsi(l).length),
    title ? stripAnsi(title).length + 2 : 0
  );
  const innerWidth = maxLen + padding * 2;
  const indentStr = ' '.repeat(indent);
  
  const paddingStr = ' '.repeat(padding);
  let output = [];
  
  if (title) {
    const titlePadded = ` ${title} `;
    const leftDash = Math.floor((innerWidth - stripAnsi(titlePadded).length) / 2);
    const rightDash = innerWidth - leftDash - stripAnsi(titlePadded).length;
    output.push(
      indentStr +
      c('cyan', BOX.topLeft) +
      c('cyan', BOX.horizontal.repeat(leftDash)) +
      c('cyan', titlePadded) +
      c('cyan', BOX.horizontal.repeat(rightDash)) +
      c('cyan', BOX.topRight)
    );
  } else {
    output.push(
      indentStr +
      c('cyan', BOX.topLeft) +
      c('cyan', BOX.horizontal.repeat(innerWidth)) +
      c('cyan', BOX.topRight)
    );
  }
  
  for (const line of lines) {
    output.push(
      indentStr +
      c('cyan', BOX.vertical) +
      paddingStr +
      pad(line, maxLen) +
      paddingStr +
      c('cyan', BOX.vertical)
    );
  }
  
  output.push(
    indentStr +
    c('cyan', BOX.bottomLeft) +
    c('cyan', BOX.horizontal.repeat(innerWidth)) +
    c('cyan', BOX.bottomRight)
  );
  
  return output.join('\n');
}

export function header(title) {
  const width = 50;
  const line = BOX.horizontal.repeat(width);
  const paddedTitle = pad(title, width, 'center');
  
  console.log('');
  console.log(c('cyan', `  ${BOX.topLeft}${line}${BOX.topRight}`));
  console.log(c('cyan', `  ${BOX.vertical}`) + bold(c('white', paddedTitle)) + c('cyan', BOX.vertical));
  console.log(c('cyan', `  ${BOX.bottomLeft}${line}${BOX.bottomRight}`));
  console.log('');
}

export function subHeader(title) {
  console.log('');
  console.log(`  ${c('cyan', SYMBOLS.spark)} ${bold(c('white', title))}`);
  console.log(`  ${c('cyan', BOX.horizontal.repeat(stripAnsi(title).length + 2))}`);
}

export function progressBar(current, total, width = 30, options = {}) {
  const { showPercent = true, showCount = true, label = '' } = options;
  const percent = total === 0 ? 0 : current / total;
  const filled = Math.round(percent * width);
  const empty = width - filled;
  
  const bar = 
    c('green', SYMBOLS.block.repeat(filled)) +
    c('gray', SYMBOLS.blockLight.repeat(empty));
  
  let result = `  ${bar}`;
  
  if (showPercent) {
    result += c('white', ` ${(percent * 100).toFixed(0).padStart(3)}%`);
  }
  if (showCount) {
    result += dim(` (${current}/${total})`);
  }
  if (label) {
    result = `  ${dim(label)} ${result.trim()}`;
  }
  
  return result;
}

export function accuracyBar(correct, total, width = 20) {
  const percent = total === 0 ? 0 : correct / total;
  const filled = Math.round(percent * width);
  const empty = width - filled;
  
  const color = percent >= 0.7 ? 'green' : percent >= 0.4 ? 'yellow' : 'red';
  
  return c(color, SYMBOLS.block.repeat(filled)) + c('gray', SYMBOLS.blockLight.repeat(empty));
}

export function success(message) {
  console.log(`  ${c('green', SYMBOLS.check)} ${message}`);
}

export function error(message) {
  console.log(`  ${c('red', SYMBOLS.cross)} ${message}`);
}

export function info(message) {
  console.log(`  ${c('blue', SYMBOLS.bullet)} ${message}`);
}

export function warn(message) {
  console.log(`  ${c('yellow', SYMBOLS.bullet)} ${message}`);
}

export function item(label, value, indent = 2) {
  const spaces = ' '.repeat(indent);
  console.log(`${spaces}${c('gray', SYMBOLS.arrowRight)} ${dim(label + ':')} ${value}`);
}

export function table(headers, rows, options = {}) {
  const { indent = 2 } = options;
  const spaces = ' '.repeat(indent);
  
  const colWidths = headers.map((h, i) => {
    const headerWidth = stripAnsi(h).length;
    const maxDataWidth = Math.max(...rows.map(r => stripAnsi(String(r[i] || '')).length));
    return Math.max(headerWidth, maxDataWidth);
  });
  
  const totalWidth = colWidths.reduce((a, b) => a + b, 0) + (headers.length - 1) * 3;
  
  console.log(spaces + c('cyan', BOX.topLeft + BOX.horizontal.repeat(totalWidth + 2) + BOX.topRight));
  
  const headerRow = headers.map((h, i) => pad(bold(h), colWidths[i], 'center')).join(c('cyan', ' │ '));
  console.log(spaces + c('cyan', BOX.vertical) + ' ' + headerRow + ' ' + c('cyan', BOX.vertical));
  
  const separator = colWidths.map(w => BOX.horizontal.repeat(w)).join(BOX.horizontal + BOX.cross + BOX.horizontal);
  console.log(spaces + c('cyan', BOX.leftT + BOX.horizontal + separator + BOX.horizontal + BOX.rightT));
  
  for (const row of rows) {
    const rowStr = row.map((cell, i) => {
      const str = String(cell || '');
      return pad(str, colWidths[i], i === 0 ? 'left' : 'right');
    }).join(c('cyan', ' │ '));
    console.log(spaces + c('cyan', BOX.vertical) + ' ' + rowStr + ' ' + c('cyan', BOX.vertical));
  }
  
  console.log(spaces + c('cyan', BOX.bottomLeft + BOX.horizontal.repeat(totalWidth + 2) + BOX.bottomRight));
}

export function divider(width = 50) {
  console.log('  ' + c('gray', BOX.horizontal.repeat(width)));
}

export function emptyLine() {
  console.log('');
}

class Spinner {
  constructor(message) {
    this.message = message;
    this.frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    this.current = 0;
    this.interval = null;
  }
  
  start() {
    process.stdout.write('\x1b[?25l'); // hide cursor
    this.interval = setInterval(() => {
      const frame = this.frames[this.current];
      process.stdout.write(`\r  ${c('cyan', frame)} ${this.message}`);
      this.current = (this.current + 1) % this.frames.length;
    }, 80);
    return this;
  }
  
  update(message) {
    this.message = message;
  }
  
  stop(finalMessage, type = 'success') {
    clearInterval(this.interval);
    process.stdout.write('\x1b[?25h'); // show cursor
    const symbol = type === 'success' ? c('green', SYMBOLS.check) : 
                   type === 'error' ? c('red', SYMBOLS.cross) : 
                   c('blue', SYMBOLS.bullet);
    process.stdout.write(`\r  ${symbol} ${finalMessage}\x1b[K\n`);
  }
}

export function spinner(message) {
  return new Spinner(message);
}

export function clearLine() {
  process.stdout.write('\r\x1b[K');
}

export function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60000);
  const secs = ((ms % 60000) / 1000).toFixed(0);
  return `${mins}m ${secs}s`;
}

export function formatCost(cost) {
  if (cost === 0) return c('green', 'FREE');
  if (cost < 0.0001) return c('green', '<$0.0001');
  if (cost < 0.01) return c('green', `$${cost.toFixed(6)}`);
  if (cost < 0.1) return c('yellow', `$${cost.toFixed(4)}`);
  return c('red', `$${cost.toFixed(4)}`);
}

export function formatAccuracy(correct, total) {
  if (total === 0) return dim('N/A');
  const percent = (correct / total) * 100;
  const color = percent >= 70 ? 'green' : percent >= 40 ? 'yellow' : 'red';
  return c(color, `${percent.toFixed(1)}%`);
}

export function modelCard(name, stats) {
  const { correct, total, avgTime, totalCost } = stats;
  const width = 52;
  
  console.log('');
  console.log(`  ${c('cyan', BOX.topLeft)}${c('cyan', BOX.horizontal.repeat(width))}${c('cyan', BOX.topRight)}`);
  console.log(`  ${c('cyan', BOX.vertical)} ${bold(pad(name, width - 2))} ${c('cyan', BOX.vertical)}`);
  console.log(`  ${c('cyan', BOX.leftT)}${c('cyan', BOX.horizontal.repeat(width))}${c('cyan', BOX.rightT)}`);
  
  const bar = accuracyBar(correct, total, 20);
  const pct = formatAccuracy(correct, total);
  const countStr = dim(`(${correct}/${total})`);
  const accLine = `  ${dim('Accuracy')}   ${bar}  ${pct}  ${countStr}`;
  console.log(`  ${c('cyan', BOX.vertical)}${pad(accLine, width)} ${c('cyan', BOX.vertical)}`);
  
  const timeStr = formatDuration(Math.round(avgTime));
  const costStr = formatCost(totalCost);
  const statsLine = `  ${dim('Avg Time')}   ${c('white', timeStr)}  ${dim(BOX.vertical)}  ${dim('Total Cost')}   ${costStr}`;
  console.log(`  ${c('cyan', BOX.vertical)}${pad(statsLine, width)} ${c('cyan', BOX.vertical)}`);
  
  console.log(`  ${c('cyan', BOX.bottomLeft)}${c('cyan', BOX.horizontal.repeat(width))}${c('cyan', BOX.bottomRight)}`);
}

export function puzzleResult(puzzleId, correct, time, cost) {
  const icon = correct ? c('green', SYMBOLS.check) : c('red', SYMBOLS.cross);
  const shortId = puzzleId.substring(0, 8);
  const timeStr = formatDuration(time);
  const costStr = formatCost(cost);
  
  console.log(`    ${icon} ${c('gray', shortId)} ${dim('|')} ${timeStr.padEnd(8)} ${dim('|')} ${costStr}`);
}

export function summary(stats) {
  const { totalPuzzles, totalCorrect, totalTime, totalCost, modelsCount } = stats;
  
  console.log('');
  console.log(box(
    `${bold('Total Puzzles:')}  ${totalPuzzles}\n` +
    `${bold('Total Correct:')}  ${totalCorrect} ${dim(`(${((totalCorrect/totalPuzzles)*100).toFixed(1)}%)`)}\n` +
    `${bold('Total Time:')}     ${formatDuration(totalTime)}\n` +
    `${bold('Total Cost:')}     ${formatCost(totalCost)}\n` +
    `${bold('Models Tested:')} ${modelsCount}`,
    { title: 'Summary', minWidth: 35 }
  ));
}

export { COLORS, BOX, SYMBOLS };

