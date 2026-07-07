import io
import json
import tempfile
import unittest
from contextlib import redirect_stdout, redirect_stderr
from pathlib import Path
from types import SimpleNamespace

import graphify_obsidian as go


class GraphifyObsidianTests(unittest.TestCase):
    def test_default_config_uses_known_vault_and_default_inbox(self):
        cfg = go.default_config()
        self.assertEqual(cfg["vault"], "/Users/mufid/personal-projects/duedatebuddy")
        self.assertEqual(cfg["base"], "~/graphify-obsidian")
        self.assertEqual(cfg["projects"], [])
        self.assertEqual(cfg["doc_collections"], [])

    def test_init_writes_explicit_source_config_only(self):
        with tempfile.TemporaryDirectory() as tmp:
            base = Path(tmp) / "graphify-obsidian"
            config = base / "config.json"
            rc = go.cmd_init(SimpleNamespace(config=config, base=base, force=False))
            self.assertEqual(rc, 0)
            data = json.loads(config.read_text())
            self.assertEqual(data["base"], str(base))
            self.assertEqual(data["projects"], [])
            self.assertEqual(data["doc_collections"], [])
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

    def test_convert_collection_rejects_inbox_inside_vault(self):
        with tempfile.TemporaryDirectory() as tmp:
            vault = Path(tmp) / "vault"
            inbox = vault / "inbox/docs/papers"  # inbox is inside vault — must reject
            inbox.mkdir(parents=True)
            (inbox / "paper.pdf").write_text("fake")
            cfg = {"vault": str(vault), "base": str(Path(tmp) / "base")}
            with self.assertRaises(ValueError) as ctx:
                go.convert_collection(cfg, {"name": "papers", "inbox": str(inbox)})
            self.assertIn("must not be inside vault", str(ctx.exception))

    def test_convert_collection_logs_error_and_continues_on_markitdown_failure(self):
        import subprocess
        with tempfile.TemporaryDirectory() as tmp:
            base = Path(tmp) / "base"
            inbox = Path(tmp) / "inbox"
            inbox.mkdir()
            (inbox / "good.pdf").write_bytes(b"fine")
            # ponytail: distinctive sentinel content to detect failure by stdin
            (inbox / "bad.pdf").write_bytes(b"MARKITDOWN_SHOULD_FAIL_SENTINEL")
            (inbox / "also-good.pdf").write_bytes(b"ok")

            def discriminating_runner(cmd, check, stdin, stdout):
                data = stdin.read()
                if b"MARKITDOWN_SHOULD_FAIL_SENTINEL" in data:
                    raise subprocess.CalledProcessError(1, cmd)
                stdout.write(b"converted")
                return SimpleNamespace(returncode=0)

            cfg = {"base": str(base)}
            made = go.convert_collection(cfg, {"name": "papers", "inbox": str(inbox)}, runner=discriminating_runner)
            log_path = go.markitdown_log_path(cfg)
            self.assertTrue(log_path.exists())
            log_text = log_path.read_text()
            self.assertIn("bad.pdf", log_text)
            self.assertTrue((base / "staging/docs/papers/good.md").exists())
            self.assertTrue((base / "staging/docs/papers/also-good.md").exists())
            self.assertFalse((base / "staging/docs/papers/bad.md").exists())

    def test_convert_collection_skips_hidden_files(self):
        with tempfile.TemporaryDirectory() as tmp:
            base = Path(tmp) / "base"
            inbox = Path(tmp) / "inbox"
            inbox.mkdir()
            (inbox / ".DS_Store").write_text("noise")
            made = go.convert_collection({"base": str(base)}, {"name": "x", "inbox": str(inbox)})
            self.assertEqual(made, [])

    def test_run_graphify_uses_output_dir(self):
        with tempfile.TemporaryDirectory() as tmp:
            calls = []
            def fake_runner(cmd, check, stdin=None, stdout=None, stderr=None):
                calls.append(cmd)
            go.run_graphify(Path("/input"), Path(tmp) / "out", runner=fake_runner)
            self.assertEqual(calls, [["graphify", "extract", "/input", "--out", str(Path(tmp) / "out")]])

    def test_cmd_run_project_runs_graphify_for_named_project(self):
        with tempfile.TemporaryDirectory() as tmp:
            app = Path(tmp) / "app"
            app.mkdir()
            (app / "a.md").write_text("hello")
            config = Path(tmp) / "config.json"
            config.write_text(json.dumps({
                "vault": str(Path(tmp) / "vault"),
                "base": str(Path(tmp) / "base"),
                "projects": [{"name": "app", "path": str(app)}],
                "doc_collections": [],
            }))
            calls = []
            go.RUNNER = lambda cmd, check, stdin=None, stdout=None, stderr=None: calls.append(cmd)
            try:
                rc = go.cmd_run(SimpleNamespace(config=config, source="app"))
            finally:
                go.RUNNER = go.subprocess.run
            self.assertEqual(rc, 0)
            self.assertEqual(calls[0][0], "graphify")
            self.assertIn("Graphify/projects/app", calls[0][-1])

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

    def test_configured_source_names_returns_projects_then_docs(self):
        cfg = {
            "projects": [{"name": "app", "path": "/app"}],
            "doc_collections": [{"name": "papers", "inbox": "/papers"}],
        }
        self.assertEqual(go.configured_source_names(cfg), ["app", "papers"])

    def test_cmd_run_skips_missing_project_path(self):
        with tempfile.TemporaryDirectory() as tmp:
            config = Path(tmp) / "config.json"
            config.write_text(json.dumps({
                "vault": str(Path(tmp) / "vault"),
                "base": str(Path(tmp) / "base"),
                "projects": [{"name": "app", "path": str(Path(tmp) / "missing")}],
                "doc_collections": [],
            }))
            err = io.StringIO()
            with redirect_stderr(err):
                rc = go.cmd_run(SimpleNamespace(config=config, source="app"))
            self.assertEqual(rc, 0)
            self.assertIn("does not exist", err.getvalue())

    def test_cmd_run_skips_missing_inbox_path(self):
        with tempfile.TemporaryDirectory() as tmp:
            config = Path(tmp) / "config.json"
            config.write_text(json.dumps({
                "vault": str(Path(tmp) / "vault"),
                "base": str(Path(tmp) / "base"),
                "projects": [],
                "doc_collections": [{"name": "papers", "inbox": str(Path(tmp) / "missing-inbox")}],
            }))
            err = io.StringIO()
            with redirect_stderr(err):
                rc = go.cmd_run(SimpleNamespace(config=config, source="papers"))
            self.assertEqual(rc, 0)
            self.assertIn("does not exist", err.getvalue())

    def test_cmd_run_skips_project_inside_vault(self):
        with tempfile.TemporaryDirectory() as tmp:
            vault = Path(tmp) / "vault"
            vault.mkdir()
            project_dir = vault / "my-project"
            project_dir.mkdir()
            (project_dir / "a.md").write_text("hello")
            config = Path(tmp) / "config.json"
            config.write_text(json.dumps({
                "vault": str(vault),
                "base": str(Path(tmp) / "base"),
                "projects": [{"name": "app", "path": str(project_dir)}],
                "doc_collections": [],
            }))
            err = io.StringIO()
            with redirect_stderr(err):
                rc = go.cmd_run(SimpleNamespace(config=config, source="app"))
            self.assertEqual(rc, 0)
            self.assertIn("inside vault", err.getvalue())

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
            go.RUNNER = lambda cmd, check, stdin=None, stdout=None, stderr=None: calls.append(cmd)
            try:
                ran = go.watch_once(config)
                skipped = go.watch_once(config)
            finally:
                go.RUNNER = go.subprocess.run
            self.assertEqual(ran, ["app"])
            self.assertEqual(skipped, [])
            self.assertEqual(len(calls), 1)

if __name__ == "__main__":
    unittest.main()
