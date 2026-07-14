# AGENTS.md

Project instructions for AI agents working in this repository.

---

# Primary Goal

Keep implementation, documentation, and project knowledge synchronized.

Always prefer making decisions from:

1. Current source code
2. Project documentation
3. Official library documentation
4. Imported external references

Do not invent APIs or assume behavior.

---

# Official Documentation

Before modifying code that depends on external libraries or frameworks:

1. Resolve the library using Context7.
2. Read the relevant official documentation.
3. Never rely solely on model memory for:
   - APIs
   - CLI flags
   - configuration
   - migrations
   - setup steps
   - breaking changes

For Expo development, always consult:

<https://docs.expo.dev/llms.txt>

Use it together with Context7 before changing:

- Expo
- Expo Router
- React Native
- Expo Modules
- Metro
- EAS
- Notifications

---

# Project Knowledge Base

The project knowledge base is an Obsidian vault.

`/Users/mufid/personal-projects/duedatebuddy`

Treat it as the long-term memory of the project.

## Human-written Knowledge

Prefer storing:

- Architecture
- ADRs
- Feature design
- Roadmaps
- TODOs
- Bug investigations
- Meeting notes
- Sprint notes
- Development decisions

These files are the primary project memory.

---

# External Knowledge Import Workflow

External references should never be placed directly into the vault.

Always use this workflow:

```
Official docs ─┐
PDF ──────────┤
Website ──────┤
Word ─────────┤
Meeting trans.┤
YouTube trans.┘
        │
        ▼
    MarkItDown
        │
        ▼
    Markdown
        │
        ▼
    Graphify
        │
        ▼
    Obsidian
```

---

## Step 1 — Convert

Normalize external documents into Markdown using Docker MarkItDown.

```bash
docker run --rm -i markitdown:latest < input > output.md
```

### Examples to convert

- PDF
- DOCX
- PPTX
- HTML
- Meeting transcripts
- YouTube transcripts

### Do not convert

- Source code
- JSON
- YAML
- SQL
- Existing Markdown

---

## Step 2 — Graphify

After importing Markdown, extract semantic relationships.

Graphify is intended for:

- Documentation indexing
- Concept relationships
- Semantic search
- AI retrieval

Use Graphify 0.9.x syntax:

```bash
graphify extract INPUT --out OUTPUT
```

Store outputs separately:

- `Graphify/docs/<source-name>`
- `Graphify/projects/<feature-name>`

> Do not overwrite previous extractions unless intentionally refreshing them.

### Graphify Wrapper

Prefer the wrapper instead of calling Graphify directly.

```bash
python3 graphify_obsidian.py dry-run
python3 graphify_obsidian.py run <source-name>
python3 graphify_obsidian.py watch --interval 30
```

---

## Step 3 — Obsidian

Obsidian is the authoritative project knowledge base.

Store:

- Architecture
- Implementation notes
- Design rationale
- Bug analysis
- Feature documentation
- Retrospectives

Update notes whenever a feature, architecture, or workflow changes significantly.

---

## When to Use Each Tool

### Context7

Use when:

- Writing code
- Upgrading dependencies
- Checking APIs
- Framework configuration

### MarkItDown

Use when:

- Importing external documentation
- Converting PDFs, DOCX, websites, transcripts

> Run once per document.

### Graphify

Use when:

- New documentation has been imported
- Major feature documentation is completed
- Architecture documentation changes
- Preparing long-term searchable knowledge

> Do not run after every commit. Run only when meaningful knowledge has been added.

### Obsidian

Use continuously.

Maintain notes for:

- Requirements
- Architecture
- Feature planning
- Bugs
- Implementation decisions
- Project roadmap

This is the project's permanent memory.

---

## AI Agent Decision Order

When answering questions or making implementation decisions, prefer information in this order:

1. Current source code
2. Project documentation in Obsidian
3. Context7 official documentation
4. Graphify semantic knowledge
5. Imported Markdown references

Always prefer actual implementation over documentation if they differ.

---

## Security

Never expose:

- API keys
- Access tokens
- Secrets
- Passwords
- Credentials

Keep secrets only in runtime environment variables.

If a local `.env` is required:

- Keep it gitignored
- Never commit it
- Never print its contents

---

## Documentation Maintenance

Whenever a significant feature or architectural change is completed:

1. Update the relevant Obsidian note
2. Update architecture documentation if needed
3. Add implementation notes if useful
4. Regenerate Graphify only if the knowledge graph should change

The goal is to keep the project's second brain accurate without generating unnecessary noise.

## Logging & Error Handling

All new features must use the centralized logging and error handling system.

Requirements:

- Never use console.log() directly.
- Never ignore caught exceptions.
- Never expose internal errors to users.
- All runtime errors must be logged through lib/logger.ts.
- All Supabase responses must use the shared helper utilities.
- Validation errors must remain separate from runtime errors.
- New code should not duplicate existing error handling logic.
- Keep the architecture ready for future Sentry integration without coupling feature code to Sentry APIs.

## Subagent Workflow

Use subagents to keep work focused, reduce context waste, and improve implementation quality.

Default workflow for non-trivial tasks:

1. Use `scout` when the codebase area is unclear.
2. Use `planner` before large or risky implementation.
3. Use `worker` only after the plan is clear.
4. Use `reviewer` after implementation.
5. Use `oracle` only for risky decisions, architecture tradeoffs, or hard bugs.
6. Use `researcher` only when current external docs or recent platform behavior must be verified.

For simple changes, do not overuse subagents. Implement directly, then run tests.

## Recommended Project Flow

For feature work:

`scout -> planner -> worker -> reviewer -> worker fixes`

For bug fixing:

`scout -> oracle if hard -> worker -> reviewer`

For refactor:

`scout -> planner -> worker -> parallel reviewers`

For logging/error handling/security-sensitive changes:

`planner -> worker -> reviewer -> oracle if reviewer finds architectural risk`

## Built-in Role Usage

### scout
Use for fast codebase reconnaissance.

Expected output:
- relevant files
- current flow
- risks
- where implementation should start

Do not edit code.

### planner
Use for implementation planning.

Expected output:
- step-by-step plan
- files to modify
- risks
- validation steps

Do not edit code.

### worker
Use for implementation.

Rules:
- follow the approved plan
- avoid unrelated changes
- do not guess on product decisions
- keep code simple
- run available validation commands
- summarize changed files

### reviewer
Use after implementation.

Review for:
- correctness
- TypeScript issues
- Supabase RLS/data access risks
- Expo/React Native issues
- notification behavior
- error handling
- unnecessary complexity
- missing tests or validation

Small safe fixes may be applied. Larger changes should be reported first.

### oracle
Use only for:
- hard bugs
- architecture decisions
- security-sensitive decisions
- database/RLS design
- notification delivery design
- conflicting reviewer opinions

Oracle should challenge assumptions and recommend the safest next move.

### researcher
Use only when external facts must be current.

Examples:
- Expo SDK behavior
- EAS Build behavior
- Supabase Edge Functions/Cron
- expo-notifications limitations
- Play Store policy

Prefer official documentation.

## Review Requirement

After every non-trivial implementation, run a reviewer subagent before final summary.

For important changes, run parallel reviewers:
- correctness
- tests/validation
- simplicity/cleanup

Apply only feedback that clearly improves the project.

## Source of Truth Clarification

The source code is the source of truth for actual implementation.

Obsidian is the source of truth for project knowledge, decisions, architecture notes, and long-term memory.

If source code and documentation conflict:
1. Trust the source code for current behavior.
2. Update the documentation to match reality.
3. If the code appears wrong, propose a fix before changing architecture.

## Validation Commands

Before finalizing non-trivial changes, run available validation commands:

- npm run lint
- npm run typecheck
- npm test
- npx expo-doctor

If a command is unavailable, report it instead of inventing one.

## Expo / React Native Constraints

- Prefer Expo managed workflow.
- Do not add native Android/iOS code unless absolutely necessary.
- Do not install native modules without checking Expo compatibility first.
- Use official Expo documentation for Expo Router, EAS, notifications, and config changes.
- Test notification behavior in a development build or production APK, not only Expo Go.

## CI/CD Pipeline

Android preview builds are automated via `.github/workflows/eas-build.yml`.

Triggers:
- **Pull requests**: Builds preview APK automatically
- **`*-preview` tags**: e.g., `0.1.0-preview` triggers a preview build
- **Manual dispatch**: Via GitHub Actions UI

Secrets required (set in GitHub repo settings):
- `EXPO_TOKEN`: EAS access token from https://expo.dev/settings/access-tokens

Build command: `eas build --platform android --profile preview --non-interactive --no-wait`

## Versioning & Releases

**Never create a release tag, version bump, or trigger a build without explicit user confirmation.** Versioning is a product decision, not an implementation detail.

When the user asks for a release, confirm the following before acting:
- The target version number (semver: `MAJOR.MINOR.PATCH`)
- Which profile (`preview`, `production`)
- Which commit/version to tag
- Whether the build should be triggered or only the tag created

The current `app.json` `version` field is the source of truth for app version. `eas.json` has `appVersionSource: "remote"`; EAS manages the actual installed version.

Tag conventions:
- `vX.Y.Z-preview` → triggers the `*-preview` workflow → preview APK
- `vX.Y.Z` (non-preview) → tag only, no workflow (production builds must be triggered manually via `eas build --platform android --profile production` until a production workflow is added)

Never push tags with `-f` (force) to overwrite an existing release tag. Create a new tag instead.

---

## External Reference Storage

Do not mix raw imported documents with human-written project notes.

Use:

- references/raw/ for original external files if needed
- references/markdown/ for converted Markdown
- Graphify/docs/ for extracted semantic knowledge
- Obsidian notes for human-written summaries and decisions

Before running Graphify or MarkItDown, verify the actual installed CLI syntax.