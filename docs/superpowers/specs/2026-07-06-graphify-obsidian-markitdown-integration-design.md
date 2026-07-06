# Graphify + Obsidian + MarkItDown Integration Design

## Goal

Create one watched workflow that keeps source files outside the Obsidian vault, converts document collections with MarkItDown, and writes separate Graphify outputs into the vault.

## Decisions

- Obsidian vault: `/Users/mufid/personal-projects/duedatebuddy`
- Sources stay outside the vault.
- Graphs stay separate per project or document collection.
- Project sources are explicit config entries only.
- Document collections live in configured inbox folders.
- Start with a manual long-running watcher command, not a macOS service.

## Folder Layout

```text
~/Documents/Obsidian Vault/
  Graphify/
    projects/
      <project-name>/
    docs/
      <collection-name>/

~/graphify-obsidian/
  config.json
  inbox/
    docs/
      <collection-name>/
  staging/
    docs/
      <collection-name>/
  state.json
  logs/
```

## Configuration

A single config file defines:

- vault path
- explicit project source paths
- document inbox collections
- staging path
- output folders under the vault

Project entries map a source path to `Graphify/projects/<project-name>/`.
Document collection entries map an inbox folder to staging and then to `Graphify/docs/<collection-name>/`.

## Data Flow

### Projects

1. User adds a project path to the config.
2. Watcher observes that path.
3. On change, watcher runs Graphify for that project.
4. Graphify writes Obsidian output to:
   `/Users/mufid/personal-projects/duedatebuddy/Graphify/projects/<project-name>/`

### Documents

1. User drops files into `~/graphify-obsidian/inbox/docs/<collection-name>/`.
2. Watcher sees changes.
3. MarkItDown converts supported files into Markdown under `~/graphify-obsidian/staging/docs/<collection-name>/`.
4. Graphify reads the staging folder.
5. Graphify writes Obsidian output to:
   `/Users/mufid/personal-projects/duedatebuddy/Graphify/docs/<collection-name>/`

## Watcher Behavior

- Watch only configured project paths and document inbox folders.
- Debounce filesystem changes before processing.
- Process one source at a time to avoid overlapping Graphify writes.
- Track processed mtimes or hashes in `state.json`.
- Skip unchanged sources.
- Log failed conversions and graph runs.
- Never delete source files.
- Write document conversions to staging before running Graphify.

The initial command should be a manual long-running process:

```bash
graphify-obsidian watch
```

A future macOS LaunchAgent can start it automatically if manual startup becomes annoying.

## Commands

Minimum useful commands:

```bash
graphify-obsidian init

graphify-obsidian dry-run

graphify-obsidian watch

graphify-obsidian run <source-name>
```

`dry-run` prints watched paths, staging paths, and vault outputs without running MarkItDown or Graphify.

## Error Handling

- Missing vault path: fail fast with a clear message.
- Missing source path: log and skip that source.
- MarkItDown conversion failure: log the file and continue with other files.
- Graphify failure: log the source and keep prior vault output untouched.
- Concurrent change during processing: schedule one follow-up run after the current run finishes.

## Testing

Small checks are enough:

1. `dry-run` shows expected watched paths and outputs.
2. One sample project writes Graphify output into the vault.
3. One sample document converts through MarkItDown into staging and writes Graphify output into the vault.
4. Re-running with no changes skips work.
5. Editing one file triggers only that source.

## Out of Scope

- Obsidian plugin
- dashboard
- combined graph
- automatic deletion/cleanup
- macOS LaunchAgent
- project auto-discovery

Add these only when the manual watcher proves too limited.
