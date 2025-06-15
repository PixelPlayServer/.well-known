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
    7. Crea un nuevo acceso directo en el escritorio que ejecuta 'npm install' y 'npm start' en el directorio de la aplicación.
    8. Limpia los archivos descargados al finalizar.

.NOTES
    Autor: Gemini
    Fecha: 15/06/2025
#>

# --- 1. VERIFICACIÓN DE PERMISOS DE ADMINISTRADOR ---
Write-Host "Verificando permisos de administrador..." -ForegroundColor Yellow
if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Warning "Este script requiere privilegios de administrador. Intentando reiniciar como administrador..."
    Start-Process powershell.exe -Verb RunAs -ArgumentList ("-NoProfile -ExecutionPolicy Bypass -File `"{0}`"" -f $MyInvocation.MyCommand.Path)
    exit
}
Write-Host "Permisos de administrador confirmados." -ForegroundColor Green

# --- 2. DEFINICIÓN DE VARIABLES ---
Write-Host "Configurando variables..." -ForegroundColor Cyan

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
Write-Host "`n--- Iniciando descargas ---" -ForegroundColor Yellow
try {
    Write-Host "Descargando OpenJDK 21..."
    Invoke-WebRequest -Uri $openjdkUrl -OutFile $openjdkFile -UseBasicParsing
    Write-Host "OpenJDK 21 descargado correctamente." -ForegroundColor Green

    Write-Host "Descargando Node.js v22..."
    Invoke-WebRequest -Uri $nodejsUrl -OutFile $nodejsFile -UseBasicParsing
    Write-Host "Node.js v22 descargado correctamente." -ForegroundColor Green
}
catch {
    Write-Error "Ocurrió un error durante la descarga: $_"
    exit 1
}

# --- 4. INSTALACIÓN DE SOFTWARE ---
Write-Host "`n--- Iniciando instalaciones (esto puede tardar unos minutos) ---" -ForegroundColor Yellow
try {
    Write-Host "Instalando OpenJDK 21..."
    Start-Process msiexec.exe -ArgumentList "/i `"$openjdkFile`" /quiet /norestart" -Wait
    Write-Host "OpenJDK 21 instalado correctamente." -ForegroundColor Green

    Write-Host "Instalando Node.js v22..."
    Start-Process msiexec.exe -ArgumentList "/i `"$nodejsFile`" /quiet /norestart" -Wait
    Write-Host "Node.js v22 instalado correctamente." -ForegroundColor Green
}
catch {
    Write-Error "Ocurrió un error durante la instalación: $_"
    exit 1
}

# --- 5. LIMPIEZA DE ACCESOS DIRECTOS ANTIGUOS ---
Write-Host "`n--- Limpiando accesos directos antiguos ---" -ForegroundColor Yellow
$desktopPath = [Environment]::GetFolderPath('Desktop')
$commonProgramsPath = Join-Path ([Environment]::GetFolderPath('CommonStartMenu')) "Programs"
$shortcutPaths = @(
    (Join-Path $desktopPath "Pixelplay Launcher.lnk"),
    (Join-Path $commonProgramsPath "Pixelplay Launcher.lnk")
)

# Búsqueda más amplia por si el nombre varía ligeramente
Get-ChildItem -Path $desktopPath, $commonProgramsPath -Filter "*.lnk" | Where-Object { $_.Name -like "*Pixelplay Launcher*" } | ForEach-Object {
    Write-Host "Eliminando acceso directo encontrado en: $($_.FullName)"
    Remove-Item $_.FullName -Force -ErrorAction SilentlyContinue
}
Write-Host "Limpieza de accesos directos finalizada." -ForegroundColor Green

# --- 6. ELIMINACIÓN DE CARPETAS DE VERSIONES ---
Write-Host "`n--- Eliminando carpetas de versiones antiguas ---" -ForegroundColor Yellow
if (Test-Path $versionsBasePath) {
    foreach ($version in $versionsToDelete) {
        $versionPath = Join-Path $versionsBasePath $version
        if (Test-Path $versionPath) {
            Write-Host "Eliminando carpeta: $versionPath"
            Remove-Item -Path $versionPath -Recurse -Force
        } else {
            Write-Host "La carpeta $versionPath no existe, se omite." -ForegroundColor Gray
        }
    }
    Write-Host "Eliminación de carpetas de versiones finalizada." -ForegroundColor Green
} else {
    Write-Warning "El directorio base de versiones '$versionsBasePath' no fue encontrado."
}


# --- 7. CREACIÓN DE NUEVO ACCESO DIRECTO ---
Write-Host "`n--- Creando nuevo acceso directo de Pixelplay Launcher ---" -ForegroundColor Yellow
try {
    # Verificar que el directorio de la app y el icono existan
    if (-NOT(Test-Path $appDir)) { throw "El directorio de la aplicación '$appDir' no existe. No se puede crear el acceso directo." }
    if (-NOT(Test-Path $iconPath)) { Write-Warning "El archivo de icono '$iconPath' no fue encontrado. El acceso directo se creará sin un icono personalizado." }

    $wshell = New-Object -ComObject WScript.Shell
    $shortcut = $wshell.CreateShortcut((Join-Path $desktopPath "Pixelplay Launcher.lnk"))
    
    # El comando a ejecutar
    $command = "Set-Location -Path '$appDir'; npm install; npm start"
    
    $shortcut.TargetPath = "powershell.exe"
    $shortcut.Arguments = "-NoExit -Command `"$command`""
    $shortcut.WorkingDirectory = $appDir
    $shortcut.IconLocation = $iconPath
    $shortcut.Description = "Inicia Pixelplay Launcher ejecutando npm install y npm start."
    
    $shortcut.Save()

    Write-Host "El nuevo acceso directo se ha creado en el escritorio." -ForegroundColor Green
}
catch {
    Write-Error "No se pudo crear el acceso directo: $_"
    exit 1
}

# --- 8. LIMPIEZA FINAL ---
Write-Host "`n--- Limpiando archivos temporales ---" -ForegroundColor Yellow
Remove-Item -Path $tempDir -Recurse -Force
Write-Host "Limpieza finalizada." -ForegroundColor Green

Write-Host "`n*** PROCESO COMPLETADO ***" -ForegroundColor Magenta
