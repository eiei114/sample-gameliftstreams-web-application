@echo off
REM Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
REM SPDX-License-Identifier: MIT-0

REM Run the deploy script with your stream group identifier
REM Usage: ./deploy_cdk.bat <stream-group-id>
REM Example: ./deploy_cdk.bat <sg-000000000>

REM Check if StreamGroup ID was provided
if "%~1"=="" (
    echo Usage: %0 ^<stream-group-id^>
    echo Example: %0 sg-000000000
    exit /b 1
)

REM Validate StreamGroup ID format to match JavaScript pattern
powershell -Command "$regex = '^sg-[0-9a-zA-Z]{9,}$'; if ('%~1' -match $regex) {exit 0} else {exit 1}"
if errorlevel 1 (
    echo Error: Stream Group ID must match pattern sg-XXXXX...
    echo Where X is 9 or more alphanumeric characters
    echo Example valid ID: sg-000000000
    exit /b 1
)

REM Store the StreamGroup ID
set "STREAM_GROUP_ID=%~1"
echo Using Stream Group ID: %STREAM_GROUP_ID%

echo Starting deployment process...

REM Rest of your script continues here...
rem Check if Node.js is installed
node --version > nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo Node.js is installed.
    node --version
) else (
    echo Node.js is not installed. 
    echo Please install Node.js manually and try again.
    pause
    exit /b 1
)

echo Starting deployment process...

rem Check if Node.js is installed
node --version > nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo Node.js is installed.
    node --version
) else (
    echo Node.js is not installed. 
    echo Please install Node.js manually and try again.
    pause
    exit /b 1
)

echo.

rem Check if AWS CLI is installed
where aws >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo AWS CLI is not installed.
    echo Please install AWS CLI manually and try again.
    pause
    exit /b 1
)

rem Verify AWS CLI configuration
aws --version
if %ERRORLEVEL% neq 0 (
    echo Failed to get AWS CLI version
    pause
    exit /b 1
)

REM Simple AWS credential check
echo Verifying AWS credentials...
aws sts get-caller-identity >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo AWS credentials verification failed
    echo Please ensure you have valid AWS credentials configured
    pause
    exit /b 1
)

rem Store the current directory
set "PROJECT_DIR=%CD%"
echo Current directory: %PROJECT_DIR%

rem Install project dependencies
echo Installing project dependencies...
call npm install
if %ERRORLEVEL% neq 0 (
    echo Failed to install project dependencies
    pause
    exit /b 1
)

rem Check if CDK is installed in the project
call npm list aws-cdk >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Installing AWS CDK...
    call npm install --save-dev aws-cdk
    if %ERRORLEVEL% neq 0 (
        echo Failed to install AWS CDK
        pause
        exit /b 1
    )
)

rem Verify CDK version
echo Verifying CDK version...
call npx cdk --version
if %ERRORLEVEL% neq 0 (
    echo Failed to verify CDK installation
    pause
    exit /b 1
)

rem Build TypeScript files
echo Building TypeScript files...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo Failed to build TypeScript files
    pause
    exit /b 1
)

rem Install server dependencies
echo Installing server dependencies...

cd server
call npm install --omit=dev
if %ERRORLEVEL% neq 0 (
    echo Failed to install server dependencies
    pause
    exit /b 1
)

rem Return to project root
cd ..

rem Bootstrap the CDK stack
echo Bootstrapping the CDK stack...
call npx cdk bootstrap
if %ERRORLEVEL% neq 0 (
    echo CDK bootstrap failed
    pause
    exit /b 1
)

rem Synthesize the CDK stack
echo Synthesizing the CDK stack...
call npx cdk synth
if %ERRORLEVEL% neq 0 (
    echo CDK synthesis failed
    pause
    exit /b 1
)

rem Set IS_LOCAL to false for deployment
echo Setting IS_LOCAL to false for deployment...
set IS_LOCAL=false
node build.js
if %ERRORLEVEL% neq 0 (
    echo Failed to run build script
    pause
    exit /b 1
)

rem Deploy the CDK stack
echo Deploying the CDK stack...
call npx cdk deploy --require-approval never
if %ERRORLEVEL% neq 0 (
    echo CDK deployment failed
    pause
    exit /b 1
)

echo Deployment completed successfully!
pause

