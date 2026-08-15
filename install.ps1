$ErrorActionPreference = "Continue"

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# Define colors
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

$TICK  = [char]0x2714  # ✔
$CROSS = [char]0x2716  # ✖
$WARN  = [char]0x26A0  # ⚠
$STAR  = [char]0x2726  # ✦
$BLOCK = [char]0x2588  # █
$SHADE = [char]0x2591  # ░
$INFO  = "i"

[console]::TreatControlCAsInput = $false
$null = Register-EngineEvent -SourceIdentifier ([System.Management.Automation.PsEngineEvent]::Exiting) -Action {
    try { [Console]::CursorVisible = $true } catch {}
}
$null = Register-ObjectEvent -InputObject ([console]) -EventName CancelKeyPress -Action {
    Write-Host "`n`n  $YELLOW$WARN$NC $BOLD Installation cancelled by user.$NC"
    Write-Host "  $CYAN Thank you for trying out Hitori Bot! Have a great day.$NC`n"
    try { [Console]::CursorVisible = $true } catch {}
    [Environment]::Exit(130)
}

Write-Host ""
Write-Host "  $BOLD Hitori Bot Installation $NC"
Write-Host ""
Write-Host "  $BLUE$INFO$NC $DIM Starting setup process... $NC"
Write-Host ""

$LOG_FILE = "$env:TEMP\hitori_install.log"
if (Test-Path $LOG_FILE) { Remove-Item $LOG_FILE -Force }

function Invoke-WithSpinner {
    param (
        [string]$Message,
        [string]$CommandStr
    )
    
    $spinFrames = @([char]0x280B, [char]0x2819, [char]0x2839, [char]0x2838, [char]0x283C, [char]0x2834, [char]0x2826, [char]0x2827, [char]0x2807, [char]0x280F)
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
        if ($filled -gt 0) { $barSolid = "$BLOCK" * $filled }
        
        $barEmpty = ""
        if ($empty -gt 0) { $barEmpty = "$SHADE" * $empty }
        
        $coloredBar = $CYAN + $barSolid + $GRAY + $barEmpty + $NC
        $formattedMsg = '{0,-36}' -f $Message
        $formattedProgress = '{0,3}' -f $progress
        
        $frame = $spinFrames[$i]
        $bOpen = $GRAY + "[" + $NC
        $bClose = $GRAY + "]" + $NC
        
        $outStr = "`r  " + $YELLOW + $frame + $NC + " " + $formattedMsg + " " + $bOpen + $coloredBar + $bClose + " " + $DIM + $formattedProgress + "%" + $NC
        Write-Host $outStr -NoNewline
        
        $i = ($i + 1) % $spinFrames.Length
        Start-Sleep -Milliseconds 100
    }
    
    $bar = "$BLOCK" * 20
    $clearStr = " " * 5
    $formattedMsg = '{0,-36}' -f $Message
    $bOpen = $GRAY + "[" + $NC
    $bClose = $GRAY + "]" + $NC
    
    if ($process.ExitCode -eq 0) {
        $outStr = "`r  " + $GREEN + $TICK + $NC + " " + $formattedMsg + " " + $bOpen + $GREEN + $bar + $NC + $bClose + " " + $DIM + "100%" + $NC + $clearStr
        Write-Host $outStr
    } else {
        $outStr = "`r  " + $RED + $CROSS + $NC + " " + $formattedMsg + " " + $bOpen + $RED + $bar + $NC + $bClose + " " + $RED + "FAIL" + $NC + $clearStr
        Write-Host $outStr
        Write-Host "`n  $RED === ERROR LOG === $NC"
        Get-Content $LOG_FILE | ForEach-Object { Write-Host "  $GRAY $_ `n $NC" -NoNewline }
        Write-Host "`n  $RED ================= $NC`n"
        try { [Console]::CursorVisible = $true } catch {}
        Read-Host "Press Enter to exit"
        exit 1
    }
    try { [Console]::CursorVisible = $true } catch {}
}

if (Get-Command winget -ErrorAction SilentlyContinue) {
    $needWingetInstall = $false
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) { $needWingetInstall = $true }
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) { $needWingetInstall = $true }
    if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) { $needWingetInstall = $true }

    if ($needWingetInstall) {
        if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
            Invoke-WithSpinner -Message "Installing Git" -CommandStr "winget install -e --id Git.Git --accept-source-agreements --accept-package-agreements"
        }
        if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
            Invoke-WithSpinner -Message "Installing Node.js" -CommandStr "winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements"
        }
        if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
            Invoke-WithSpinner -Message "Installing FFmpeg" -CommandStr "winget install -e --id Gyan.FFmpeg --accept-source-agreements --accept-package-agreements"
        }
    } else {
        Write-Host "  $GREEN $TICK $NC $DIM System dependencies already installed. $NC"
    }
} else {
    Write-Host "  $YELLOW $WARN $NC $DIM 'winget' not found. Please ensure Git, Node.js, and FFmpeg are installed manually. $NC"
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "  $RED $CROSS $NC $BOLD Node.js (npm) is not installed or not in PATH! $NC Please install Node.js first, or restart the terminal if you just installed it."
    Read-Host "Press Enter to exit"
    exit 1
}

if (-not (Get-Command pm2 -ErrorAction SilentlyContinue)) {
    Invoke-WithSpinner -Message "Installing PM2" -CommandStr "npm install -g pm2"
} else {
    Write-Host "  $GREEN $TICK $NC $DIM PM2 already installed. $NC"
}

if (Test-Path "package.json") {
    Invoke-WithSpinner -Message "Installing project dependencies" -CommandStr "npm install"
} else {
    Write-Host "  $YELLOW $WARN $NC $DIM No package.json found. Skipping project dependency installation. $NC"
}

Invoke-WithSpinner -Message "Registering global 'hitori'" -CommandStr "npm link"

Write-Host ""
Write-Host "  $GREEN $TICK $NC $BOLD All dependencies have been installed successfully! $NC"
Write-Host "  $BLUE $INFO $NC $DIM You can now use the 'hitori' command from anywhere. $NC"
Write-Host ""

Write-Host "  $MAGENTA $STAR $NC $BOLD Launching first-time setup wizard... $NC"
Write-Host ""
cmd.exe /c "node cli.js --setup"

Write-Host ""
Read-Host "Press Enter to continue"
