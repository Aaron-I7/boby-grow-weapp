param(
  [string]$EnvId = ''
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'common.ps1')

$repoRoot = Get-RepoRoot
Set-Location $repoRoot
$EnvId = Resolve-DefaultEnvId -EnvId $EnvId -RepoRoot $repoRoot

Write-Host "==> Seeding CloudBase data in env: $EnvId"

$login = Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'user' -Params @{ action = 'login' } -WorkingDirectory $repoRoot
$family = $login.Json.family
if (-not $family -or -not $family._id) {
  $familyName = 'SeedFamily_' + (Get-Date -Format 'yyyyMMdd-HHmmss')
  $createFamily = Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'user' -Params @{ action = 'createFamily'; name = $familyName } -WorkingDirectory $repoRoot
  $family = $createFamily.Json
}
Assert-True -Condition ([bool]$family._id) -Message 'Failed to resolve family after login/createFamily.'

[void](Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'user' -Params @{
    action = 'setFamilyMode'
    mode   = 'hybrid_growth'
  } -WorkingDirectory $repoRoot)

$childrenRes = Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'user' -Params @{ action = 'getChildren' } -WorkingDirectory $repoRoot
$children = @($childrenRes.Json)
if ($children.Count -eq 0) {
  $childPayload = @{
    action      = 'addChild'
    nickname    = 'SeedKid'
    age         = 7
    gender      = 'male'
    avatarIndex = 0
    avatarKey   = 'child_male_01'
    avatarUrl   = '/images/png/avatar/child/child_male_01.png'
    currentPoints = 1200
    totalPoints = 1200
  }
  [void](Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'user' -Params $childPayload -WorkingDirectory $repoRoot)
  $children = @((Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'user' -Params @{ action = 'getChildren' } -WorkingDirectory $repoRoot).Json)
}
Assert-True -Condition ($children.Count -gt 0) -Message 'No child data available after seed.'
$childId = $children[0]._id

$rulesRes = Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'task' -Params @{ action = 'getRules' } -WorkingDirectory $repoRoot
$rules = @($rulesRes.Json)
if ($rules.Count -eq 0) {
  [void](Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'task' -Params @{
      action             = 'createRule'
      name               = 'SeedRule'
      category           = 'habit'
      points             = 10
      dailyLimit         = 1
      frequency          = 'daily'
      weekdays           = @()
      purposeText        = 'Build a stable habit'
      choiceOptions      = @('Start with 5 minutes', 'Start with the easiest one')
      reflectionRequired = $true
      intrinsicTag       = 'autonomy'
    } -WorkingDirectory $repoRoot)
}

$rewardsRes = Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'point' -Params @{ action = 'getRewards' } -WorkingDirectory $repoRoot
$rewards = @($rewardsRes.Json)
if ($rewards.Count -eq 0) {
  [void](Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'point' -Params @{
      action         = 'createReward'
      name           = 'SeedReward'
      category       = 'companion'
      rewardType     = 'experience'
      cost           = 200
      redeemLimit    = 1
      iconIndex      = 0
      enabled        = $true
      weeklyQuota    = 2
      cooldownDays   = 0
      requiresReason = $false
    } -WorkingDirectory $repoRoot)
  $rewards = @((Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'point' -Params @{ action = 'getRewards' } -WorkingDirectory $repoRoot).Json)
}

$growthOverview = (Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'growth' -Params @{
    action  = 'getOverview'
    childId = $childId
  } -WorkingDirectory $repoRoot).Json

$summary = [pscustomobject]@{
  envId            = $EnvId
  familyId         = $family._id
  childCount       = $children.Count
  firstChildId     = $childId
  rewardCount      = $rewards.Count
  growthRecordSeed = [int]($growthOverview.totalRecords)
  seededAt         = (Get-Date).ToString('s')
}

Write-Host "Seed completed:"
$summary | ConvertTo-Json -Depth 10
