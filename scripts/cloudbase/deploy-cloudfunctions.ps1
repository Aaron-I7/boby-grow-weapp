param(
  [string]$EnvId = '',
  [string[]]$Functions = @('user', 'task', 'point', 'growth', 'mcp'),
  [switch]$InstallDependencies,
  [switch]$KeepLocalNodeModules
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'common.ps1')

$repoRoot = Get-RepoRoot
Set-Location $repoRoot
$EnvId = Resolve-DefaultEnvId -EnvId $EnvId -RepoRoot $repoRoot

Write-Host "==> Checking CloudBase environment: $EnvId"
$envList = Invoke-Cloudbase -Arguments @('env', 'list') -WorkingDirectory $repoRoot
Assert-True -Condition ($envList.Combined -match [regex]::Escape($EnvId)) -Message "Environment $EnvId not found in cloudbase env list output."
if ($envList.Combined -notmatch 'Normal') {
  Write-Warning "Environment status output does not contain 'Normal'. Please verify manually before production deployment."
}

foreach ($fn in $Functions) {
  $fnDir = Join-Path $repoRoot ("cloudfunctions\" + $fn)
  Assert-True -Condition (Test-Path $fnDir) -Message "Function directory missing: $fnDir"
  Assert-True -Condition (Test-Path (Join-Path $fnDir 'index.js')) -Message "Missing index.js for function: $fn"
  Assert-True -Condition (Test-Path (Join-Path $fnDir 'package.json')) -Message "Missing package.json for function: $fn"

  if ($InstallDependencies) {
    Write-Host "==> Installing dependencies for $fn"
    $npmInstall = Invoke-External -FilePath 'npm.cmd' -Arguments @('install', '--omit=dev') -WorkingDirectory $fnDir
    if ($npmInstall.Combined) { Write-Host $npmInstall.Combined }
  } elseif (-not $KeepLocalNodeModules) {
    $nodeModulesDir = Join-Path $fnDir 'node_modules'
    if (Test-Path $nodeModulesDir) {
      Write-Host "==> Removing local node_modules for lightweight deploy: $fn"
      Remove-Item -Recurse -Force $nodeModulesDir
    }
  }

  Write-Host "==> Deploying function: $fn"
  $deploy = Invoke-Cloudbase -Arguments @('fn', 'deploy', $fn, '-e', $EnvId, '--dir', $fnDir, '--force', '--yes') -WorkingDirectory $repoRoot
  if ($deploy.Combined) { Write-Host $deploy.Combined }

  Write-Host "==> Validating function list contains: $fn"
  $listAfterDeploy = Invoke-Cloudbase -Arguments @('fn', 'list', '-e', $EnvId) -WorkingDirectory $repoRoot
  Assert-True -Condition ($listAfterDeploy.Combined -match [regex]::Escape($fn)) -Message "Function '$fn' not found in cloudbase fn list output after deploy."
}

Write-Host "==> Final function list"
$finalList = Invoke-Cloudbase -Arguments @('fn', 'list', '-e', $EnvId) -WorkingDirectory $repoRoot
if ($finalList.Combined) { Write-Host $finalList.Combined }

Write-Host "Deployment completed."
