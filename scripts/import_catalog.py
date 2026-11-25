"""Importação reproduzível de fontes públicas. Conteúdo remoto nunca é executado."""
import concurrent.futures
import csv
import hashlib
import io
import json
import pathlib
import re
import subprocess
import unicodedata
import urllib.request
from datetime import datetime, timezone

ROOT = pathlib.Path(__file__).resolve().parent.parent
CACHE = ROOT / ".cache"
DATA = ROOT / "data"
CACHE.mkdir(exist_ok=True)
DATA.mkdir(exist_ok=True)
csv.field_size_limit(10000000)
records = []
sources = []
seen = {}


def fetch(url):
    target = CACHE / (hashlib.sha256(url.encode()).hexdigest() + ".txt")
    if not target.exists():
        request = urllib.request.Request(url, headers={"User-Agent": "Atalho-Catalog/1.0"})
        try:
            body = urllib.request.urlopen(request, timeout=120).read()
        except Exception:
            body = subprocess.check_output(["node", "--input-type=module", "-e",
                "const r=await fetch(process.argv[1]);if(!r.ok)throw Error(r.status);process.stdout.write(await r.text())", url], timeout=150)
        target.write_bytes(body)
    return target.read_text()


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()).strip("-")[:70]


def add(source, key, title, body, category, **extra):
    body = body.strip()
    if not body:
        return False
    digest = hashlib.sha256(re.sub(r"\s+", " ", body).lower().encode()).hexdigest()
    provenance = {"source": source, "url": extra.pop("url", "")}
    if digest in seen:
        existing = records[seen[digest]]
        if provenance not in existing["origins"]:
            existing["origins"].append(provenance)
        return False
    seen[digest] = len(records)
    records.append(dict(id=f"{source}-{key}", title=title, prompt=body, category=category,
        shortcut=extra.pop("shortcut", "/" + (slug(title) or str(key))),
        origins=[provenance], **extra))
    return True


def source(id, name, url, model, announced=None):
    d = dict(id=id, name=name, url=url, model=model, announced=announced, imported=0, extracted=0)
    sources.append(d)
    return d


def category(title, dev=False, image=False):
    t = title.lower()
    if image:
        return "imagens"
    if dev or re.search(r"code|program|develop|software|javascript|python|sql|linux|debug|engineer|api\b|react|database|terminal", t):
        return "programacao"
    if re.search(r"teach|learn|stud|tutor|exam|quiz|math|research|science|history|language|education|lesson|professor", t):
        return "estudos"
    if re.search(r"business|market|sales|financ|entrepreneur|startup|manager|product|recruit|career|invest|consult|brand|customer|seo|strategy|advertis", t):
        return "negocios"
    return "escrita"


def main():
    curated = json.loads((ROOT / "scripts/curated.json").read_text())
    s = source("editorial", "Atalho · seleção editorial", "", "ChatGPT")
    for item in curated:
        add("editorial", item["shortcut"][1:], item["title"], item["prompt"], item["category"],
            shortcut=item["shortcut"], description=item["description"], language="pt", featured=True)
    s["extracted"] = len(curated)

    s = source("maestro", "Mestre dos Prompts", "https://codigos.maestroprompts.chatgpt.site/", "ChatGPT", 300)
    raw = json.loads(fetch(s["url"] + "data.json?v=300-20261031"))
    for cat in raw["categories"]:
        for item in cat["items"]:
            body = item.get("prompt") or f"Use a imagem enviada como referência, se houver. Aplique o atalho personalizado {item['code']}: {item['description']} Preserve as características reconhecíveis do assunto principal. Defina uma composição intencional, iluminação coerente e detalhes naturais. Entregue a imagem final em {item.get('format', '4:5')}, sem marca-d’água."
            number = item["number"]
            # Thumbs presentes em thumbs/ têm prioridade sobre o hotlink da fonte.
            local_thumb = ROOT / "thumbs" / f"maestro-{number}.webp"
            image = (f"thumbs/maestro-{number}.webp" if local_thumb.exists()
                     else s["url"]+"assets/thumbs/"+str(number)+".webp?v=300")
            add("maestro", number, item["description"].rstrip("."), body, "imagens",
                shortcut=item["code"], description=cat["name"], language="pt",
                image=image,
                url=s["url"], featured=item["code"] in ["/albumcover", "/editorial", "/goldenhour", "/cinematic", "/product"])
            s["extracted"] += 1
    print("Mestre: dados importados", flush=True)

    s = source("prompts-chat", "prompts.chat", "https://github.com/f/prompts.chat", "ChatGPT")
    text = fetch("https://raw.githubusercontent.com/f/prompts.chat/main/prompts.csv")
    for n, row in enumerate(csv.DictReader(io.StringIO(text))):
        add(s["id"], n, row["act"], row["prompt"],
            category(row["act"], row.get("for_devs", "").lower() == "true", row.get("type") == "IMAGE"),
            description=row["prompt"][:180], language="original",
            url=s["url"]+"/blob/main/prompts.csv")
        s["extracted"] += 1
    print("prompts.chat: dados importados", flush=True)

    # As categorias YouMind se sobrepõem: deduplicar por ID antes de contar.
    for sid, repo, label, model, announced in [
        ("youmind-gpt", "gpt-image-2-prompts-search", "YouMind · GPT Image 2", "GPT Image 2", 18144),
        ("youmind-nano", "nano-banana-pro-prompts-recommend-skill", "YouMind · Nano Banana Pro", "Nano Banana Pro", 15860),
    ]:
        base = f"https://raw.githubusercontent.com/YouMind-OpenLab/{repo}/main/references/"
        s = source(sid, label, f"https://github.com/YouMind-OpenLab/{repo}", model, announced)
        manifest = json.loads(fetch(base+"manifest.json"))
        s["manifestTotal"] = manifest.get("totalPrompts")
        files = [c["file"] for c in manifest["categories"]]
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
            groups = list(pool.map(lambda f: (f, json.loads(fetch(base+f))), files))
        ids = set()
        for filename, rows in groups:
            for item in rows:
                if str(item["id"]) in ids:
                    continue
                ids.add(str(item["id"]))
                add(sid, item["id"], item["title"], item.get("content", ""), "imagens",
                    description=item.get("description", "")[:180], language="original",
                    image=next((u for u in item.get("sourceMedia", []) if u.startswith("https://")), ""),
                    reference=item.get("needReferenceImages", False),
                    url=s["url"]+"/blob/main/references/"+filename)
        s["extracted"] = len(ids)
        print(label, "IDs únicos disponíveis:", len(ids), flush=True)

    for sid, repo, file, heading in [
        ("gpt4o", "jamez-bondos/awesome-gpt4o-images", "README_en.md", r"^### Case \d+:[^\n]*"),
        ("imgedify", "ImgEdify/Awesome-GPT4o-Image-Prompts", "README.md", r"^### (?!Table of Contents)[^\n]+"),
        ("pixmind", "Pixmind-io/awesome-gpt-image-2-prompts", "README.md", r"^### \d+\.[^\n]+"),
    ]:
        branch = "master" if sid == "pixmind" else "main"
        s = source(sid, {"gpt4o":"Awesome GPT-4o Images","imgedify":"ImgEdify","pixmind":"Pixmind"}[sid], f"https://github.com/{repo}", "GPT Image 2" if sid == "pixmind" else "GPT-4o")
        text = fetch(f"https://raw.githubusercontent.com/{repo}/{branch}/{file}")
        matches = list(re.finditer(heading, text, re.M))
        for n, match in enumerate(matches):
            section = text[match.end():matches[n+1].start() if n+1<len(matches) else len(text)]
            blocks = re.findall(r"```[^\n]*\n(.*?)```", section, re.S)
            if sid == "imgedify":
                blocks = re.findall(r"\*\*Prompt Text:\*\*\s*`(.*?)`", section, re.S)
            if not blocks:
                blocks = ["\n".join(re.findall(r"^>\s?(.*)$", section, re.M))]
            body = "\n\n".join(b.strip() for b in blocks if b.strip())
            if not body:
                continue
            title = re.sub(r"\[([^]]+)\]\([^)]*\)", r"\1", match.group().lstrip("# "))
            title = re.sub(r"^(Case )?\d+[.:]\s*", "", title)
            add(sid, n, title, body, "imagens", language="original", url=s["url"]+"/blob/"+branch+"/"+file)
            s["extracted"] += 1

    s = source("instagram", "Instagram · @poderartificial", "https://www.instagram.com/p/DdIxjB1SSoF/", "ChatGPT", 20)
    for item in json.loads((ROOT/"scripts/instagram.json").read_text()):
        add("instagram", item["code"], item["title"], item["prompt"], item["category"],
            shortcut="/"+item["code"], description="Adaptado da instrução curta publicada por @poderartificial.",
            language="pt", url=s["url"])
        s["extracted"] += 1

    # Preserve a origem mesmo quando o mesmo texto aparece em múltiplas coleções.
    for s in sources:
        s["imported"] = sum(any(o["source"] == s["id"] for o in r["origins"]) for r in records)
    records.sort(key=lambda r: (r["shortcut"] != "/albumcover", not r.get("featured", False), r.get("language") != "pt"))
    index = []
    for start in range(0, len(records), 200):
        chunk = records[start:start+200]
        chunk_id = start//200
        (DATA/f"prompts-{chunk_id}.json").write_text(json.dumps({r["id"]:r["prompt"] for r in chunk}, ensure_ascii=False, separators=(",", ":")))
        for r in chunk:
            entry = {k:v for k,v in r.items() if k != "prompt"}
            entry["chunk"] = chunk_id
            entry["searchTerms"] = " ".join(re.findall(r"[A-Za-zÀ-ÿ]{4,}", r["prompt"][:500]))[:240]
            index.append(entry)
    (DATA/"index.json").write_text(json.dumps(index, ensure_ascii=False, separators=(",", ":")))
    meta = dict(updatedAt=datetime.now(timezone.utc).isoformat(), total=len(records), sources=sources,
        categories={c:sum(r["category"] == c for r in records) for c in ["imagens","escrita","estudos","programacao","negocios"]},
        methodology="Registros com texto não vazio; IDs YouMind deduplicados entre categorias e textos normalizados deduplicados entre todas as fontes. Importação verificada não significa eficácia testada. Textos internacionais preservados no idioma disponibilizado pela fonte.")
    (DATA/"meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2))
    print(json.dumps(meta, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
