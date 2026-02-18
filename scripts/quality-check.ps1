#Requires -Version 5.1

param(
    [switch]$Fix,
    [switch]$Verbose
)

$ErrorActionPreference = "Continue"
$exitCode = 0
$errorCount = 0
$warningCount = 0

function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Type = "Info"
    )
    
    $color = switch ($Type) {
        "Success" { "Green" }
        "Error" { "Red" }
        "Warning" { "Yellow" }
        "Info" { "Cyan" }
        default { "White" }
    }
    
    Write-Host $Message -ForegroundColor $color
}

function Test-Command {
    param([string]$Command)
    
    $result = Get-Command $Command -ErrorAction SilentlyContinue
    return $null -ne $result
}

Write-ColorOutput "========================================" "Info"
Write-ColorOutput "  Skill-Sync Quality Check Script" "Info"
Write-ColorOutput "========================================" "Info"
Write-Host ""

$projectRoot = $PSScriptRoot | Split-Path
Set-Location $projectRoot

# [1/4] Check TypeScript compilation
Write-ColorOutput "[1/4] TypeScript Compilation Check..." "Info"

if (Test-Path "server/tsconfig.json") {
    Push-Location server
    $tscResult = npx tsc --noEmit 2>&1
    Pop-Location
    
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput "  [OK] Server TypeScript compilation passed" "Success"
    } else {
        Write-ColorOutput "  [ERROR] Server TypeScript compilation failed:" "Error"
        Write-Host $tscResult
        $errorCount++
        $exitCode = 1
    }
} else {
    Write-ColorOutput "  [SKIP] Server tsconfig.json not found" "Warning"
}

if (Test-Path "web/tsconfig.json") {
    Push-Location web
    $tscResult = npx tsc --noEmit 2>&1
    Pop-Location
    
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput "  [OK] Web TypeScript compilation passed" "Success"
    } else {
        Write-ColorOutput "  [ERROR] Web TypeScript compilation failed:" "Error"
        Write-Host $tscResult
        $errorCount++
        $exitCode = 1
    }
} else {
    Write-ColorOutput "  [SKIP] Web tsconfig.json not found" "Warning"
}

# [2/4] ESLint Check
Write-ColorOutput "[2/4] ESLint Check..." "Info"

if (Test-Command "npx") {
    $eslintArgs = @("eslint", ".", "--ext", ".ts,.tsx", "--max-warnings", "50")
    
    if ($Fix) {
        $eslintArgs += "--fix"
        Write-ColorOutput "  Running with auto-fix..." "Warning"
    }
    
    $eslintResult = & npx @eslintArgs 2>&1
    $eslintExitCode = $LASTEXITCODE
    
    if ($eslintExitCode -eq 0) {
        Write-ColorOutput "  [OK] ESLint check passed" "Success"
    } elseif ($eslintExitCode -eq 1) {
        Write-ColorOutput "  [WARNING] ESLint found issues:" "Warning"
        Write-Host $eslintResult
        $warningCount++
    } else {
        Write-ColorOutput "  [ERROR] ESLint check failed:" "Error"
        Write-Host $eslintResult
        $errorCount++
        $exitCode = 1
    }
} else {
    Write-ColorOutput "  [SKIP] npx not available, skipping ESLint" "Warning"
}

# [3/4] Prettier Check
Write-ColorOutput "[3/4] Prettier Check..." "Info"

if (Test-Command "npx") {
    $prettierArgs = @("prettier", "--check", ".", "--ignore-path", ".eslintignore")
    
    if ($Fix) {
        $prettierArgs = @("prettier", "--write", ".", "--ignore-path", ".eslintignore")
        Write-ColorOutput "  Running with auto-fix..." "Warning"
    }
    
    $prettierResult = & npx @prettierArgs 2>&1
    $prettierExitCode = $LASTEXITCODE
    
    if ($prettierExitCode -eq 0) {
        Write-ColorOutput "  [OK] Prettier check passed" "Success"
    } else {
        if ($Fix) {
            Write-ColorOutput "  [OK] Prettier formatting applied" "Success"
        } else {
            Write-ColorOutput "  [WARNING] Code formatting issues found. Run with -Fix to auto-fix." "Warning"
            $warningCount++
        }
    }
} else {
    Write-ColorOutput "  [SKIP] npx not available, skipping Prettier" "Warning"
}

# [4/4] Code Quality Metrics
Write-ColorOutput "[4/4] Code Quality Metrics..." "Info"

$totalFiles = 0
$totalLines = 0
$longFiles = @()

$sourcePatterns = @("server/**/*.ts", "web/src/**/*.ts", "web/src/**/*.tsx")

foreach ($pattern in $sourcePatterns) {
    $files = Get-ChildItem -Path $pattern -ErrorAction SilentlyContinue
    
    foreach ($file in $files) {
        $totalFiles++
        $lines = (Get-Content $file.FullName | Measure-Object -Line).Lines
        $totalLines += $lines
        
        if ($lines -gt 500) {
            $longFiles += @{ Name = $file.Name; Lines = $lines }
        }
    }
}

Write-ColorOutput "  Total source files: $totalFiles" "Info"
Write-ColorOutput "  Total lines of code: $totalLines" "Info"

if ($longFiles.Count -gt 0) {
    Write-ColorOutput "  [WARNING] Files exceeding 500 lines:" "Warning"
    foreach ($f in $longFiles) {
        Write-ColorOutput "    - $($f.Name): $($f.Lines) lines" "Warning"
    }
    $warningCount++
} else {
    Write-ColorOutput "  [OK] All files under 500 lines" "Success"
}

# Summary
Write-Host ""
Write-ColorOutput "========================================" "Info"
Write-ColorOutput "  Quality Check Summary" "Info"
Write-ColorOutput "========================================" "Info"

if ($errorCount -eq 0 -and $warningCount -eq 0) {
    Write-ColorOutput "  All checks passed!" "Success"
} else {
    if ($errorCount -gt 0) {
        Write-ColorOutput "  Errors: $errorCount" "Error"
    }
    if ($warningCount -gt 0) {
        Write-ColorOutput "  Warnings: $warningCount" "Warning"
    }
}

Write-Host ""

if ($exitCode -eq 0) {
    Write-ColorOutput "  Quality gate: PASSED" "Success"
} else {
    Write-ColorOutput "  Quality gate: FAILED" "Error"
}

exit $exitCode
