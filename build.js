/**
 * 
 * * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: MIT-0
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this
 * software and associated documentation files (the "Software"), to deal in the Software
 * without restriction, including without limitation the rights to use, copy, modify,
 * merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 * 
 * 
 * Build Script Documentation
 * ========================
 * This script updates the IS_LOCAL configuration variable across multiple files
 * in the project. It reads the IS_LOCAL value from environment variables and
 * updates it in both server.js and index.html files.
 *
 * Requirements:
 * ------------
 * - Node.js environment
 * - Environment variable IS_LOCAL must be set ('true' or 'false')
 * - File structure must include:
 *   - /server/server.js
 *   - /server/public/index.html
 *
 * Environment Variables:
 * --------------------
 * IS_LOCAL: boolean
 *   Sets the environment mode
 *   - 'true': Local development environment
 *   - 'false': Deployed environment
 *
 * File Modifications:
 * -----------------
 * 1. server.js:
 *    - Updates the line containing "const IS_LOCAL = true/false;"
 *    - Must contain exact match of pattern to be replaced
 *
 * 2. index.html:
 *    - Updates the line containing "var IS_LOCAL = true/false;"
 *    - Must contain exact match of pattern to be replaced
 *
 * Error Handling:
 * -------------
 * - Fails if files cannot be read or written
 * - Exits with status code 1 on error
 * - Provides detailed error messages in console
 *
 * Usage:
 * -----
 * IS_LOCAL=true node build.js
 * 
 * Success Output:
 * -------------
 * - Logs confirmation messages for each file update
 * - Final success message confirms both files were updated
 *
 * Error Output:
 * -----------
 * - Logs specific error message for file operation failures
 * - Terminates process with exit code 1
 *
 * Notes:
 * -----
 * - Script uses synchronous file operations
 * - Regular expressions are used for precise replacements
 * - Both files must exist in their expected locations
 */

const fs = require('fs');
const path = require('path');

// Get the IS_LOCAL value from environment variable
const isLocal = process.env.IS_LOCAL === 'true';

// Update server.js
const serverPath = path.join(__dirname, 'server', 'server.js');
let serverContent;

try {
    serverContent = fs.readFileSync(serverPath, 'utf8');
    const updatedServerContent = serverContent.replace(
        /const IS_LOCAL = (true|false);/,
        `const IS_LOCAL = ${isLocal};`
    );
    
    fs.writeFileSync(serverPath, updatedServerContent);
    console.log(`Set IS_LOCAL to ${isLocal} in server.js`);
} catch (error) {
    console.error('Error updating server.js:', error);
    process.exit(1);
}

// Update index.html
const indexPath = path.join(__dirname, 'server', 'public', 'index.html');
let indexContent;

try {
    indexContent = fs.readFileSync(indexPath, 'utf8');
    const updatedIndexContent = indexContent.replace(
        /var IS_LOCAL = (true|false);/,
        `var IS_LOCAL = ${isLocal};`
    );

    fs.writeFileSync(indexPath, updatedIndexContent);
    console.log(`Set IS_LOCAL to ${isLocal} in index.html`);
} catch (error) {
    console.error('Error updating index.html:', error);
    process.exit(1);
}

console.log(`Successfully updated IS_LOCAL to ${isLocal} in both files`);