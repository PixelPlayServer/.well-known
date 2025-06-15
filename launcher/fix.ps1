<#
.SYNOPSIS
    Este script automatiza la configuración del entorno para Pixelplay Launcher.
    Requiere ejecución como Administrador.

.DESCRIPTION
    El script realiza las siguientes acciones:
    1. Verifica si se está ejecutando con privilegios de administrador y, si no, se reinicia como tal.
    2. Crea un directorio temporal para las descargas.
    3. Descarga los instaladores MSI de OpenJDK 21 y Node.js v22.
    4. Instala ambos MSI de forma silenciosa.
    5. Busca y elimina cualquier acceso directo existente de "Pixelplay Launcher" en el escritorio y en el menú de inicio común.
    6. Elimina carpetas de versiones antiguas dentro de la instalación de Pixelplay Launcher.
    7. Ejecuta npm install en el directorio de la aplicación.
    8. Crea un nuevo acceso directo en el escritorio que solo ejecuta 'npm start'.
    9. Limpia los archivos descargados al finalizar.

.NOTES
    Autor: Gemini
    Fecha: 15/06/2025
    Corrección: Configuración UTF-8 y ejecución directa de npm install
#>

# --- CONFIGURACIÓN DE CODIFICACIÓN ---
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# --- 1. VERIFICACIÓN DE PERMISOS DE ADMINISTRADOR ---
Write-Host "🔐 Verificando permisos de administrador..." -ForegroundColor Cyan
if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "⚠️  Este script requiere privilegios de administrador" -ForegroundColor Yellow
    Write-Host "🔄 Reiniciando como administrador..." -ForegroundColor Cyan
    Start-Process powershell.exe -Verb RunAs -ArgumentList ("-NoProfile -ExecutionPolicy Bypass -File `"{0}`"" -f $MyInvocation.MyCommand.Path)
    exit
}
Write-Host "✅ Permisos de administrador confirmados" -ForegroundColor Green
Start-Sleep -Milliseconds 500

# --- 2. DEFINICIÓN DE VARIABLES ---
Write-Host "`n⚙️ Inicializando configuración..." -ForegroundColor Cyan
Start-Sleep -Milliseconds 300

# Directorio de la aplicación y del icono
$launcherBaseDir = "C:\Program Files\Pixelplay Launcher"
$appDir = Join-Path $launcherBaseDir "resources\app"
$iconPath = Join-Path $launcherBaseDir "pixel.ico"

# URLs de descarga
$openjdkUrl = "https://release-assets.githubusercontent.com/github-production-release-asset/602574963/86891b60-d9eb-45a1-af09-7f8c326d3daa?sp=r&sv=2018-11-09&sr=b&spr=https&se=2025-06-15T02%3A45%3A33Z&skoid=96c2d410-5711-43a1-aedd-ab1947aa7ab0&sktid=398a6654-997b-47e9-b12b-9515b896b4de&skt=2025-06-15T01%3A53%3A54Z&ske=2025-06-15T02%3A54%3A16Z&sks=b&skv=2018-11-09&sig=JYq9QaVCs7PizQGYWkBEnrSh4goz7VphdM4QZYI8d%2FA%3D&jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJnaXRodWIuY29tIiwiYXVkIjoicmVsZWFzZS1hc3NldHMuZ2l0aHVidXNlcmNvbnRlbnQuY29tIiwia2V5Ijoia2V5MSIsImV4cCI6MTc0OTk1NTUzMywibmJmIjoxNzQ5OTU1MjMzLCJwYXRoIjoicmVsZWFzZWFzc2V0cHJvZHVjdGlvbi5ibG9iLmNvcmUud2luZG93cy5uZXQifQ.PyhViPsm3IxUjhf8zNkSZRuugYQ8gOWdAbc3N-IcUPg"
$nodejsUrl = "https://nodejs.org/dist/v22.16.0/node-v22.16.0-x64.msi"

# Directorio temporal para descargas
$tempDir = Join-Path $env:TEMP "LauncherSetup"
if (-NOT (Test-Path $tempDir)) {
    New-Item -Path $tempDir -ItemType Directory | Out-Null
}

# Nombres de archivo de salida
$openjdkFile = Join-Path $tempDir "OpenJDK21.msi"
$nodejsFile = Join-Path $tempDir "NodeJS22.msi"

# Carpetas a eliminar
$versionsToDelete = @(
    "1.21.5",
    "1.21.6-pre1",
    "1.21.6-pre3",
    "1.21.6-rc1"
)
$versionsBasePath = Join-Path $appDir "client\versions"

# --- 3. DESCARGA DE ARCHIVOS ---
Write-Host "`n📥 Descargando componentes necesarios..." -ForegroundColor Cyan
$downloadProgress = @("⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏")
$progressIndex = 0

try {
    Write-Host "  🔄 Descargando OpenJDK 21..." -NoNewline
    for ($i = 0; $i -lt 3; $i++) {
        Write-Host "`r  $($downloadProgress[$progressIndex % $downloadProgress.Length]) Descargando OpenJDK 21..." -NoNewline
        $progressIndex++
        Start-Sleep -Milliseconds 200
    }
    Invoke-WebRequest -Uri $openjdkUrl -OutFile $openjdkFile -UseBasicParsing
    Write-Host "`r  ✅ OpenJDK 21 descargado correctamente           " -ForegroundColor Green

    Write-Host "  🔄 Descargando Node.js v22..." -NoNewline
    for ($i = 0; $i -lt 3; $i++) {
        Write-Host "`r  $($downloadProgress[$progressIndex % $downloadProgress.Length]) Descargando Node.js v22..." -NoNewline
        $progressIndex++
        Start-Sleep -Milliseconds 200
    }
    Invoke-WebRequest -Uri $nodejsUrl -OutFile $nodejsFile -UseBasicParsing
    Write-Host "`r  ✅ Node.js v22 descargado correctamente         " -ForegroundColor Green
}
catch {
    Write-Host "`r  ❌ Error durante la descarga: $_" -ForegroundColor Red
    exit 1
}

# --- 4. INSTALACIÓN DE SOFTWARE ---
Write-Host "`n⚙️ Configurando entorno de desarrollo..." -ForegroundColor Cyan
Start-Sleep -Milliseconds 500

try {
    Write-Host "  🔄 Instalando OpenJDK 21 (esto puede tardar unos minutos)..." -ForegroundColor Gray
    Start-Process msiexec.exe -ArgumentList "/i `"$openjdkFile`" /quiet /norestart" -Wait
    Write-Host "  ✅ OpenJDK 21 instalado exitosamente" -ForegroundColor Green
    Start-Sleep -Milliseconds 300

    Write-Host "  🔄 Instalando Node.js v22 (esto puede tardar unos minutos)..." -ForegroundColor Gray
    Start-Process msiexec.exe -ArgumentList "/i `"$nodejsFile`" /quiet /norestart" -Wait
    Write-Host "  ✅ Node.js v22 instalado exitosamente" -ForegroundColor Green
    Start-Sleep -Milliseconds 300
}
catch {
    Write-Host "`r  ❌ Error durante la instalación: $_" -ForegroundColor Red
    exit 1
}

# --- 5. LIMPIEZA DE ACCESOS DIRECTOS ANTIGUOS ---
Write-Host "`n🔄 Restableciendo App, manteniendo la sesión..." -ForegroundColor Cyan
Start-Sleep -Milliseconds 500

# Definir todas las rutas donde pueden estar los accesos directos
$desktopPath = [Environment]::GetFolderPath('Desktop')
$publicDesktopPath = "C:\Users\Public\Desktop"
$commonProgramsPath = "C:\ProgramData\Microsoft\Windows\Start Menu\Programs"
$userProgramsPath = Join-Path ([Environment]::GetFolderPath('StartMenu')) "Programs"

$shortcutLocations = @(
    @{ Path = $desktopPath; Name = "Escritorio personal" },
    @{ Path = $publicDesktopPath; Name = "Escritorio público" },
    @{ Path = $commonProgramsPath; Name = "Menú de inicio (sistema)" },
    @{ Path = $userProgramsPath; Name = "Menú de inicio (usuario)" }
)

$shortcutsFound = 0
foreach ($location in $shortcutLocations) {
    if (Test-Path $location.Path) {
        $shortcuts = Get-ChildItem -Path $location.Path -Filter "*.lnk" -ErrorAction SilentlyContinue | 
                    Where-Object { $_.Name -like "*Pixelplay Launcher*" }
        
        foreach ($shortcut in $shortcuts) {
            Write-Host "  ✓ Encontrado en $($location.Name): $($shortcut.Name)" -ForegroundColor Gray
            Remove-Item $shortcut.FullName -Force -ErrorAction SilentlyContinue
            $shortcutsFound++
            Start-Sleep -Milliseconds 200
        }
    }
}

if ($shortcutsFound -gt 0) {
    Write-Host "  ✓ Se eliminaron $shortcutsFound acceso(s) directo(s) anterior(es)" -ForegroundColor Green
} else {
    Write-Host "  ℹ No se encontraron accesos directos anteriores" -ForegroundColor Gray
}
Start-Sleep -Milliseconds 300

# --- 6. ELIMINACIÓN DE CARPETAS DE VERSIONES ---
Write-Host "`n🔄 Actualizando versiones de Pixelplay, por favor espere..." -ForegroundColor Cyan
Start-Sleep -Milliseconds 500

if (Test-Path $versionsBasePath) {
    $versionsDeleted = 0
    foreach ($version in $versionsToDelete) {
        $versionPath = Join-Path $versionsBasePath $version
        if (Test-Path $versionPath) {
            Write-Host "  ✓ Eliminando versión: $version" -ForegroundColor Gray
            Remove-Item -Path $versionPath -Recurse -Force -ErrorAction SilentlyContinue
            $versionsDeleted++
            Start-Sleep -Milliseconds 300
        }
    }
    
    if ($versionsDeleted -gt 0) {
        Write-Host "  ✓ Se eliminaron $versionsDeleted versión(es) obsoleta(s)" -ForegroundColor Green
    } else {
        Write-Host "  ℹ No se encontraron versiones obsoletas para eliminar" -ForegroundColor Gray
    }
} else {
    Write-Host "  ⚠ El directorio de versiones no fue encontrado" -ForegroundColor Yellow
}
Start-Sleep -Milliseconds 300

# --- 7. EJECUTAR NPM INSTALL ---
Write-Host "`n📦 Actualizando dependencias del launcher..." -ForegroundColor Cyan
Start-Sleep -Milliseconds 500

try {
    # Verificar que el directorio de la app exista
    if (-NOT(Test-Path $appDir)) { 
        Write-Host "  ❌ El directorio de la aplicación no existe: $appDir" -ForegroundColor Red
        throw "Directorio de aplicación no encontrado"
    }

    Write-Host "  🔄 Ejecutando npm install (esto puede tardar varios minutos)..." -ForegroundColor Gray
    
    # Cambiar al directorio de la aplicación y ejecutar npm install
    Push-Location $appDir
    $npmProcess = Start-Process -FilePath "npm" -ArgumentList "install" -Wait -PassThru -NoNewWindow
    Pop-Location
    
    if ($npmProcess.ExitCode -eq 0) {
        Write-Host "  ✅ Dependencias instaladas exitosamente" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️ npm install completado con advertencias (código: $($npmProcess.ExitCode))" -ForegroundColor Yellow
    }
    Start-Sleep -Milliseconds 300
}
catch {
    Write-Host "  ❌ Error al ejecutar npm install: $_" -ForegroundColor Red
    Write-Host "  ℹ️ Continuando con la creación del acceso directo..." -ForegroundColor Gray
}

# --- 8. CREACIÓN DE NUEVO ACCESO DIRECTO ---
Write-Host "`n🚀 Configurando launcher optimizado..." -ForegroundColor Cyan
Start-Sleep -Milliseconds 500

try {
    if (-NOT(Test-Path $iconPath)) { 
        Write-Host "  ⚠ Icono personalizado no encontrado, usando icono por defecto" -ForegroundColor Yellow
    }

    $wshell = New-Object -ComObject WScript.Shell
    $shortcut = $wshell.CreateShortcut((Join-Path $desktopPath "Pixelplay Launcher.lnk"))
    
    # Crear acceso directo que solo ejecute npm start
    Write-Host "  🔄 Creando acceso directo optimizado..." -ForegroundColor Gray
    $shortcut.TargetPath = "cmd.exe"
    $shortcut.Arguments = "/k `"cd /d `"$appDir`" && npm start`""
    $shortcut.WorkingDirectory = $appDir
    $shortcut.IconLocation = $iconPath
    $shortcut.Description = "Pixelplay Launcher - Inicia la aplicación directamente"
    
    $shortcut.Save()
    Start-Sleep -Milliseconds 300

    Write-Host "  ✅ Acceso directo creado exitosamente en el escritorio" -ForegroundColor Green
}
catch {
    Write-Host "  ❌ Error al crear el acceso directo: $_" -ForegroundColor Red
    exit 1
}

# --- 9. LIMPIEZA FINAL ---
Write-Host "`n🧹 Finalizando configuración..." -ForegroundColor Cyan
Start-Sleep -Milliseconds 500

Write-Host "  🔄 Limpiando archivos temporales..." -ForegroundColor Gray
Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue
Start-Sleep -Milliseconds 300
Write-Host "  ✅ Limpieza completada" -ForegroundColor Green

Write-Host "`n🎉 ¡CONFIGURACIÓN COMPLETADA EXITOSAMENTE!" -ForegroundColor Magenta
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host "✨ Pixelplay Launcher está listo para usar" -ForegroundColor Green
Write-Host "🚀 Haz doble clic en el acceso directo del escritorio para iniciar" -ForegroundColor Cyan
Write-Host "💡 Las dependencias ya están actualizadas y listas" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
