"""
API_BASE 값을 읽어 exhibition/config.js 를 생성한다.
읽는 순서: 이미 설정된 환경 변수(API_BASE) > .env 파일의 API_BASE > 빈 값.
로컬 개발과 GitHub Actions 배포가 이 스크립트 하나를 함께 쓴다.

로컬 실행:
    python generate_config.py
GitHub Actions 실행 (워크플로에서):
    API_BASE=${{ vars.API_BASE }} python generate_config.py
"""
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent

api_base = os.environ.get("SUPABASE_URL", "").strip().strip('"').strip("'").strip(";")
api_key = os.environ.get("SUPABASE_KEY", "").strip().strip('"').strip("'").strip(";")
api_db = os.environ.get("SUPABASE_DB", "").strip().strip('"').strip("'").strip(";")
out_path = ROOT / "config.js"
out_path.write_text(f'window.SUPABASE_URL = "{api_key}";\n', encoding="utf-8")
out_path.write_text(f'window.SUPABASE_KEY = "{api_key}";\n', encoding="utf-8")
out_path.write_text(f'window.SUPABASE_DB = "{api_key}";\n', encoding="utf-8")
print(f"생성됨: {out_path}  (SUPABASE_URL={api_base})\n (SUPABASE_KEY={api_key}) \n (SUPABASE_DB={api_db})")