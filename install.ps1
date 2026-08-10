$ErrorActionPreference = "Continue"

# Console Encoding for Unicode support (for the spinner and checkmarks)
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# Color Palette
$ESC = [char]27
$BOLD = "$ESC[1m"
$DIM = "$ESC[2m"
$BLUE = "$ESC[34m"
$CYAN = "$ESC[36m"
$MAGENTA = "$ESC[35m"
$GREEN = "$ESC[32m"
$YELLOW = "$ESC[33m"
$RED = "$ESC[31m"
$GRAY = "$ESC[90m"
$NC = "$ESC[0m"

Write-Host ""
Write-Host "  ${BOLD}Hitori Bot Installation${NC}"
Write-Host ""
Write-Host "  ${BLUE}i${NC} ${DIM}Starting setup process...${NC}"
Write-Host ""

$LOG_FILE = "$env:TEMP\hitori_install.log"
if (Test-Path $LOG_FILE) { Remove-Item $LOG_FILE -Force }

function Invoke-WithSpinner {
    param (
        [string]$Message,
        [string]$CommandStr
    )
    
    $spinFrames = @('⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏')
    try { [Console]::CursorVisible = $false } catch {}

    $process = New-Object System.Diagnostics.Process
    $process.StartInfo.FileName = "cmd.exe"
    $process.StartInfo.Arguments = "/c `"$CommandStr >> `"$LOG_FILE`" 2>&1`""
    $process.StartInfo.UseShellExecute = $false
    $process.StartInfo.CreateNoWindow = $true
    
    $process.Start() | Out-Null
    
    $i = 0
    $progress = 0
    $increment = 3
    
    while (-not $process.HasExited) {
        if ($progress -lt 99) {
            $progress += $increment
            if ($progress -ge 60) { $increment = 1 }
            if ($progress -ge 85) { $increment = 0 }
            if ($progress -ge 85 -and (Get-Random -Minimum 0 -Maximum 10) -eq 0 -and $progress -lt 99) {
                $progress += 1
            }
        }

        $filled = [int][math]::Floor($progress / 5)
        $empty = 20 - $filled
        
        $barSolid = ""
        if ($filled -gt 0) { $barSolid = "█" * $filled }
        
        $barEmpty = ""
        if ($empty -gt 0) { $barEmpty = "░" * $empty }
        
        $coloredBar = "${CYAN}${barSolid}${GRAY}${barEmpty}${NC}"
        $formattedMsg = '{0,-36}' -f $Message
        $formattedProgress = '{0,3}' -f $progress
        
        Write-Host "`r  ${MAGENTA}$($spinFrames[$i])${NC} $formattedMsg ${GRAY}[${NC}$coloredBar${GRAY}]${NC} ${DIM}${formattedProgress}%${NC}" -NoNewline
        
        $i = ($i + 1) % $spinFrames.Length
        Start-Sleep -Milliseconds 100
    }
    
    $bar = "█" * 20
    $clearStr = " " * 5
    if ($process.ExitCode -eq 0) {
        Write-Host "`r  ${GREEN}✔${NC} $( '{0,-36}' -f $Message ) ${GRAY}[${NC}${GREEN}${bar}${NC}${GRAY}]${NC} ${DIM}100%${NC}$clearStr"
    } else {
        Write-Host "`r  ${RED}✖${NC} $( '{0,-36}' -f $Message ) ${GRAY}[${NC}${RED}${bar}${NC}${GRAY}]${NC} ${RED}FAIL${NC}$clearStr"
        Write-Host "`n  ${RED}=== ERROR LOG ===${NC}"
        Get-Content $LOG_FILE | ForEach-Object { Write-Host "  ${GRAY}$_`n${NC}" -NoNewline }
        Write-Host "`n  ${RED}=================${NC}`n"
        try { [Console]::CursorVisible = $true } catch {}
        Read-Host "Press Enter to exit"
        exit 1
    }
    try { [Console]::CursorVisible = $true } catch {}
}

# Ensure exit restores cursor
try {
    Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action {
        try { [Console]::CursorVisible = $true } catch {}
    } | Out-Null
} catch {}

# Check for winget
if (Get-Command winget -ErrorAction SilentlyContinue) {
    $needWingetInstall = $false
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) { $needWingetInstall = $true }
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) { $needWingetInstall = $true }
    if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) { $needWingetInstall = $true }

    if ($needWingetInstall) {
        # Combine the installations into a single cmd script sequence for the spinner
        $installCmds = @()
        if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
            $installCmds += "winget install -e --id Git.Git --accept-source-agreements --accept-package-agreements"
        }
        if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
            $installCmds += "winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements"
        }
        if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
            $installCmds += "winget install -e --id Gyan.FFmpeg --accept-source-agreements --accept-package-agreements"
        }
        
        $combinedCmd = $installCmds -join " && "
        Invoke-WithSpinner -Message "Installing system dependencies" -CommandStr $combinedCmd
    } else {
        Write-Host "  ${GREEN}✔${NC} ${DIM}System dependencies already installed.${NC}"
    }
} else {
    Write-Host "  ${YELLOW}⚠${NC} ${DIM}'winget' not found. Please ensure Git, Node.js, and FFmpeg are installed manually.${NC}"
}

# Refresh PATH if node or npm were just installed
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
}

# Check for Node.js again
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "  ${RED}✖${NC} ${BOLD}Node.js (npm) is not installed or not in PATH!${NC} Please install Node.js first, or restart the terminal if you just installed it."
    Read-Host "Press Enter to exit"
    exit 1
}

# Check for PM2
if (-not (Get-Command pm2 -ErrorAction SilentlyContinue)) {
    Invoke-WithSpinner -Message "Installing PM2" -CommandStr "npm install -g pm2"
} else {
    Write-Host "  ${GREEN}✔${NC} ${DIM}PM2 already installed.${NC}"
}

# Check for package.json
if (Test-Path "package.json") {
    Invoke-WithSpinner -Message "Installing project dependencies" -CommandStr "npm install"
} else {
    Write-Host "  ${YELLOW}⚠${NC} ${DIM}No package.json found. Skipping project dependency installation.${NC}"
}

Invoke-WithSpinner -Message "Registering global 'hitori' command" -CommandStr "npm link"

Write-Host ""
Write-Host "  ${GREEN}✔${NC} ${BOLD}All dependencies have been installed successfully!${NC}"
Write-Host "  ${BLUE}i${NC} ${DIM}You can now use the 'hitori' command from anywhere.${NC}"
Write-Host ""

Write-Host "  ${MAGENTA}✦${NC} ${BOLD}Launching first-time setup wizard...${NC}"
Write-Host ""
cmd.exe /c "node cli.js --setup"

Write-Host ""
Read-Host "Press Enter to continue"
