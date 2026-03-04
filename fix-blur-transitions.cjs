const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? 
      walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

let modifiedCount = 0;

walkDir('./src/components', function(filePath) {
  if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  
  // Replace transition-all with transition-colors and transition-transform if needed
  // Alternatively, just replace 'transition-all' with 'transition-colors' where 'backdrop-blur' exists on the same line.
  
  const lines = content.split('\n');
  let changed = false;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('backdrop-blur') && lines[i].includes('transition-all')) {
        lines[i] = lines[i].replace(/transition-all/g, 'transition-colors');
        changed = true;
    }
  }
  
  if (changed) {
    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    console.log(`Updated ${filePath}`);
    modifiedCount++;
  }
});

console.log(`Total files modified: ${modifiedCount}`);
