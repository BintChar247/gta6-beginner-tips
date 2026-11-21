"""Merge step-by-step "fill" files into content/walkthrough.md.

Each fill file uses the walkthrough mission format:
  ### Mission Name            (optionally "### Name [Ch4]" to disambiguate by chapter)
  - step / > Tip: / ! Missable: / Unlocks: a, b / Sources: Name <url>; ...

Only missions that currently have no steps receive steps; tips, missables,
unlocks and sources are merged without duplicates.

Usage: python tools/merge_walkthrough_fill.py content/walkthrough.md fill1.md [fill2.md ...]
"""
import re
import sys


def parse_fill(path):
    out, cur = {}, None
    for raw in open(path, encoding="utf-8"):
        line = raw.strip()
        m = re.match(r"^### (.+?)\s*(?:\[(Ch\d)\])?\s*$", line)
        if m:
            cur = {"steps": [], "tips": [], "miss": [], "unlocks": [], "sources": []}
            out[(m.group(1).strip(), m.group(2))] = cur
            continue
        if not cur or not line:
            continue
        if line.startswith("- "):
            cur["steps"].append(line[2:].strip())
        elif line.startswith("> Tip:"):
            cur["tips"].append(line[6:].strip())
        elif line.startswith("! Missable:"):
            cur["miss"].append(line[11:].strip())
        elif line.startswith("Unlocks:"):
            cur["unlocks"] += [u.strip() for u in line[8:].split(",") if u.strip()]
        elif line.startswith("Sources:"):
            cur["sources"] += [s.strip() for s in line[8:].split(";") if s.strip()]
    return out


def norm(s):
    return re.sub(r"[^a-z0-9]+", "", s.lower().replace("…", "").replace("...", ""))


def main():
    wt_path, fills = sys.argv[1], sys.argv[2:]
    fill = {}
    for f in fills:
        for (name, ch), v in parse_fill(f).items():
            fill[(norm(name), ch)] = v

    lines = open(wt_path, encoding="utf-8").read().splitlines()
    out, i, chapter_no, updated, used = [], 0, None, [], set()
    while i < len(lines):
        line = lines[i]
        if line.startswith("## "):
            m = re.search(r"Chapter (\d)", line)
            chapter_no = "Ch" + m.group(1) if m else None
        m = re.match(r"^### (.+?)\s*\[(Confirmed|Reported|Unverified)\]\s*$", line)
        if not m:
            out.append(line); i += 1; continue
        # collect mission block
        block = [line]; i += 1
        while i < len(lines) and not lines[i].startswith("#"):
            block.append(lines[i]); i += 1
        key = (norm(m.group(1)), chapter_no) if (norm(m.group(1)), chapter_no) in fill else (norm(m.group(1)), None)
        f = fill.get(key)
        if not f:
            out.extend(block); continue
        used.add(key)
        who, unlocks, steps, tips, miss, sources, other = None, [], [], [], [], [], []
        for b in block[1:]:
            s = b.strip()
            if s.startswith("Who:"): who = s
            elif s.startswith("Unlocks:"): unlocks = [u.strip() for u in s[8:].split(",") if u.strip()]
            elif s.startswith("- "): steps.append(s[2:])
            elif s.startswith("> Tip:"): tips.append(s[6:].strip())
            elif s.startswith("! Missable:"): miss.append(s[11:].strip())
            elif s.startswith("Sources:"): sources = [x.strip() for x in s[8:].split(";") if x.strip()]
            elif s: other.append(b)
        if not steps and f["steps"]:
            steps = f["steps"]
        low = lambda xs: {norm(x) for x in xs}
        tips += [t for t in f["tips"] if norm(t) not in low(tips)]
        miss += [t for t in f["miss"] if norm(t) not in low(miss)]
        unlocks += [u for u in f["unlocks"] if norm(u) not in low(unlocks)]
        urls = {re.search(r"<(\S+)>", s).group(1) for s in sources if re.search(r"<(\S+)>", s)}
        for s in f["sources"]:
            u = re.search(r"<(\S+)>", s)
            if u and u.group(1) not in urls and len(sources) < 4:
                sources.append(s); urls.add(u.group(1))
        out.append(line)
        if who: out.append(who)
        if unlocks: out.append("Unlocks: " + ", ".join(unlocks))
        out += ["- " + s for s in steps] + ["> Tip: " + t for t in tips] + ["! Missable: " + t for t in miss]
        out += other
        if sources: out.append("Sources: " + "; ".join(sources))
        out.append("")
        updated.append(m.group(1))

    open(wt_path, "w", encoding="utf-8").write("\n".join(out).rstrip() + "\n")
    unmatched = [k for k in fill if k not in used]
    print(f"updated {len(updated)} missions")
    if unmatched:
        print("UNMATCHED fill entries:", unmatched)


main()
