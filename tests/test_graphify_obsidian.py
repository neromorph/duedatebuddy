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
