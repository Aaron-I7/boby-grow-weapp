param(
  [string]$EnvId = '',
  [string]$OutputPath = '',
  [switch]$StopOnFailure
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'common.ps1')

$repoRoot = Get-RepoRoot
Set-Location $repoRoot
$EnvId = Resolve-DefaultEnvId -EnvId $EnvId -RepoRoot $repoRoot

$nowTag = Get-Date -Format 'yyyyMMddHHmmss'
$ctx = @{}
$results = New-Object System.Collections.Generic.List[object]

function Get-ArrayCount {
  param([object]$Value)
  return @($Value).Count
}

function Assert-HasProperty {
  param(
    [object]$Target,
    [string]$PropertyName,
    [string]$Message
  )
  $ok = $false
  if ($null -ne $Target) {
    $ok = $Target.PSObject.Properties.Name -contains $PropertyName
  }
  Assert-True -Condition $ok -Message $Message
}

function Assert-NonEmptyString {
  param(
    [object]$Value,
    [string]$Message
  )
  $text = if ($null -eq $Value) { '' } else { [string]$Value }
  Assert-True -Condition (-not [string]::IsNullOrWhiteSpace($text)) -Message $Message
}

function Invoke-Case {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name,
    [Parameter(Mandatory = $true)]
    [scriptblock]$Body
  )

  Write-Host "==> Case: $Name"
  $started = Get-Date
  try {
    & $Body
    $durationMs = [int]((Get-Date) - $started).TotalMilliseconds
    $results.Add([pscustomobject]@{
      name       = $Name
      status     = 'passed'
      durationMs = $durationMs
      error      = ''
    })
  } catch {
    $durationMs = [int]((Get-Date) - $started).TotalMilliseconds
    $message = $_.Exception.Message
    $results.Add([pscustomobject]@{
      name       = $Name
      status     = 'failed'
      durationMs = $durationMs
      error      = $message
    })
    Write-Host "FAILED: $message"
    if ($StopOnFailure) { throw }
  }
}

function Find-ById {
  param(
    [object[]]$List,
    [string]$Id
  )
  return @($List) | Where-Object { $_ -and $_._id -eq $Id } | Select-Object -First 1
}

function Get-TodayDateKey {
  return (Get-Date -Format 'yyyy-MM-dd')
}

Write-Host "==> Functional test started for env: $EnvId"

Invoke-Case -Name 'L1.action-mapping.v2-implemented' -Body {
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
  Assert-True -Condition (@($apiCalls).Count -eq 40) -Message "Expected 40 API actions, got $(@($apiCalls).Count)."
  Assert-True -Condition ($missing.Count -eq 0) -Message ("Missing action implementations: " + ($missing -join ','))
}

Invoke-Case -Name 'user.login.return-schema' -Body {
  $res = (Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'user' -Params @{ action = 'login' } -WorkingDirectory $repoRoot).Json
  Assert-HasProperty -Target $res -PropertyName 'user' -Message 'user.login must return user.'
  Assert-HasProperty -Target $res -PropertyName 'currentUser' -Message 'user.login must return currentUser.'
  $currentUser = if ($res.currentUser) { $res.currentUser } else { $res.user }
  Assert-NonEmptyString -Value $currentUser._id -Message 'user.login currentUser._id is required.'

  $ctx.userId = $currentUser._id
  $ctx.familyId = if ($res.familyId) { [string]$res.familyId } else { '' }
}

Invoke-Case -Name 'user.family.create-or-get.return+persist' -Body {
  $family = (Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'user' -Params @{ action = 'getFamily' } -WorkingDirectory $repoRoot).Json
  if (-not $family -or -not $family._id) {
    $familyName = 'TCFamily_' + $nowTag
    $created = (Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'user' -Params @{ action = 'createFamily'; name = $familyName } -WorkingDirectory $repoRoot).Json
    Assert-NonEmptyString -Value $created._id -Message 'createFamily must return _id.'
    $family = $created
  }
  $familyAgain = (Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'user' -Params @{ action = 'getFamily' } -WorkingDirectory $repoRoot).Json
  Assert-NonEmptyString -Value $familyAgain._id -Message 'getFamily must return _id after create/get.'

  $ctx.familyId = [string]$familyAgain._id
}

Invoke-Case -Name 'user.setFamilyMode.persist' -Body {
  $modeRes = (Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'user' -Params @{
      action = 'setFamilyMode'
      mode   = 'hybrid_growth'
    } -WorkingDirectory $repoRoot).Json

  Assert-True -Condition ([bool]$modeRes.success) -Message 'setFamilyMode must return success=true.'
  Assert-True -Condition ([string]$modeRes.mode -eq 'hybrid_growth') -Message 'setFamilyMode must return selected mode.'

  $family = (Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'user' -Params @{ action = 'getFamily' } -WorkingDirectory $repoRoot).Json
  Assert-True -Condition ([string]$family.mode -eq 'hybrid_growth') -Message 'setFamilyMode mode not persisted in family.'
}

Invoke-Case -Name 'user.addChild.write+return' -Body {
  $before = @((Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'user' -Params @{ action = 'getChildren' } -WorkingDirectory $repoRoot).Json)
  $childName = 'TCChild_' + $nowTag
  $child = (Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'user' -Params @{
      action        = 'addChild'
      nickname      = $childName
      age           = 8
      gender        = 'male'
      avatarIndex   = 0
      avatarKey     = 'child_male_01'
      avatarUrl     = '/images/png/avatar/child/child_male_01.png'
      currentPoints = 1200
      totalPoints   = 1200
    } -WorkingDirectory $repoRoot).Json

  Assert-NonEmptyString -Value $child._id -Message 'addChild must return _id.'
  Assert-True -Condition ([string]$child.nickname -eq $childName) -Message 'addChild nickname mismatch.'

  $after = @((Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'user' -Params @{ action = 'getChildren' } -WorkingDirectory $repoRoot).Json)
  Assert-True -Condition (Get-ArrayCount $after -ge (Get-ArrayCount $before + 1)) -Message 'addChild did not increase children count.'
  $hit = Find-ById -List $after -Id $child._id
  Assert-True -Condition ([bool]$hit) -Message 'added child not found in getChildren.'

  $ctx.childId = [string]$child._id
}

Invoke-Case -Name 'user.editChild.persist' -Body {
  Assert-NonEmptyString -Value $ctx.childId -Message 'childId missing for editChild.'
  $newName = 'TCChildEdit_' + $nowTag
  $res = (Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'user' -Params @{
      action   = 'editChild'
      _id      = $ctx.childId
      nickname = $newName
      age      = 9
    } -WorkingDirectory $repoRoot).Json

  Assert-True -Condition ([bool]$res.success) -Message 'editChild must return success=true.'
  $detail = (Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'user' -Params @{
      action  = 'getChildDetail'
      childId = $ctx.childId
    } -WorkingDirectory $repoRoot).Json
  Assert-True -Condition ([string]$detail.nickname -eq $newName) -Message 'editChild nickname not persisted.'
}

Invoke-Case -Name 'user.profile.update+get.persist' -Body {
  $profileName = 'TCParent_' + $nowTag
  $updated = (Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'user' -Params @{
      action   = 'updateProfile'
      nickname = $profileName
      identity = 'dad'
      gender   = 'neutral'
    } -WorkingDirectory $repoRoot).Json

  Assert-True -Condition ([bool]$updated.success) -Message 'updateProfile must return success=true.'
  Assert-True -Condition ([string]$updated.profile.nickname -eq $profileName) -Message 'updateProfile.profile.nickname mismatch.'
  $profile = (Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'user' -Params @{ action = 'getProfile' } -WorkingDirectory $repoRoot).Json
  Assert-True -Condition ([string]$profile.nickname -eq $profileName) -Message 'getProfile nickname not updated.'
}

Invoke-Case -Name 'user.updateDailyLimit.persist' -Body {
  $limit = 777
  $res = (Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'user' -Params @{
      action = 'updateDailyLimit'
      limit  = $limit
    } -WorkingDirectory $repoRoot).Json
  Assert-True -Condition ([bool]$res.success) -Message 'updateDailyLimit must return success=true.'

  $family = (Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'user' -Params @{ action = 'getFamily' } -WorkingDirectory $repoRoot).Json
  Assert-True -Condition ([int]$family.dailyPointLimit -eq $limit) -Message 'updateDailyLimit not persisted in family.'
}

Invoke-Case -Name 'user.coadmin.add+remove.persist' -Body {
  $before = @((Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'user' -Params @{ action = 'getCoadmins' } -WorkingDirectory $repoRoot).Json)
  $coOpenId = 'tc_co_' + $nowTag
  $coName = 'TCAdmin_' + $nowTag

  $added = (Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'user' -Params @{
      action   = 'addCoadmin'
      openId   = $coOpenId
      nickname = $coName
      identity = 'other'
      gender   = 'neutral'
    } -WorkingDirectory $repoRoot).Json
  Assert-True -Condition ([bool]$added.success) -Message 'addCoadmin must return success=true.'

  $afterAdd = @((Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'user' -Params @{ action = 'getCoadmins' } -WorkingDirectory $repoRoot).Json)
  $addedHit = @($afterAdd | Where-Object { $_ -and $_.openId -eq $coOpenId }) | Select-Object -First 1
  Assert-True -Condition ([bool]$addedHit) -Message 'added coadmin not found in getCoadmins.'
  Assert-True -Condition (Get-ArrayCount $afterAdd -ge (Get-ArrayCount $before + 1)) -Message 'coadmin count did not increase after add.'

  $removed = (Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'user' -Params @{
      action = 'removeCoadmin'
      userId = $addedHit._id
    } -WorkingDirectory $repoRoot).Json
  Assert-True -Condition ([bool]$removed.success) -Message 'removeCoadmin must return success=true.'

  $afterRemove = @((Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'user' -Params @{ action = 'getCoadmins' } -WorkingDirectory $repoRoot).Json)
  $removedHit = @($afterRemove | Where-Object { $_ -and $_._id -eq $addedHit._id }) | Select-Object -First 1
  Assert-True -Condition (-not $removedHit) -Message 'coadmin still exists after removeCoadmin.'
}

Invoke-Case -Name 'task.createRule.write+return' -Body {
  $before = @((Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'task' -Params @{ action = 'getRules' } -WorkingDirectory $repoRoot).Json)
  $ruleName = 'TCRule_' + $nowTag
  $rule = (Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'task' -Params @{
      action             = 'createRule'
      name               = $ruleName
      category           = 'habit'
      points             = 15
      dailyLimit         = 1
      frequency          = 'daily'
      weekdays           = @()
      enabled            = $true
      purposeText        = 'BuildAStableHabit'
      choiceOptions      = @('Start5min', 'EasiestFirst')
      reflectionRequired = $true
      intrinsicTag       = 'autonomy'
    } -WorkingDirectory $repoRoot).Json

  Assert-NonEmptyString -Value $rule._id -Message 'createRule must return _id.'
  Assert-True -Condition ([string]$rule.name -eq $ruleName) -Message 'createRule name mismatch.'
  Assert-True -Condition ([bool]$rule.reflectionRequired) -Message 'createRule reflectionRequired mismatch.'
  Assert-True -Condition ([string]$rule.intrinsicTag -eq 'autonomy') -Message 'createRule intrinsicTag mismatch.'

  $after = @((Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'task' -Params @{ action = 'getRules' } -WorkingDirectory $repoRoot).Json)
  $hit = Find-ById -List $after -Id $rule._id
  Assert-True -Condition ([bool]$hit) -Message 'created rule not found in getRules.'
  Assert-True -Condition (Get-ArrayCount $after -ge (Get-ArrayCount $before + 1)) -Message 'rule count did not increase after createRule.'

  $ctx.ruleId = [string]$rule._id
}

Invoke-Case -Name 'task.updateRule.persist' -Body {
  Assert-NonEmptyString -Value $ctx.ruleId -Message 'ruleId missing for updateRule.'
  $updatedName = 'TCRuleEdit_' + $nowTag
  $res = (Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'task' -Params @{
      action             = 'updateRule'
      _id                = $ctx.ruleId
      name               = $updatedName
      points             = 19
      reflectionRequired = $false
      intrinsicTag       = 'competence'
    } -WorkingDirectory $repoRoot).Json
  Assert-True -Condition ([bool]$res.success) -Message 'updateRule must return success=true.'

  $rules = @((Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'task' -Params @{ action = 'getRules' } -WorkingDirectory $repoRoot).Json)
  $hit = Find-ById -List $rules -Id $ctx.ruleId
  Assert-True -Condition ([bool]$hit) -Message 'rule not found after updateRule.'
  Assert-True -Condition ([string]$hit.name -eq $updatedName) -Message 'updateRule name not persisted.'
  Assert-True -Condition ([int]$hit.points -eq 19) -Message 'updateRule points not persisted.'
  Assert-True -Condition ($hit.reflectionRequired -eq $false) -Message 'updateRule reflectionRequired not persisted.'
  Assert-True -Condition ([string]$hit.intrinsicTag -eq 'competence') -Message 'updateRule intrinsicTag not persisted.'
}

Invoke-Case -Name 'task.toggleRule.persist' -Body {
  Assert-NonEmptyString -Value $ctx.ruleId -Message 'ruleId missing for toggleRule.'
  $off = (Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'task' -Params @{
      action  = 'toggleRule'
      ruleId  = $ctx.ruleId
      enabled = $false
    } -WorkingDirectory $repoRoot).Json
  Assert-True -Condition ([bool]$off.success) -Message 'toggleRule(false) must return success=true.'

  $rulesAfterOff = @((Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'task' -Params @{ action = 'getRules' } -WorkingDirectory $repoRoot).Json)
  $hitOff = Find-ById -List $rulesAfterOff -Id $ctx.ruleId
  Assert-True -Condition ($hitOff.enabled -eq $false) -Message 'toggleRule(false) not persisted.'

  $on = (Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'task' -Params @{
      action  = 'toggleRule'
      ruleId  = $ctx.ruleId
      enabled = $true
    } -WorkingDirectory $repoRoot).Json
  Assert-True -Condition ([bool]$on.success) -Message 'toggleRule(true) must return success=true.'
}

Invoke-Case -Name 'task.getTasks.return+submitTask.persist' -Body {
  Assert-NonEmptyString -Value $ctx.childId -Message 'childId missing for getTasks/submitTask.'
  $date = Get-TodayDateKey
  $tasks = @((Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'task' -Params @{
      action  = 'getTasks'
      childId = $ctx.childId
      date    = $date
    } -WorkingDirectory $repoRoot).Json)
  Assert-True -Condition (Get-ArrayCount $tasks -gt 0) -Message 'getTasks must return at least one task.'

  $task = @($tasks | Where-Object { $_ -and $_.status -ne 'completed' }) | Select-Object -First 1
  if (-not $task) { $task = $tasks[0] }
  Assert-NonEmptyString -Value $task._id -Message 'taskId not found for submitTask.'

  $submit = (Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'task' -Params @{
      action     = 'submitTask'
      taskId     = $task._id
      reflection = 'HardestStepFirst'
    } -WorkingDirectory $repoRoot).Json
  Assert-True -Condition ([bool]$submit.success) -Message 'submitTask must return success=true.'

  $tasksAfter = @((Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'task' -Params @{
      action  = 'getTasks'
      childId = $ctx.childId
      date    = $date
    } -WorkingDirectory $repoRoot).Json)
  $taskAfter = Find-ById -List $tasksAfter -Id $task._id
  Assert-True -Condition ([string]$taskAfter.auditStatus -eq 'pending') -Message 'submitTask did not persist auditStatus=pending.'
  Assert-True -Condition ([string]$taskAfter.reflection -ne '') -Message 'submitTask did not persist reflection.'

  $ctx.taskId = [string]$task._id
}

Invoke-Case -Name 'task.auditTask.persist' -Body {
  Assert-NonEmptyString -Value $ctx.taskId -Message 'taskId missing for auditTask.'
  $audit = (Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'task' -Params @{
      action       = 'auditTask'
      taskId       = $ctx.taskId
      approved     = $true
      note         = 'tc_ok'
      feedbackType = 'process'
      feedbackText = 'ProcessAdjusted'
      grantPoints  = $true
    } -WorkingDirectory $repoRoot).Json
  Assert-True -Condition ([bool]$audit.success) -Message 'auditTask must return success=true.'

  $date = Get-TodayDateKey
  $tasksAfter = @((Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'task' -Params @{
      action  = 'getTasks'
      childId = $ctx.childId
      date    = $date
    } -WorkingDirectory $repoRoot).Json)
  $taskAfter = Find-ById -List $tasksAfter -Id $ctx.taskId
  Assert-True -Condition ([string]$taskAfter.auditStatus -eq 'approved') -Message 'auditTask did not persist auditStatus=approved.'
  Assert-True -Condition ([string]$taskAfter.status -eq 'completed') -Message 'auditTask approved did not persist completed status.'
  Assert-True -Condition ([string]$taskAfter.feedbackType -eq 'process') -Message 'auditTask feedbackType not persisted.'
  Assert-True -Condition ([string]$taskAfter.feedbackText -ne '') -Message 'auditTask feedbackText not persisted.'
}

Invoke-Case -Name 'task.completeTask.persist' -Body {
  $date = Get-TodayDateKey
  $tasks = @((Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'task' -Params @{
      action  = 'getTasks'
      childId = $ctx.childId
      date    = $date
    } -WorkingDirectory $repoRoot).Json)

  $candidate = @($tasks | Where-Object { $_ -and $_._id -ne $ctx.taskId -and $_.status -ne 'completed' }) | Select-Object -First 1
  if (-not $candidate) {
    $fallbackRule = (Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'task' -Params @{
        action             = 'createRule'
        name               = 'TCRuleFallback_' + $nowTag
        category           = 'habit'
        points             = 8
        dailyLimit         = 1
        frequency          = 'daily'
        weekdays           = @()
        reflectionRequired = $false
        intrinsicTag       = 'competence'
      } -WorkingDirectory $repoRoot).Json
    Assert-NonEmptyString -Value $fallbackRule._id -Message 'fallback createRule failed for completeTask case.'
    $tasks = @((Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'task' -Params @{
        action  = 'getTasks'
        childId = $ctx.childId
        date    = $date
      } -WorkingDirectory $repoRoot).Json)
    $candidate = @($tasks | Where-Object { $_ -and $_.status -ne 'completed' }) | Select-Object -First 1
  }

  Assert-True -Condition ([bool]$candidate) -Message 'No task available for completeTask.'
  $done = (Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'task' -Params @{
      action = 'completeTask'
      taskId = $candidate._id
    } -WorkingDirectory $repoRoot).Json
  Assert-True -Condition ([bool]$done.success) -Message 'completeTask must return success=true.'

  $tasksAfter = @((Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'task' -Params @{
      action  = 'getTasks'
      childId = $ctx.childId
      date    = $date
    } -WorkingDirectory $repoRoot).Json)
  $hit = Find-ById -List $tasksAfter -Id $candidate._id
  Assert-True -Condition ([string]$hit.status -eq 'completed') -Message 'completeTask did not persist completed status.'
}

Invoke-Case -Name 'task.analytics.return-schema' -Body {
  $overview = (Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'task' -Params @{
      action    = 'getTaskCompletionOverview'
      childId   = $ctx.childId
      startTime = ((Get-Date).AddDays(-30).ToString('s') + 'Z')
      endTime   = ((Get-Date).ToString('s') + 'Z')
    } -WorkingDirectory $repoRoot).Json
  Assert-HasProperty -Target $overview -PropertyName 'totalCompleted' -Message 'overview must contain totalCompleted.'
  Assert-HasProperty -Target $overview -PropertyName 'categorySummary' -Message 'overview must contain categorySummary.'
  Assert-HasProperty -Target $overview -PropertyName 'taskRanking' -Message 'overview must contain taskRanking.'

  $timeline = (Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'task' -Params @{
      action   = 'getTaskCompletionTimeline'
      childId  = $ctx.childId
      pageNo   = 1
      pageSize = 10
    } -WorkingDirectory $repoRoot).Json
  Assert-HasProperty -Target $timeline -PropertyName 'list' -Message 'timeline must contain list.'
  Assert-HasProperty -Target $timeline -PropertyName 'total' -Message 'timeline must contain total.'

  $cluster = (Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'task' -Params @{
      action    = 'getTaskCompletionCluster'
      childId   = $ctx.childId
      clusterBy = 'task'
    } -WorkingDirectory $repoRoot).Json
  Assert-HasProperty -Target $cluster -PropertyName 'buckets' -Message 'cluster must contain buckets.'
  Assert-HasProperty -Target $cluster -PropertyName 'clusterBy' -Message 'cluster must contain clusterBy.'
}

Invoke-Case -Name 'point.createReward.write+return' -Body {
  $before = @((Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'point' -Params @{ action = 'getRewards' } -WorkingDirectory $repoRoot).Json)
  $rewardName = 'TCReward_' + $nowTag
  $reward = (Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'point' -Params @{
      action         = 'createReward'
      name           = $rewardName
      category       = 'companion'
      rewardType     = 'experience'
      cost           = 60
      redeemLimit    = 1
      iconIndex      = 1
      enabled        = $true
      weeklyQuota    = 2
      cooldownDays   = 0
      requiresReason = $false
    } -WorkingDirectory $repoRoot).Json
  Assert-NonEmptyString -Value $reward._id -Message 'createReward must return _id.'
  Assert-True -Condition ([string]$reward.name -eq $rewardName) -Message 'createReward name mismatch.'
  Assert-True -Condition ([string]$reward.rewardType -eq 'experience') -Message 'createReward rewardType mismatch.'

  $after = @((Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'point' -Params @{ action = 'getRewards' } -WorkingDirectory $repoRoot).Json)
  $hit = Find-ById -List $after -Id $reward._id
  Assert-True -Condition ([bool]$hit) -Message 'created reward not found in getRewards.'
  Assert-True -Condition (Get-ArrayCount $after -ge (Get-ArrayCount $before + 1)) -Message 'reward count did not increase after createReward.'

  $ctx.rewardId = [string]$reward._id
}

Invoke-Case -Name 'point.redeemReward.write+return' -Body {
  Assert-NonEmptyString -Value $ctx.childId -Message 'childId missing for redeemReward.'
  Assert-NonEmptyString -Value $ctx.rewardId -Message 'rewardId missing for redeemReward.'

  $redeem = (Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'point' -Params @{
      action   = 'redeemReward'
      childId  = $ctx.childId
      rewardId = $ctx.rewardId
      reason   = 'WithParentExperience'
    } -WorkingDirectory $repoRoot).Json
  Assert-True -Condition ([bool]$redeem.success) -Message 'redeemReward must return success=true.'
  Assert-NonEmptyString -Value $redeem.requestId -Message 'redeemReward must return requestId.'

  $pending = @((Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'point' -Params @{
        action = 'getRewardRequests'
        status = 'pending'
      } -WorkingDirectory $repoRoot).Json)
  $hit = Find-ById -List $pending -Id $redeem.requestId
  Assert-True -Condition ([bool]$hit) -Message 'redeemReward request not found in pending list.'

  $ctx.redeemRequestId = [string]$redeem.requestId
}

Invoke-Case -Name 'point.auditRedeem.rejected.persist' -Body {
  Assert-NonEmptyString -Value $ctx.redeemRequestId -Message 'redeemRequestId missing for auditRedeem.'
  $audit = (Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'point' -Params @{
      action    = 'auditRedeem'
      requestId = $ctx.redeemRequestId
      approved  = $false
      note      = 'tc_reject'
    } -WorkingDirectory $repoRoot).Json
  Assert-True -Condition ([bool]$audit.success) -Message 'auditRedeem(rejected) must return success=true.'

  $rejected = @((Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'point' -Params @{
        action = 'getRewardRequests'
        status = 'rejected'
      } -WorkingDirectory $repoRoot).Json)
  $hit = Find-ById -List $rejected -Id $ctx.redeemRequestId
  Assert-True -Condition ([bool]$hit) -Message 'auditRedeem(rejected) not persisted to rejected list.'
}

Invoke-Case -Name 'point.adjustPoints.write+return' -Body {
  $before = @((Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'point' -Params @{
        action  = 'getRecords'
        childId = $ctx.childId
      } -WorkingDirectory $repoRoot).Json)
  $adjust = (Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'point' -Params @{
      action  = 'adjustPoints'
      childId = $ctx.childId
      amount  = 15
      note    = 'tc_adjust'
    } -WorkingDirectory $repoRoot).Json
  Assert-True -Condition ([bool]$adjust.success) -Message 'adjustPoints must return success=true.'

  $after = @((Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'point' -Params @{
        action  = 'getRecords'
        childId = $ctx.childId
      } -WorkingDirectory $repoRoot).Json)
  Assert-True -Condition (Get-ArrayCount $after -ge (Get-ArrayCount $before + 1)) -Message 'adjustPoints did not create point record.'
}

Invoke-Case -Name 'point.auditRedeem.approved.write-record' -Body {
  $redeem = (Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'point' -Params @{
      action   = 'redeemReward'
      childId  = $ctx.childId
      rewardId = $ctx.rewardId
      reason   = 'ApprovalFlowTest'
    } -WorkingDirectory $repoRoot).Json
  Assert-True -Condition ([bool]$redeem.success) -Message 'second redeemReward must return success=true.'
  Assert-NonEmptyString -Value $redeem.requestId -Message 'second redeemReward missing requestId.'

  $recordsBefore = @((Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'point' -Params @{
        action  = 'getRecords'
        childId = $ctx.childId
      } -WorkingDirectory $repoRoot).Json)

  $audit = (Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'point' -Params @{
      action    = 'auditRedeem'
      requestId = $redeem.requestId
      approved  = $true
      note      = 'tc_approve'
    } -WorkingDirectory $repoRoot).Json
  Assert-True -Condition ([bool]$audit.success) -Message 'auditRedeem(approved) must return success=true.'

  $approved = @((Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'point' -Params @{
        action = 'getRewardRequests'
        status = 'approved'
      } -WorkingDirectory $repoRoot).Json)
  $approvedHit = Find-ById -List $approved -Id $redeem.requestId
  Assert-True -Condition ([bool]$approvedHit) -Message 'auditRedeem(approved) status not persisted.'

  $recordsAfter = @((Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'point' -Params @{
        action  = 'getRecords'
        childId = $ctx.childId
      } -WorkingDirectory $repoRoot).Json)
  Assert-True -Condition (Get-ArrayCount $recordsAfter -ge (Get-ArrayCount $recordsBefore + 1)) -Message 'auditRedeem(approved) did not create redeem record.'
}

Invoke-Case -Name 'point.submitWish.write+return' -Body {
  $wishName = 'TCWish_' + $nowTag
  $wish = (Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'point' -Params @{
      action    = 'submitWish'
      childId   = $ctx.childId
      name      = $wishName
      iconIndex = 2
    } -WorkingDirectory $repoRoot).Json
  Assert-NonEmptyString -Value $wish._id -Message 'submitWish must return _id.'
  Assert-True -Condition ([string]$wish.status -eq 'pending') -Message 'submitWish must return pending status.'

  $pending = @((Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'point' -Params @{
        action = 'getWishRequests'
        status = 'pending'
      } -WorkingDirectory $repoRoot).Json)
  $hit = Find-ById -List $pending -Id $wish._id
  Assert-True -Condition ([bool]$hit) -Message 'submitWish not found in pending wish list.'

  $ctx.wishId = [string]$wish._id
}

Invoke-Case -Name 'point.auditWish.persist' -Body {
  Assert-NonEmptyString -Value $ctx.wishId -Message 'wishId missing for auditWish.'
  $audit = (Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'point' -Params @{
      action          = 'auditWish'
      wishId          = $ctx.wishId
      approved        = $true
      suggestedPoints = 321
    } -WorkingDirectory $repoRoot).Json
  Assert-True -Condition ([bool]$audit.success) -Message 'auditWish must return success=true.'

  $approved = @((Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'point' -Params @{
        action = 'getWishRequests'
        status = 'approved'
      } -WorkingDirectory $repoRoot).Json)
  $hit = Find-ById -List $approved -Id $ctx.wishId
  Assert-True -Condition ([bool]$hit) -Message 'auditWish not persisted to approved list.'
}

Invoke-Case -Name 'point.getWeeklyTrend.return-schema' -Body {
  $trend = @((Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'point' -Params @{
        action  = 'getWeeklyTrend'
        childId = $ctx.childId
      } -WorkingDirectory $repoRoot).Json)
  Assert-True -Condition (Get-ArrayCount $trend -eq 7) -Message 'getWeeklyTrend must return 7 day points.'
  $first = if ((Get-ArrayCount $trend) -gt 0) { $trend[0] } else { $null }
  Assert-HasProperty -Target $first -PropertyName 'day' -Message 'weekly trend item must contain day.'
  Assert-HasProperty -Target $first -PropertyName 'points' -Message 'weekly trend item must contain points.'
}

Invoke-Case -Name 'growth.overview+timeline.return-schema' -Body {
  $overview = (Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'growth' -Params @{
      action  = 'getOverview'
      childId = $ctx.childId
    } -WorkingDirectory $repoRoot).Json
  Assert-HasProperty -Target $overview -PropertyName 'totalRecords' -Message 'growth.getOverview must contain totalRecords.'
  Assert-HasProperty -Target $overview -PropertyName 'reflectionCount' -Message 'growth.getOverview must contain reflectionCount.'

  $timeline = (Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'growth' -Params @{
      action   = 'getTimeline'
      childId  = $ctx.childId
      pageNo   = 1
      pageSize = 10
    } -WorkingDirectory $repoRoot).Json
  Assert-HasProperty -Target $timeline -PropertyName 'list' -Message 'growth.getTimeline must contain list.'
  Assert-HasProperty -Target $timeline -PropertyName 'total' -Message 'growth.getTimeline must contain total.'
}

Invoke-Case -Name 'mcp.getVerifyCode.return-schema' -Body {
  $verify = (Invoke-CloudbaseFn -EnvId $EnvId -FunctionName 'mcp' -Params @{
      action  = 'getVerifyCode'
      childId = $ctx.childId
    } -WorkingDirectory $repoRoot).Json
  Assert-HasProperty -Target $verify -PropertyName 'code' -Message 'getVerifyCode must return code.'
}

$passed = @($results | Where-Object { $_.status -eq 'passed' })
$failed = @($results | Where-Object { $_.status -eq 'failed' })

$childIdOut = if ($ctx.Keys -contains 'childId' -and $ctx['childId']) { [string]$ctx['childId'] } else { '' }
$ruleIdOut = if ($ctx.Keys -contains 'ruleId' -and $ctx['ruleId']) { [string]$ctx['ruleId'] } else { '' }
$rewardIdOut = if ($ctx.Keys -contains 'rewardId' -and $ctx['rewardId']) { [string]$ctx['rewardId'] } else { '' }
$detailsOut = @($results | ForEach-Object { $_ })

$summary = @{}
$summary['envId'] = $EnvId
$summary['totalCases'] = $results.Count
$summary['passedCases'] = $passed.Count
$summary['failedCases'] = $failed.Count
$summary['generatedAt'] = (Get-Date).ToString('s')
$summary['childId'] = $childIdOut
$summary['ruleId'] = $ruleIdOut
$summary['rewardId'] = $rewardIdOut
$summary['details'] = $detailsOut

if ([string]::IsNullOrWhiteSpace($OutputPath)) {
  $reportDir = Join-Path $repoRoot 'scripts\cloudbase\reports'
  if (-not (Test-Path $reportDir)) {
    New-Item -ItemType Directory -Path $reportDir | Out-Null
  }
  $OutputPath = Join-Path $reportDir ("functional-test-report-" + (Get-Date -Format 'yyyyMMdd-HHmmss') + ".json")
}

$outDir = Split-Path $OutputPath -Parent
if ($outDir -and -not (Test-Path $outDir)) {
  New-Item -ItemType Directory -Path $outDir | Out-Null
}

$summary | ConvertTo-Json -Depth 20 | Set-Content -Path $OutputPath -Encoding UTF8

Write-Host "==> Functional test finished"
Write-Host ("Report: " + $OutputPath)
$summary | ConvertTo-Json -Depth 10

if ($failed.Count -gt 0) {
  throw ("Functional test failed with " + $failed.Count + " case(s).")
}

