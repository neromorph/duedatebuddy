# Graphify Obsidian MarkItDown Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a tiny watched workflow that converts document inboxes with MarkItDown and writes separate Graphify outputs for projects and document collections into Obsidian.

**Architecture:** A small Python CLI reads one JSON config, exposes `init`, `dry-run`, `run`, and `watch`, and shells out to Docker for MarkItDown and to installed `graphify`. State lives in `~/graphify-obsidian/state.json`; sources stay outside the vault; outputs go under `/Users/mufid/personal-projects/duedatebuddy/Graphify/`.

**Tech Stack:** Python 3 standard library only, Docker image `markitdown:latest`, installed `graphify` CLI, Docker CLI, `unittest`, JSON config/state.

## Global Constraints

- Obsidian vault path: `/Users/mufid/personal-projects/duedatebuddy`.
- Sources stay outside the vault.
- Graphs stay separate per project or document collection.
- Project sources are explicit config entries only.
- Document collections live in configured inbox folders.
- Start with a manual long-running watcher command, not a macOS service.
- No new third-party Python dependencies.
- MarkItDown runs through Docker: `docker run --rm -i markitdown:latest < input > output.md`.
- Current directory is not a git repo; skip commit steps unless a worker initializes or moves this into a repo.

---

## File Structure

- Create `graphify_obsidian.py`: one-file CLI. Keeps this small; split only if it grows.
- Create `tests/test_graphify_obsidian.py`: stdlib `unittest` tests for config, planning, conversion, state, and commands.
- Existing `docs/superpowers/specs/2026-07-06-graphify-obsidian-markitdown-integration-design.md`: source spec; do not modify unless behavior changes.

---

### Task 1: Config, Init, and Dry Run

**Files:**
- Create: `graphify_obsidian.py`
- Create: `tests/test_graphify_obsidian.py`

**Interfaces:**
- Produces: `DEFAULT_HOME: Path`, `default_config() -> dict`, `load_config(path: Path) -> dict`, `cmd_init(args: argparse.Namespace) -> int`, `cmd_dry_run(args: argparse.Namespace) -> int`.
- Later tasks consume the config shape:

```json
{
  "vault": "/Users/mufid/personal-projects/duedatebuddy",
  "base": "~/graphify-obsidian",
  "projects": [],
  "doc_collections": [
    {"name": "default", "inbox": "~/graphify-obsidian/inbox/docs/default"}
  ]
}
```

- [ ] **Step 1: Write failing tests for init and dry-run**

Create `tests/test_graphify_obsidian.py`:

```python
import io
import json
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path
from types import SimpleNamespace

import graphify_obsidian as go


class GraphifyObsidianTests(unittest.TestCase):
    def test_default_config_uses_known_vault_and_default_inbox(self):
        cfg = go.default_config()
        self.assertEqual(cfg["vault"], "/Users/mufid/personal-projects/duedatebuddy")
        self.assertEqual(cfg["base"], "~/graphify-obsidian")
        self.assertEqual(cfg["projects"], [])
        self.assertEqual(cfg["doc_collections"][0]["name"], "default")
        self.assertEqual(cfg["doc_collections"][0]["inbox"], "~/graphify-obsidian/inbox/docs/default")

    def test_init_writes_config_and_creates_default_inbox(self):
        with tempfile.TemporaryDirectory() as tmp:
            base = Path(tmp) / "graphify-obsidian"
            config = base / "config.json"
            rc = go.cmd_init(SimpleNamespace(config=config, base=base, force=False))
            self.assertEqual(rc, 0)
            data = json.loads(config.read_text())
            self.assertEqual(data["base"], str(base))
            self.assertTrue((base / "inbox/docs/default").is_dir())
            self.assertTrue((base / "staging/docs/default").is_dir())
            self.assertTrue((base / "logs").is_dir())

    def test_dry_run_prints_projects_and_doc_outputs(self):
        with tempfile.TemporaryDirectory() as tmp:
            config = Path(tmp) / "config.json"
            config.write_text(json.dumps({
                "vault": "/vault",
                "base": str(Path(tmp) / "base"),
                "projects": [{"name": "app", "path": "/src/app"}],
                "doc_collections": [{"name": "papers", "inbox": "/inbox/papers"}],
            }))
            out = io.StringIO()
            with redirect_stdout(out):
                rc = go.cmd_dry_run(SimpleNamespace(config=config))
            self.assertEqual(rc, 0)
            text = out.getvalue()
            self.assertIn("Project app: /src/app -> /vault/Graphify/projects/app", text)
            self.assertIn("Docs papers: /inbox/papers ->", text)
            self.assertIn("/vault/Graphify/docs/papers", text)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
python3 -m unittest tests/test_graphify_obsidian.py -v
```

Expected: FAIL with `ModuleNotFoundError: No module named 'graphify_obsidian'`.

- [ ] **Step 3: Implement config, init, dry-run, and CLI skeleton**

Create `graphify_obsidian.py`:

```python
#!/usr/bin/env python3
import argparse
import json
import sys
from pathlib import Path

DEFAULT_HOME = Path.home() / "graphify-obsidian"
DEFAULT_VAULT = "/Users/mufid/personal-projects/duedatebuddy"


def expand(path):
    return Path(path).expanduser()


def default_config():
    return {
        "vault": DEFAULT_VAULT,
        "base": "~/graphify-obsidian",
        "projects": [],
        "doc_collections": [
            {"name": "default", "inbox": "~/graphify-obsidian/inbox/docs/default"}
        ],
    }


def load_config(path):
    with Path(path).expanduser().open(encoding="utf-8") as f:
        return json.load(f)


def write_json(path, data):
    path = Path(path).expanduser()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def ensure_layout(cfg):
    base = expand(cfg["base"])
    (base / "logs").mkdir(parents=True, exist_ok=True)
    for collection in cfg.get("doc_collections", []):
        inbox = expand(collection["inbox"])
        staging = base / "staging/docs" / collection["name"]
        inbox.mkdir(parents=True, exist_ok=True)
        staging.mkdir(parents=True, exist_ok=True)


def cmd_init(args):
    config_path = Path(args.config).expanduser()
    if config_path.exists() and not args.force:
        print(f"Config exists: {config_path}", file=sys.stderr)
        return 1
    cfg = default_config()
    cfg["base"] = str(Path(args.base).expanduser())
    cfg["doc_collections"][0]["inbox"] = str(Path(args.base).expanduser() / "inbox/docs/default")
    ensure_layout(cfg)
    write_json(config_path, cfg)
    print(f"Wrote {config_path}")
    return 0


def cmd_dry_run(args):
    cfg = load_config(args.config)
    vault = expand(cfg["vault"])
    base = expand(cfg["base"])
    print(f"Vault: {vault}")
    print(f"Base: {base}")
    for project in cfg.get("projects", []):
        out = vault / "Graphify/projects" / project["name"]
        print(f"Project {project['name']}: {project['path']} -> {out}")
    for collection in cfg.get("doc_collections", []):
        staging = base / "staging/docs" / collection["name"]
        out = vault / "Graphify/docs" / collection["name"]
        print(f"Docs {collection['name']}: {collection['inbox']} -> {staging} -> {out}")
    return 0


def build_parser():
    parser = argparse.ArgumentParser(prog="graphify-obsidian")
    parser.add_argument("--config", type=Path, default=DEFAULT_HOME / "config.json")
    sub = parser.add_subparsers(dest="command", required=True)

    init = sub.add_parser("init")
    init.add_argument("--base", type=Path, default=DEFAULT_HOME)
    init.add_argument("--force", action="store_true")
    init.set_defaults(func=cmd_init)

    dry = sub.add_parser("dry-run")
    dry.set_defaults(func=cmd_dry_run)
    return parser


def main(argv=None):
    args = build_parser().parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
python3 -m unittest tests/test_graphify_obsidian.py -v
```

Expected: 3 tests pass.

- [ ] **Step 5: Manual smoke test**

Run:

```bash
python3 graphify_obsidian.py --config /tmp/graphify-obsidian-config.json init --base /tmp/graphify-obsidian --force
python3 graphify_obsidian.py --config /tmp/graphify-obsidian-config.json dry-run
```

Expected output includes `Vault: /Users/mufid/personal-projects/duedatebuddy` and `Docs default:`.

- [ ] **Step 6: Commit if inside a git repo**

Run:

```bash
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git add graphify_obsidian.py tests/test_graphify_obsidian.py
  git commit -m "feat: add graphify obsidian config cli"
else
  echo "skip commit: not inside a git repo"
fi
```

Expected outside this current folder: `skip commit: not inside a git repo`.

---

### Task 2: Document Conversion with MarkItDown

**Files:**
- Modify: `graphify_obsidian.py`
- Modify: `tests/test_graphify_obsidian.py`

**Interfaces:**
- Consumes: `load_config(path: Path) -> dict`, `expand(path) -> Path`.
- Produces: `convert_collection(cfg: dict, collection: dict, runner=subprocess.run) -> list[Path]`.
- Later tasks call `convert_collection` before Graphify for document collections.

- [ ] **Step 1: Add failing tests for conversion planning and subprocess calls**

Append to `GraphifyObsidianTests` in `tests/test_graphify_obsidian.py`:

```python
    def test_convert_collection_runs_markitdown_for_each_source_file(self):
        with tempfile.TemporaryDirectory() as tmp:
            base = Path(tmp) / "base"
            inbox = Path(tmp) / "inbox"
            inbox.mkdir()
            (inbox / "paper.pdf").write_text("fake pdf")
            (inbox / "note.md").write_text("already markdown")
            calls = []

            def fake_runner(cmd, check, stdin, stdout):
                calls.append(cmd)
                stdout.write(b"converted")
                return SimpleNamespace(returncode=0)

            cfg = {"base": str(base)}
            made = go.convert_collection(cfg, {"name": "papers", "inbox": str(inbox)}, runner=fake_runner)
            self.assertEqual([p.name for p in made], ["note.md", "paper.md"])
            self.assertEqual(len(calls), 1)
            self.assertEqual(calls[0], ["docker", "run", "--rm", "-i", "markitdown:latest"])
            self.assertTrue((base / "staging/docs/papers/note.md").exists())
            self.assertTrue((base / "staging/docs/papers/paper.md").exists())

    def test_convert_collection_skips_hidden_files(self):
        with tempfile.TemporaryDirectory() as tmp:
            base = Path(tmp) / "base"
            inbox = Path(tmp) / "inbox"
            inbox.mkdir()
            (inbox / ".DS_Store").write_text("noise")
            made = go.convert_collection({"base": str(base)}, {"name": "x", "inbox": str(inbox)})
            self.assertEqual(made, [])
```

- [ ] **Step 2: Run targeted tests to verify they fail**

Run:

```bash
python3 -m unittest tests.test_graphify_obsidian.GraphifyObsidianTests.test_convert_collection_runs_markitdown_for_each_source_file tests.test_graphify_obsidian.GraphifyObsidianTests.test_convert_collection_skips_hidden_files -v
```

Expected: FAIL with `AttributeError: module 'graphify_obsidian' has no attribute 'convert_collection'`.

- [ ] **Step 3: Add conversion implementation**

Modify imports at the top of `graphify_obsidian.py`:

```python
import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path
```

Add these functions before `cmd_init`:

```python

def source_files(root):
    root = expand(root)
    if not root.exists():
        return []
    return sorted(p for p in root.rglob("*") if p.is_file() and not p.name.startswith("."))


def markdown_name(path):
    return path.name if path.suffix.lower() == ".md" else f"{path.stem}.md"


def convert_collection(cfg, collection, runner=subprocess.run):
    staging = expand(cfg["base"]) / "staging/docs" / collection["name"]
    staging.mkdir(parents=True, exist_ok=True)
    made = []
    for src in source_files(collection["inbox"]):
        dest = staging / markdown_name(src)
        if src.suffix.lower() == ".md":
            shutil.copy2(src, dest)
        else:
            with src.open("rb") as stdin, dest.open("wb") as stdout:
                runner(["docker", "run", "--rm", "-i", "markitdown:latest"], check=True, stdin=stdin, stdout=stdout)
        made.append(dest)
    return sorted(made)
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
python3 -m unittest tests/test_graphify_obsidian.py -v
```

Expected: all tests pass.

- [ ] **Step 5: Manual smoke test if Docker MarkItDown image exists**

Run:

```bash
docker image inspect markitdown:latest >/dev/null || echo "markitdown:latest image missing"
mkdir -p /tmp/graphify-obsidian/inbox/docs/default
printf '# Hello\n' > /tmp/graphify-obsidian/inbox/docs/default/hello.md
python3 - <<'PY'
from pathlib import Path
import graphify_obsidian as go
cfg = {'base': '/tmp/graphify-obsidian'}
print([str(p) for p in go.convert_collection(cfg, {'name': 'default', 'inbox': '/tmp/graphify-obsidian/inbox/docs/default'})])
PY
```

Expected: printed path `/tmp/graphify-obsidian/staging/docs/default/hello.md`.

- [ ] **Step 6: Commit if inside a git repo**

Run:

```bash
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git add graphify_obsidian.py tests/test_graphify_obsidian.py
  git commit -m "feat: convert doc inboxes with markitdown"
else
  echo "skip commit: not inside a git repo"
fi
```

---

### Task 3: Run Graphify Per Source

**Files:**
- Modify: `graphify_obsidian.py`
- Modify: `tests/test_graphify_obsidian.py`

**Interfaces:**
- Consumes: `convert_collection(cfg, collection, runner) -> list[Path]`.
- Produces: `run_graphify(input_path: Path, output_path: Path, runner=subprocess.run) -> None`, `cmd_run(args: argparse.Namespace) -> int`.
- CLI contract: `python3 graphify_obsidian.py --config <config> run <source-name>`.

- [ ] **Step 1: Add failing tests for Graphify command construction and run source lookup**

Append to `GraphifyObsidianTests`:

```python
    def test_run_graphify_uses_obsidian_output(self):
        calls = []
        def fake_runner(cmd, check):
            calls.append(cmd)
        go.run_graphify(Path("/input"), Path("/vault/out"), runner=fake_runner)
        self.assertEqual(calls, [["graphify", "/input", "--obsidian", "--obsidian-dir", "/vault/out"]])

    def test_cmd_run_project_runs_graphify_for_named_project(self):
        with tempfile.TemporaryDirectory() as tmp:
            config = Path(tmp) / "config.json"
            config.write_text(json.dumps({
                "vault": str(Path(tmp) / "vault"),
                "base": str(Path(tmp) / "base"),
                "projects": [{"name": "app", "path": str(Path(tmp) / "app")}],
                "doc_collections": [],
            }))
            calls = []
            go.RUNNER = lambda cmd, check: calls.append(cmd)
            try:
                rc = go.cmd_run(SimpleNamespace(config=config, source="app"))
            finally:
                go.RUNNER = go.subprocess.run
            self.assertEqual(rc, 0)
            self.assertEqual(calls[0][0], "graphify")
            self.assertIn("Graphify/projects/app", calls[0][-1])
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
python3 -m unittest tests.test_graphify_obsidian.GraphifyObsidianTests.test_run_graphify_uses_obsidian_output tests.test_graphify_obsidian.GraphifyObsidianTests.test_cmd_run_project_runs_graphify_for_named_project -v
```

Expected: FAIL with missing `run_graphify` or `cmd_run`.

- [ ] **Step 3: Add Graphify runner and `run` command**

Add this global below imports in `graphify_obsidian.py`:

```python
RUNNER = subprocess.run
```

Add these functions before `cmd_init`:

```python

def run_graphify(input_path, output_path, runner=subprocess.run):
    output_path = expand(output_path)
    output_path.mkdir(parents=True, exist_ok=True)
    runner(["graphify", str(expand(input_path)), "--obsidian", "--obsidian-dir", str(output_path)], check=True)


def find_source(cfg, name):
    for project in cfg.get("projects", []):
        if project["name"] == name:
            return "project", project
    for collection in cfg.get("doc_collections", []):
        if collection["name"] == name:
            return "docs", collection
    return None, None
```

Add this command function after `cmd_dry_run`:

```python

def cmd_run(args):
    cfg = load_config(args.config)
    kind, item = find_source(cfg, args.source)
    if item is None:
        print(f"Unknown source: {args.source}", file=sys.stderr)
        return 1
    vault = expand(cfg["vault"])
    if kind == "project":
        run_graphify(item["path"], vault / "Graphify/projects" / item["name"], runner=RUNNER)
    else:
        convert_collection(cfg, item)
        staging = expand(cfg["base"]) / "staging/docs" / item["name"]
        run_graphify(staging, vault / "Graphify/docs" / item["name"], runner=RUNNER)
    return 0
```

Modify `build_parser()` to add the run subcommand before `return parser`:

```python
    run = sub.add_parser("run")
    run.add_argument("source")
    run.set_defaults(func=cmd_run)
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
python3 -m unittest tests/test_graphify_obsidian.py -v
```

Expected: all tests pass.

- [ ] **Step 5: Manual dry smoke test without running Graphify**

Run:

```bash
python3 graphify_obsidian.py --config /tmp/graphify-obsidian-config.json dry-run
```

Expected: still prints valid paths.

- [ ] **Step 6: Commit if inside a git repo**

Run:

```bash
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git add graphify_obsidian.py tests/test_graphify_obsidian.py
  git commit -m "feat: run graphify per configured source"
else
  echo "skip commit: not inside a git repo"
fi
```

---

### Task 4: State-Based Skipping

**Files:**
- Modify: `graphify_obsidian.py`
- Modify: `tests/test_graphify_obsidian.py`

**Interfaces:**
- Consumes: `source_files(root) -> list[Path]`, `cmd_run(args) -> int`.
- Produces: `fingerprint(path: Path) -> str`, `should_run(cfg: dict, name: str, path: Path) -> bool`, `mark_done(cfg: dict, name: str, path: Path) -> None`.
- Later watcher calls `should_run` before `cmd_run` and `mark_done` after success.

- [ ] **Step 1: Add failing state tests**

Append to `GraphifyObsidianTests`:

```python
    def test_state_skips_unchanged_folder_after_mark_done(self):
        with tempfile.TemporaryDirectory() as tmp:
            base = Path(tmp) / "base"
            src = Path(tmp) / "src"
            src.mkdir()
            (src / "a.md").write_text("one")
            cfg = {"base": str(base)}
            self.assertTrue(go.should_run(cfg, "docs", src))
            go.mark_done(cfg, "docs", src)
            self.assertFalse(go.should_run(cfg, "docs", src))
            (src / "a.md").write_text("two")
            self.assertTrue(go.should_run(cfg, "docs", src))
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
python3 -m unittest tests.test_graphify_obsidian.GraphifyObsidianTests.test_state_skips_unchanged_folder_after_mark_done -v
```

Expected: FAIL with missing `should_run`.

- [ ] **Step 3: Add state helpers**

Add import:

```python
import hashlib
```

Add these functions before `cmd_init`:

```python

def state_path(cfg):
    return expand(cfg["base"]) / "state.json"


def load_state(cfg):
    path = state_path(cfg)
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def save_state(cfg, state):
    write_json(state_path(cfg), state)


def fingerprint(path):
    path = expand(path)
    h = hashlib.sha256()
    files = source_files(path) if path.is_dir() else [path]
    for file in files:
        stat = file.stat()
        h.update(str(file.relative_to(path) if path.is_dir() else file.name).encode())
        h.update(str(stat.st_mtime_ns).encode())
        h.update(str(stat.st_size).encode())
    return h.hexdigest()


def should_run(cfg, name, path):
    state = load_state(cfg)
    return state.get(name) != fingerprint(path)


def mark_done(cfg, name, path):
    state = load_state(cfg)
    state[name] = fingerprint(path)
    save_state(cfg, state)
```

Modify `cmd_run` so it skips unchanged sources and marks successful runs. Replace its body with:

```python
    cfg = load_config(args.config)
    kind, item = find_source(cfg, args.source)
    if item is None:
        print(f"Unknown source: {args.source}", file=sys.stderr)
        return 1
    vault = expand(cfg["vault"])
    input_path = item["path"] if kind == "project" else item["inbox"]
    if not should_run(cfg, args.source, input_path):
        print(f"Skipped unchanged source: {args.source}")
        return 0
    if kind == "project":
        run_graphify(item["path"], vault / "Graphify/projects" / item["name"], runner=RUNNER)
    else:
        convert_collection(cfg, item)
        staging = expand(cfg["base"]) / "staging/docs" / item["name"]
        run_graphify(staging, vault / "Graphify/docs" / item["name"], runner=RUNNER)
    mark_done(cfg, args.source, input_path)
    return 0
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
python3 -m unittest tests/test_graphify_obsidian.py -v
```

Expected: all tests pass.

- [ ] **Step 5: Commit if inside a git repo**

Run:

```bash
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git add graphify_obsidian.py tests/test_graphify_obsidian.py
  git commit -m "feat: skip unchanged graphify sources"
else
  echo "skip commit: not inside a git repo"
fi
```

---

### Task 5: Polling Watcher

**Files:**
- Modify: `graphify_obsidian.py`
- Modify: `tests/test_graphify_obsidian.py`

**Interfaces:**
- Consumes: `find_source`, `should_run`, `cmd_run`.
- Produces: `configured_source_names(cfg: dict) -> list[str]`, `watch_once(config_path: Path) -> list[str]`, `cmd_watch(args: argparse.Namespace) -> int`.
- CLI contract: `python3 graphify_obsidian.py --config <config> watch --interval 5`.

- [ ] **Step 1: Add failing watcher tests**

Append to `GraphifyObsidianTests`:

```python
    def test_configured_source_names_returns_projects_then_docs(self):
        cfg = {
            "projects": [{"name": "app", "path": "/app"}],
            "doc_collections": [{"name": "papers", "inbox": "/papers"}],
        }
        self.assertEqual(go.configured_source_names(cfg), ["app", "papers"])

    def test_watch_once_runs_only_changed_sources(self):
        with tempfile.TemporaryDirectory() as tmp:
            base = Path(tmp) / "base"
            app = Path(tmp) / "app"
            app.mkdir()
            (app / "a.py").write_text("print(1)")
            config = Path(tmp) / "config.json"
            config.write_text(json.dumps({
                "vault": str(Path(tmp) / "vault"),
                "base": str(base),
                "projects": [{"name": "app", "path": str(app)}],
                "doc_collections": [],
            }))
            calls = []
            go.RUNNER = lambda cmd, check: calls.append(cmd)
            try:
                ran = go.watch_once(config)
                skipped = go.watch_once(config)
            finally:
                go.RUNNER = go.subprocess.run
            self.assertEqual(ran, ["app"])
            self.assertEqual(skipped, [])
            self.assertEqual(len(calls), 1)
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
python3 -m unittest tests.test_graphify_obsidian.GraphifyObsidianTests.test_configured_source_names_returns_projects_then_docs tests.test_graphify_obsidian.GraphifyObsidianTests.test_watch_once_runs_only_changed_sources -v
```

Expected: FAIL with missing watcher functions.

- [ ] **Step 3: Implement watcher**

Add import:

```python
import time
```

Add functions after `cmd_run`:

```python

def configured_source_names(cfg):
    return [p["name"] for p in cfg.get("projects", [])] + [c["name"] for c in cfg.get("doc_collections", [])]


def watch_once(config_path):
    cfg = load_config(config_path)
    ran = []
    for name in configured_source_names(cfg):
        kind, item = find_source(cfg, name)
        input_path = item["path"] if kind == "project" else item["inbox"]
        if should_run(cfg, name, input_path):
            rc = cmd_run(SimpleNamespace(config=config_path, source=name))
            if rc == 0:
                ran.append(name)
    return ran
```

Because `watch_once` uses `SimpleNamespace`, add import:

```python
from types import SimpleNamespace
```

Add `cmd_watch` after `watch_once`:

```python

def cmd_watch(args):
    print(f"Watching configured sources every {args.interval}s. Press Ctrl-C to stop.")
    try:
        while True:
            ran = watch_once(args.config)
            for name in ran:
                print(f"Updated {name}")
            time.sleep(args.interval)
    except KeyboardInterrupt:
        print("Stopped")
        return 0
```

Modify `build_parser()` to add the watch subcommand before `return parser`:

```python
    watch = sub.add_parser("watch")
    watch.add_argument("--interval", type=int, default=5)
    watch.set_defaults(func=cmd_watch)
```

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
python3 -m unittest tests/test_graphify_obsidian.py -v
```

Expected: all tests pass.

- [ ] **Step 5: Manual smoke test**

Run:

```bash
python3 graphify_obsidian.py --config /tmp/graphify-obsidian-config.json dry-run
python3 graphify_obsidian.py --config /tmp/graphify-obsidian-config.json watch --interval 10
```

Expected: watcher prints `Watching configured sources every 10s`; stop with Ctrl-C and expect `Stopped`.

- [ ] **Step 6: Commit if inside a git repo**

Run:

```bash
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git add graphify_obsidian.py tests/test_graphify_obsidian.py
  git commit -m "feat: watch configured graphify sources"
else
  echo "skip commit: not inside a git repo"
fi
```

---

## Final Verification

- [ ] Run the full test suite:

```bash
python3 -m unittest tests/test_graphify_obsidian.py -v
```

Expected: all tests pass.

- [ ] Verify installed tools are visible:

```bash
command -v graphify
docker image inspect markitdown:latest >/dev/null && echo markitdown:latest
```

Expected: `graphify` prints a path. Docker image check prints `markitdown:latest`; if missing, build or pull that image before running document conversion.

- [ ] Initialize real config:

```bash
python3 graphify_obsidian.py init --force
python3 graphify_obsidian.py dry-run
```

Expected: creates `~/graphify-obsidian/config.json`, inbox/staging/log folders, and prints vault outputs under `/Users/mufid/personal-projects/duedatebuddy/Graphify/`.

- [ ] Add one real project manually to `~/graphify-obsidian/config.json`:

```json
{
  "name": "markitdown",
  "path": "/Users/mufid/personal-projects/markitdown"
}
```

Expected: `dry-run` shows `Project markitdown: /Users/mufid/personal-projects/markitdown -> /Users/mufid/personal-projects/duedatebuddy/Graphify/projects/markitdown`.

- [ ] Run one real source only when ready:

```bash
python3 graphify_obsidian.py run markitdown
```

Expected: Graphify writes output into `/Users/mufid/personal-projects/duedatebuddy/Graphify/projects/markitdown`.

## Self-Review

- Spec coverage: config, outside sources, separate project/doc outputs, MarkItDown staging, Graphify Obsidian output, watcher, state skip, and manual command are covered.
- Placeholder scan: no TBD/TODO/implement-later placeholders remain.
- Type consistency: config keys, function names, and command names are consistent across tasks.
- Scope check: no Obsidian plugin, dashboard, combined graph, LaunchAgent, or auto-discovery included.
