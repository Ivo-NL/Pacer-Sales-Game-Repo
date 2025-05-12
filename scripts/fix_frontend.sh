#!/bin/bash
echo "Starting frontend-only fix..."

# Create script to fix frontend paths
cat > fix_paths.js << 'EOF'
const fs = require('fs');
const path = require('path');

// Function to search and replace in files
function findAndReplace(directory, searchPattern, replacePattern) {
  const files = fs.readdirSync(directory);
  let replacedCount = 0;
  
  files.forEach(file => {
    const filePath = path.join(directory, file);
    const stats = fs.statSync(filePath);
    
    if (stats.isDirectory()) {
      // Recursively search directories
      replacedCount += findAndReplace(filePath, searchPattern, replacePattern);
    } else if (file.endsWith('.js') || file.endsWith('.css')) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        
        if (content.includes(searchPattern)) {
          console.log(`Found pattern in ${filePath}`);
          const newContent = content.replace(new RegExp(searchPattern, 'g'), replacePattern);
          fs.writeFileSync(filePath, newContent, 'utf8');
          console.log(`Fixed: ${filePath}`);
          replacedCount++;
        }
      } catch (err) {
        console.error(`Error processing ${filePath}:`, err.message);
      }
    }
  });
  
  return replacedCount;
}

// Run the search and replace
console.log('Starting search and replace for frontend paths...');

// Fix the progress endpoint paths
const pathsToFix = [
  { search: '\\/progress\\/progress', replace: '/progress' },
  { search: '\\/progress\\/progress\\/detailed', replace: '/progress/detailed' },
  { search: '\\/progress\\/progress\\/check-achievements', replace: '/progress/check-achievements' }
];

let totalReplaced = 0;
pathsToFix.forEach(({ search, replace }) => {
  console.log(`Searching for pattern: ${search}`);
  const count = findAndReplace('/usr/share/nginx/html', search, replace);
  console.log(`Replaced ${count} occurrences of ${search} with ${replace}`);
  totalReplaced += count;
});

console.log(`Total files fixed: ${totalReplaced}`);
EOF

# Copy and execute the script in the frontend container
docker cp fix_paths.js pacer_frontend:/tmp/fix_paths.js
docker exec pacer_frontend sh -c "apt-get update && apt-get install -y nodejs && node /tmp/fix_paths.js"

# Restart the frontend container
docker restart pacer_frontend

echo "Frontend fixes completed" 