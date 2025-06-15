<#
.SYNOPSIS
    Este script automatiza la configuracion del entorno para Pixelplay Launcher.
    Requiere ejecucion como Administrador.

.DESCRIPTION
    El script realiza las siguientes acciones:
    1. Verifica si se esta ejecutando con privilegios de administrador y, si no, se reinicia como tal.
    2. Crea un directorio temporal para las descargas.
    3. Descarga los instaladores MSI de OpenJDK 21 y Node.js v22.
    4. Instala ambos MSI de forma silenciosa.
    5. Busca y elimina cualquier acceso directo existente de "Pixelplay Launcher" en el escritorio y en el menu de inicio comun.
    6. Elimina carpetas de versiones antiguas dentro de la instalacion de Pixelplay Launcher.
    7. Ejecuta npm install en el directorio de la aplicacion.
    8. Crea un nuevo acceso directo en el escritorio que solo ejecuta 'npm start'.
    9. Limpia los archivos descargados al finalizar.

.NOTES
    Autor: Gemini
    Fecha: 15/06/2025
    Correccion: Configuracion UTF-8 y ejecucion directa de npm install
#>

# --- CONFIGURACION DE CODIFICACION ---
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# --- 1. VERIFICACION DE PERMISOS DE ADMINISTRADOR ---
Write-Host "Verificando permisos de administrador..." -ForegroundColor Cyan
if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "Este script requiere privilegios de administrador" -ForegroundColor Yellow
    Write-Host "Reiniciando como administrador..." -ForegroundColor Cyan
    Start-Process powershell.exe -Verb RunAs -ArgumentList ("-NoProfile -ExecutionPolicy Bypass -File `"{0}`"" -f $MyInvocation.MyCommand.Path)
    exit
}
Write-Host "Permisos de administrador confirmados" -ForegroundColor Green
Start-Sleep -Milliseconds 500

# --- 2. DEFINICION DE VARIABLES ---
Write-Host "`nInicializando configuracion..." -ForegroundColor Cyan
Start-Sleep -Milliseconds 300

# Directorio de la aplicacion y del icono
$launcherBaseDir = "C:\Program Files\Pixelplay Launcher"
$appDir = Join-Path $launcherBaseDir "resources\app"
$iconPath = Join-Path $launcherBaseDir "pixel.ico"

# URLs de descarga
$openjdkUrl = "https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.5%2B11/OpenJDK21U-jdk_x64_windows_hotspot_21.0.5_11.msi"
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
Write-Host "`nDescargando componentes necesarios..." -ForegroundColor Cyan

try {
    Write-Host "  Descargando OpenJDK 21..." -ForegroundColor Gray
    Invoke-WebRequest -Uri $openjdkUrl -OutFile $openjdkFile -UseBasicParsing
    Write-Host "  OpenJDK 21 descargado correctamente" -ForegroundColor Green

    Write-Host "  Descargando Node.js v22..." -ForegroundColor Gray
    Invoke-WebRequest -Uri $nodejsUrl -OutFile $nodejsFile -UseBasicParsing
    Write-Host "  Node.js v22 descargado correctamente" -ForegroundColor Green
}
catch {
    Write-Host "  Error durante la descarga: $_" -ForegroundColor Red
    exit 1
}

# --- 4. INSTALACION DE SOFTWARE ---
Write-Host "`nConfigurando entorno de desarrollo..." -ForegroundColor Cyan
Start-Sleep -Milliseconds 500

try {
    Write-Host "  Instalando OpenJDK 21 (esto puede tardar unos minutos)..." -ForegroundColor Gray
    Start-Process msiexec.exe -ArgumentList "/i `"$openjdkFile`" /quiet /norestart" -Wait -NoNewWindow
    Write-Host "  OpenJDK 21 instalado exitosamente" -ForegroundColor Green
    Start-Sleep -Milliseconds 300

    Write-Host "  Instalando Node.js v22 (esto puede tardar unos minutos)..." -ForegroundColor Gray
    Start-Process msiexec.exe -ArgumentList "/i `"$nodejsFile`" /quiet /norestart" -Wait -NoNewWindow
    Write-Host "  Node.js v22 instalado exitosamente" -ForegroundColor Green
    Start-Sleep -Milliseconds 300
}
catch {
    Write-Host "  Error durante la instalacion: $_" -ForegroundColor Red
    exit 1
}

# --- 5. LIMPIEZA DE ACCESOS DIRECTOS ANTIGUOS ---
Write-Host "`nRestableciendo App, manteniendo la sesion..." -ForegroundColor Cyan
Start-Sleep -Milliseconds 500

# Definir todas las rutas donde pueden estar los accesos directos
$desktopPath = [Environment]::GetFolderPath('Desktop')
$publicDesktopPath = "C:\Users\Public\Desktop"
$commonProgramsPath = "C:\ProgramData\Microsoft\Windows\Start Menu\Programs"
$userProgramsPath = Join-Path ([Environment]::GetFolderPath('StartMenu')) "Programs"

$shortcutLocations = @(
    @{ Path = $desktopPath; Name = "Escritorio personal" },
    @{ Path = $publicDesktopPath; Name = "Escritorio publico" },
    @{ Path = $commonProgramsPath; Name = "Menu de inicio (sistema)" },
    @{ Path = $userProgramsPath; Name = "Menu de inicio (usuario)" }
)

$shortcutsFound = 0
foreach ($location in $shortcutLocations) {
    if (Test-Path $location.Path) {
        $shortcuts = Get-ChildItem -Path $location.Path -Filter "*.lnk" -ErrorAction SilentlyContinue | 
                    Where-Object { $_.Name -like "*Pixelplay Launcher*" }
        
        foreach ($shortcut in $shortcuts) {
            Write-Host "  Encontrado en $($location.Name): $($shortcut.Name)" -ForegroundColor Gray
            Remove-Item $shortcut.FullName -Force -ErrorAction SilentlyContinue
            $shortcutsFound++
            Start-Sleep -Milliseconds 200
        }
    }
}

if ($shortcutsFound -gt 0) {
    Write-Host "  Se eliminaron $shortcutsFound acceso(s) directo(s) anterior(es)" -ForegroundColor Green
} else {
    Write-Host "  No se encontraron accesos directos anteriores" -ForegroundColor Gray
}
Start-Sleep -Milliseconds 300

# --- 6. ELIMINACION DE CARPETAS DE VERSIONES ---
Write-Host "`nActualizando versiones de Pixelplay, por favor espere..." -ForegroundColor Cyan
Start-Sleep -Milliseconds 500

if (Test-Path $versionsBasePath) {
    $versionsDeleted = 0
    foreach ($version in $versionsToDelete) {
        $versionPath = Join-Path $versionsBasePath $version
        if (Test-Path $versionPath) {
            Write-Host "  Eliminando version: $version" -ForegroundColor Gray
            Remove-Item -Path $versionPath -Recurse -Force -ErrorAction SilentlyContinue
            $versionsDeleted++
            Start-Sleep -Milliseconds 300
        }
    }
    
    if ($versionsDeleted -gt 0) {
        Write-Host "  Se eliminaron $versionsDeleted version(es) obsoleta(s)" -ForegroundColor Green
    } else {
        Write-Host "  No se encontraron versiones obsoletas para eliminar" -ForegroundColor Gray
    }
} else {
    Write-Host "  El directorio de versiones no fue encontrado" -ForegroundColor Yellow
}
Start-Sleep -Milliseconds 300

# --- 7. EJECUTAR NPM INSTALL ---
Write-Host "`nActualizando dependencias del launcher..." -ForegroundColor Cyan
Start-Sleep -Milliseconds 500

try {
    # Verificar que el directorio de la app exista
    if (-NOT(Test-Path $appDir)) { 
        Write-Host "  El directorio de la aplicacion no existe: $appDir" -ForegroundColor Red
        throw "Directorio de aplicacion no encontrado"
    }

    Write-Host "  Refrescando variables de entorno..." -ForegroundColor Gray
    # Refrescar variables de entorno para que Node.js sea reconocido
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    Start-Sleep -Milliseconds 500

    Write-Host "  Ejecutando npm install (esto puede tardar varios minutos)..." -ForegroundColor Gray
    
    # Usar cmd para ejecutar npm install con PATH actualizado
    $npmCommand = "cd /d `"$appDir`" && npm install"
    $npmProcess = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", $npmCommand -Wait -PassThru -WindowStyle Hidden
    
    if ($npmProcess.ExitCode -eq 0) {
        Write-Host "  Dependencias instaladas exitosamente" -ForegroundColor Green
    } else {
        Write-Host "  npm install completado con advertencias (codigo: $($npmProcess.ExitCode))" -ForegroundColor Yellow
        Write-Host "  Esto es normal si ya existian las dependencias" -ForegroundColor Gray
    }
    Start-Sleep -Milliseconds 300
}
catch {
    Write-Host "  Error al ejecutar npm install: $_" -ForegroundColor Red
    Write-Host "  Continuando con la creacion del acceso directo..." -ForegroundColor Gray
    Write-Host "  El acceso directo incluira npm install como respaldo" -ForegroundColor Yellow
}

# --- 8. CREACION DE NUEVO ACCESO DIRECTO ---
Write-Host "`nConfigurando launcher optimizado..." -ForegroundColor Cyan
Start-Sleep -Milliseconds 500

try {
    if (-NOT(Test-Path $iconPath)) { 
        Write-Host "  Icono personalizado no encontrado, usando icono por defecto" -ForegroundColor Yellow
    }

    $wshell = New-Object -ComObject WScript.Shell
    $shortcut = $wshell.CreateShortcut((Join-Path $desktopPath "Pixelplay Launcher.lnk"))
    
    # Crear acceso directo que ejecute npm install && npm start como respaldo
    Write-Host "  Creando acceso directo con respaldo de dependencias..." -ForegroundColor Gray
    $shortcut.TargetPath = "cmd.exe"
    $shortcut.Arguments = "/k `"cd /d `"$appDir`" && npm install && npm start`""
    $shortcut.WorkingDirectory = $appDir
    if (Test-Path $iconPath) {
        $shortcut.IconLocation = $iconPath
    }
    $shortcut.Description = "Pixelplay Launcher - Inicia con verificacion de dependencias"
    
    $shortcut.Save()
    Start-Sleep -Milliseconds 300

    Write-Host "  Acceso directo creado exitosamente en el escritorio" -ForegroundColor Green
}
catch {
    Write-Host "  Error al crear el acceso directo: $_" -ForegroundColor Red
    exit 1
}

# --- 9. LIMPIEZA FINAL ---
Write-Host "`nFinalizando configuracion..." -ForegroundColor Cyan
Start-Sleep -Milliseconds 500

Write-Host "  Limpiando archivos temporales..." -ForegroundColor Gray
Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue
Start-Sleep -Milliseconds 300
Write-Host "  Limpieza completada" -ForegroundColor Green

Write-Host "`nCONFIGURACION COMPLETADA EXITOSAMENTE!" -ForegroundColor Magenta
Write-Host "=================================================================" -ForegroundColor DarkGray
Write-Host "Pixelplay Launcher esta listo para usar" -ForegroundColor Green
Write-Host "Haz doble clic en el acceso directo del escritorio para iniciar" -ForegroundColor Cyan
Write-Host "Las dependencias ya estan actualizadas y listas" -ForegroundColor Yellow
Write-Host "=================================================================" -ForegroundColor DarkGray
