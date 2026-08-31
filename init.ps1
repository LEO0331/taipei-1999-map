$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -LiteralPath $projectRoot

Write-Output '=== Harness Initialization ==='

$requiredBinaries = @(
    'node_modules/.bin/vitest.cmd',
    'node_modules/.bin/tsc.cmd',
    'node_modules/.bin/vite.cmd'
)
$missingBinaries = @($requiredBinaries | Where-Object { -not (Test-Path -LiteralPath $_) })

if ($missingBinaries.Count -gt 0) {
    Write-Output '=== npm ci (dependencies missing) ==='
    npm.cmd ci
    if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
    }
}

Write-Output '=== npm test ==='
npm.cmd test
if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}

Write-Output '=== npm run build ==='
npm.cmd run build
if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}

Write-Output '=== Verification Complete ==='
Write-Output ''
Write-Output 'Next steps:'
Write-Output '1. Read feature_list.json to see current feature state'
Write-Output '2. Pick ONE unfinished feature to work on'
Write-Output '3. Implement only that feature'
Write-Output '4. Re-run verification before claiming done'
