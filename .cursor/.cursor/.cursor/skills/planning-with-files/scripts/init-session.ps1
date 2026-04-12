# Initialize planning files for a new session
# Usage: .\init-session.ps1 [project-name]
# Run from project root

param([string]$ProjectName = "project")

$DATE = Get-Date -Format "yyyy-MM-dd"
Write-Host "Initializing planning files for: $ProjectName"

if (-not (Test-Path "task_plan.md")) {
    @"
# Task Plan: [Brief Description]

## Goal
[One sentence describing the end state]

## Current Phase
Phase 1

## Phases

### Phase 1: Requirements & Discovery
- [ ] Understand user intent
- [ ] Identify constraints
- [ ] Document in findings.md
- **Status:** in_progress

### Phase 2: Planning & Structure
- [ ] Define approach
- [ ] Create project structure
- **Status:** pending

### Phase 3: Implementation
- [ ] Execute the plan
- [ ] Write to files before executing
- **Status:** pending

### Phase 4: Testing & Verification
- [ ] Verify requirements met
- [ ] Document test results
- **Status:** pending

### Phase 5: Delivery
- [ ] Review outputs
- [ ] Deliver to user
- **Status:** pending

## Decisions Made
| Decision | Rationale |
|----------|-----------|

## Errors Encountered
| Error | Resolution |
|-------|------------|
"@ | Out-File -FilePath "task_plan.md" -Encoding UTF8
    Write-Host "Created task_plan.md"
} else { Write-Host "task_plan.md exists, skipping" }

if (-not (Test-Path "findings.md")) {
    @"
# Findings & Decisions

## Requirements
-

## Research Findings
-

## Technical Decisions
| Decision | Rationale |
|----------|-----------|

## Issues Encountered
| Issue | Resolution |
|-------|------------|

## Resources
-
"@ | Out-File -FilePath "findings.md" -Encoding UTF8
    Write-Host "Created findings.md"
} else { Write-Host "findings.md exists, skipping" }

if (-not (Test-Path "progress.md")) {
    @"
# Progress Log

## Session: $DATE

### Current Status
- **Phase:** 1 - Requirements & Discovery
- **Started:** $DATE

### Actions Taken
-

### Test Results
| Test | Expected | Actual | Status |
|------|----------|--------|--------|

### Errors
| Error | Resolution |
|-------|------------|
"@ | Out-File -FilePath "progress.md" -Encoding UTF8
    Write-Host "Created progress.md"
} else { Write-Host "progress.md exists, skipping" }

Write-Host "`nPlanning files initialized: task_plan.md, findings.md, progress.md"
