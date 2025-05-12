# Simplified Fix for Progress Endpoint Mismatch

## The Real Issue

After examining the backend code more carefully, we found that the backend already has the correct endpoints defined in `app/routers/progress.py`:

```python
@router.get("/progress", response_model=schemas.ProgressResponse)
def get_user_progress(...)
```

The issue is in the frontend code, which is using incorrect endpoint paths like `/progress/progress` instead of just `/progress`.

## Quick Fix for VPS

Here's how to apply a direct fix to the frontend container on your VPS:

1. SSH into your VPS:
   ```bash
   ssh debian@vps-d067f247.vps.ovh.ca
   ```

2. Create a script to fix the endpoints in the frontend code:
   ```bash
   cd ~/pacer
   
   cat > fix_frontend_endpoints.sh << 'EOF'
   #!/bin/bash
   
   # Install required packages in the frontend container
   echo "Installing Node.js in frontend container..."
   docker exec -it pacer_frontend apk add --no-cache nodejs npm
   
   # Create a script to find and fix incorrect endpoint paths
   echo "Creating fix script..."
   cat > /tmp/fix_endpoints.js << 'END'
   const fs = require('fs');
   const path = require('path');
   
   // Helper function to recursively find JS files
   function findJsFiles(dir, fileList = []) {
     const files = fs.readdirSync(dir);
     files.forEach(file => {
       const filePath = path.join(dir, file);
       if (fs.statSync(filePath).isDirectory()) {
         findJsFiles(filePath, fileList);
       } else if (path.extname(file) === '.js') {
         fileList.push(filePath);
       }
     });
     return fileList;
   }
   
   // Find all js files in the HTML directory
   const jsFiles = findJsFiles('/usr/share/nginx/html');
   console.log(`Found ${jsFiles.length} JavaScript files`);
   
   // Patterns to look for and replace
   const patterns = [
     {
       search: /['"]\/progress\/progress['"]/g,
       replace: "'/progress'"
     },
     {
       search: /['"]\/progress\/progress\/detailed['"]/g,
       replace: "'/progress/detailed'"
     },
     {
       search: /['"]\/progress\/progress\/check-achievements['"]/g,
       replace: "'/progress/check-achievements'"
     }
   ];
   
   // Fix each file
   let totalFixed = 0;
   
   jsFiles.forEach(file => {
     try {
       const content = fs.readFileSync(file, 'utf8');
       let modified = content;
       let fileFixed = false;
       
       patterns.forEach(pattern => {
         if (pattern.search.test(modified)) {
           modified = modified.replace(pattern.search, pattern.replace);
           fileFixed = true;
           totalFixed++;
           console.log(`Fixed ${pattern.search} in ${file}`);
         }
       });
       
       if (fileFixed) {
         fs.writeFileSync(file, modified, 'utf8');
       }
     } catch (error) {
       console.error(`Error processing ${file}: ${error.message}`);
     }
   });
   
   console.log(`Fixed endpoints in ${totalFixed} locations`);
   END
   
   # Copy the script to the container
   docker cp /tmp/fix_endpoints.js pacer_frontend:/tmp/
   
   # Run the script in the container
   echo "Running fix script in frontend container..."
   docker exec -it pacer_frontend node /tmp/fix_endpoints.js
   
   # Restart the frontend container to apply changes
   echo "Restarting frontend container..."
   docker restart pacer_frontend
   
   echo "Fix completed. Please test the application."
   EOF
   
   # Make the script executable and run it
   chmod +x fix_frontend_endpoints.sh
   ./fix_frontend_endpoints.sh
   ```

3. After running the script, test the application by visiting:
   ```
   https://vps-d067f247.vps.ovh.ca/pacer/login
   ```

## Alternative: Pull the Latest Changes

Since we've pushed the fix to the GitHub repository, you can also redeploy the entire application to get the latest changes:

1. SSH into your VPS:
   ```bash
   ssh debian@vps-d067f247.vps.ovh.ca
   ```

2. Trigger the GitHub Actions webhook to deploy the latest changes:
   ```bash
   cd ~/pacer
   
   # Stop and remove existing containers
   docker-compose -f docker-compose.vps.yml down
   
   # Pull the latest images
   docker-compose -f docker-compose.vps.yml pull
   
   # Start containers with new images
   docker-compose -f docker-compose.vps.yml up -d
   ```

## Explanation

The key issue was that the frontend API service was trying to access endpoints with an extra "progress/" segment in the path. The correct endpoint paths in the backend are:

- `/progress` (not `/progress/progress`)
- `/progress/detailed` (not `/progress/progress/detailed`)
- `/progress/check-achievements` (not `/progress/progress/check-achievements`)

This mismatch caused the 404 errors when the dashboard tried to load. By fixing the endpoint paths in the frontend code, the application should now be able to correctly access the backend API endpoints.

## Verifying the Fix

After applying the fix, the frontend should be able to correctly fetch progress data from the backend. You can verify this by:

1. Checking the browser console for network requests - you should see successful 200 responses for the progress endpoints
2. The dashboard should load without errors
3. If needed, you can check the backend logs to see the correct API requests:
   ```bash
   docker logs pacer_backend | grep "GET /api/progress"
   ``` 