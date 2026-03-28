Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$script:NodeCmd = if ((Get-Command 'node.exe' -ErrorAction SilentlyContinue)) {
  (Get-Command 'node.exe').Source
} else {
  'node'
}

$script:CloudbaseCmdPath = if ((Get-Command 'cloudbase.cmd' -ErrorAction SilentlyContinue)) {
  (Get-Command 'cloudbase.cmd').Source
} else {
  ''
}

$script:CloudbaseCliEntry = ''
if ($script:CloudbaseCmdPath) {
  $globalNodeDir = Split-Path $script:CloudbaseCmdPath -Parent
  $candidate = Join-Path $globalNodeDir 'node_modules\@cloudbase\cli\dist\standalone\cli.js'
  if (Test-Path $candidate) {
    $script:CloudbaseCliEntry = $candidate
  }
}

if (-not $script:CloudbaseCliEntry) {
  throw 'Cannot resolve CloudBase CLI entry file. Please ensure @cloudbase/cli is installed globally.'
}

function Get-RepoRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
}

function Get-CloudbaseEnvFromConfig {
  param(
    [string]$RepoRoot
  )

  $root = if ($RepoRoot) { $RepoRoot } else { Get-RepoRoot }
  $configPath = Join-Path $root 'cloudbaserc.json'
  if (-not (Test-Path $configPath)) { return '' }

  try {
    $text = Get-Content -Raw -Encoding UTF8 $configPath
    $obj = $text | ConvertFrom-Json -Depth 20
    if ($obj -and $obj.envId) {
      return ([string]$obj.envId).Trim()
    }
  } catch {
    # ignore parse errors and fallback to other sources
  }

  return ''
}

function Resolve-DefaultEnvId {
  param(
    [string]$EnvId,
    [string]$RepoRoot = '',
    [string]$Fallback = 'cloudbase-1g26i1txc0ae8f4b'
  )

  if ($EnvId -and $EnvId.Trim()) { return $EnvId.Trim() }

  if ($env:CLOUDBASE_ENV -and $env:CLOUDBASE_ENV.Trim()) {
    return $env:CLOUDBASE_ENV.Trim()
  }

  $fromConfig = Get-CloudbaseEnvFromConfig -RepoRoot $RepoRoot
  if ($fromConfig) { return $fromConfig }

  return $Fallback
}

function Invoke-External {
  param(
    [Parameter(Mandatory = $true)]
    [string]$FilePath,
    [Parameter(Mandatory = $true)]
    [string[]]$Arguments,
    [string]$WorkingDirectory = (Get-Location).Path,
    [switch]$IgnoreExitCode
  )

  $stdoutFile = [System.IO.Path]::GetTempFileName()
  $stderrFile = [System.IO.Path]::GetTempFileName()
  $result = $null
  $prevColumns = $env:COLUMNS
  $prevForceColor = $env:FORCE_COLOR
  $prevNoColor = $env:NO_COLOR

  try {
    $env:COLUMNS = '5000'
    $env:FORCE_COLOR = '0'
    $env:NO_COLOR = '1'

    $proc = Start-Process `
      -FilePath $FilePath `
      -ArgumentList $Arguments `
      -WorkingDirectory $WorkingDirectory `
      -NoNewWindow `
      -Wait `
      -PassThru `
      -RedirectStandardOutput $stdoutFile `
      -RedirectStandardError $stderrFile

    $stdout = if (Test-Path $stdoutFile) { (Get-Content -Raw -Path $stdoutFile) } else { '' }
    $stderr = if (Test-Path $stderrFile) { (Get-Content -Raw -Path $stderrFile) } else { '' }

    $stdout = ($stdout -replace "(\r?\n)+$", '')
    $stderr = ($stderr -replace "(\r?\n)+$", '')

    $result = [pscustomobject]@{
      ExitCode = $proc.ExitCode
      StdOut   = $stdout
      StdErr   = $stderr
      Combined = (($stdout + "`n" + $stderr).Trim())
    }
  } catch {
    $result = [pscustomobject]@{
      ExitCode = 1
      StdOut   = ''
      StdErr   = $_.Exception.Message
      Combined = $_.Exception.Message
    }
  } finally {
    if ($null -eq $prevColumns) { Remove-Item Env:COLUMNS -ErrorAction SilentlyContinue } else { $env:COLUMNS = $prevColumns }
    if ($null -eq $prevForceColor) { Remove-Item Env:FORCE_COLOR -ErrorAction SilentlyContinue } else { $env:FORCE_COLOR = $prevForceColor }
    if ($null -eq $prevNoColor) { Remove-Item Env:NO_COLOR -ErrorAction SilentlyContinue } else { $env:NO_COLOR = $prevNoColor }
    Remove-Item -Path $stdoutFile -ErrorAction SilentlyContinue
    Remove-Item -Path $stderrFile -ErrorAction SilentlyContinue
  }

  if ($result.ExitCode -ne 0 -and -not $IgnoreExitCode) {
    throw "Command failed: $FilePath $($Arguments -join ' ')`n$result.Combined"
  }

  return $result
}

function Assert-True {
  param(
    [Parameter(Mandatory = $true)]
    [bool]$Condition,
    [Parameter(Mandatory = $true)]
    [string]$Message
  )
  if (-not $Condition) {
    throw "ASSERT FAILED: $Message"
  }
}

function Convert-JsonText {
  param(
    [Parameter(Mandatory = $true)]
    [string]$JsonText
  )

  try {
    return ($JsonText | ConvertFrom-Json -Depth 100)
  } catch {
    if ($_.Exception.Message -like '*parameter name ''Depth''*') {
      return ($JsonText | ConvertFrom-Json)
    }
    throw
  }
}

function Parse-JsonFromOutput {
  param(
    [Parameter(Mandatory = $true)]
    [string]$OutputText
  )

  function Try-ParseCandidate {
    param(
      [Parameter(Mandatory = $true)]
      [string]$Raw
    )

    $clean = [regex]::Replace($Raw, "\x1B\[[0-9;]*[A-Za-z]", '')
    $variants = @(
      $clean.Trim(),
      ($clean -replace "`r?`n", '').Trim(),
      ($clean -replace "`r?`n", ' ').Trim()
    )

    $seen = @{}
    foreach ($variant in $variants) {
      if (-not $variant) { continue }
      if ($seen.ContainsKey($variant)) { continue }
      $seen[$variant] = $true
      try {
        return [pscustomobject]@{
          Success = $true
          Value   = (Convert-JsonText -JsonText $variant)
        }
      } catch {}
    }

    return [pscustomobject]@{
      Success = $false
      Value   = $null
    }
  }

  $blockPatterns = @(
    '(?s)RetMsg:\s*([\{\[].*[\}\]])\s*END RequestId',
    '(?s)Return result[^\r\n]*?([\{\[].*[\}\]])\s*Invocation log',
    '(?s)Return result[^\r\n]*?([\{\[].*[\}\]])\s*- Loading data'
  )

  foreach ($pattern in $blockPatterns) {
    $matches = [regex]::Matches($OutputText, $pattern)
    for ($j = $matches.Count - 1; $j -ge 0; $j--) {
      $payload = $matches[$j].Groups[1].Value.Trim()
      $parsed = Try-ParseCandidate -Raw $payload
      if ($parsed.Success) { return $parsed.Value }
    }
  }

  $lines = $OutputText -split "`r?`n" | Where-Object { $_.Trim() -ne '' }
  for ($i = $lines.Count - 1; $i -ge 0; $i--) {
    $line = $lines[$i].Trim()
    if ($line -match 'Return result|RetMsg') {
      $startIdx = $line.IndexOf('{')
      if ($startIdx -lt 0) { $startIdx = $line.IndexOf('[') }
      if ($startIdx -ge 0) {
        $payload = $line.Substring($startIdx)
        $parsed = Try-ParseCandidate -Raw $payload
        if ($parsed.Success) { return $parsed.Value }
      }
    }
    if (($line.StartsWith('{') -and $line.EndsWith('}')) -or ($line.StartsWith('[') -and $line.EndsWith(']'))) {
      $parsed = Try-ParseCandidate -Raw $line
      if ($parsed.Success) { return $parsed.Value }
    }
  }

  $jsonMatches = [regex]::Matches($OutputText, '(?s)(\{.*\}|\[.*\])')
  for ($i = $jsonMatches.Count - 1; $i -ge 0; $i--) {
    $candidate = $jsonMatches[$i].Value
    $parsed = Try-ParseCandidate -Raw $candidate
    if ($parsed.Success) { return $parsed.Value }
  }

  throw "Unable to parse JSON from output:`n$OutputText"
}

function Invoke-Cloudbase {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Arguments,
    [string]$WorkingDirectory = (Get-Location).Path,
    [switch]$IgnoreExitCode
  )

  $fullArgs = @($script:CloudbaseCliEntry) + $Arguments
  return Invoke-External -FilePath $script:NodeCmd -Arguments $fullArgs -WorkingDirectory $WorkingDirectory -IgnoreExitCode:$IgnoreExitCode
}

function Invoke-CloudbaseFn {
  param(
    [Parameter(Mandatory = $true)]
    [string]$EnvId,
    [Parameter(Mandatory = $true)]
    [string]$FunctionName,
    [Parameter(Mandatory = $true)]
    [object]$Params,
    [string]$WorkingDirectory = (Get-Location).Path
  )

  $json = $Params | ConvertTo-Json -Compress -Depth 100
  $jsonEscaped = $json -replace '"', '\"'
  $res = Invoke-Cloudbase -Arguments @('fn', 'invoke', $FunctionName, '-e', $EnvId, '--params', $jsonEscaped) -WorkingDirectory $WorkingDirectory
  $parsed = Parse-JsonFromOutput -OutputText ($res.StdOut + "`n" + $res.StdErr)

  return [pscustomobject]@{
    Raw  = $res
    Json = $parsed
  }
}
