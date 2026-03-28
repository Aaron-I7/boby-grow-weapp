param(
  [string]$EnvId = ''
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'common.ps1')

$repoRoot = Get-RepoRoot
Set-Location $repoRoot
$EnvId = Resolve-DefaultEnvId -EnvId $EnvId -RepoRoot $repoRoot

Write-Host "==> Smoke test started for env: $EnvId"

Write-Host '==> L1 static checks'
$checkFiles = @(
  'cloudfunctions\user\index.js',
  'cloudfunctions\task\index.js',
  'cloudfunctions\point\index.js',
  'cloudfunctions\growth\index.js',
  'cloudfunctions\mcp\index.js'
)
foreach ($file in $checkFiles) {
  [void](Invoke-External -FilePath 'node' -Arguments @('--check', (Join-Path $repoRoot $file)) -WorkingDirectory $repoRoot)
}

$apiText = Get-Content -Raw -Encoding UTF8 (Join-Path $repoRoot 'miniprogram\utils\api.js')
$apiCalls = [regex]::Matches($apiText, "callCloud\('([a-z]+)'\s*,\s*'([A-Za-z0-9_]+)'") | ForEach-Object {
  "$($_.Groups[1].Value).$($_.Groups[2].Value)"
} | Sort-Object -Unique

$impl = @()
$impl += ([regex]::Matches((Get-Content -Raw -Encoding UTF8 (Join-Path $repoRoot 'cloudfunctions\user\index.js')), "case '([A-Za-z0-9_]+)'") | ForEach-Object { "user.$($_.Groups[1].Value)" })
$impl += ([regex]::Matches((Get-Content -Raw -Encoding UTF8 (Join-Path $repoRoot 'cloudfunctions\task\index.js')), "case '([A-Za-z0-9_]+)'") | ForEach-Object { "task.$($_.Groups[1].Value)" })
$impl += ([regex]::Matches((Get-Content -Raw -Encoding UTF8 (Join-Path $repoRoot 'cloudfunctions\point\index.js')), "case '([A-Za-z0-9_]+)'") | ForEach-Object { "point.$($_.Groups[1].Value)" })
$impl += ([regex]::Matches((Get-Content -Raw -Encoding UTF8 (Join-Path $repoRoot 'cloudfunctions\growth\index.js')), "case '([A-Za-z0-9_]+)'") | ForEach-Object { "growth.$($_.Groups[1].Value)" })
$impl += ([regex]::Matches((Get-Content -Raw -Encoding UTF8 (Join-Path $repoRoot 'cloudfunctions\mcp\index.js')), "case '([A-Za-z0-9_]+)'") | ForEach-Object { "mcp.$($_.Groups[1].Value)" })
$impl = $impl | Sort-Object -Unique

$missing = @($apiCalls | Where-Object { $_ -notin $impl })
Assert-True -Condition ($missing.Count -eq 0) -Message ('Missing action implementations: ' + ($missing -join ','))

Write-Host '==> L3 cloud invoke checks'

$login = Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'user' -Params @{ action = 'login' } -WorkingDirectory $repoRoot
Assert-True -Condition ([bool]($login.Json.user -or $login.Json.currentUser)) -Message 'user.login missing user/currentUser.'

$family = $login.Json.family
if (-not $family -or -not $family._id) {
  $newFamily = Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'user' -Params @{ action = 'createFamily'; name = ('SmokeFamily_' + (Get-Date -Format 'HHmmss')) } -WorkingDirectory $repoRoot
  $family = $newFamily.Json
}
Assert-True -Condition ([bool]$family._id) -Message 'Family not available after login/createFamily.'

$getFamily = Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'user' -Params @{ action = 'getFamily' } -WorkingDirectory $repoRoot
Assert-True -Condition ([bool]($getFamily.Json -and $getFamily.Json._id)) -Message 'user.getFamily returned empty.'

$setMode = Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'user' -Params @{
  action = 'setFamilyMode'
  mode   = 'hybrid_growth'
} -WorkingDirectory $repoRoot
Assert-True -Condition ([bool]$setMode.Json.success) -Message 'user.setFamilyMode failed.'

$childrenRes = Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'user' -Params @{ action = 'getChildren' } -WorkingDirectory $repoRoot
$children = @($childrenRes.Json)
if (@($children).Count -eq 0) {
  [void](Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'user' -Params @{
      action        = 'addChild'
      nickname      = 'SmokeKid'
      age           = 7
      gender        = 'female'
      avatarIndex   = 1
      avatarKey     = 'child_female_01'
      avatarUrl     = '/images/png/avatar/child/child_female_01.png'
      currentPoints = 1500
      totalPoints   = 1500
    } -WorkingDirectory $repoRoot)
  $children = @((Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'user' -Params @{ action = 'getChildren' } -WorkingDirectory $repoRoot).Json)
}
Assert-True -Condition (@($children).Count -gt 0) -Message 'No children found for smoke test.'
$childId = $children[0]._id

[void](Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'task' -Params @{
    action             = 'createRule'
    name               = ('SmokeRule_' + (Get-Date -Format 'HHmmss'))
    category           = 'habit'
    points             = 10
    dailyLimit         = 1
    frequency          = 'daily'
    weekdays           = @()
    purposeText        = 'BuildAStableHabit'
    choiceOptions      = @('Start5min', 'TidyDeskFirst')
    reflectionRequired = $true
    intrinsicTag       = 'autonomy'
  } -WorkingDirectory $repoRoot)

$rules = @((Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'task' -Params @{ action = 'getRules' } -WorkingDirectory $repoRoot).Json)
Assert-True -Condition (@($rules).Count -gt 0) -Message 'task.getRules returned empty after createRule.'

$today = Get-Date -Format 'yyyy-MM-dd'
$tasks = @((Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'task' -Params @{ action = 'getTasks'; childId = $childId; date = $today } -WorkingDirectory $repoRoot).Json)
Assert-True -Condition (@($tasks).Count -gt 0) -Message 'task.getTasks returned empty.'

$task = $tasks[0]
$submit = (Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'task' -Params @{
    action     = 'submitTask'
    taskId     = $task._id
    reflection = 'I broke the hardest part into small steps first.'
  } -WorkingDirectory $repoRoot).Json
Assert-True -Condition ([bool]$submit.success) -Message 'task.submitTask failed.'

$audit = (Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'task' -Params @{
    action       = 'auditTask'
    taskId       = $task._id
    approved     = $true
    note         = 'smoke'
    feedbackType = 'process'
    feedbackText = 'You adjusted your approach during the process.'
    grantPoints  = $true
  } -WorkingDirectory $repoRoot).Json
Assert-True -Condition ([bool]$audit.success) -Message 'task.auditTask failed.'

$overview = (Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'task' -Params @{
    action    = 'getTaskCompletionOverview'
    childId   = $childId
    startTime = ((Get-Date).AddDays(-30).ToString('s') + 'Z')
    endTime   = ((Get-Date).ToString('s') + 'Z')
  } -WorkingDirectory $repoRoot).Json
Assert-True -Condition ($overview.PSObject.Properties.Name -contains 'totalCompleted') -Message 'task.getTaskCompletionOverview missing totalCompleted.'

$timeline = (Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'task' -Params @{
    action   = 'getTaskCompletionTimeline'
    childId  = $childId
    pageNo   = 1
    pageSize = 10
  } -WorkingDirectory $repoRoot).Json
Assert-True -Condition ($timeline.PSObject.Properties.Name -contains 'list') -Message 'task.getTaskCompletionTimeline missing list.'

$rewards = @((Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'point' -Params @{ action = 'getRewards' } -WorkingDirectory $repoRoot).Json)
if (@($rewards).Count -eq 0) {
  [void](Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'point' -Params @{
      action         = 'createReward'
      name           = 'SmokeReward'
      category       = 'companion'
      rewardType     = 'experience'
      cost           = 100
      redeemLimit    = 1
      iconIndex      = 0
      enabled        = $true
      weeklyQuota    = 3
      cooldownDays   = 0
      requiresReason = $false
    } -WorkingDirectory $repoRoot)
  $rewards = @((Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'point' -Params @{ action = 'getRewards' } -WorkingDirectory $repoRoot).Json)
}
Assert-True -Condition (@($rewards).Count -gt 0) -Message 'point.getRewards returned empty.'
$rewardId = $rewards[0]._id

[void](Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'point' -Params @{
    action   = 'redeemReward'
    childId  = $childId
    rewardId = $rewardId
    reason   = 'I want to complete this reward experience with my parent.'
  } -WorkingDirectory $repoRoot)

$rewardRequests = @((Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'point' -Params @{ action = 'getRewardRequests'; status = 'pending' } -WorkingDirectory $repoRoot).Json)
if (@($rewardRequests).Count -gt 0) {
  [void](Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'point' -Params @{
      action    = 'auditRedeem'
      requestId = $rewardRequests[0]._id
      approved  = $false
      note      = 'smoke'
    } -WorkingDirectory $repoRoot)
}

[void](Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'point' -Params @{
    action    = 'submitWish'
    childId   = $childId
    name      = ('SmokeWish_' + (Get-Date -Format 'HHmmss'))
    iconIndex = 0
  } -WorkingDirectory $repoRoot)

$wishRequests = @((Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'point' -Params @{ action = 'getWishRequests'; status = 'pending' } -WorkingDirectory $repoRoot).Json)
if (@($wishRequests).Count -gt 0) {
  [void](Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'point' -Params @{
      action          = 'auditWish'
      wishId          = $wishRequests[0]._id
      approved        = $true
      suggestedPoints = 300
    } -WorkingDirectory $repoRoot)
}

$records = @((Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'point' -Params @{ action = 'getRecords'; childId = $childId } -WorkingDirectory $repoRoot).Json)
Assert-True -Condition (@($records).Count -ge 0) -Message 'point.getRecords call failed.'

$growthOverview = (Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'growth' -Params @{
    action  = 'getOverview'
    childId = $childId
  } -WorkingDirectory $repoRoot).Json
Assert-True -Condition ($growthOverview.PSObject.Properties.Name -contains 'totalRecords') -Message 'growth.getOverview missing totalRecords.'

$growthTimeline = (Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'growth' -Params @{
    action   = 'getTimeline'
    childId  = $childId
    pageNo   = 1
    pageSize = 10
  } -WorkingDirectory $repoRoot).Json
Assert-True -Condition ($growthTimeline.PSObject.Properties.Name -contains 'list') -Message 'growth.getTimeline missing list.'

$verify = (Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'mcp' -Params @{ action = 'getVerifyCode'; childId = $childId } -WorkingDirectory $repoRoot).Json
Assert-True -Condition ($verify.PSObject.Properties.Name -contains 'code') -Message 'mcp.getVerifyCode missing code field.'

$summary = [pscustomobject]@{
  envId             = $EnvId
  apiActions        = @($apiCalls).Count
  implemented       = @($impl).Count
  childId           = $childId
  taskCountToday    = @($tasks).Count
  rewardCount       = @($rewards).Count
  recordCount       = @($records).Count
  growthRecordCount = [int]($growthOverview.totalRecords)
  verifyCode        = $verify.code
  finishedAt        = (Get-Date).ToString('s')
}

Write-Host '==> Smoke test passed'
$summary | ConvertTo-Json -Depth 10
