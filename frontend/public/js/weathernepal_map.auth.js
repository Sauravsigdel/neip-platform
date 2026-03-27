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
let adminAqiDraft = OFFICIAL_AQI_STATIONS.map((r) => ({ ...r }));

function normalizeStationName(name) {
  return String(name || "")
    .trim()
    .toLowerCase();
}

function renderAdminAqiTable() {
  const body = document.getElementById("adminAqiTableBody");
  if (!body) return;
  body.innerHTML = adminAqiDraft
    .map(
      (row, i) => `
          <tr>
            <td style="padding:6px 8px;border-bottom:1px solid var(--border);font-size:12px;color:var(--text);font-weight:600;">${row.station}</td>
            <td style="padding:6px 8px;border-bottom:1px solid var(--border);font-size:11px;color:var(--sub);">${row.city}</td>
            <td style="padding:6px 8px;border-bottom:1px solid var(--border);">
              <input type="number" min="0" max="500" step="1" value="${Number.isFinite(row.aqi) ? row.aqi : ""}" oninput="updateAdminAqiValue(${i}, this.value)" class="wn-fi" style="height:30px;padding:6px 8px;font-size:12px;" placeholder="-" />
            </td>
          </tr>`,
    )
    .join("");
}

function updateAdminAqiValue(index, value) {
  const n = Number(value);
  adminAqiDraft[index].aqi = Number.isFinite(n) ? Math.round(n) : null;
}

async function hydrateAdminAqiDraftFromServer() {
  adminAqiDraft = OFFICIAL_AQI_STATIONS.map((r) => ({ ...r }));
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
      .map(
        (r) =>
          `<div style="display:flex;justify-content:space-between;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);font-size:11px;"><span style="color:var(--text);font-weight:600;">${r.stationName}</span><span style="color:${Number.isFinite(r.aqi) ? "#f97316" : "var(--sub)"};">${Number.isFinite(r.aqi) ? r.aqi : "-"}</span><span style="color:var(--sub);">${new Date(r.timestamp).toLocaleString()}</span></div>`,
      )
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

  const currentPassword = prompt("Enter current admin password:");
  if (!currentPassword) return;

  const newPassword = prompt("Enter new admin password (min 6 chars):");
  if (!newPassword) return;
  if (newPassword.length < 6) {
    alert("New password must be at least 6 characters.");
    return;
  }

  const confirmPassword = prompt("Confirm new admin password:");
  if (confirmPassword !== newPassword) {
    alert("New password and confirmation do not match.");
    return;
  }

  try {
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
    alert("Admin password updated successfully.");
  } catch (err) {
    alert(err.message || "Password update failed.");
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
  if (adminItem) {
    adminItem.style.display = user.role === "admin" ? "block" : "none";
  }
  if (adminPasswordItem) {
    adminPasswordItem.style.display = user.role === "admin" ? "block" : "none";
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
  // Generate location-based notification on login
  setTimeout(() => generateLoginNotification(user), 3000);
}

// LOGOUT
function logout() {
  authToken = null;
  currentUser = null;
  localStorage.removeItem("wn_token");
  document.getElementById("authBtns").style.display = "flex";
  document.getElementById("userAvatarWrap").style.display = "none";
  document.getElementById("notifWrap").style.display = "none";
  document.getElementById("notifBadge").classList.remove("show");
  const adminItem = document.getElementById("adminAqiMenuItem");
  const adminPasswordItem = document.getElementById("adminPasswordMenuItem");
  if (adminItem) adminItem.style.display = "none";
  if (adminPasswordItem) adminPasswordItem.style.display = "none";
  // Restore guest alert button
  const guestBtn = document.getElementById("alertBtnGuest");
  const userBtn = document.getElementById("alertBtnUser");
  if (guestBtn) guestBtn.style.display = "flex";
  if (userBtn) userBtn.style.display = "none";
  closeUserMenu();
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
};
function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return Math.floor(s / 60) + "m ago";
  if (s < 86400) return Math.floor(s / 3600) + "h ago";
  return Math.floor(s / 86400) + "d ago";
}

async function loadNotifications() {
  if (!authToken) return;
  try {
    const res = await fetch(`${API}/notifications`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (!res.ok) return;
    const data = await res.json();
    const badge = document.getElementById("notifBadge");
    if (data.unreadCount > 0) {
      badge.textContent = data.unreadCount > 9 ? "9+" : data.unreadCount;
      badge.classList.add("show");
    } else badge.classList.remove("show");
    const list = document.getElementById("ndList");
    if (!data.notifications.length) {
      list.innerHTML = '<div class="nd-empty">No notifications yet 🎉</div>';
      return;
    }
    list.innerHTML = data.notifications
      .map(
        (n) => `
          <div class="nd-item${n.read ? "" : " unread"}" onclick="markRead('${n._id}',this)">
            <div class="nd-ico ${n.severity}">${NOTIF_ICONS[n.type] || "🔔"}</div>
            <div class="nd-body">
              <div class="nd-ntitle">${n.title}</div>
              <div class="nd-msg">${n.message}</div>
              <div class="nd-time">${timeAgo(n.createdAt)}</div>
            </div>
            ${n.read ? "" : '<div class="nd-dot"></div>'}
          </div>`,
      )
      .join("");
  } catch (e) {
    console.error("Notifications error:", e);
  }
}

async function markRead(id, el) {
  if (!authToken) return;
  el.classList.remove("unread");
  el.querySelector(".nd-dot")?.remove();
  await fetch(`${API}/notifications/${id}/read`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${authToken}` },
  });
  loadNotifications();
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
              <button onclick="document.getElementById('profileModal').remove();openAlertSettings();" style="flex:1;padding:10px;border-radius:10px;background:var(--cell);border:1px solid var(--border);color:var(--text);font-size:12px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;">⚙️ Alert Settings</button>
              <button onclick="document.getElementById('profileModal').remove();flyToUserLocation();" style="flex:1;padding:10px;border-radius:10px;background:var(--accent);border:none;color:#fff;font-size:12px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif;">📍 My Location</button>
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
