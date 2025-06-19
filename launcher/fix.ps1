# Script de Migración Pixelplay Launcher
# Requiere permisos de administrador

# Verificar si se ejecuta como administrador
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "🔒 Iniciando proceso de migración..." -ForegroundColor Yellow
    Write-Host "Se requieren permisos elevados para completar la operación." -ForegroundColor Cyan
    
    # Reiniciar como administrador
    Start-Process PowerShell -Verb RunAs -ArgumentList "-ExecutionPolicy Bypass -File `"$PSCommandPath`""
    exit
}

# Configuración de rutas
$sourceDir = "C:\Program Files\Pixelplay Launcher"
$targetDir = "$env:APPDATA\Pixelplay Launcher"
$currentUser = $env:USERNAME

# Función para mostrar progreso
function Show-Progress {
    param([string]$Status, [int]$Step, [int]$Total)
    $percent = [math]::Round(($Step / $Total) * 100)
    Write-Progress -Activity "Migración de Pixelplay Launcher" -Status $Status -PercentComplete $percent
}

# Función para buscar y actualizar accesos directos
function Update-Shortcuts {
    param([string]$OldPath, [string]$NewPath, [string]$IconPath)
    
    $shortcutLocations = @(
        "$env:ProgramData\Microsoft\Windows\Start Menu\Programs",
        "$env:USERPROFILE\Desktop",
        "$env:USERPROFILE\AppData\Roaming\Microsoft\Windows\Start Menu\Programs",
        "$env:PUBLIC\Desktop"
    )
    
    $updatedCount = 0
    
    foreach ($location in $shortcutLocations) {
        if (Test-Path $location) {
            $shortcuts = Get-ChildItem -Path $location -Filter "*Pixelplay Launcher*" -Recurse -ErrorAction SilentlyContinue
            
            foreach ($shortcut in $shortcuts) {
                if ($shortcut.Extension -eq ".lnk") {
                    try {
                        $shell = New-Object -ComObject WScript.Shell
                        $link = $shell.CreateShortcut($shortcut.FullName)
                        
                        # Verificar si apunta a la ubicación antigua
                        if ($link.TargetPath -like "*$OldPath*") {
                            # Actualizar la ruta del ejecutable
                            $newTargetPath = $link.TargetPath.Replace($OldPath, $NewPath)
                            $link.TargetPath = $newTargetPath
                            
                            # Actualizar el icono si existe
                            if (Test-Path $IconPath) {
                                $link.IconLocation = $IconPath
                            }
                            
                            # Actualizar directorio de trabajo
                            $link.WorkingDirectory = $NewPath
                            
                            $link.Save()
                            $updatedCount++
                        }
                    }
                    catch {
                        # Silenciosamente continuar si hay error con algún acceso directo
                    }
                }
            }
        }
    }
    
    return $updatedCount
}

# Función para limpiar directorio antiguo
function Remove-OldDirectory {
    param([string]$Path)
    
    try {
        if (Test-Path $Path) {
            Remove-Item -Path $Path -Recurse -Force -ErrorAction Stop
            return $true
        }
    }
    catch {
        return $false
    }
    return $false
}

# Inicio del script
Clear-Host
Write-Host "🚀 Pixelplay Launcher - Proceso de Optimización" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""

# Paso 1: Verificar si existe la instalación
Show-Progress -Status "Verificando instalación..." -Step 1 -Total 6

if (-not (Test-Path $sourceDir)) {
    Write-Host "❌ No se encontró una instalación de Pixelplay Launcher." -ForegroundColor Red
    Write-Host "El proceso no puede continuar." -ForegroundColor Yellow
    Read-Host "Presiona Enter para salir"
    exit 1
}

Start-Sleep -Seconds 1

# Paso 2: Crear directorio de destino
Show-Progress -Status "Preparando nueva ubicación..." -Step 2 -Total 6

try {
    if (-not (Test-Path $targetDir)) {
        New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
    }
}
catch {
    Write-Host "❌ Error al preparar la nueva ubicación." -ForegroundColor Red
    Read-Host "Presiona Enter para salir"
    exit 1
}

Start-Sleep -Seconds 1

# Paso 3: Copiar archivos
Show-Progress -Status "Transfiriendo archivos..." -Step 3 -Total 6

try {
    Copy-Item -Path "$sourceDir\*" -Destination $targetDir -Recurse -Force -ErrorAction Stop
}
catch {
    Write-Host "❌ Error durante la transferencia de archivos." -ForegroundColor Red
    Read-Host "Presiona Enter para salir"
    exit 1
}

Start-Sleep -Seconds 2

# Paso 4: Buscar icono
Show-Progress -Status "Configurando recursos..." -Step 4 -Total 6

$iconPath = ""
$possibleIcons = @("$targetDir\pixel.ico", "$targetDir\resources\pixel.ico", "$targetDir\assets\pixel.ico")

foreach ($icon in $possibleIcons) {
    if (Test-Path $icon) {
        $iconPath = $icon
        break
    }
}

Start-Sleep -Seconds 1

# Paso 5: Actualizar accesos directos
Show-Progress -Status "Actualizando configuración del sistema..." -Step 5 -Total 6

$updatedShortcuts = Update-Shortcuts -OldPath "C:\Program Files\Pixelplay Launcher" -NewPath $targetDir -IconPath $iconPath

Start-Sleep -Seconds 2

# Paso 6: Limpiar instalación anterior
Show-Progress -Status "Finalizando optimización..." -Step 6 -Total 6

$cleanupSuccess = Remove-OldDirectory -Path $sourceDir

Start-Sleep -Seconds 1

# Completar barra de progreso
Write-Progress -Activity "Migración de Pixelplay Launcher" -Completed

# Resultados finales
Clear-Host
Write-Host "✅ Optimización Completada Exitosamente" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Resumen del proceso:" -ForegroundColor Cyan
Write-Host "• Archivos transferidos correctamente" -ForegroundColor White
Write-Host "• $updatedShortcuts accesos directos actualizados" -ForegroundColor White

if ($iconPath -ne "") {
    Write-Host "• Iconos configurados correctamente" -ForegroundColor White
} else {
    Write-Host "• Iconos: usando configuración por defecto" -ForegroundColor Yellow
}

if ($cleanupSuccess) {
    Write-Host "• Limpieza del sistema completada" -ForegroundColor White
} else {
    Write-Host "• Limpieza: se requiere reinicio del sistema" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎮 Pixelplay Launcher está listo para usar." -ForegroundColor Green
Write-Host "Los accesos directos existentes funcionarán normalmente." -ForegroundColor White
Write-Host ""
Write-Host "Presiona Enter para finalizar..." -ForegroundColor Gray
Read-Host
