```javascript
/* =========================================================
   KITEEZI RECREATIONAL CENTER
   COMPLETE PUBLIC WEBSITE + ADMIN SCRIPT
========================================================= */


/* =========================================================
   1. SUPABASE INITIALIZATION
========================================================= */

const SUPABASE_URL = "https://qxdtxlphhzkjleqtmuen.supabase.co";

const SUPABASE_ANON_KEY =
  "sb_publishable_tVPfEkEPgHfYB8kA_sVw_w_i2b2PVZW";

const supabase =
  window.supabase
    ? window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
      )
    : null;


/* =========================================================
   2. GLOBAL VARIABLES
========================================================= */

let cart = [];

let currentMenuCategory = "all";

let editingMenuItemId = null;


/* =========================================================
   3. START APPLICATION
========================================================= */

document.addEventListener("DOMContentLoaded", async () => {

  console.log("Kiteezi website starting...");

  if (!supabase) {
    console.error("Supabase failed to initialize.");
    return;
  }

  /* Public website functions */
  await fetchAnnouncement();
  await fetchBuffetPackages();
  await fetchSupabaseMenuItems();

  /* Admin */
  await checkAdminSession();

  /* Cart */
  loadCart();

});


/* =========================================================
   4. ANNOUNCEMENT SYSTEM
========================================================= */

async function fetchAnnouncement() {

  const announcementBar =
    document.getElementById("live-announcement-bar");

  if (!announcementBar || !supabase) return;

  try {

    const { data, error } = await supabase
      .from("site_announcements")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Announcement error:", error);
      return;
    }

    if (data) {

      const message =
        data.message ||
        data.text ||
        data.announcement ||
        data.content ||
        "";

      if (message) {

        announcementBar.innerHTML = `
          <i class="fa-solid fa-bullhorn"></i>
          ${escapeHTML(message)}
        `;

      }

    }

  } catch (error) {

    console.error("Announcement loading failed:", error);

  }

}


/* =========================================================
   5. ADMIN ANNOUNCEMENT UPDATE
========================================================= */

async function updateAnnouncement(event) {

  event.preventDefault();

  if (!supabase) {
    alert("Supabase is not connected.");
    return;
  }

  const input =
    document.getElementById("admin-announcement-input");

  if (!input) return;

  const message = input.value.trim();

  if (!message) {
    alert("Please enter an announcement.");
    return;
  }

  try {

    /*
      We first check whether an announcement exists.
    */

    const { data: existing, error: fetchError } =
      await supabase
        .from("site_announcements")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (fetchError) {
      console.error(fetchError);
      alert("Could not access announcements: " + fetchError.message);
      return;
    }

    let result;

    if (existing) {

      /*
        Try updating the existing announcement.
      */

      const updateData = {};

      if ("message" in existing) {
        updateData.message = message;
      } else if ("text" in existing) {
        updateData.text = message;
      } else if ("announcement" in existing) {
        updateData.announcement = message;
      } else {
        updateData.message = message;
      }

      result = await supabase
        .from("site_announcements")
        .update(updateData)
        .eq("id", existing.id);

    } else {

      /*
        No announcement exists, so create one.
      */

      result = await supabase
        .from("site_announcements")
        .insert([
          {
            message: message
          }
        ]);

    }

    if (result.error) {

      console.error(result.error);

      alert(
        "Could not update announcement:\n" +
        result.error.message
      );

      return;

    }

    alert("Announcement updated successfully!");

    input.value = "";

    await fetchAnnouncement();

  } catch (error) {

    console.error(error);

    alert("Unexpected announcement error.");

  }

}


/* =========================================================
   6. FETCH MENU ITEMS
========================================================= */

async function fetchSupabaseMenuItems(category = "all") {

  const grid =
    document.getElementById("menu-grid");

  if (!grid) return;

  currentMenuCategory = category;

  grid.innerHTML =
    "<p>Loading live menu...</p>";

  if (!supabase) {

    grid.innerHTML =
      "<p>Supabase is not connected.</p>";

    return;

  }

  try {

    let query =
      supabase
        .from("menu_items")
        .select("*")
        .order("id", { ascending: true });

    if (category !== "all") {

      query = query.eq(
        "category",
        category
      );

    }

    const { data, error } =
      await query;

    if (error) {

      console.error(
        "Menu loading error:",
        error
      );

      grid.innerHTML = `
        <p>
          Error loading menu items.<br>
          ${escapeHTML(error.message)}
        </p>
      `;

      return;

    }

    grid.innerHTML = "";

    const availableItems =
      (data || []).filter(
        item => item.in_stock !== false
      );

    if (availableItems.length === 0) {

      grid.innerHTML =
        "<p>No items found in this category.</p>";

      return;

    }

    availableItems.forEach(item => {

      const card =
        document.createElement("div");

      card.className =
        "menu-card";

      const image =
        item.img_url ||
        "https://via.placeholder.com/400x300?text=Kiteezi+Food";

      card.innerHTML = `

        <div>

          <img
            src="${escapeAttribute(image)}"
            class="menu-img"
            alt="${escapeAttribute(item.name)}"
            onerror="this.src='https://via.placeholder.com/400x300?text=Kiteezi+Food'"
          >

          <div class="menu-card-title">
            ${escapeHTML(item.name)}
          </div>

          <div class="menu-card-price">
            ${Number(item.price || 0).toLocaleString()} UGX
          </div>

        </div>

        <button
          class="btn-primary full-width-btn"
          onclick="addToCart(
            '${escapeJS(item.name)}',
            ${Number(item.price || 0)}
          )"
        >

          <i class="fa-solid fa-plus"></i>
          Add to Order

        </button>
      `;

      grid.appendChild(card);

    });

  } catch (error) {

    console.error(error);

    grid.innerHTML =
      "<p>Unable to load menu.</p>";

  }

}


/* =========================================================
   7. CATEGORY FILTER
========================================================= */

function filterCategory(category, button) {

  document
    .querySelectorAll(".tab-btn")
    .forEach(btn => {
      btn.classList.remove("active");
    });

  if (button) {
    button.classList.add("active");
  }

  fetchSupabaseMenuItems(category);

}


/* =========================================================
   8. BUFFET PACKAGES
========================================================= */

async function fetchBuffetPackages() {

  const container =
    document.getElementById(
      "buffet-packages-grid"
    );

  if (!container || !supabase) return;

  container.innerHTML =
    "<p>Loading party and buffet packages...</p>";

  try {

    const { data, error } =
      await supabase
        .from("buffet_packages")
        .select("*")
        .order("id", { ascending: true });

    if (error) {

      console.error(
        "Buffet error:",
        error
      );

      container.innerHTML =
        "<p>Unable to load buffet packages.</p>";

      return;

    }

    container.innerHTML = "";

    if (!data || data.length === 0) {

      container.innerHTML =
        "<p>No buffet packages available.</p>";

      return;

    }

    data.forEach(pkg => {

      const card =
        document.createElement("div");

      card.className =
        "card highlight";

      card.innerHTML = `

        <i class="${
          escapeAttribute(
            pkg.icon_class ||
            "fa-solid fa-utensils"
          )
        } icon"></i>

        <h3>
          ${escapeHTML(
            pkg.title ||
            "Buffet Package"
          )}
        </h3>

        <p>
          ${escapeHTML(
            pkg.description || ""
          )}
        </p>

        ${
          pkg.price != null
            ? `
              <div style="
                font-weight:bold;
                margin-top:10px;
                color:var(--primary-red);
              ">
                ${Number(pkg.price).toLocaleString()}
                UGX / Person
              </div>
            `
            : ""
        }

      `;

      container.appendChild(card);

    });

  } catch (error) {

    console.error(error);

    container.innerHTML =
      "<p>Unable to load buffet packages.</p>";

  }

}


/* =========================================================
   9. ADMIN SESSION
========================================================= */

async function checkAdminSession() {

  const loginCard =
    document.getElementById(
      "admin-login-card"
    );

  const dashboard =
    document.getElementById(
      "admin-dashboard-view"
    );

  if (!loginCard || !dashboard) return;

  if (!supabase) {

    loginCard.style.display = "block";
    dashboard.style.display = "none";

    return;

  }

  try {

    const {
      data: { session },
      error
    } =
      await supabase.auth.getSession();

    if (error) {

      console.error(
        "Session error:",
        error
      );

      return;

    }

    if (session) {

      loginCard.style.display =
        "none";

      const recoveryCard =
        document.getElementById(
          "admin-recovery-card"
        );

      if (recoveryCard) {
        recoveryCard.style.display =
          "none";
      }

      dashboard.style.display =
        "block";

      const userDisplay =
        document.getElementById(
          "logged-in-user-email"
        );

      if (userDisplay) {

        userDisplay.innerText =
          `Logged in: ${session.user.email}`;

      }

      await fetchAdminItems();

      await loadAdminAnnouncement();

    } else {

      loginCard.style.display =
        "block";

      dashboard.style.display =
        "none";

    }

  } catch (error) {

    console.error(
      "Admin session error:",
      error
    );

  }

}


/* =========================================================
   10. ADMIN LOGIN
========================================================= */

async function handleSupabaseLogin(event) {

  event.preventDefault();

  if (!supabase) {

    alert(
      "Supabase is not connected."
    );

    return;

  }

  const email =
    document.getElementById(
      "admin-email"
    ).value.trim();

  const password =
    document.getElementById(
      "admin-password"
    ).value;

  if (!email || !password) {

    alert(
      "Please enter your email and password."
    );

    return;

  }

  const button =
    event.submitter;

  if (button) {

    button.disabled = true;
    button.innerText = "Signing In...";

  }

  try {

    const { data, error } =
      await supabase.auth.signInWithPassword({

        email: email,
        password: password

      });

    if (error) {

      alert(
        "Login Error:\n" +
        error.message
      );

      return;

    }

    console.log(
      "Login successful:",
      data.user.email
    );

    await checkAdminSession();

  } catch (error) {

    console.error(error);

    alert(
      "An unexpected login error occurred."
    );

  } finally {

    if (button) {

      button.disabled = false;
      button.innerHTML =
        "Sign In";

    }

  }

}


/* =========================================================
   11. ADMIN LOGOUT
========================================================= */

async function handleSupabaseLogout() {

  if (!supabase) return;

  try {

    const { error } =
      await supabase.auth.signOut();

    if (error) {

      alert(
        "Logout error: " +
        error.message
      );

      return;

    }

    cart = [];
    saveCart();
    updateCartUI();

    await checkAdminSession();

  } catch (error) {

    console.error(error);

  }

}


/* =========================================================
   12. PASSWORD RECOVERY
========================================================= */

function toggleRecoveryView(showRecovery) {

  const loginCard =
    document.getElementById(
      "admin-login-card"
    );

  const recoveryCard =
    document.getElementById(
      "admin-recovery-card"
    );

  if (loginCard) {

    loginCard.style.display =
      showRecovery
        ? "none"
        : "block";

  }

  if (recoveryCard) {

    recoveryCard.style.display =
      showRecovery
        ? "block"
        : "none";

  }

}


async function handlePasswordRecovery(event) {

  event.preventDefault();

  if (!supabase) {

    alert(
      "Supabase is not connected."
    );

    return;

  }

  const input =
    document.getElementById(
      "recovery-email"
    );

  const email =
    input.value.trim();

  if (!email) {

    alert(
      "Enter your admin email."
    );

    return;

  }

  try {

    const { error } =
      await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo:
            window.location.origin +
            "/admin.html"
        }
      );

    if (error) {

      alert(
        "Recovery Error:\n" +
        error.message
      );

      return;

    }

    alert(
      "Password reset link sent! Check your email."
    );

    toggleRecoveryView(false);

  } catch (error) {

    console.error(error);

    alert(
      "Unable to send recovery email."
    );

  }

}


/* =========================================================
   13. LOAD ADMIN ANNOUNCEMENT
========================================================= */

async function loadAdminAnnouncement() {

  const input =
    document.getElementById(
      "admin-announcement-input"
    );

  if (!input || !supabase) return;

  try {

    const { data, error } =
      await supabase
        .from("site_announcements")
        .select("*")
        .order("created_at", {
          ascending: false
        })
        .limit(1)
        .maybeSingle();

    if (error) {

      console.error(
        "Admin announcement error:",
        error
      );

      return;

    }

    if (data) {

      input.value =
        data.message ||
        data.text ||
        data.announcement ||
        data.content ||
        "";

    }

  } catch (error) {

    console.error(error);

  }

}


/* =========================================================
   14. FETCH ADMIN MENU ITEMS
========================================================= */

async function fetchAdminItems() {

  const container =
    document.getElementById(
      "admin-menu-render-list"
    );

  if (!container || !supabase) return;

  container.innerHTML =
    "<p>Loading menu items...</p>";

  try {

    const { data, error } =
      await supabase
        .from("menu_items")
        .select("*")
        .order("id", {
          ascending: false
        });

    if (error) {

      console.error(
        "Admin menu error:",
        error
      );

      container.innerHTML = `
        <p style="color:red;">
          ${escapeHTML(error.message)}
        </p>
      `;

      return;

    }

    container.innerHTML = "";

    if (!data || data.length === 0) {

      container.innerHTML =
        "<p>No menu items yet.</p>";

      return;

    }

    data.forEach(item => {

      const row =
        document.createElement("div");

      row.style.cssText = `
        padding:12px;
        border-bottom:1px solid #ddd;
        background:white;
        margin-bottom:8px;
        border-radius:6px;
      `;

      row.innerHTML = `

        <div style="
          display:flex;
          justify-content:space-between;
          gap:10px;
          align-items:flex-start;
        ">

          <div style="flex:1;">

            <strong>
              ${escapeHTML(item.name)}
            </strong>

            <br>

            <small>
              ${Number(item.price || 0).toLocaleString()}
              UGX
              -
              ${escapeHTML(item.category)}
            </small>

            <br>

            <small style="
              color:${
                item.in_stock
                  ? "#28a745"
                  : "#dc3545"
              };
              font-weight:bold;
            ">
              ${
                item.in_stock
                  ? "Available"
                  : "Unavailable"
              }
            </small>

          </div>

          <div style="
            display:flex;
            gap:5px;
            flex-wrap:wrap;
          ">

            <button
              onclick="editMenuItem(${item.id})"
              style="
                background:#007bff;
                color:white;
                border:none;
                padding:5px 9px;
                border-radius:4px;
                cursor:pointer;
              "
            >
              <i class="fa-solid fa-pen"></i>
            </button>

            <button
              onclick="deleteMenuItem(${item.id})"
              style="
                background:#dc3545;
                color:white;
                border:none;
                padding:5px 9px;
                border-radius:4px;
                cursor:pointer;
              "
            >
              <i class="fa-solid fa-trash"></i>
            </button>

          </div>

        </div>

      `;

      container.appendChild(row);

    });

  } catch (error) {

    console.error(error);

    container.innerHTML =
      "<p>Unable to load admin menu.</p>";

  }

}


/* =========================================================
   15. SAVE / ADD MENU ITEM
========================================================= */

async function handleSaveMenuItem(event) {

  event.preventDefault();

  if (!supabase) {

    alert(
      "Supabase is not connected."
    );

    return;

  }

  const name =
    document
      .getElementById("menu-title-input")
      .value.trim();

  const price =
    Number(
      document
        .getElementById("menu-price-input")
        .value
    );

  const category =
    document
      .getElementById("menu-category-input")
      .value;

  const imgUrl =
    document
      .getElementById("menu-img-input")
      .value.trim();

  const requiresSides =
    document
      .getElementById("m
```
