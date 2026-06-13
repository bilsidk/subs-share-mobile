# SubsShare AI Workspace

## Quick Reference
- **App type:** React Native 0.85.3 — Android + iOS
- **Backend:** Railway → `https://subs-share-backend-production.up.railway.app`
- **Owner email:** bilsidk@gmail.com
- **Languages:** 15 (en, ar, fr, es, pt, tr, id, hi, ru, de, zh-CN, zh-TW, bn, ja, ko)

## Project Memory (load as needed)
| File | When to load |
|---|---|
| `repository-map.md` | Finding files, understanding structure |
| `architecture.md` | Any architectural change, understanding data flow |
| `api-contracts.md` | Any API integration work |
| `business-rules.md` | Feature decisions, coin economy, verification rules |
| `coding-standards.md` | Code review, new feature implementation |
| `technical-debt.md` | Bug investigation, refactoring |
| `roadmap.md` | Sprint planning, prioritization |
| `feature-registry.md` | Checking what's shipped vs planned |

## Agent Memory (load as needed)
| File | When to load |
|---|---|
| `agents/architect-memory.md` | ADRs, architectural constraints |
| `agents/frontend-memory.md` | Component patterns, theme, screen data loading |
| `agents/backend-memory.md` | API error codes, data models, pricing sync |
| `agents/qa-memory.md` | Testing strategy, fragile areas |
| `agents/reviewer-memory.md` | Code review checklist |
| `agents/pm-memory.md` | Feature planning, acceptance criteria |

## Workflow for Every Request
1. PM: Analyze request, identify affected features/rules
2. Architect: Validate approach, check constraints
3. Load only relevant memory files
4. Implement with correct patterns (coding-standards.md)
5. Reviewer: Verify against checklist
6. Update technical-debt.md if new issues found
