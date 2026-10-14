#!/usr/bin/env python3
"""Carga la demo del proceso de pareja ($3.000) en el Supabase en la nube vinculado.

1. Crea los usuarios de demo con la API de Auth (service role), con los mismos UUID que en local
   y una contraseña aleatoria fuerte por usuario.
2. Guarda las credenciales en credenciales-demo.local.txt (fuera de git, permisos 600).
3. Ejecuta los seeds compartidos con `supabase db query --linked`.

Uso: python3 scripts/seed_remote_demo.py   (requiere .env.local y `supabase link` hecho)
"""
import json
import os
import secrets
import string
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CREDS = ROOT / "credenciales-demo.local.txt"
SEEDS = ["01_staff_roles.sql", "10_service_pareja_3000.sql", "20_demo_pareja.sql"]
USERS = [
    ("a0000000-0000-4000-8000-000000000001", "admin@example.com", "Admin CEP"),
    ("a0000000-0000-4000-8000-000000000002", "emilia@example.com", "Emilia"),
    ("a0000000-0000-4000-8000-000000000003", "psicologa@example.com", "Psicóloga del equipo"),
    ("a0000000-0000-4000-8000-000000000004", "diego@example.com", "Diego"),
    ("a0000000-0000-4000-8000-000000000005", "yasna@example.com", "Yasna"),
    ("b0000000-0000-4000-8000-000000000001", "pedro@example.com", "Pedro Ramírez"),
    ("b0000000-0000-4000-8000-000000000002", "andrea@example.com", "Andrea Solís"),
]


def load_env():
    env = {}
    for line in (ROOT / ".env.local").read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def password():
    alphabet = string.ascii_letters + string.digits
    return "-".join("".join(secrets.choice(alphabet) for _ in range(6)) for _ in range(4))


def create_user(url, key, uid, email, name, pwd):
    body = json.dumps({"id": uid, "email": email, "password": pwd, "email_confirm": True,
                       "user_metadata": {"full_name": name}}).encode()
    req = urllib.request.Request(f"{url}/auth/v1/admin/users", data=body, method="POST",
                                 headers={"apikey": key, "Authorization": f"Bearer {key}",
                                          "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req) as r:
            return r.status
    except urllib.error.HTTPError as e:
        if e.code == 422 and "already" in e.read().decode().lower():
            return "existe"
        raise


def main():
    env = load_env()
    url, key = env["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/"), env["SUPABASE_SERVICE_ROLE_KEY"]
    if "127.0.0.1" in url or "localhost" in url:
        sys.exit("NEXT_PUBLIC_SUPABASE_URL apunta a local; este script es para la nube.")

    lines = [f"# Credenciales de demo · {url}", "# NO subir a git ni compartir por canales abiertos.", ""]
    for uid, email, name in USERS:
        pwd = password()
        status = create_user(url, key, uid, email, name, pwd)
        if status == "existe":
            print(f"{email}: ya existía (contraseña sin cambios)")
            lines.append(f"{email}\t(ya existía)")
        else:
            print(f"{email}: creado")
            lines.append(f"{email}\t{pwd}")
    CREDS.write_text("\n".join(lines) + "\n")
    os.chmod(CREDS, 0o600)

    for seed in SEEDS:
        print(f"Seed {seed}...")
        subprocess.run(["supabase", "db", "query", "--linked", "-f", str(ROOT / "supabase" / "seed" / seed)],
                       check=True, cwd=ROOT, stdout=subprocess.DEVNULL)
    print(f"Listo. Credenciales en {CREDS.name}")


if __name__ == "__main__":
    main()
