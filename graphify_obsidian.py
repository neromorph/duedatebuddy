#!/usr/bin/env python3
import argparse
import json
import shutil
import subprocess
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
