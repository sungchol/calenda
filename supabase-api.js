// schedule-api.js
// supabase-js 라이브러리 없이 fetch만으로 schedules 테이블을 CRUD 한다.
// 다른 파일보다 먼저 불러오면 아래 함수들을 전역에서 쓸 수 있다.

const SUPABASE_URL = window.SUPABASE_URL; // Project URL
const SUPABASE_KEY = window.SUPABASE_KEY; // Publishable key 
const TABLE_URL = `${SUPABASE_URL}/rest/v1/${window.SUPABASE_DB}`;

// 편집 코드 방식(방식 B)을 쓰는 경우 브라우저에 저장된 코드를 헤더에 붙인다.
export function getEditCode() {
  try {
    return localStorage.getItem("editCode") || "";
  } catch (e) {
    return "";
  }
}

// 공통 요청 함수: 헤더를 붙이고, 실패하면 서버 오류 메시지로 예외를 던진다.
async function api(path, { method = "GET", body } = {}) {
  const headers = {
    apikey: SUPABASE_KEY,
    "Content-Type": "application/json",
    Prefer: "return=representation", // 추가/수정/삭제 후 처리된 행을 돌려받는다
  };
  const code = getEditCode();
  if (code) headers["x-edit-code"] = code;

  const res = await fetch(TABLE_URL + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    // PostgREST 오류 형식: { code, message, details, hint }
    throw new Error((data && data.message) || `HTTP ${res.status}`);
  }
  return data;
}

export async function readAll() {
  const q = new URLSearchParams();
  q.append("select", "*");
  q.append("order", "date.asc,kyosi.asc.nullsfirst");
  return api("?" + q.toString());
}

// Read: 한 달치 일정 (ym = "2026-10")
export async function readMonth(ym) {
  const [y, m] = ym.split("-").map(Number);
  //해당월마지막날짜
  const last = String(new Date(y, m, 0).getDate()).padStart(2, "0");
  const thisYM = ym.replace("-", ".").slice(2, 7);
  const startDay = `${thisYM}.01`;
  const endDay = `${thisYM}.${last}`;
  const q = new URLSearchParams();
  q.append("select", "*");
  q.append("date", `gte.${startDay}`);
  q.append("date", `lte.${endDay}`);
  q.append("order", "date.asc,kyosi.asc.nullsfirst");
  return api("?" + q.toString());
}

// Read: 하루 일정 (d = "2026-10-12")
export async function readDay(d) {
  return api(
    `?select=*&date=eq.${encodeURIComponent(d)}&order=kyosi.asc.nullsfirst`,
  );
}

// Create: item = { date, kyosi, title, descr, prepa }
export async function createRow(item) {
  const rows = await api("", { method: "POST", body: item });
  return rows[0];
}

// Update: id 행의 일부 열만 바꿔도 된다
export async function updateRow(id, changes) {
  const rows = await api(`?id=eq.${Number(id)}`, {
    method: "PATCH",
    body: changes,
  });
  if (rows.length === 0)
    throw new Error("수정되지 않았다. 권한 또는 대상 일정을 확인한다.");
  return rows[0];
}

// Delete
export async function deleteRow(id) {
  const rows = await api(`?id=eq.${Number(id)}`, { method: "DELETE" });
  if (rows.length === 0)
    throw new Error("삭제되지 않았다. 권한 또는 대상 일정을 확인한다.");
  return rows[0];
}

// Supabase 영문 오류 메시지를 한국어로 바꾼다.
export function koError(err) {
  const m = (err && err.message) || String(err);
  if (m.includes("Invalid login credentials"))
    return "이메일 또는 비밀번호가 틀렸다.";
  if (m.includes("User already registered")) return "이미 가입된 이메일이다.";
  if (m.includes("Password should be"))
    return "비밀번호는 6자 이상이어야 한다.";
  if (m.includes("Email not confirmed")) return "이메일 인증이 끝나지 않았다.";
  if (m.includes("Signups not allowed"))
    return "현재 회원가입이 막혀 있다. 관리자 설정을 확인한다.";
  if (m.includes("rate limit"))
    return "요청이 너무 많다. 잠시 후 다시 시도한다.";
  if (m.includes("row-level security")) return "권한이 없다. 다시 로그인한다.";
  return m;
}
