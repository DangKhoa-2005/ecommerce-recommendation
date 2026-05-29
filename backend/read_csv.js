const fs = require('fs');
const readline = require('readline');

async function processLineByLine() {
  const fileStream = fs.createReadStream('d:/Code/Brazilian E-Commerce Public Dataset by Olist.csv');

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let lineNum = 0;
  for await (const line of rl) {
    if (lineNum === 0) { console.log("Header:", line); }
    if (lineNum === 1) { console.log("Line 1:", line); break; }
    lineNum++;
  }
}
processLineByLine();