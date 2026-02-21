const fs = require('fs');

if (!process.argv[2]) {
  console.log("# stringsplitter.js usage:");
  console.log("node stringsplitter.js [filename] [output.json]");
  console.log("# writes JSON with hex addresses as keys and strings as values (default: [filename].json)");
  process.exit();
}

const inputPath = process.argv[2];
const outputPath = process.argv[3] || inputPath + '.json';

// Read the binary file
const buffer = fs.readFileSync(inputPath);

// Fixed 6-byte suffix pattern: 00 21 01 00 00 00
const SUFFIX = Buffer.from([0x00, 0x21, 0x01, 0x00, 0x00, 0x00]);

// Find all occurrences of the suffix pattern
const headerStarts = [];
let lastIndex = 0;

while (true) {
  const index = buffer.indexOf(SUFFIX, lastIndex);
  if (index === -1) {
    break;
  }
  
  // Header start is 2 bytes before the suffix (since pattern is bytes 2-7 of 8-byte header)
  if (index >= 2) {
    headerStarts.push(index - 2);
  }
  
  lastIndex = index + 1;
}

// Build the map: hex address -> string
const result = {};

if (headerStarts.length === 0) {
  // No matches found, return empty object
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  process.exit();
}

// Process each header start
for (let i = 0; i < headerStarts.length; i++) {
  const headerStart = headerStarts[i];
  const hexAddress = headerStart.toString(16);
  
  // Read the length from bytes 0-1 of the header (little-endian uint16)
  const stringLength = buffer.readUInt16LE(headerStart);
  const stringStart = headerStart + 8; // After the 8-byte header
  const stringEnd = Math.min(stringStart + stringLength, buffer.length); // Use length, but don't exceed buffer
  
  // Extract the string bytes and decode as UTF-8
  const stringBytes = buffer.subarray(stringStart, stringEnd);
  const stringValue = stringBytes.toString('utf8');
  
  result[hexAddress] = stringValue;
}

// Output the result as JSON to file
fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
