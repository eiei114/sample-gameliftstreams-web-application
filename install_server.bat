REM Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
REM SPDX-License-Identifier: MIT-0

@echo off
setlocal enabledelayedexpansion

:: Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Node.js is not installed or not in the system PATH.
    echo Please install Node.js from https://nodejs.org/ and try again.
    pause
    exit /b 1
)

echo Starting local server...

:: Install root dependencies
call npm install
if %errorlevel% neq 0 (
    echo npm install failed in root. Please check your internet connection and try again.
    pause
    exit /b 1
)

:: Install @types/node
call npm install --save-dev @types/node
if %errorlevel% neq 0 (
    echo Failed to install @types/node
    pause
    exit /b 1
)

:: Verify aws-cdk-lib installation
call npm list aws-cdk-lib >nul 2>&1
if %errorlevel% neq 0 (
    echo aws-cdk-lib not found. Installing...
    call npm install aws-cdk-lib
    if %errorlevel% neq 0 (
        echo Failed to install aws-cdk-lib
        pause
        exit /b 1
    )
)

:: Navigate to server directory and install its dependencies
cd server
call npm install --omit=dev
if %errorlevel% neq 0 (
    echo npm install failed in server folder. Please check your internet connection and try again.
    cd ..
    pause
    exit /b 1
)

:: Return to root directory
cd ..

:: Set IS_LOCAL to true for local development
echo Setting IS_LOCAL to true for local development...
set IS_LOCAL=true
node build.js
if %errorlevel% neq 0 (
    echo Failed to set IS_LOCAL to true
    pause
    exit /b 1
)

:: Set NODE_ENV and run build script
set NODE_ENV=development
node build.js

:: Set AWS SDK related environment variables
set AWS_SDK_LOAD_CONFIG=1
set AWS_NODEJS_CONNECTION_REUSE_ENABLED=1
set AWS_SDK_JS_SUPPRESS_MAINTENANCE_MODE_MESSAGE=1

:: Navigate to server directory and start server
cd server
set NODE_ENV=development

:: Check AWS SDK installation (Windows-friendly version)
echo Checking AWS SDK installation...
if not exist "node_modules\@aws-sdk" (
    echo AWS SDK not found. Running reinstall...
    if exist "node_modules" rmdir /s /q "node_modules"
    if exist "package-lock.json" del /f /q "package-lock.json"
    call npm install
    if %errorlevel% neq 0 (
        echo Reinstall failed. Please check your setup and try again.
        cd ..
        pause
        exit /b 1
    )
) else (
    echo AWS SDK found.
)

:: Start the server
echo Starting the server...
npm run start

:: Return to root directory
cd ..

endlocal