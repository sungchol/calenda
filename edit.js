import {
  readMonth,
  koError,
  createRow,
  updateRow,
  deleteRow,
  getEditCode,
} from "./supabase-api.js";

/* ---------- 공통 ---------- */
const $ = (id) => document.getElementById(id);
let rows = []; // 현재 달의 일정
let toastTimer = null;

function toast(text, isErr) {
  const t = $("toast");
  t.textContent = text;
  t.className = "show" + (isErr ? " err" : "");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.className = ""), 2200);
}
const emptyToNull = (v) => (v.trim() === "" ? null : v.trim());

/* ---------- CRUD ---------- */
// async function readMonth(ym) {
//   ym = "2026-10";
//   const [y, m] = ym.split("-").map(Number);
//   const last = new Date(y, m, 0).getDate();
//   console.log("db", db);
//   const { data, error } = await db
//     .from("schedules")
//     .select("*")
//     .gte("date", `${ym}-01`)
//     .lte("date", `${ym}-${String(last).padStart(2, "0")}`)
//     .order("date")
//     .order("kyosi", { nullsFirst: true });
//   if (error) throw error;
//   return data;
// }

// async function createRow(item) {
//   const { data, error } = await db.from("schedules").insert(item).select();
//   if (error) throw error;
//   return data[0];
// }

// async function updateRow(id, changes) {
//   const { data, error } = await db
//     .from("schedules")
//     .update(changes)
//     .eq("id", id)
//     .select();
//   if (error) throw error;
//   if (data.length === 0)
//     throw new Error("수정되지 않았다. 권한 또는 대상 일정을 확인한다.");
//   return data[0];
// }

// async function deleteRow(id) {
//   const { data, error } = await db
//     .from("schedules")
//     .delete()
//     .eq("id", id)
//     .select();
//   if (error) throw error;
//   if (data.length === 0)
//     throw new Error("삭제되지 않았다. 권한 또는 대상 일정을 확인한다.");
// }

/* ---------- 목록 그리기 (textContent만 사용해 스크립트 삽입을 막는다) ---------- */
function td(text, cls) {
  const el = document.createElement("td");
  el.textContent = text ?? "";
  if (cls) el.className = cls;
  return el;
}

function renderList() {
  const body = $("listBody");
  body.replaceChildren();
  if (rows.length === 0) {
    const tr = document.createElement("tr");
    const cell = td("이 달에는 일정이 없다.", "empty");
    cell.colSpan = 6;
    tr.appendChild(cell);
    body.appendChild(tr);
    return;
  }
  const editingId = $("fId").value;
  for (const r of rows) {
    const tr = document.createElement("tr");
    if (String(r.id) === editingId) tr.className = "editing";
    tr.append(
      td(r.date, "date"),
      td(r.kyosi),
      td(r.title),
      td(r.descr, "multi hide-sm"),
      td(r.prepa, "multi hide-sm"),
      td(r.suhang, "multi hide-sm"),
    );
    const act = td("", "actions");
    const eBtn = document.createElement("button");
    eBtn.type = "button";
    eBtn.className = "btn btn-sm btn-edit";
    eBtn.textContent = "수정";
    eBtn.onclick = () => startEdit(r);
    const dBtn = document.createElement("button");
    dBtn.type = "button";
    dBtn.className = "btn btn-sm btn-del";
    dBtn.textContent = "삭제";
    dBtn.style.marginLeft = "4px";
    dBtn.onclick = () => removeRow(r);
    act.append(eBtn, dBtn);
    tr.appendChild(act);
    body.appendChild(tr);
  }
}

async function loadList() {
  try {
    rows = await readMonth($("monthPicker").value);
    renderList();
  } catch (err) {
    toast("불러오기 실패: " + koError(err), true);
  }
}

/* ---------- 폼 ---------- */
function setMode(isEdit) {
  $("formTitle").textContent = isEdit ? "일정 수정" : "새 일정 추가";
  $("modeBadge").textContent = isEdit ? "수정" : "추가";
  $("modeBadge").className =
    "mode-badge " + (isEdit ? "mode-edit" : "mode-new");
}

function resetForm(keepDate) {
  const d = $("fDate").value;
  $("scheduleForm").reset();
  $("fId").value = "";
  if (keepDate) $("fDate").value = d;
  setMode(false);
  renderList();
}

function startEdit(r) {
  $("fId").value = r.id;
  $("fDate").value = r.date;
  $("fKyosi").value = r.kyosi ?? "";
  $("fTitle").value = r.title ?? "";
  $("fDescr").value = r.descr ?? "";
  $("fPrepa").value = r.prepa ?? "";
  $("fSuhang").value = r.suhang ?? "";

  setMode(true);
  renderList();
  window.scrollTo({ top: 0, behavior: "smooth" });
  $("fTitle").focus();
}

async function removeRow(r) {
  if (!confirm(`[${r.date}] ${r.title}\n이 일정을 삭제할까?`)) return;
  try {
    await deleteRow(r.id);
    if ($("fId").value === String(r.id)) resetForm();
    toast("삭제했다.");
    await loadList();
  } catch (err) {
    toast("삭제 실패: " + koError(err), true);
  }
}

$("scheduleForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  let suhang = $("fSuhang").value?.toUpperCase();
  suhang = suhang !== "Y" ? null : suhang;
  let date_o = $("fDate").value;

  let sp_o = date_o.split(/[\.-]/).map(Number);
  sp_o[0] =
    sp_o[0] >= 2000
      ? sp_o[0] - 2000
      : sp_o[0] >= 1900
        ? sp_o[0] - 1900
        : sp_o[0];
  date_o =
    sp_o.length === 3
      ? `${pad(sp_o[0])}.${pad(sp_o[1])}.${pad(sp_o[2])}`
      : date_o;
  $("fDate").value = date_o;

  const item = {
    date: date_o,
    kyosi: emptyToNull($("fKyosi").value),
    title: $("fTitle").value.trim(),
    descr: emptyToNull($("fDescr").value),
    prepa: emptyToNull($("fPrepa").value),
    suhang: suhang,
  };
  if (!item.date || !item.title) return toast("날짜와 제목은 필수다.", true);

  console.log(item.date);
  let safe = /^[\d]{2}\.[01][\d]\.[0-3][\d]$/.test(item.date);
  if (!safe) return toast("날짜 입력은 YY.MM.DD 또는 YY-MM-DD 형태다", true);
  let splitDate = item.date.split(".");
  let safe2 =
    splitDate[1] > 0 &&
    splitDate[1] < 13 &&
    splitDate[2] > 0 &&
    splitDate[2] <= new Date(splitDate[0], splitDate[1], 0).getDate();
  if (!safe2) return toast("유효한 날짜범위가 아니다", true);
  console.log(safe);

  const id = $("fId").value;
  $("saveBtn").disabled = true;
  try {
    if (id) {
      await updateRow(Number(id), item);
      toast("수정했다.");
    } else {
      await createRow(item);
      toast("추가했다.");
    }
    // 저장한 날짜의 달로 목록을 이동한다
    setMonthPicker(item.date);
    //$("monthPicker").value = item.date.slice(0, 7);
    resetForm(!id); // 추가 후에는 같은 날짜를 남겨 연속 입력을 쉽게 한다
    await loadList();
  } catch (err) {
    toast("저장 실패: " + koError(err), true);
  } finally {
    $("saveBtn").disabled = false;
  }
});

$("resetBtn").addEventListener("click", () => resetForm());

/* ---------- 달 이동 ---------- */
function shiftMonth(delta) {
  const [y, m] = $("monthPicker").value.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  $("monthPicker").value =
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  loadList();
}

$("prevMonth").onclick = () => shiftMonth(-1);
$("nextMonth").onclick = () => shiftMonth(1);
$("monthPicker").addEventListener("change", loadList);

// /* ---------- 로그인 확인 후 시작 ---------- */
$("inputEditCode").addEventListener("click", async () => {
  const code = prompt("편집 코드를 입력한다");
  try {
    localStorage.setItem("editCode", code.trim());
  } catch (e) {}
  //location.reload(); // 헤더에 새 코드를 싣기 위해 새로고침한다
  //location.replace("auth.html?next=edit.html");
});

// db.auth.onAuthStateChange((event) => {
//   if (event === "SIGNED_OUT")
//     location.replace("auth.html?next=edit.html");
// });

function pad(n) {
  return String(n).padStart(2, "0");
}
function convertStrDate(y, m, d) {
  return `${y}-${pad(m)}-${pad(d)}`;
}

/* "26.10.19" / "2026.10.19" / "2026-10-19" 모두 허용 */
function parseDate(strDate) {
  const p = String(strDate)
    .trim()
    .split(/[.\-\/]/)
    .map(Number);
  if (p.length !== 3 || p.some(isNaN)) return null;
  let [y, m, d] = p;
  if (y < 100) y += 2000;
  return convertStrDate(y, m, d);
}

function setMonthPicker(strDate) {
  let qDate = parseDate(strDate);
  $("monthPicker").value = qDate.slice(0, 7);
}

(async () => {
  // const session = await requireLogin();
  // if (!session) return;
  // $("userEmail").textContent = session.user.email;
  // document.body.classList.remove("loading");

  // local에 편집코드가 저장안되어 있다면 입력받고 시작한다

  if (!getEditCode()) {
    const code = prompt("편집 코드를 입력한다");
    if (!code) {
      location.replace("/");
      return;
    }
    try {
      localStorage.setItem("editCode", code.trim());
    } catch (e) {}
    location.reload(); // 헤더에 새 코드를 싣기 위해 새로고침한다
    return;
  }

  document.body.classList.remove("loading");

  const inputDate = $("fDate");
  const now = new Date();
  $("monthPicker").value =
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const placeholdertext = `예시 : ${pad(now.getFullYear() - 2000)}.${pad(now.getMonth() + 1)}.${pad(now.getDate())}`;
  inputDate.setAttribute("placeholder", placeholdertext);

  const qDate = new URLSearchParams(location.search).get("date");
  if (qDate !== null) {
    let mDate = parseDate(qDate);
    console.log(qDate);
    console.log(mDate);

    $("fDate").value = mDate?.replaceAll("-", ".").slice(2);
    $("monthPicker").value = mDate?.slice(0, 7);
  }

  loadList();
})();
