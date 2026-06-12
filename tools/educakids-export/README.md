# EducaKids Export & Audit

Scrapling tool to export data + audit `admin.educakids.tn` for migration to Klasso.
Runs in WSL Ubuntu (Windows Smart App Control blocks lxml).

## Setup (once)
```bash
wsl bash -lc "cd /mnt/c/Users/ultra/Desktop/Projets/ecole-saas/tools/educakids-export && pip install -r requirements.txt"
cp .env.example .env   # then fill EDUCAKIDS_IDENTIFIANT / EDUCAKIDS_PASSWORD
```

## Run
```bash
# Phase 1 — discovery + audit (read-only)
wsl bash -lc "cd /mnt/c/Users/ultra/Desktop/Projets/ecole-saas/tools/educakids-export && python run.py --phase discover"

# Phase 2 — extraction (after reviewing output/audit/site-map.json)
wsl bash -lc "cd /mnt/c/Users/ultra/Desktop/Projets/ecole-saas/tools/educakids-export && python run.py --phase extract"
```

## Tests
```bash
wsl bash -lc "cd /mnt/c/Users/ultra/Desktop/Projets/ecole-saas/tools/educakids-export && pytest -v"
```
