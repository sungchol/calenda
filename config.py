"""
API_BASE 값을 읽어 exhibition/config.js 를 생성한다.
읽는 순서: 이미 설정된 환경 변수(API_BASE) > .env 파일의 API_BASE > 빈 값.
로컬 개발과 GitHub Actions 배포가 이 스크립트 하나를 함께 쓴다.

로컬 실행:
    python generate_config.py
GitHub Actions 실행 (워크플로에서):
    API_BASE=${{ vars.API_BASE }} python generate_config.py
"""
import os, json
from pathlib import Path

ROOT = Path(__file__).resolve().parent

KEYS = ["SUPABASE_URL", "SUPABASE_KEY", "SUPABASE_DB"]

config = {}
for k in KEYS:
    v = os.environ.get(k).strip().strip('"').strip("'").strip(";")
    if v is None:
        raise SystemExit(f"환경변수 {k}가 전달되지 않았다. 워크플로 env: 를 확인할 것")
    config[k] = v

out_path = ROOT / "config.js"
with open("config.js", "w", encoding="utf-8") as f:   # 파일은 한 번만 연다
    f.write("window.APP_CONFIG = " + json.dumps(config, ensure_ascii=False) + ";\n")

print(f"생성됨: {out_path}");
for k in KEYS:
    print(f"{k}:{config[k]}")