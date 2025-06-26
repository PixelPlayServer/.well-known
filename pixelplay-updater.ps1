# Pixelplay Launcher Updater
# This script updates the Pixelplay Launcher client files

param(
    [switch]$Silent
)

# Hide PowerShell window for cleaner execution
if (-not $Silent) {
    Add-Type -Name Window -Namespace Console -MemberDefinition '
    [DllImport("Kernel32.dll")]
    public static extern IntPtr GetConsoleWindow();
    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, Int32 nCmdShow);
    '
    $consolePtr = [Console.Window]::GetConsoleWindow()
    [Console.Window]::ShowWindow($consolePtr, 0) # Hide window
}

# Function to show progress with modern styling
function Show-Progress {
    param($Activity, $Status, $PercentComplete)
    Write-Progress -Activity $Activity -Status $Status -PercentComplete $PercentComplete
}

# Function to display colored output
function Write-ColorOutput {
    param($Text, $Color = "White")
    Write-Host $Text -ForegroundColor $Color
}

# Clear screen and show header
Clear-Host
Write-ColorOutput "╔══════════════════════════════════════╗" "Cyan"
Write-ColorOutput "║        PIXELPLAY LAUNCHER            ║" "Cyan"
Write-ColorOutput "║           CLIENT UPDATE              ║" "Cyan"
Write-ColorOutput "╚══════════════════════════════════════╝" "Cyan"
Write-ColorOutput ""

# Define possible installation paths
$possiblePaths = @(
    "${env:ProgramFiles}\Pixelplay Launcher\resources\app",
    "${env:ProgramFiles(x86)}\Pixelplay Launcher\resources\app",
    "${env:LOCALAPPDATA}\Programs\Pixelplay Launcher\resources\app"
)

# GitHub raw URL for the minecraft.js file
$downloadUrl = "https://raw.githubusercontent.com/PixelPlayServer/.well-known/main/minecraft.js"

Write-ColorOutput "🔍 Scanning for Pixelplay Launcher installation..." "Yellow"
Show-Progress "Updating Client" "Locating installation..." 10

$targetPath = $null
$minecraftJsPath = $null

foreach ($path in $possiblePaths) {
    if (Test-Path $path) {
        $potentialFile = Join-Path $path "minecraft.js"
        if (Test-Path $potentialFile) {
            $targetPath = $path
            $minecraftJsPath = $potentialFile
            break
        }
    }
}

if (-not $targetPath) {
    Write-ColorOutput "❌ Pixelplay Launcher installation not found!" "Red"
    Write-ColorOutput "Please ensure Pixelplay Launcher is properly installed." "Red"
    Write-ColorOutput ""
    Write-ColorOutput "Press any key to exit..." "Gray"
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

Write-ColorOutput "✅ Installation found!" "Green"
Show-Progress "Updating Client" "Downloading latest client files..." 30

# Create backup of original file
$backupPath = $minecraftJsPath + ".backup." + (Get-Date -Format "yyyyMMdd_HHmmss")
try {
    Copy-Item $minecraftJsPath $backupPath -ErrorAction Stop
    Write-ColorOutput "📋 Backup created successfully" "Green"
} catch {
    Write-ColorOutput "⚠️  Warning: Could not create backup" "Yellow"
}

Show-Progress "Updating Client" "Downloading update from server..." 50

# Download the new minecraft.js file
try {
    # Create a temporary file
    $tempFile = [System.IO.Path]::GetTempFileName()
    
    # Download with progress
    $webClient = New-Object System.Net.WebClient
    $webClient.Headers.Add("User-Agent", "Pixelplay-Updater/1.0")
    $webClient.DownloadFile($downloadUrl, $tempFile)
    
    Show-Progress "Updating Client" "Installing update..." 75
    
    # Replace the original file
    Copy-Item $tempFile $minecraftJsPath -Force
    Remove-Item $tempFile -Force
    
    Write-ColorOutput "✅ Client files updated successfully!" "Green"
    
} catch {
    Write-ColorOutput "❌ Failed to download or install update!" "Red"
    Write-ColorOutput "Error: $($_.Exception.Message)" "Red"
    
    # Restore backup if available
    if (Test-Path $backupPath) {
        try {
            Copy-Item $backupPath $minecraftJsPath -Force
            Write-ColorOutput "🔄 Original file restored from backup" "Yellow"
        } catch {
            Write-ColorOutput "❌ Failed to restore backup!" "Red"
        }
    }
    
    Write-ColorOutput ""
    Write-ColorOutput "Press any key to exit..." "Gray"
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

Show-Progress "Updating Client" "Finalizing..." 95

# Clean up old backups (keep only last 5)
try {
    $backupFiles = Get-ChildItem -Path (Split-Path $minecraftJsPath) -Filter "minecraft.js.backup.*" | Sort-Object CreationTime -Descending
    if ($backupFiles.Count -gt 5) {
        $backupFiles | Select-Object -Skip 5 | Remove-Item -Force
    }
} catch {
    # Silently ignore cleanup errors
}

Show-Progress "Updating Client" "Complete!" 100
Start-Sleep -Milliseconds 500

Write-ColorOutput ""
Write-ColorOutput "🎉 UPDATE COMPLETED SUCCESSFULLY!" "Green"
Write-ColorOutput ""
Write-ColorOutput "Your Pixelplay Launcher has been updated with the latest client files." "White"
Write-ColorOutput "You can now launch the application normally." "White"
Write-ColorOutput ""

# Auto-close after 3 seconds or wait for key press
Write-ColorOutput "This window will close automatically in 3 seconds..." "Gray"
for ($i = 3; $i -gt 0; $i--) {
    Write-Host "`rClosing in $i seconds... (Press any key to close now)" -NoNewline -ForegroundColor Gray
    Start-Sleep -Seconds 1
}

# Clear the progress bar
Write-Progress -Activity "Updating Client" -Completed
