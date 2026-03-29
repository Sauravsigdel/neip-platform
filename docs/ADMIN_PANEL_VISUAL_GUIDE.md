# 🎨 Admin Panel - Visual Guide & What You'll See

## ✨ Updated Admin Panel Features

Your admin panel now has **improved styling** with better visibility for all PM input fields and a cleaner data table.

---

## 🔗 Access Your Admin Panel

**URL:**

```
http://localhost:5173/admin-panel.html
```

---

## 📋 What You'll See (Step by Step)

### **Screen 1: Login Modal** (if not logged in)

```
┌─────────────────────────────────┐
│  Admin Login                    │
├─────────────────────────────────┤
│                                 │
│  📧 Email Address               │
│  ┌─────────────────────────────┐│
│  │ sauravsigdel00000@gmail.com ││
│  └─────────────────────────────┘│
│                                 │
│  🔐 Password                    │
│  ┌─────────────────────────────┐│
│  │ ••••••••                    ││
│  └─────────────────────────────┘│
│                                 │
│  [LOGIN BUTTON]                 │
│                                 │
└─────────────────────────────────┘
```

---

### **Screen 2: Main Admin Dashboard** (After Login)

#### **Top Section - Header**

```
    🌏 WeatherNepal Admin Panel
    Manual Air Quality Data Upload

👤 Logged in as: sauravsigdel00000@gmail.com
                                    [LOGOUT]
```

---

#### **Section 1: 📊 Upload Air Quality Data**

##### **A) Station Selection**

```
Air Quality Station *

⌄ ┌──────────────────────┐
  │ -- Select Station --  │
  │ Kathmandu            │
  │ Pokhara              │
  │ Bhaktapur            │
  │ Lalitpur             │
  │ Ghorahi              │
  │ Birgunj              │
  │ Janakpur             │
  │ Nepalgunj            │
  │ Dharan               │
  │ Biratnagar           │
  └──────────────────────┘
```

---

##### **B) PM Values Input (Now Highlighted!)**

Three **blue-highlighted cards** showing:

```
┌─────────────────────────────────────────────────────────────┐
│                     PM Input Cards (Row 1)                  │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─ 🔬 PM2.5 (µg/m³) *  ─┐  ┌─ 🌫️ PM10 (µg/m³) * ─┐  │
│  │                        │  │                       │  │
│  │ ┌──────────────────┐ │  │ ┌──────────────────┐ │  │
│  │ │ e.g., 45.5      │ │  │ │ e.g., 89.2      │ │  │
│  │ └──────────────────┘ │  │ └──────────────────┘ │  │
│  └────────────────────┘  │  └───────────────────┘  │
│                                                     │
│  ┌─ 💨 PM1 (µg/m³) *   ─┐                          │
│  │                      │                          │
│  │ ┌──────────────────┐ │                          │
│  │ │ e.g., 25.3      │ │                          │
│  │ └──────────────────┘ │                          │
│  └──────────────────────┘                          │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

##### **C) Optional Fields**

```
┌─────────────────────────────────────────────────────────────┐
│                     Optional Fields (Row 2)                 │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─ AQI (Optional) ─┐  ┌─ CO (Optional) ─┐  ┌─ O3 ─┐     │
│  │ ┌──────────────┐ │  │ ┌──────────────┐ │  │ ─┐  │     │
│  │ │ e.g., 150   │ │  │ │ e.g., 1.5   │ │  │   │  │     │
│  │ └──────────────┘ │  │ └──────────────┘ │  │   │  │     │
│  └────────────────┘  │  └────────────────┘  │   │  │     │
│                                              │   │  │     │
└─────────────────────────────────────────────────────────────┘
```

---

##### **D) Action Buttons**

```
┌────────────────────────────────────┐
│  [📤 UPLOAD DATA] [CLEAR FORM]     │
└────────────────────────────────────┘
```

---

#### **Section 2: 📋 Recent Uploads**

After uploading, you'll see a **data table** with:

```
┌─────────────────────────────────────────────────────────────┐
│ STATION    | PM2.5  | PM10  | PM1    | AQI  | UPLOADED     │
├─────────────────────────────────────────────────────────────┤
│ Kathmandu  │ 47 µ/m³│ 98 µ/m³│ 30.5 µ/m³│ — │ 29 mar, 3pm │
│ Pokhara    │ 35 µ/m³│ 72 µ/m³│ 22 µ/m³ │ — │ 29 mar, 2pm │
│ Bhaktapur  │ 52 µ/m³│ 105 µ/m³│ 33 µ/m³│ — │ 28 mar, 10pm│
└─────────────────────────────────────────────────────────────┘
```

**Note:** New timestamp format shows like: **`29 mar, 3pm`** (not `Mar 29, 2026, 3:00:00 PM`)

---

## 🎨 What Changed - Styling Improvements

### **Before** → **After**

| Element              | Before                 | After                                     |
| -------------------- | ---------------------- | ----------------------------------------- |
| **PM Cards**         | Light gray border      | **Blue border with shadow, hover effect** |
| **Section Titles**   | Gray underline         | **Blue thick underline, larger font**     |
| **Table Header**     | Light gray             | **Dark blue gradient with white text**    |
| **Timestamp Format** | `Mar 29, 2026 3:00 PM` | **`29 mar, 3pm`**                         |
| **Table Rows**       | Light gray hover       | **Light blue hover**                      |
| **Form Cards**       | Static                 | **Hover animation with lift effect**      |

---

## ✅ How to Test It

### **Step 1: Open Admin Panel**

```
Go to: http://localhost:5173/admin-panel.html
```

### **Step 2: Login**

- Email: `sauravsigdel00000@gmail.com`
- Password: `Admin@123456`

### **Step 3: You'll See the Form**

- ✅ Station dropdown (clearly visible)
- ✅ **Three blue PM input cards** (PM2.5, PM10, PM1)
- ✅ Optional AQI/CO/O3 fields
- ✅ Upload & Clear buttons

### **Step 4: Fill in Sample Data**

```
Station:  Kathmandu
PM2.5:    45.5
PM10:     89.2
PM1:      30.5
```

### **Step 5: Click Upload**

- Table below will update
- Shows: `Kathmandu | 45.5 µg/m³ | 89.2 µg/m³ | 30.5 µg/m³ | — | 29 mar, 3pm`

---

## 🎯 Key Features Now Visible

### **1. PM Input Cards - Enhanced**

✅ Blue borders (not gray)  
✅ Shadow effects  
✅ Hover animations  
✅ Better spacing

### **2. Timestamp Format - Simplified**

✅ Shows `29 mar, 3pm` format  
✅ No full date  
✅ No seconds  
✅ Clean and readable

### **3. Table Header - Professional**

✅ Dark blue gradient background  
✅ White bold text  
✅ Better contrast  
✅ More clickable appearance

### **4. Station Options - All Available**

✅ Kathmandu  
✅ Pokhara  
✅ Bhaktapur  
✅ Lalitpur  
✅ Ghorahi  
✅ Birgunj  
✅ Janakpur  
✅ Nepalgunj  
✅ Dharan  
✅ Biratnagar

---

## 📱 Mobile/Tablet Support

The form is **fully responsive**:

- **Desktop:** 3 PM cards in one row
- **Tablet:** 2 cards per row
- **Mobile:** 1 card per column (vertical stack)

---

## 🔍 Troubleshooting

### **"I don't see the PM input fields"**

→ Make sure you're **logged in** first  
→ Scroll down to see all sections  
→ Make browser window wider if on mobile

### **"The form looks different"**

→ Hard refresh: **Ctrl + Shift + R** (or Cmd + Shift + R on Mac)  
→ Clear browser cache

### **"No data appears in table"**

→ Check network tab (F12 → Network)  
→ Ensure backend is running with `npm start`

---

## 🎓 Next Steps

1. **Login** to admin panel
2. **Select a station** from dropdown
3. **Enter PM values** (PM2.5, PM10, PM1)
4. **Click Upload Data**
5. **See data in table** with new timestamp format
6. **Repeat** for other stations

---

## 💡 Tips

- **PM values:** Typical range is 0-200 µg/m³
- **Timestamp:** Auto-formatted to simple format (e.g., `2 sept, 10pm`)
- **Optional fields:** Leave AQI/CO/O3 blank if not needed
- **Auto-refresh:** History table updates every 60 seconds
- **Session:** Persists for 30 days (saved in browser)

---

**You're all set! 🚀 Visit http://localhost:5173/admin-panel.html now!**
