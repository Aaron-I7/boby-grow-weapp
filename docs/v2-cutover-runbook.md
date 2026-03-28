# v2 Cutover Runbook (Clean Rebuild)

Updated: 2026-03-27

## Goal
- No legacy field compatibility.
- Build in a new CloudBase env with clean v2 schema.
- Validate first, then cutover app env.
- Keep old env read-only during observation window, then decommission.

## Default Env Resolution
- `cloudbaserc.json` default: `cloudbase-REPLACE_WITH_NEW_ENV`
- Mini program default: `miniprogram/app.js` `CUTOVER_ENV`
- Script order:
1. `-EnvId`
2. `CLOUDBASE_ENV`
3. `cloudbaserc.json` `envId`
4. fallback `cloudbase-REPLACE_WITH_NEW_ENV`

## v2 Collections
- `families`
- `users`
- `children`
- `rules`
- `tasks`
- `point_records`
- `rewards`
- `reward_requests`
- `wish_requests`
- `growth_records`
- `system_config`

Note: `system_config` stores `schemaVersion=v2` and index checklist metadata.

## Index Checklist
Create these indexes in CloudBase console:
- `children.verifyCode` (unique)
- `children.familyId + status`
- `rules.familyId + enabled`
- `tasks.childId + date + status`
- `point_records.childId + createdAt`
- `reward_requests.familyId + status`
- `wish_requests.familyId + status`

## Deploy and Seed
```powershell
.\scripts\cloudbase\deploy-cloudfunctions.ps1 -EnvId cloudbase-NEW_ENV_ID
.\scripts\cloudbase\seed-database.ps1 -EnvId cloudbase-NEW_ENV_ID
```

## Validate
```powershell
.\scripts\cloudbase\smoke-cloudfunctions.ps1 -EnvId cloudbase-NEW_ENV_ID
.\scripts\cloudbase\functional-testcases.ps1 -EnvId cloudbase-NEW_ENV_ID
```

## Cutover Steps
1. Replace `CUTOVER_ENV` in `miniprogram/app.js` with new env ID.
2. Run full real-device flow validation.
3. Observe error rate and latency.
4. Keep old env read-only for a window.
5. Decommission old env.
