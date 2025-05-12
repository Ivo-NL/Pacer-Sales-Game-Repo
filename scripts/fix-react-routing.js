/**
 * Script to fix the double /pacer/pacer/ path issue in the PACER frontend
 * 
 * This script modifies the compiled main.js file to fix the React Router basename configuration
 * without requiring a complete rebuild of the application.
 * 
 * Usage:
 * 1. Install Node.js if not already available
 * 2. Run this script with node: `node fix-react-routing.js`
 */

const fs = require('fs');
const path = require('path');

// Function to find the main JS file
function findMainJsFile(staticJsDir) {
  try {
    const files = fs.readdirSync(staticJsDir);
    const mainJsFile = files.find(file => file.startsWith('main.') && file.endsWith('.js'));
    
    if (!mainJsFile) {
      console.error('Could not find main.*.js file in', staticJsDir);
      return null;
    }
    
    return path.join(staticJsDir, mainJsFile);
  } catch (error) {
    console.error('Error finding main JS file:', error);
    return null;
  }
}

// Main function to fix the routing
function fixReactRouting() {
  // Path to the static JS directory
  const staticJsDir = '/home/debian/pacer/frontend-static/static/js';
  
  // Find the main JS file
  const mainJsPath = findMainJsFile(staticJsDir);
  if (!mainJsPath) {
    process.exit(1);
  }
  
  console.log(`Found main JS file: ${mainJsPath}`);
  
  try {
    // Read the file content
    let content = fs.readFileSync(mainJsPath, 'utf8');
    console.log(`Read ${content.length} bytes from file`);
    
    // Create a backup
    fs.writeFileSync(`${mainJsPath}.bak`, content);
    console.log(`Created backup at ${mainJsPath}.bak`);
    
    // Fix the basename configuration
    const originalContent = content;
    
    // Replace the basename configuration
    content = content.replace(/basename:"\/pacer"/g, 'basename:""');
    
    // Fix any hardcoded /pacer/pacer/ paths
    content = content.replace(/\/pacer\/pacer\//g, '/pacer/');
    
    // Check if any changes were made
    if (content === originalContent) {
      console.log('No changes needed to be made');
    } else {
      // Write the modified content back to the file
      fs.writeFileSync(mainJsPath, content);
      console.log(`Updated ${mainJsPath} with routing fixes`);
    }
    
    console.log('Routing fix completed successfully');
  } catch (error) {
    console.error('Error fixing React routing:', error);
    process.exit(1);
  }
}

// Run the fix
fixReactRouting(); 