# 🛠️ Geospatial Dictionary: Technical Implementation History & Changelog

This document provides a technical record of all development tasks, code changes, and feature enhancements completed for the Geospatial Dictionary project. It is structured chronologically by system component for technical reference.

---

## 🔗 Quick Developer Reference Links

> [!NOTE]
> * **Live Production Site**: [https://harimss-webgis.github.io/Geospatial-Dictionary/](https://harimss-webgis.github.io/Geospatial-Dictionary/)
> * **Admin Moderation Access**: [https://harimss-webgis.github.io/Geospatial-Dictionary/?admin=true](https://harimss-webgis.github.io/Geospatial-Dictionary/?admin=true)

---

## Part 1: Website Frontend & User Interface Development

### 1. Modern Responsive UI & Style System (`style.css` & `index.html`)
* **Design tokens**: Established CSS variables for dark/light themes, including background grids, panel blurs (`backdrop-filter`), typography (Outfit/Inter), transitions, and accent states (Emerald green and Cyan blue).
* **Grid Layouts**: Implemented fluid grids with CSS Flexbox and Grid to handle mobile-first responsiveness.
* **Scroll Lock fixes**: Adjusted form containers to act as vertical flex containers (`flex: 1; overflow: hidden;`), pinning the "Cancel" and "Save" buttons at the bottom of the modal viewport while keeping input fields scrollable on small mobile screens.

### 2. Search Engine & Autocomplete Logic (`app.js`)
* **Parallel Search**: Built query functions to search term titles, definition texts, and alias arrays concurrently.
* **Autocomplete recommendation dropdown**: Attached key listeners (`ArrowUp`/`ArrowDown`/`Enter`) and click observers to navigate recommendations without keyboard conflicts.
* **Outside-click close handler**: Added window listeners to automatically hide autocomplete recommendations and header dropdown menus when clicking elsewhere.

### 3. Wikipedia API Live Sync & Autofill (`app.js`)
* **Live fetch**: Configured fetch logic using JSONP/CORS to query Wikipedia descriptions on term title input.
* **Debouncing & Blur Events**: Bound an input listener with a 1000ms delay timer and a blur event handler to auto-populate fields only when typing stops or focuses out.
* **Auto-Classification Rules**: Wrote auto-tagging logic inside imports to parse descriptions and automatically classify imported terms into category streams (e.g. classifying GPS, Galileo, and RTK as "GNSS").

### 4. Interactive Vector Diagram System (`app.js`)
* Populated terms with responsive inline SVG diagrams, including:
  * **Trilateration**: Highlighting satellite distance spheres intersecting to compute coordinates.
  * **Multipath Errors**: Diagram showing signals reflecting off structures before reaching a GPS antenna.
  * **RTK (Real-Time Kinematic)**: Showing the base station rover correction transmission cycle.

---

## Part 2: Database Sync, Contributor Metadata & Admin Moderation

### 1. Firebase Synchronization Setup (`app.js`)

> [!NOTE]
> * **Firebase Realtime Database Endpoint**: Linked application logic to `https://geospatialdictonary-default-rtdb.firebaseio.com/` (noting the spelling constraint of the database node).
> * **Offline fallback caching**: Integrated localStorage sync to load pre-cached data instantly if connection fails.

### 2. Contributor Metadata & Badges (`app.js` & `style.css`)
* **CreatedBy Parameter**: Embedded creator data fields (`createdBy: "admin" | "guest"`, `createdAt: timestamp`) into the database schema.
* **Color Badging**: Added blue badges for **Admin Custom** terms and orange badges for **Guest Contribution** terms in both card lists and drawers.

### 3. Lockdown Deletions (Secure Admin Mode) (`app.js`)

> [!IMPORTANT]
> * **Admin Verification**: Configured a query parser (`?admin=true`) to enable administrator features.
> * **Lock Deletes**: Restricted deletion database calls (`deleteTerm()`) and hid deletion trash cans from cards unless the user is confirmed as admin.

### 4. Cron-styled Submissions Moderation Panel (`index.html` & `app.js`)
* **Admin Dashboard modal**: Added a moderation panel overlay (`#admin-modal`) and header link button (`#btn-admin-panel`) visible only to administrators.
* **Chronological grouping logic**: Developed sorting filters grouping contributions into:
  * 🔴 **Added Today**
  * 🟡 **Added This Week (Last 7 Days)**
  * 🔵 **Added Earlier**
* **Panel Actions**: Linked "View" (opens term detail drawer) and "Delete" (purges the term instantly from Firebase) buttons next to each submission row.

---

## Part 3: PWA & Offline Mobile Integration

### 1. Manifest Assets & Browser Verification (`manifest.json` & `sw.js`)
* **PWA configuration**: Configured start URLs, standalone display modes, orientation support, and theme/background parameters.
* **Qualifying for Chrome native installer**: Generated standard high-quality **`icon-192.png`** and **`icon-512.png`** files from `icon.svg` and registered them inside the manifest icons array to meet Chrome's mobile install prompt criteria.
* **Service worker caching**: Configured `sw.js` to pre-cache frontend files, stylesheets, and the new PNG icons, allowing offline loads. Advanced version caching to clear client caches.

### 2. Custom Install UI Dropdown (`index.html` & `app.js`)
* **Download dropdown wrapper**: Created a header button (`#btn-download-dropdown`) toggle trigger expanding a clean options panel (Download App, User Manual).

### 3. Custom Installation Guide Modal (`index.html` & `app.js`)
* **Visual Help Modal Structure**: Created `#install-guide-modal` containing SVG graphic mockups and guides.

### Visual popup details matching website layout:

![Installation Guide Popup](./install_popup_guide.png)

* > [!NOTE]
  > **Method A (Desktop Installation)**:
  > 1. Click the Install Monitor icon on the right side of the address bar.
  > 2. Or click the three dots (⋮) ➔ Cast, save, and share ➔ Install Geospatial Dictionary...
* > [!TIP]
  > **Method B (Mobile Android Menu)**:
  > Mobile address bars do not show install icons. Tap the three vertical dots (⋮) in Chrome, select Install (or Install and create shortcut), then select Install.
* > [!WARNING]
  > **Method C (iPhone iOS Safari)**:
  > Open Safari, tap the Share sheet button (box with up arrow), and select Add to Home Screen.

### App Install vs. Web Shortcut (Android Chrome Details):

> [!IMPORTANT]
> When installing on mobile, you can choose between two methods:
> * **Install (App)**: Downloads PWA files directly. Opens in its own window (no tabs) and works offline. To delete, press and hold and select **Uninstall**.
> * **Create Shortcut**: Places a link on your screen. Accesses the site without installing files. To delete, press and hold and select **Remove**.

### How to Remove or Uninstall from Phone:

> [!CAUTION]
> If you ever want to delete the icon from your phone:
> * **If you chose 'Install'**: Press and hold the icon on your home screen and select **Uninstall**.
> * **If you chose 'Create shortcut'**: Press and hold the icon and select **Remove** (or drag to the 'Remove' trash can at the top).
