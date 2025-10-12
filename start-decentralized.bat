@echo off
echo ============================================================
echo    BnB Decentralized Proxy Network - Quick Start
echo ============================================================
echo.

echo Step 1: Checking database migration...
psql %DATABASE_URL% -f scripts\add-keeper-columns.sql
if errorlevel 1 (
    echo ERROR: Database migration failed!
    echo Make sure DATABASE_URL environment variable is set.
    pause
    exit /b 1
)
echo ✅ Database migration completed
echo.

echo Step 2: Installing keeper node dependencies...
cd keeper-node
if not exist package.json (
    echo ERROR: keeper-node/package.json not found!
    pause
    exit /b 1
)

if not exist node_modules (
    echo Installing dependencies...
    call npm install
)
echo ✅ Dependencies installed
echo.

echo Step 3: Checking keeper node configuration...
if not exist .env (
    echo Creating .env from .env.example...
    copy .env.example .env
    echo.
    echo ⚠️  IMPORTANT: Edit keeper-node/.env with your settings!
    echo    - KEEPER_WALLET_PRIVATE_KEY
    echo    - DATABASE_URL
    echo    - RPC_URL
    echo.
    pause
)
echo.

echo Step 4: Starting keeper node...
echo Starting keeper-node-1 on port 3001...
start "Keeper Node 1" cmd /k "npm start"
timeout /t 3
echo.

echo Step 5: Checking keeper node health...
timeout /t 2
curl http://localhost:3001/health
echo.

cd ..
echo ============================================================
echo    Setup Complete!
echo ============================================================
echo.
echo Next steps:
echo   1. Start main app: npm run dev
echo   2. Run tests: node test-decentralized-proxy.js
echo   3. Monitor keeper: http://localhost:3001/stats
echo.
echo Keeper Node running in separate window.
echo Close that window to stop the keeper node.
echo.
pause
