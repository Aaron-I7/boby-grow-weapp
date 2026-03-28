# API v2 (Clean Rebuild)

Updated: 2026-03-27

## user actions
- `login`
- `getFamily`
- `createFamily`
- `joinFamily`
- `getChildren`
- `addChild`
- `editChild`
- `getChildDetail`
- `getCoadmins`
- `addCoadmin`
- `removeCoadmin`
- `updateDailyLimit`
- `setFamilyMode` (new in v2)
- `getProfile`
- `updateProfile`

## task actions
- `getRules`
- `createRule` (v2 fields)
  - `purposeText`
  - `choiceOptions`
  - `reflectionRequired`
  - `intrinsicTag`
- `updateRule` (supports v2 fields)
- `toggleRule`
- `getTasks`
- `completeTask`
- `submitTask` (v2 field `reflection`)
- `auditTask` (v2 fields `feedbackType`, `feedbackText`, `grantPoints`)
- `getTaskCompletionOverview`
- `getTaskCompletionTimeline`
- `getTaskCompletionCluster`

## point actions
- `getRecords`
- `adjustPoints`
- `getWeeklyTrend`
- `getRewards`
- `createReward` (v2 fields)
  - `rewardType` (`experience|relationship|material`)
  - `weeklyQuota`
  - `cooldownDays`
  - `requiresReason`
- `getRewardRequests`
- `redeemReward` (v2 field `reason`)
- `auditRedeem`
- `getWishRequests`
- `submitWish`
- `auditWish`

## growth actions (new cloud function)
- `getOverview`
- `getTimeline`

## mcp actions
- `getVerifyCode`

## Compatibility
- Existing action names are kept to reduce frontend change cost.
- Legacy fallback and dual-write logic are removed.
- Old data schema is not compatible with v2 semantics.
