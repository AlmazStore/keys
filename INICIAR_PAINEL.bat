@echo off
title ALMAZ - Iniciar Painel de Keys
chcp 65001 > nul
cls

echo =======================================================
echo            ALMAZ - SISTEMA DE KEYS (PAINEL)
echo =======================================================
echo.

:: Verificar se o Node.js está instalado
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERRO] O Node.js não foi encontrado no seu computador!
    echo.
    echo Para fazer o sistema funcionar, você precisa instalar o Node.js.
    echo.
    echo Vou abrir o site oficial do Node.js no seu navegador...
    echo Baixe e instale a versão "LTS" (o botão verde grande).
    echo Depois de instalar, feche esta janela e abra ela novamente.
    echo.
    pause
    start https://nodejs.org/
    exit
)

:: Verificar se a pasta node_modules existe
if not exist node_modules (
    echo [INFO] Primeira execução detectada. Instalando componentes necessários...
    echo Isso pode levar alguns segundos, por favor aguarde...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERRO] Falha ao instalar dependências. Verifique sua conexão.
        pause
        exit
      )
)

echo [OK] Componentes prontos.
echo [INFO] Iniciando o servidor de validação...
echo.
echo === O PAINEL E O SERVIDOR ESTÃO ONLINE AGORA ===
echo.
echo -> Para acessar o painel administrativo, abra o link:
echo    http://localhost:3000
echo.
echo -> Não feche esta janela preta enquanto estiver usando!
echo =======================================================
echo.

:: Abrir o painel no navegador automaticamente
start http://localhost:3000

:: Rodar o servidor
npm start
pause
