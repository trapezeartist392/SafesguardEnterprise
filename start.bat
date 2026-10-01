@echo off
title SafeguardIQ Enterprise v1 — Startup
color 0E

echo.
echo  ================================================
echo   SafeguardIQ Enterprise v1 — Starting up...
echo  ================================================
echo.

:: 1. Start Postgres
echo [1/5] Starting Postgres...
docker start sgiq_ent_postgres 2>nul
if %errorlevel% neq 0 (
    echo   Container not found — creating fresh one...
    docker run --name sgiq_ent_postgres -e POSTGRES_DB=safeguardsiq_enterprise -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=devpass -p 5434:5432 -d postgres:16-alpine
    timeout /t 4 /nobreak >nul
    echo   Running migrations...
    docker cp "%~dp0src\db\migrations\001_init.sql" sgiq_ent_postgres:/tmp/001.sql
    docker cp "%~dp0src\db\migrations\002_v1_compat.sql" sgiq_ent_postgres:/tmp/002.sql
    docker cp "%~dp0src\db\migrations\003_seed_full.sql" sgiq_ent_postgres:/tmp/003.sql
    docker exec sgiq_ent_postgres psql -U postgres -d safeguardsiq_enterprise -f /tmp/001.sql
    docker exec sgiq_ent_postgres psql -U postgres -d safeguardsiq_enterprise -f /tmp/002.sql
    docker exec sgiq_ent_postgres psql -U postgres -d safeguardsiq_enterprise -f /tmp/003.sql
)
timeout /t 2 /nobreak >nul
echo   Postgres running on port 5434
echo.

:: 2. License check
echo [2/5] Checking license...
if not exist "C:\tmp\license\" mkdir "C:\tmp\license"
if not exist "C:\tmp\license\safeguardsiq.lic" (
    if exist "%~dp0sample-license\safeguardsiq-demo-factory.lic" (
        copy /Y "%~dp0sample-license\safeguardsiq-demo-factory.lic" "C:\tmp\license\safeguardsiq.lic" >nul
        echo   Demo license placed at C:\tmp\license\safeguardsiq.lic
    ) else (
        echo   WARNING: No license file found!
    )
) else (
    echo   License found
)
echo.

:: 3. Install dependencies if missing
echo [3/5] Checking dependencies...
if not exist "%~dp0node_modules\" (
    echo   Installing backend dependencies...
    cd /d "%~dp0"
    call npm install
    echo   Backend deps installed
) else (
    echo   Backend deps OK
)
if not exist "%~dp0frontend\node_modules\" (
    echo   Installing frontend dependencies...
    cd /d "%~dp0frontend"
    call npm install
    cd /d "%~dp0"
    echo   Frontend deps installed
) else (
    echo   Frontend deps OK
)
echo.

:: 4. Start Backend in new window
echo [4/5] Starting backend (port 4200)...
start "SafeguardIQ Enterprise — Backend" cmd /k ^
"cd /d "%~dp0"^
& set DB_HOST=localhost^
& set DB_PORT=5434^
& set DB_NAME=safeguardsiq_enterprise^
& set DB_USER=postgres^
& set DB_PASSWORD=devpass^
& set JWT_SECRET=dev-secret-change-in-production^
& set LICENSE_PATH=C:\tmp\license\safeguardsiq.lic^
& npm run dev"
timeout /t 5 /nobreak >nul
echo   Backend starting in new window
echo.

:: 5. Start Frontend in new window
echo [5/5] Starting frontend (port 5173)...
start "SafeguardIQ Enterprise — Frontend" cmd /k "cd /d "%~dp0frontend" & npm run dev"
timeout /t 3 /nobreak >nul
echo   Frontend starting in new window
echo.

:: Open browser
timeout /t 2 /nobreak >nul
start http://localhost:5173

echo.
echo  ================================================
echo   All services starting. Dashboard opening...
echo  ================================================
echo.
echo   Dashboard:    http://localhost:5173
echo   Backend API:  http://localhost:4200/api/health
echo   Login:        admin@bharatforge.com / Admin@123
echo.
echo   To stop: close the Backend and Frontend windows, then run:
echo     docker stop sgiq_ent_postgres
echo.
pause
