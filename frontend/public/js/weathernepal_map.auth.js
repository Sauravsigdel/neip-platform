// ══════════════════════════════════════════
// AUTH SYSTEM
// ══════════════════════════════════════════
const API = CFG.API;
let currentUser = null;
let authToken = localStorage.getItem("wn_token");
let pendingEmail = "";
const AVATAR_IMAGES = [
  "/avatars/avatar1.png",
  "/avatars/avatar2.png",
  "/avatars/avatar3.png",
  "/avatars/avatar4.png",
  "/avatars/avatar5.png",
  "/avatars/avatar6.png",
  "/avatars/avatar7.png",
  "/avatars/avatar8.png",
  "/avatars/avatar9.png",
];
let selectedAvatarIndex = 1; // 1-based index

// Build avatar grid
function buildAvatarGrid() {
  const grid = document.getElementById("avatarGrid");
  if (!grid) return;
  grid.innerHTML = AVATAR_IMAGES.map(
    (src, i) => `
        <div class="avatar-opt${i === 0 ? " selected" : ""}" onclick="selectAvatar(${i + 1},this)"
          style="width:52px;height:52px;border-radius:50%;overflow:hidden;cursor:pointer;border:3px solid ${i === 0 ? "var(--accent)" : "transparent"};transition:all 0.2s;flex-shrink:0;">
          <img src="${src}" style="width:100%;height:100%;object-fit:cover;" onerror="this.parentElement.style.background='#2563eb';this.style.display='none'"/>
        </div>`,
  ).join("");
}
function selectAvatar(index, el) {
  selectedAvatarIndex = index;
  document.querySelectorAll(".avatar-opt").forEach((e) => {
    e.style.border = "3px solid transparent";
    e.style.boxShadow = "none";
  });
  el.style.border = "3px solid var(--accent)";
  el.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.3)";
}

// Build OTP inputs
function buildOTPInputs() {
  const row = document.getElementById("otpRow");
  row.innerHTML = Array.from(
    { length: 6 },
    (_, i) =>
      `<input class="otp-input" id="otp${i}" maxlength="1" type="text" inputmode="numeric" oninput="otpNext(${i})" onkeydown="otpBack(event,${i})">`,
  ).join("");
}
function otpNext(i) {
  const val = document.getElementById("otp" + i).value;
  if (val && i < 5) document.getElementById("otp" + (i + 1)).focus();
}
function otpBack(e, i) {
  if (
    e.key === "Backspace" &&
    !document.getElementById("otp" + i).value &&
    i > 0
  )
    document.getElementById("otp" + (i - 1)).focus();
}
function getOTPValue() {
  return Array.from(
    { length: 6 },
    (_, i) => document.getElementById("otp" + i)?.value || "",
  ).join("");
}

// Show/hide error and success
function showAuthError(msg) {
  const e = document.getElementById("authError");
  e.textContent = msg;
  e.style.display = "block";
  document.getElementById("authSuccess").style.display = "none";
}
function showAuthSuccess(msg) {
  const e = document.getElementById("authSuccess");
  e.textContent = msg;
  e.style.display = "block";
  document.getElementById("authError").style.display = "none";
}
function clearAuthMsgs() {
  document.getElementById("authError").style.display = "none";
  document.getElementById("authSuccess").style.display = "none";
}

// Open modal
function openModal() {
  clearAuthMsgs();
  document.getElementById("authModal").classList.add("show");
  document.getElementById("modalTitle").textContent = "Admin Login";
  document.getElementById("modalSub").textContent =
    "Sign in with admin credentials";
  document.getElementById("loginForm").style.display = "block";
}
function closeModal() {
  document.getElementById("authModal").classList.remove("show");
}

// LOGIN
async function doLogin() {
  const email = document.getElementById("loginEmail").value.trim();
  const pass = document.getElementById("loginPass").value;
  if (!email || !pass) {
    showAuthError("Please fill in all fields.");
    return;
  }
  try {
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: pass }),
    });
    const data = await res.json();
    if (!res.ok) {
      showAuthError(data.error || "Login failed");
      return;
    }
    if ((data?.user?.role || "user") !== "admin") {
      showAuthError("Admin account required.");
      return;
    }
    authToken = data.token;
    localStorage.setItem("wn_token", authToken);
    setLoggedIn(data.user);
    closeModal();
  } catch (e) {
    showAuthError("Connection error. Is the backend running?");
  }
}

const OFFICIAL_AQI_STATIONS = [
  { station: "Shankapark", city: "Kathmandu", aqi: 155 },
  { station: "Ratnapark", city: "Kathmandu", aqi: 152 },
  { station: "Bhaisipati", city: "Lalitpur", aqi: 138 },
  { station: "Bhaktapur", city: "Bhaktapur", aqi: 123 },
  { station: "Khumaltar", city: "Lalitpur", aqi: 123 },
  { station: "TU Kirtipur", city: "Kathmandu", aqi: 98 },
  { station: "Dhankuta", city: "Dhankuta", aqi: 98 },
  { station: "Dhulikhel", city: "Dhulikhel", aqi: 97 },
  { station: "Surkhet", city: "Birendranagar", aqi: 79 },
  { station: "Deukhuri, Dang", city: "Ghorahi", aqi: 76 },
  { station: "Mustang", city: "Jomsom", aqi: 49 },
  { station: "Achaam", city: "Sanfebagar", aqi: null },
  { station: "Bharatpur", city: "Bharatpur", aqi: null },
  {
    station: "Bhimdatta (Mahendranagar)",
    city: "Mahendranagar",
    aqi: null,
  },
  { station: "Biratnagar", city: "Biratnagar", aqi: null },
  { station: "DHM, Pkr", city: "Pokhara", aqi: null },
  { station: "Damak", city: "Birtamod", aqi: null },
  { station: "Dang", city: "Ghorahi", aqi: null },
  { station: "Dhangadhi", city: "Dhangadhi", aqi: null },
  { station: "GBS, Pkr", city: "Pokhara", aqi: null },
  { station: "Hetauda", city: "Hetauda", aqi: null },
  { station: "Ilam", city: "Ilam", aqi: null },
  { station: "Janakpur", city: "Janakpur", aqi: null },
  { station: "Jhumka", city: "Itahari", aqi: null },
  { station: "Lumbini", city: "Bhairahawa", aqi: null },
  { station: "Nepalgunj", city: "Nepalgunj", aqi: null },
  { station: "PU Pkr", city: "Pokhara", aqi: null },
  { station: "Pulchowk", city: "Lalitpur", aqi: null },
  { station: "Rara", city: "Gamgadhi", aqi: null },
  { station: "Sauraha", city: "Bharatpur", aqi: null },
  { station: "Simara", city: "Birgunj", aqi: null },
];
let adminAqiDraft = OFFICIAL_AQI_STATIONS.map((r) => ({
  ...r,
  pm25: null,
  pm10: null,
  pm1: null,
}));

function normalizeStationName(name) {
  return String(name || "")
    .trim()
    .toLowerCase();
}

function adminAqiBand(aqi) {
  if (!Number.isFinite(aqi)) {
    return { label: "No Data", color: "#64748b" };
  }
  if (aqi <= 50) return { label: "Good", color: "#22c55e" };
  if (aqi <= 100) return { label: "Moderate", color: "#eab308" };
  if (aqi <= 150) return { label: "Unhealthy*", color: "#f97316" };
  if (aqi <= 200) return { label: "Unhealthy", color: "#ef4444" };
  if (aqi <= 300) return { label: "Very Unhealthy", color: "#a855f7" };
  return { label: "Hazardous", color: "#7f1d1d" };
}

function refreshAdminAqiStats() {
  const total = adminAqiDraft.length;
  const filled = adminAqiDraft.filter(
    (r) =>
      Number.isFinite(r.aqi) ||
      Number.isFinite(r.pm25) ||
      Number.isFinite(r.pm10) ||
      Number.isFinite(r.pm1),
  ).length;
  const pct = total ? Math.round((filled / total) * 100) : 0;
  const totalEl = document.getElementById("adminAqiStationCount");
  const filledEl = document.getElementById("adminAqiFilledCount");
  const pctEl = document.getElementById("adminAqiCoveragePct");
  if (totalEl) totalEl.textContent = String(total);
  if (filledEl) filledEl.textContent = String(filled);
  if (pctEl) pctEl.textContent = `${pct}%`;
}

function renderAdminAqiTable() {
  const body = document.getElementById("adminAqiTableBody");
  if (!body) return;
  body.innerHTML = adminAqiDraft
    .map((row, i) => {
      const band = adminAqiBand(row.aqi);
      return `
          <tr>
            <td style="padding:6px 8px;border-bottom:1px solid var(--border);font-size:12px;color:var(--text);font-weight:600;">${row.station}</td>
            <td style="padding:6px 8px;border-bottom:1px solid var(--border);font-size:11px;color:var(--sub);">${row.city}</td>
            <td style="padding:6px 8px;border-bottom:1px solid var(--border);">
              <input type="number" min="0" max="500" step="1" value="${Number.isFinite(row.aqi) ? row.aqi : ""}" oninput="updateAdminAqiValue(${i}, this.value, this)" class="wn-fi" style="height:32px;padding:6px 8px;font-size:12px;" placeholder="-" />
            </td>
            <td style="padding:6px 8px;border-bottom:1px solid var(--border);">
              <input type="number" min="0" max="500" step="0.1" value="${Number.isFinite(row.pm25) ? row.pm25 : ""}" oninput="updateAdminAqiField(${i}, 'pm25', this.value)" class="wn-fi" style="height:32px;padding:6px 8px;font-size:12px;" placeholder="-" />
            </td>
            <td style="padding:6px 8px;border-bottom:1px solid var(--border);">
              <input type="number" min="0" max="500" step="0.1" value="${Number.isFinite(row.pm10) ? row.pm10 : ""}" oninput="updateAdminAqiField(${i}, 'pm10', this.value)" class="wn-fi" style="height:32px;padding:6px 8px;font-size:12px;" placeholder="-" />
            </td>
            <td style="padding:6px 8px;border-bottom:1px solid var(--border);">
              <input type="number" min="0" max="500" step="0.1" value="${Number.isFinite(row.pm1) ? row.pm1 : ""}" oninput="updateAdminAqiField(${i}, 'pm1', this.value)" class="wn-fi" style="height:32px;padding:6px 8px;font-size:12px;" placeholder="-" />
            </td>
            <td style="padding:6px 8px;border-bottom:1px solid var(--border);font-size:10px;">
              <span data-aqi-band style="display:inline-flex;align-items:center;padding:4px 8px;border-radius:999px;background:${band.color}1f;color:${band.color};font-weight:700;">${band.label}</span>
            </td>
          </tr>`;
    })
    .join("");
  refreshAdminAqiStats();
}

function updateAdminAqiValue(index, value, inputEl) {
  const clean = String(value ?? "").trim();
  const n = Number(clean);
  adminAqiDraft[index].aqi =
    clean !== "" && Number.isFinite(n) ? Math.round(n) : null;
  const rowBand = inputEl?.closest("tr")?.querySelector("[data-aqi-band]");
  if (rowBand) {
    const band = adminAqiBand(adminAqiDraft[index].aqi);
    rowBand.textContent = band.label;
    rowBand.style.color = band.color;
    rowBand.style.background = `${band.color}1f`;
  }
  refreshAdminAqiStats();
}

function updateAdminAqiField(index, field, value) {
  const clean = String(value ?? "").trim();
  const n = Number(clean);
  adminAqiDraft[index][field] = clean !== "" && Number.isFinite(n) ? n : null;
  refreshAdminAqiStats();
}

async function hydrateAdminAqiDraftFromServer() {
  adminAqiDraft = OFFICIAL_AQI_STATIONS.map((r) => ({
    ...r,
    pm25: null,
    pm10: null,
    pm1: null,
  }));
  try {
    const res = await fetch(`${CFG.API}/map/official-aqi-latest`);
    if (!res.ok) return;
    const data = await res.json();
    if (!data?.success || !Array.isArray(data.data)) return;
    const map = new Map(
      data.data.map((r) => [normalizeStationName(r.stationName), r]),
    );
    adminAqiDraft = adminAqiDraft.map((row) => {
      const found = map.get(normalizeStationName(row.station));
      if (!found) return row;
      return {
        ...row,
        aqi: Number.isFinite(found.aqi) ? Math.round(found.aqi) : null,
        pm25: Number.isFinite(found.pm25) ? found.pm25 : null,
        pm10: Number.isFinite(found.pm10) ? found.pm10 : null,
        pm1: Number.isFinite(found.pm1) ? found.pm1 : null,
      };
    });
  } catch (_) {
    // Keep defaults if fetch fails.
  }
}

async function loadAdminAqiHistory() {
  const box = document.getElementById("adminAqiHistory");
  if (!box) return;
  box.innerHTML =
    '<div style="font-size:11px;color:var(--sub);">Loading history...</div>';
  try {
    const res = await fetch(`${CFG.API}/map/admin/official-aqi-history`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await res.json();
    if (!res.ok || !data?.success || !Array.isArray(data.data)) {
      throw new Error(data?.error || "Failed to load history");
    }
    if (!data.data.length) {
      box.innerHTML =
        '<div style="font-size:11px;color:var(--sub);">No history yet.</div>';
      return;
    }
    box.innerHTML = data.data
      .slice(0, 40)
      .map((r) => {
        const dt = new Date(r.timestamp);
        const day = dt.toLocaleString("en-US", {
          day: "numeric",
          timeZone: "Asia/Kathmandu",
        });
        const month = dt
          .toLocaleString("en-US", {
            month: "short",
            timeZone: "Asia/Kathmandu",
          })
          .toLowerCase();
        const hourRaw = Number(
          dt.toLocaleString("en-US", {
            hour: "numeric",
            hour12: false,
            timeZone: "Asia/Kathmandu",
          }),
        );
        const ampm = hourRaw >= 12 ? "pm" : "am";
        const hour = hourRaw % 12 || 12;
        const compactTime = `${day} ${month}, ${hour}${ampm}`;
        return `<div style="display:flex;justify-content:space-between;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);font-size:11px;"><span style="color:var(--text);font-weight:600;">${r.stationName}</span><span style="color:${Number.isFinite(r.aqi) ? "#f97316" : "var(--sub)"};">${Number.isFinite(r.aqi) ? r.aqi : "-"}</span><span style="color:var(--sub);">${compactTime}</span></div>`;
      })
      .join("");
  } catch (err) {
    box.innerHTML = `<div style="font-size:11px;color:#ef4444;">${err.message || "History load failed."}</div>`;
  }
}

function openAdminAqiModal() {
  if (!currentUser || currentUser.role !== "admin") return;
  closeUserMenu();
  const modal = document.getElementById("adminAqiModal");
  const status = document.getElementById("adminAqiStatus");
  if (status) {
    status.textContent = "Edit AQI values and update changes.";
    status.style.color = "var(--sub)";
  }
  if (modal) modal.style.display = "block";
  hydrateAdminAqiDraftFromServer().then(() => {
    renderAdminAqiTable();
    loadAdminAqiHistory();
  });
}

async function openAdminPasswordReset() {
  if (!authToken || !currentUser || currentUser.role !== "admin") return;
  closeUserMenu();
  const modal = document.getElementById("adminPassModal");
  const status = document.getElementById("apStatus");
  if (status) {
    status.textContent = "Use a unique password you don't use elsewhere.";
    status.style.color = "var(--sub)";
  }
  ["apCurrent", "apNew", "apConfirm"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  if (modal) modal.style.display = "block";
}

function closeAdminPasswordModal() {
  const modal = document.getElementById("adminPassModal");
  if (modal) modal.style.display = "none";
}

async function submitAdminPasswordChange() {
  if (!authToken || !currentUser || currentUser.role !== "admin") return;
  const currentPassword = document.getElementById("apCurrent")?.value || "";
  const newPassword = document.getElementById("apNew")?.value || "";
  const confirmPassword = document.getElementById("apConfirm")?.value || "";
  const status = document.getElementById("apStatus");

  if (!currentPassword || !newPassword || !confirmPassword) {
    if (status) {
      status.textContent = "Fill in all password fields.";
      status.style.color = "#ef4444";
    }
    return;
  }
  if (newPassword.length < 6) {
    if (status) {
      status.textContent = "New password must be at least 6 characters.";
      status.style.color = "#ef4444";
    }
    return;
  }
  if (newPassword !== confirmPassword) {
    if (status) {
      status.textContent = "New password and confirmation do not match.";
      status.style.color = "#ef4444";
    }
    return;
  }

  try {
    if (status) {
      status.textContent = "Updating password...";
      status.style.color = "var(--sub)";
    }
    const res = await fetch(`${API}/auth/change-password`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.success) {
      throw new Error(data?.error || "Password update failed");
    }
    if (status) {
      status.textContent = "Password updated successfully.";
      status.style.color = "#22c55e";
    }
    setTimeout(() => closeAdminPasswordModal(), 700);
  } catch (err) {
    if (status) {
      status.textContent = err.message || "Password update failed.";
      status.style.color = "#ef4444";
    }
  }
}

function openAvatarPicker() {
  if (!authToken || !currentUser) return;
  closeUserMenu();
  const modal = document.getElementById("avatarPickerModal");
  const status = document.getElementById("avatarPickerStatus");
  if (!Number.isInteger(selectedAvatarIndex) || selectedAvatarIndex < 1) {
    selectedAvatarIndex = currentUser.avatarIndex || 1;
  }
  if (status) {
    status.textContent = "Choose an avatar and save.";
    status.style.color = "var(--sub)";
  }
  renderAvatarPickerGrid();
  if (modal) modal.style.display = "block";
}

function renderAvatarPickerGrid() {
  const grid = document.getElementById("avatarPickerGrid");
  if (grid) {
    grid.innerHTML = AVATAR_IMAGES.map((src, i) => {
      const idx = i + 1;
      const active = idx === selectedAvatarIndex;
      return `<button onclick="selectPickerAvatar(${idx})" style="height:88px;border-radius:12px;border:${active ? "2px solid var(--accent)" : "1px solid var(--border)"};background:var(--cell);cursor:pointer;display:grid;place-items:center;padding:6px;">
          <img src="${src}" style="width:64px;height:64px;border-radius:50%;object-fit:cover;" />
        </button>`;
    }).join("");
  }
}

function selectPickerAvatar(index) {
  selectedAvatarIndex = index;
  renderAvatarPickerGrid();
}

function closeAvatarPicker() {
  const modal = document.getElementById("avatarPickerModal");
  if (modal) modal.style.display = "none";
}

async function saveAvatarSelection() {
  if (!authToken || !currentUser) return;
  const status = document.getElementById("avatarPickerStatus");
  try {
    if (status) {
      status.textContent = "Saving avatar...";
      status.style.color = "var(--sub)";
    }
    const res = await fetch(`${API}/auth/avatar`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ avatarIndex: selectedAvatarIndex }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.success) {
      throw new Error(data?.error || "Failed to save avatar");
    }
    currentUser.avatarIndex = data.user?.avatarIndex || selectedAvatarIndex;
    setLoggedIn(currentUser);
    if (status) {
      status.textContent = "Avatar updated.";
      status.style.color = "#22c55e";
    }
    setTimeout(() => closeAvatarPicker(), 600);
  } catch (err) {
    if (status) {
      status.textContent = err.message || "Failed to save avatar.";
      status.style.color = "#ef4444";
    }
  }
}

function closeAdminAqiModal() {
  const modal = document.getElementById("adminAqiModal");
  if (modal) modal.style.display = "none";
}

async function submitAdminAqiUpload() {
  if (!authToken || !currentUser || currentUser.role !== "admin") return;
  const status = document.getElementById("adminAqiStatus");

  const records = adminAqiDraft.map((row) => ({
    stationName: row.station,
    city: row.city,
    aqi: Number.isFinite(row.aqi) ? row.aqi : null,
    pm25: Number.isFinite(row.pm25) ? row.pm25 : null,
    pm10: Number.isFinite(row.pm10) ? row.pm10 : null,
    pm1: Number.isFinite(row.pm1) ? row.pm1 : null,
  }));

  try {
    if (status) {
      status.textContent = "Uploading official AQI data...";
      status.style.color = "var(--sub)";
    }
    const res = await fetch(`${CFG.API}/map/admin/official-aqi-manual`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ records }),
    });
    const data = await res.json();
    if (!res.ok || !data?.success) {
      throw new Error(data?.error || "Upload failed");
    }
    await loadRealAQI();
    await loadAdminAqiHistory();
    if (status) {
      status.textContent = `Updated ${records.length} station values.`;
      status.style.color = "#22c55e";
    }
  } catch (err) {
    if (status) {
      status.textContent = err.message || "Upload failed.";
      status.style.color = "#ef4444";
    }
  }
}

// SET LOGGED IN STATE
// Helper: returns HTML for user avatar (img or initials fallback)
function avatarHTML(user, size = 32, border = "") {
  const idx = user.avatarIndex || user.avatar_index || 0;
  const initials =
    user.initials ||
    (user.name || "?")
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  if (idx >= 1 && idx <= 9) {
    return `<img src="/avatars/avatar${idx}.png" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;${border}" onerror="this.parentElement.innerHTML='<span style=\'font-size:${Math.round(size * 0.35)}px;font-weight:800;color:#fff;\'>${initials}</span>';this.parentElement.style.background='#2563eb'"/>`;
  }
  return `<span style="font-size:${Math.round(size * 0.35)}px;font-weight:800;color:#fff;">${initials}</span>`;
}

function setLoggedIn(user) {
  currentUser = user;
  // Always clear search bar on login
  const si = document.getElementById("srchInput");
  if (si) {
    si.value = "";
    document.getElementById("srchClr").style.display = "none";
  }
  document.getElementById("srchDrop").style.display = "none";
  document.getElementById("authBtns").style.display = "none";
  document.getElementById("userAvatarWrap").style.display = "flex";
  document.getElementById("notifWrap").style.display = "flex";
  const av = document.getElementById("userAvatar");
  av.innerHTML = "";
  av.style.background = "";
  av.style.overflow = "hidden";
  av.style.padding = "0";
  const idx = user.avatarIndex || user.avatar_index || 0;
  if (idx >= 1 && idx <= 9) {
    const img = document.createElement("img");
    img.src = `/avatars/avatar${idx}.png`;
    img.style.cssText =
      "width:100%;height:100%;object-fit:cover;border-radius:50%;";
    img.onerror = () => {
      av.innerHTML = "";
      av.style.background = user.avatarColor || "#2563eb";
      const initials = (user.name || "?")
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
      av.textContent = initials;
    };
    av.appendChild(img);
  } else {
    const initials =
      user.initials ||
      (user.name || "?")
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    av.textContent = initials;
    av.style.background = user.avatarColor || "#2563eb";
  }
  document.getElementById("umName").textContent = user.name;
  document.getElementById("umEmail").textContent = user.email;
  const adminItem = document.getElementById("adminAqiMenuItem");
  const adminPasswordItem = document.getElementById("adminPasswordMenuItem");
  const alertSettingsItem = document.getElementById("alertSettingsMenuItem");
  const avatarItem = document.getElementById("avatarMenuItem");
  if (adminItem) {
    adminItem.style.display = user.role === "admin" ? "block" : "none";
  }
  if (adminPasswordItem) {
    adminPasswordItem.style.display = user.role === "admin" ? "block" : "none";
  }
  if (alertSettingsItem) {
    alertSettingsItem.style.display = user.role === "admin" ? "none" : "block";
  }
  if (avatarItem) {
    avatarItem.style.display = "block";
  }
  // Auto-fix missing coordinates by matching location name to CITIES
  if ((!user.lat || !user.lon) && user.location) {
    const locLower = user.location.toLowerCase().trim();
    const matched =
      CITIES.find(
        (c) =>
          c.city.toLowerCase() === locLower ||
          c.d.toLowerCase() === locLower ||
          c.city.toLowerCase().includes(locLower) ||
          locLower.includes(c.city.toLowerCase()),
      ) || CITIES.find((c) => c.d.toLowerCase().includes(locLower));
    if (matched && authToken) {
      user.lat = matched.lat;
      user.lon = matched.lon;
      user.district = matched.d;
      currentUser.lat = matched.lat;
      currentUser.lon = matched.lon;
      currentUser.district = matched.d;
      // Silently update in backend
      fetch(`${API}/auth/update-location`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          location: user.location,
          district: matched.d,
          lat: matched.lat,
          lon: matched.lon,
        }),
      }).catch(() => {});
    }
  }
  // Fly to user location if available
  if (user.lat && user.lon) {
    setTimeout(
      () =>
        map.flyTo([user.lat, user.lon], 9, {
          animate: true,
          duration: 1.2,
        }),
      500,
    );
  }
  loadNotifications();
  // Update alert buttons — hide guest form, show direct send
  const guestBtn = document.getElementById("alertBtnGuest");
  const userBtn = document.getElementById("alertBtnUser");
  if (guestBtn) guestBtn.style.display = "none";
  if (userBtn) userBtn.style.display = "flex";
}

// LOGOUT
function logout() {
  authToken = null;
  currentUser = null;
  localStorage.removeItem("wn_token");
  document.getElementById("authBtns").style.display = "flex";
  document.getElementById("userAvatarWrap").style.display = "none";
  document.getElementById("notifWrap").style.display = "flex";
  document.getElementById("notifBadge").classList.remove("show");
  const adminItem = document.getElementById("adminAqiMenuItem");
  const adminPasswordItem = document.getElementById("adminPasswordMenuItem");
  const alertSettingsItem = document.getElementById("alertSettingsMenuItem");
  const avatarItem = document.getElementById("avatarMenuItem");
  if (adminItem) adminItem.style.display = "none";
  if (adminPasswordItem) adminPasswordItem.style.display = "none";
  if (alertSettingsItem) alertSettingsItem.style.display = "block";
  if (avatarItem) avatarItem.style.display = "none";
  // Restore guest alert button
  const guestBtn = document.getElementById("alertBtnGuest");
  const userBtn = document.getElementById("alertBtnUser");
  if (guestBtn) guestBtn.style.display = "flex";
  if (userBtn) userBtn.style.display = "none";
  closeUserMenu();
  loadNotifications();
}

// TOGGLE USER MENU
function toggleUserMenu() {
  document.getElementById("userMenu").classList.toggle("show");
  document.getElementById("notifDrop").classList.remove("show");
}
function closeUserMenu() {
  document.getElementById("userMenu").classList.remove("show");
}

// ── NOTIFICATIONS ─────────────────────────────────────────────
function toggleNotifDrop() {
  document.getElementById("notifDrop").classList.toggle("show");
  document.getElementById("userMenu").classList.remove("show");
  if (document.getElementById("notifDrop").classList.contains("show"))
    loadNotifications();
}

const NOTIF_ICONS = {
  aqi: "🏭",
  rain: "🌧️",
  wind: "💨",
  snow: "❄️",
  temp: "🥶",
  daily: "🌅",
  system: "🔔",
  news: "📰",
};
let cachedNotifications = [];

function escapeHtml(text) {
  return String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return Math.floor(s / 60) + "m ago";
  if (s < 86400) return Math.floor(s / 3600) + "h ago";
  return Math.floor(s / 86400) + "d ago";
}

async function loadNotifications() {
  try {
    const publicRes = await fetch(`${API}/notifications/public`);
    const publicData = publicRes.ok
      ? await publicRes.json()
      : { notifications: [] };

    let personalData = { notifications: [], unreadCount: 0 };
    if (authToken) {
      const res = await fetch(`${API}/notifications`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        personalData = await res.json();
      }
    }

    const merged = [
      ...(publicData.notifications || []).map((n) => ({
        ...n,
        read: true,
        isPublic: true,
      })),
      ...(personalData.notifications || []).map((n) => ({
        ...n,
        isPublic: false,
      })),
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    cachedNotifications = merged;

    const readAllBtn = document.querySelector(".nd-readall");
    if (readAllBtn) {
      readAllBtn.style.display = authToken ? "inline-flex" : "none";
    }

    const badge = document.getElementById("notifBadge");
    if ((personalData.unreadCount || 0) > 0) {
      badge.textContent =
        personalData.unreadCount > 9 ? "9+" : personalData.unreadCount;
      badge.classList.add("show");
    } else badge.classList.remove("show");

    const list = document.getElementById("ndList");
    if (!merged.length) {
      list.innerHTML =
        '<div class="nd-empty">No news yet. Check back soon.</div>';
      return;
    }

    list.innerHTML = merged
      .map(
        (n, i) => `
          <div class="nd-item${n.read ? "" : " unread"}" onclick="openNotificationDetail(${i})">
            <div class="nd-ico ${n.severity}">${NOTIF_ICONS[n.type] || "🔔"}</div>
            <div class="nd-body">
              <div class="nd-ntitle">${escapeHtml(n.title)}</div>
              <div class="nd-msg">${escapeHtml(n.message)}</div>
              <div class="nd-time">${timeAgo(n.createdAt)}</div>
            </div>
            ${n.isPublic ? '<div style="font-size:9px;color:var(--sub);font-weight:700;align-self:flex-start;">PUBLIC</div>' : n.read ? "" : '<div class="nd-dot"></div>'}
          </div>`,
      )
      .join("");
  } catch (e) {
    console.error("Notifications error:", e);
  }
}

async function openNotificationDetail(index) {
  const n = cachedNotifications[index];
  if (!n) return;

  if (authToken && !n.isPublic && !n.read) {
    await fetch(`${API}/notifications/${n._id}/read`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${authToken}` },
    });
  }

  const existing = document.getElementById("notifDetailModal");
  if (existing) existing.remove();
  const details = n.details || n.message;
  const advisory = n.advisory || "No suggestion generated yet.";
  const html = `
    <div id="notifDetailModal" style="position:fixed;inset:0;z-index:5100;display:flex;align-items:center;justify-content:center;padding:16px;">
      <div style="position:absolute;inset:0;background:rgba(2,6,23,0.75);backdrop-filter:blur(8px);" onclick="document.getElementById('notifDetailModal').remove();loadNotifications();"></div>
      <div style="position:relative;z-index:1;width:min(560px,96vw);max-height:86vh;overflow:auto;background:var(--card);border:1px solid var(--border);border-radius:16px;padding:18px;">
        <button onclick="document.getElementById('notifDetailModal').remove();loadNotifications();" style="position:absolute;top:10px;right:10px;border:none;background:rgba(148,163,184,0.2);color:var(--text);width:28px;height:28px;border-radius:50%;cursor:pointer;">✕</button>
        <div style="font-size:11px;color:var(--sub);font-weight:700;letter-spacing:1px;text-transform:uppercase;">${n.isPublic ? "Public News" : "Personal Alert"}</div>
        <div style="font-size:18px;font-weight:800;color:var(--text);margin-top:6px;">${escapeHtml(n.title)}</div>
        <div style="font-size:11px;color:var(--sub);margin-top:4px;">${timeAgo(n.createdAt)}${n.location ? ` • ${escapeHtml(n.location)}` : ""}</div>
        <div style="margin-top:14px;padding:12px;border-radius:10px;background:var(--cell);border:1px solid var(--border);font-size:13px;color:var(--text);line-height:1.6;">${escapeHtml(details)}</div>
        <div style="margin-top:12px;padding:12px;border-radius:10px;background:rgba(37,99,235,0.12);border:1px solid rgba(59,130,246,0.3);">
          <div style="font-size:10px;color:#93c5fd;text-transform:uppercase;letter-spacing:1px;font-weight:700;">AI Suggestion</div>
          <div style="font-size:13px;color:var(--text);margin-top:6px;line-height:1.6;">${escapeHtml(advisory)}</div>
        </div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML("beforeend", html);
  await loadNotifications();
}

async function markAllRead() {
  if (!authToken) return;
  await fetch(`${API}/notifications/read-all`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${authToken}` },
  });
  loadNotifications();
  document.getElementById("notifDrop").classList.remove("show");
}

// Close dropdowns on outside click
document.addEventListener("click", (e) => {
  if (!e.target.closest("#notifWrap") && !e.target.closest("#notifDrop"))
    document.getElementById("notifDrop").classList.remove("show");
  if (!e.target.closest("#userAvatarWrap") && !e.target.closest("#userMenu"))
    document.getElementById("userMenu").classList.remove("show");
});

// ── SEND DIRECT ALERT TO LOGGED IN USER ──────────────────────────
async function sendDirectAlert() {
  if (!currentUser || !activeCity) return;
  const btn = document.getElementById("alertBtnUser");
  const origText = btn.innerHTML;
  btn.innerHTML = "⏳ Sending...";
  btn.disabled = true;
  try {
    const res = await fetch(`${API}/alerts/send-direct`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        city: activeCity.city,
        district: activeCity.d,
        lat: activeCity.lat,
        lon: activeCity.lon,
        aqi: activeCity.aqi,
        weather: activeCity.wx,
      }),
    });
    if (res.ok) {
      btn.innerHTML = "✅ Alert Sent!";
      btn.style.background = "linear-gradient(135deg,#059669,#047857)";
      setTimeout(() => {
        btn.innerHTML = origText;
        btn.disabled = false;
        btn.style.background = "linear-gradient(135deg,#059669,#0284c7)";
      }, 3000);
    } else {
      btn.innerHTML = "❌ Failed";
      setTimeout(() => {
        btn.innerHTML = origText;
        btn.disabled = false;
      }, 2000);
    }
  } catch (e) {
    btn.innerHTML = "❌ Error";
    setTimeout(() => {
      btn.innerHTML = origText;
      btn.disabled = false;
    }, 2000);
  }
}

// ── GENERATE LOGIN NOTIFICATION ─────────────────────────────────
async function generateLoginNotification(user) {
  try {
    // Get city data for user location — by coords or name
    let nearest = null;
    if (user.lat && user.lon) {
      nearest = CITIES.reduce((prev, curr) => {
        const pd =
          Math.abs(prev.lat - user.lat) + Math.abs(prev.lon - user.lon);
        const cd =
          Math.abs(curr.lat - user.lat) + Math.abs(curr.lon - user.lon);
        return cd < pd ? curr : prev;
      });
    } else if (user.location) {
      const loc = user.location.toLowerCase().trim();
      nearest = CITIES.find(
        (c) =>
          c.city.toLowerCase() === loc ||
          c.d.toLowerCase() === loc ||
          c.city.toLowerCase().includes(loc) ||
          loc.includes(c.city.toLowerCase()),
      );
      if (!nearest)
        nearest = CITIES.find((c) => c.d.toLowerCase().includes(loc));
      if (!nearest)
        nearest = CITIES.find((c) => c.city === "Kathmandu") || CITIES[0];
    }
    if (!nearest) return;
    const lv = gl(nearest.aqi);
    const msg = `Welcome back, ${user.name.split(" ")[0]}! ${user.location}: AQI ${nearest.aqi} (${lv.lbl}), ${nearest.wx.temp}°C. ${lv.adv}`;
    // Add to notification list UI (local, not saved to DB)
    const list = document.getElementById("ndList");
    if (list) {
      const existing = list.querySelector(".nd-empty");
      if (existing) existing.remove();
      const item = document.createElement("div");
      item.className = "nd-item unread";
      item.innerHTML = `
            <div class="nd-ico info">🌅</div>
            <div class="nd-body">
              <div class="nd-ntitle">📍 Your Location: ${user.location || nearest.city}</div>
              <div class="nd-msg">${msg}</div>
              <div class="nd-time">just now</div>
            </div>
            <div class="nd-dot"></div>`;
      list.prepend(item);
      // Show badge
      const badge = document.getElementById("notifBadge");
      badge.textContent = "1";
      badge.classList.add("show");
    }
  } catch (e) {
    console.error("Login notif error:", e);
  }
}

// ── PROFILE MODAL ─────────────────────────────────────────────
function openProfile() {
  closeUserMenu();
  if (!currentUser) return;

  // Find nearest city — by coords if available, else by name match
  let nearest = null;
  if (currentUser.lat && currentUser.lon) {
    nearest = CITIES.reduce((prev, curr) => {
      const pd =
        Math.abs(prev.lat - currentUser.lat) +
        Math.abs(prev.lon - currentUser.lon);
      const cd =
        Math.abs(curr.lat - currentUser.lat) +
        Math.abs(curr.lon - currentUser.lon);
      return cd < pd ? curr : prev;
    });
  } else if (currentUser.location) {
    // Match by city or district name (case-insensitive)
    const loc = currentUser.location.toLowerCase().trim();
    nearest =
      CITIES.find(
        (c) =>
          c.city.toLowerCase() === loc ||
          c.d.toLowerCase() === loc ||
          c.city.toLowerCase().includes(loc) ||
          loc.includes(c.city.toLowerCase()),
      ) || null;
    // Fallback: find by district
    if (!nearest)
      nearest = CITIES.find((c) => c.d.toLowerCase().includes(loc)) || null;
    // Last resort: just use Kathmandu
    if (!nearest)
      nearest = CITIES.find((c) => c.city === "Kathmandu") || CITIES[0];
  }
  const lv = nearest ? gl(nearest.aqi) : null;
  const actions =
    currentUser.role === "admin"
      ? `
      <button onclick="document.getElementById('profileModal').remove();openAvatarPicker();" style="flex:1;padding:10px;border-radius:10px;background:var(--cell);border:1px solid var(--border);color:var(--text);font-size:12px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;">🖼️ Change Avatar</button>
      <button onclick="document.getElementById('profileModal').remove();flyToUserLocation();" style="flex:1;padding:10px;border-radius:10px;background:var(--accent);border:none;color:#fff;font-size:12px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;">📍 My Location</button>
    `
      : `
      <button onclick="document.getElementById('profileModal').remove();openAlertSettings();" style="flex:1;padding:10px;border-radius:10px;background:var(--cell);border:1px solid var(--border);color:var(--text);font-size:12px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;">⚙️ Alert Settings</button>
      <button onclick="document.getElementById('profileModal').remove();flyToUserLocation();" style="flex:1;padding:10px;border-radius:10px;background:var(--accent);border:none;color:#fff;font-size:12px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;">📍 My Location</button>
    `;

  const html = `
      <div style="position:fixed;inset:0;z-index:5000;display:flex;align-items:center;justify-content:center;padding:16px;" id="profileModal">
        <div style="position:absolute;inset:0;background:rgba(0,0,0,0.75);backdrop-filter:blur(8px);" onclick="document.getElementById('profileModal').remove()"></div>
        <div style="position:relative;z-index:1;width:min(380px,100%);background:var(--card);border:1px solid var(--border);border-radius:20px;overflow:hidden;box-shadow:0 32px 80px rgba(0,0,0,0.5);">
          <!-- X close button top right -->
          <button onclick="document.getElementById('profileModal').remove()" style="position:absolute;top:12px;right:12px;z-index:10;width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,0.15);border:none;color:#fff;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;">✕</button>
          <!-- Header -->
          <div style="background:linear-gradient(135deg,#0f172a,#1e3a8a);padding:28px 24px 22px;text-align:center;">
            <div style="width:72px;height:72px;border-radius:50%;overflow:hidden;margin:0 auto 10px;border:3px solid rgba(255,255,255,0.3);background:${currentUser.avatarIndex ? "transparent" : "#2563eb"};display:flex;align-items:center;justify-content:center;">
              ${
                currentUser.avatarIndex >= 1 && currentUser.avatarIndex <= 9
                  ? `<img src="/avatars/avatar${currentUser.avatarIndex}.png" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none';this.parentElement.innerHTML='<span style=\'font-size:24px;font-weight:800;color:#fff;\'>${currentUser.initials || currentUser.name[0]}</span>';this.parentElement.style.background='#2563eb'"/>`
                  : `<span style="font-size:24px;font-weight:800;color:#fff;">${currentUser.initials || currentUser.name[0]}</span>`
              }
            </div>
            <div style="font-size:18px;font-weight:800;color:#fff;">${currentUser.name}</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.6);margin-top:2px;">${currentUser.email}</div>
            <div style="font-size:10px;color:rgba(255,255,255,0.45);margin-top:4px;">📍 ${currentUser.location || "Location not set"}</div>
          </div>
          <!-- Weather grid from real CITIES data -->
          <div style="padding:18px 20px;">
            <div style="font-size:9px;font-weight:700;color:var(--sub);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">Live Conditions — ${nearest ? nearest.city : currentUser.location}</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px;">
              <div style="background:var(--cell);border-radius:10px;padding:12px;text-align:center;border:1px solid var(--border);">
                <div style="font-size:18px;margin-bottom:3px;">🏭</div>
                <div style="font-size:16px;font-weight:800;color:${lv ? lv.c : "var(--text)"};">${nearest ? nearest.aqi : "—"}</div>
                <div style="font-size:9px;color:var(--sub);text-transform:uppercase;margin-top:2px;">${lv ? lv.lbl : "AQI"}</div>
              </div>
              <div style="background:var(--cell);border-radius:10px;padding:12px;text-align:center;border:1px solid var(--border);">
                <div style="font-size:18px;margin-bottom:3px;">🌡️</div>
                <div style="font-size:16px;font-weight:800;color:var(--text);">${nearest ? nearest.wx.temp + "°C" : "—"}</div>
                <div style="font-size:9px;color:var(--sub);text-transform:uppercase;margin-top:2px;">Temperature</div>
              </div>
              <div style="background:var(--cell);border-radius:10px;padding:12px;text-align:center;border:1px solid var(--border);">
                <div style="font-size:18px;margin-bottom:3px;">💨</div>
                <div style="font-size:16px;font-weight:800;color:var(--text);">${nearest ? nearest.wx.wind + " km/h" : "—"}</div>
                <div style="font-size:9px;color:var(--sub);text-transform:uppercase;margin-top:2px;">Wind ${nearest ? nearest.wx.windDir : ""}</div>
              </div>
              <div style="background:var(--cell);border-radius:10px;padding:12px;text-align:center;border:1px solid var(--border);">
                <div style="font-size:18px;margin-bottom:3px;">💧</div>
                <div style="font-size:16px;font-weight:800;color:var(--text);">${nearest ? nearest.wx.humidity + "%" : "—"}</div>
                <div style="font-size:9px;color:var(--sub);text-transform:uppercase;margin-top:2px;">Humidity</div>
              </div>
              <div style="background:var(--cell);border-radius:10px;padding:12px;text-align:center;border:1px solid var(--border);">
                <div style="font-size:18px;margin-bottom:3px;">🌧️</div>
                <div style="font-size:16px;font-weight:800;color:var(--text);">${nearest ? nearest.wx.rain + " mm" : "—"}</div>
                <div style="font-size:9px;color:var(--sub);text-transform:uppercase;margin-top:2px;">Rainfall</div>
              </div>
              <div style="background:var(--cell);border-radius:10px;padding:12px;text-align:center;border:1px solid var(--border);">
                <div style="font-size:18px;margin-bottom:3px;">☀️</div>
                <div style="font-size:16px;font-weight:800;color:var(--text);">${nearest ? nearest.wx.uv + "/11" : "—"}</div>
                <div style="font-size:9px;color:var(--sub);text-transform:uppercase;margin-top:2px;">UV Index</div>
              </div>
            </div>
            <!-- Quick action buttons -->
            <div style="display:flex;gap:8px;">
              ${actions}
            </div>
          </div>
        </div>
      </div>`;
  document.body.insertAdjacentHTML("beforeend", html);
}

function flyToUserLocation() {
  if (currentUser && currentUser.lat && currentUser.lon)
    map.flyTo([currentUser.lat, currentUser.lon], 11, {
      animate: true,
      duration: 1.0,
    });
}

// ── ALERT SETTINGS MODAL ──────────────────────────────────────
function openAlertSettings() {
  closeUserMenu();
  if (!currentUser) return;
  if (currentUser.role === "admin") return;
  const alerts = currentUser.alerts || {
    aqi: true,
    rain: true,
    wind: false,
    snow: false,
    temp: false,
    daily: true,
  };
  const opts = [
    { key: "aqi", ico: "🏭", label: "AQI Unhealthy (>150)" },
    { key: "rain", ico: "🌧️", label: "Heavy Rain (>5mm)" },
    { key: "wind", ico: "💨", label: "Strong Wind (>40km/h)" },
    { key: "snow", ico: "❄️", label: "Snowfall Detected" },
    { key: "temp", ico: "🥶", label: "Below Freezing (0°C)" },
    { key: "daily", ico: "🌅", label: "Daily Morning Summary" },
  ];
  const html = `
      <div style="position:fixed;inset:0;z-index:5000;display:flex;align-items:center;justify-content:center;padding:16px;" id="alertSettingsModal">
        <div style="position:absolute;inset:0;background:rgba(0,0,0,0.75);backdrop-filter:blur(8px);" onclick="document.getElementById('alertSettingsModal').remove()"></div>
        <div style="position:relative;z-index:1;width:min(380px,100%);background:var(--card);border:1px solid var(--border);border-radius:20px;overflow:hidden;box-shadow:0 32px 80px rgba(0,0,0,0.5);">
          <div style="background:linear-gradient(135deg,#1e3a8a,#1d4ed8);padding:18px 22px;display:flex;align-items:center;justify-content:space-between;">
            <div>
              <div style="font-size:16px;font-weight:800;color:#fff;">⚙️ Alert Settings</div>
              <div style="font-size:10px;color:rgba(255,255,255,0.6);margin-top:2px;">Choose what alerts you receive</div>
            </div>
            <button onclick="document.getElementById('alertSettingsModal').remove()" style="background:rgba(255,255,255,0.15);border:none;color:#fff;width:26px;height:26px;border-radius:50%;cursor:pointer;font-size:13px;">✕</button>
          </div>
          <div style="padding:18px 22px;">
            <div style="font-size:10px;font-weight:700;color:var(--sub);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">📍 Location: ${currentUser.location || "Not set"}</div>
            ${opts
              .map(
                (o) => `
            <label style="display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:10px;background:var(--cell);border:1px solid var(--border);margin-bottom:8px;cursor:pointer;transition:border-color 0.2s;">
              <input type="checkbox" id="as_${o.key}" ${alerts[o.key] ? "checked" : ""} style="accent-color:var(--accent);width:15px;height:15px;">
              <span style="font-size:16px;">${o.ico}</span>
              <span style="font-size:12px;font-weight:600;color:var(--text);">${o.label}</span>
            </label>`,
              )
              .join("")}
            <button onclick="saveAlertSettings()" style="width:100%;padding:11px;border-radius:10px;background:linear-gradient(135deg,#2563eb,#0284c7);color:#fff;font-size:13px;font-weight:700;border:none;cursor:pointer;font-family:'DM Sans',sans-serif;margin-top:4px;">Save Settings →</button>
          </div>
        </div>
      </div>`;
  document.body.insertAdjacentHTML("beforeend", html);
}

async function saveAlertSettings() {
  const keys = ["aqi", "rain", "wind", "snow", "temp", "daily"];
  const alerts = {};
  keys.forEach((k) => {
    alerts[k] = document.getElementById("as_" + k)?.checked || false;
  });
  try {
    const res = await fetch(`${API}/auth/alerts`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ alerts }),
    });
    if (res.ok) {
      currentUser.alerts = alerts;
      document.getElementById("alertSettingsModal")?.remove();
    }
  } catch (e) {
    console.error("Save alerts error:", e);
  }
}

// ── PUBLIC ALERT MODAL (for non-logged-in users) ─────────────────
function openAlert() {
  const modal = document.getElementById("alrtModal");
  if (modal) {
    modal.style.display = "flex";
    // Set location from active city if available
    if (activeCity) {
      const amSub = document.getElementById("amSub");
      if (amSub)
        amSub.textContent = `Stay informed about ${activeCity.city} conditions`;
    }
  }
}

function closeAlert() {
  const modal = document.getElementById("alrtModal");
  if (modal) modal.style.display = "none";
}

async function submitAlert() {
  const name = (document.getElementById("aName")?.value || "").trim();
  const email = (document.getElementById("aEmail")?.value || "").trim();

  if (!name || !email) {
    alert("Please fill in your name and email.");
    return;
  }

  if (!email.includes("@")) {
    alert("Please enter a valid email address.");
    return;
  }

  if (!activeCity) {
    alert("Please select a location on the map first.");
    return;
  }

  const btn = document.querySelector("#alrtModal .f-submit");
  if (!btn) return;

  const origText = btn.textContent;
  btn.textContent = "⏳ Setting up...";
  btn.disabled = true;

  try {
    // Send to public endpoint with alert preferences
    const message = `Weather alert preferences set for ${activeCity.city}: ${
      document.getElementById("cAqi")?.checked ? "AQI, " : ""
    }${document.getElementById("cRain")?.checked ? "Rain, " : ""}${
      document.getElementById("cWind")?.checked ? "Wind, " : ""
    }${document.getElementById("cSnow")?.checked ? "Snow, " : ""}${
      document.getElementById("cTemp")?.checked ? "Temperature, " : ""
    }${document.getElementById("cDaily")?.checked ? "Daily Summary" : ""}`;

    const res = await fetch(`${API}/auth/send-alert-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        name,
        location: activeCity.city,
        message,
        severity: "moderate",
        weather: {
          temp: activeCity.wx?.temp,
          feelsLike: activeCity.wx?.feelsLike,
          humidity: activeCity.wx?.humidity,
          wind: activeCity.wx?.wind,
          rain: activeCity.wx?.rain,
          snow: activeCity.wx?.snow,
        },
        alertPrefs: {
          aqi: Boolean(document.getElementById("cAqi")?.checked),
          rain: Boolean(document.getElementById("cRain")?.checked),
          wind: Boolean(document.getElementById("cWind")?.checked),
          snow: Boolean(document.getElementById("cSnow")?.checked),
          temp: Boolean(document.getElementById("cTemp")?.checked),
          daily: Boolean(document.getElementById("cDaily")?.checked),
        },
      }),
    });

    if (!res.ok) {
      const raw = await res.text();
      let errMsg = "Failed to set up alert";
      try {
        const data = JSON.parse(raw || "{}");
        errMsg = data.error || data.details || errMsg;
      } catch {
        if (raw) errMsg = raw;
      }
      throw new Error(errMsg);
    }

    // Show success state
    const form = document.getElementById("amForm");
    const okBox = document.getElementById("amOk");
    const okTxt = document.getElementById("amOkTxt");

    if (form && okBox) {
      form.style.display = "none";
      okBox.style.display = "block";
      if (okTxt)
        okTxt.textContent = `Alerts activated for ${activeCity.city}. You'll receive updates at ${email}.`;

      // Auto-close after 3 seconds
      setTimeout(() => closeAlert(), 3000);
    }
  } catch (err) {
    alert("Alert setup failed: " + err.message);
    btn.textContent = origText;
    btn.disabled = false;
  }
}

const avatarMenuItem = document.getElementById("avatarMenuItem");
if (avatarMenuItem) avatarMenuItem.style.display = "none";
loadNotifications();
