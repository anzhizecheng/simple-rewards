@echo off
chcp 65001 >nul
cd /d "%~dp0"

title 勇者征程 · 启动器

echo ========================================
echo   勇者征程 · 本地服务器启动器
echo   适用于 Windows 7/10/11
echo ========================================
echo.

REM 检查 Node.js 是否已安装
set NODE_PATH=
where node >nul 2>&1
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('where node') do set NODE_PATH=%%i
    goto NODE_READY
)

REM 尝试从常见安装路径查找
set NODE_CANDIDATES="%ProgramFiles%\nodejs\node.exe" "%ProgramFiles(x86)%\nodejs\node.exe"
for %%p in (%NODE_CANDIDATES%) do (
    if exist %%p (
        set NODE_PATH=%%~p
        goto NODE_READY
    )
)

:NODE_INSTALL
echo [1/3] Node.js 未在系统中找到，准备自动安装...
echo.

REM 获取系统架构
set ARCH=x64
if "%PROCESSOR_ARCHITECTURE%"=="ARM64" set ARCH=arm64
if "%PROCESSOR_ARCHITECTURE%"=="x86" (
    if "%PROCESSOR_ARCHITEW6432%"=="" set ARCH=x86
)

echo 系统架构: %ARCH%
echo 下载 Node.js LTS 安装包（约 50MB）...
echo.

set MSI_URL=https://nodejs.org/dist/v22.14.0/node-v22.14.0-%ARCH%.msi
set MSI_PATH=%TEMP%\node-installer-%ARCH%.msi

echo 下载中，请稍候...
powershell -Command "$wc = New-Object System.Net.WebClient; [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; try { Write-Host '下载中...'; $wc.DownloadFile('%MSI_URL%', '%MSI_PATH%'); Write-Host '下载完成!'; exit 0 } catch { Write-Host '下载失败: ' + $_.Exception.Message; exit 1 }"

if %errorlevel% neq 0 (
    echo.
    echo [错误] 自动下载失败，请手动安装 Node.js:
    echo   下载地址: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo.
echo [2/3] 正在安装 Node.js（静默安装，请稍候）...
msiexec /i "%MSI_PATH%" /quiet /norestart
set INSTALL_EXIT=%errorlevel%

echo [3/3] 清理临时文件...
del "%MSI_PATH%" 2>nul

if %INSTALL_EXIT% neq 0 (
    echo [警告] 安装程序返回代码 %INSTALL_EXIT%
    echo 但可能已部分安装，继续尝试...
) else (
    echo 安装成功!
)

REM 刷新 PATH
for /f "tokens=2*" %%a in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v Path 2^>nul') do set "PATH=%%b;%PATH%"
for /f "tokens=2*" %%a in ('reg query "HKCU\Environment" /v Path 2^>nul') do set "PATH=%%b;%PATH%"

REM 重新检查
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [错误] 安装后仍无法找到 Node.js
    echo 请手动安装后重新运行。
    echo.
    pause
    exit /b 1
)

:NODE_READY
for /f "tokens=*" %%i in ('node --version') do set NODE_VER=%%i
echo [Node.js %NODE_VER%] 已就绪
echo.

if not exist "server.js" (
    echo [错误] 未找到 server.js
    echo 请确保本程序放在勇者征程项目目录下。
    echo.
    pause
    exit /b 1
)
echo [项目文件] 已确认
echo.

echo [启动] 正在启动本地服务器...
echo.
echo ========================================
echo   勇者征程 · 本地存档服务器
echo ========================================
echo   访问地址: http://localhost:3789
echo   存档目录: %~dp0save\
echo.
echo   按 Ctrl+C 停止服务器
echo ========================================
echo.

node server.js

echo.
echo 服务器已停止。
pause
