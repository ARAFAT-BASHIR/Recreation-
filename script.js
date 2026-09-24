```javascript
// =========================================================
// KITEEZI RECREATIONAL CENTER
// COMPLETE INTEGRATED SCRIPT
// =========================================================

// =========================================================
// SUPABASE CLIENT INITIALIZATION
// =========================================================

const SUPABASE_URL = "https://qxdtxlphhzkjleqtmuen.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_tVPfEkEPgHfYB8kA_sVw_w_i2b2PVZW";

const supabase = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;


// =========================================================
// GLOBAL STATE
// =========================================================

let allMenuItems = [];
let allBuffetPackages = [];
let shoppingCart = [];
let currentCategoryFilter = "all";
let currentMediaArea = "about";


// =========================================================
// UTILITY FUNCTIONS
// =========================================================

function escapeHTML(value) {
  if (value === null || value === undefined) return "";

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function showError(message) {
  console.error(message);
}

function formatUGX(value) {
  return Number(value || 0).toLocaleString() + " UGX";
}


// =========================================================
// INITIALIZATION
// =========================================================

document.addEventListener("DOMContentLoaded", () => {

  // Footer year
  const yearEl =
    document.getElementById("year") ||
    document.getElementById("current-year");

  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  // Mobile navigation
  const menuToggle = document.getElementById("menuToggle");
  const mainNav = document.getElementById("mainNav");

  if (menuToggle && mainNav) {
    menuToggle.addEventListener("click", () => {
      mainNav.classList.toggle("active");
    });
  }

  document.querySelectorAll("#mainNav a").forEach(link => {
    link.addEventListener("click", () => {
      if (mainNav) {
        mainNav.classList.remove("active");
      }
    });
  });

  // Public content
  fetchAnnouncements();
  fetchReviews();
  setupReviewSubmission();
  fetchPublicMedia();
  fetchPublicPersonnel();

  // Menu page
  if (document.getElementById("menu-grid")) {
    fetchLiveMenuItems();
    fetchBuffetPackages();
  }

  // Admin page
  if (document.getElementById("admin-login-card")) {
    checkAdminSession();
  }

  // Admin media selector
  const mediaAreaSelector = document.getElementById("media-area-input");

  if (mediaAreaSelector) {
    currentMediaArea = mediaAreaSelector.value || "about";

    mediaAreaSelector.addEventListener("change", function () {
      currentMediaArea = this.value;
      loadAdminMedia(currentMediaArea);
    });
  }
});


// =========================================================
// ANNOUNCEMENT
// =========================================================

function closeBanner() {
  const banner = document.getElementById("announcement-banner");

  if (banner) {
    banner.style.display = "none";
  }
}


async function fetchAnnouncements() {

  if (!supabase) return;

  const banner = document.getElementById("announcement-banner");
  const textEl = document.getElementById("announcement-text");

  if (!banner || !textEl) return;

  try {

    const { data, error } = await supabase
      .from("site_announcements")
      .select("message")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      console.error("Announcement error:", error);
      return;
    }

    if (!data || !data.message) {
      banner.style.display = "none";
      return;
    }

    textEl.innerHTML =
      '<i class="fa-solid fa-bullhorn"></i> ' +
      escapeHTML(data.message);

    banner.style.display = "block";

  } catch (error) {
    console.error("Announcement load error:", error);
  }
}


// =========================================================
// ADMIN ANNOUNCEMENT
// =========================================================

async function loadAdminAnnouncement() {

  const input =
    document.getElementById("admin-announcement-input");

  if (!input || !supabase) return;

  const { data, error } = await supabase
    .from("site_announcements")
    .select("message")
    .eq("id", 1)
    .maybeSingle();

  if (!error && data) {
    input.value = data.message || "";
  }
}


async function updateAnnouncement(e) {

  e.preventDefault();

  const input =
    document.getElementById("admin-announcement-input");

  if (!input || !supabase) return;

  const message = input.value.trim();

  if (!message) {
    alert("Please enter an announcement.");
    return;
  }

  const { error } = await supabase
    .from("site_announcements")
    .upsert({
      id: 1,
      message: message,
      updated_at: new Date().toISOString()
    });

  if (error) {

    console.error(error);
    alert("Failed to update announcement: " + error.message);
    return;
  }

  alert("Announcement updated successfully.");

  await fetchAnnouncements();
}


// =========================================================
// REVIEWS
// =========================================================

async function fetchReviews() {

  const container =
    document.getElementById("reviewsContainer");

  if (!container || !supabase) return;

  try {

    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(6);

    if (error) {
      console.error("Review load error:", error);

      container.innerHTML =
        '<p style="color:var(--text-muted);grid-column:1/-1;">Unable to load reviews right now.</p>';

      return;
    }

    if (!data || data.length === 0) {

      container.innerHTML =
        '<p style="color:var(--text-muted);grid-column:1/-1;">No reviews posted yet. Be the first to leave one!</p>';

      return;
    }

    container.innerHTML = "";

    data.forEach(item => {

      const rating = Math.max(
        0,
        Math.min(5, Number(item.rating) || 0)
      );

      const stars =
        "★".repeat(rating) +
        "☆".repeat(5 - rating);

      const card = document.createElement("div");

      card.className = "card";

      card.innerHTML = `
        <div style="color:#f59e0b;margin-bottom:.5rem;font-size:1.1rem;">
          ${stars}
        </div>

        <p style="font-style:italic;margin-bottom:1rem;">
          "${escapeHTML(item.message)}"
        </p>

        <strong style="display:block;color:var(--primary-red);">
          - ${escapeHTML(item.name)}
        </strong>
      `;

      container.appendChild(card);
    });

  } catch (error) {

    console.error(error);

    container.innerHTML =
      '<p style="color:var(--text-muted);grid-column:1/-1;">Unable to load reviews right now.</p>';
  }
}


function setupReviewSubmission() {

  const form = document.getElementById("reviewForm");
  const status = document.getElementById("reviewStatus");

  if (!form || !supabase) return;

  // Prevent duplicate listeners
  if (form.dataset.initialized === "true") return;

  form.dataset.initialized = "true";

  form.addEventListener("submit", async e => {

    e.preventDefault();

    if (status) {
      status.textContent = "Submitting...";
      status.style.color = "var(--text-muted)";
    }

    const name =
      document.getElementById("reviewName").value.trim();

    const rating =
      parseInt(
        document.getElementById("reviewRating").value,
        10
      );

    const message =
      document.getElementById("reviewMessage").value.trim();

    if (!name || !rating || !message) {

      if (status) {
        status.textContent =
          "Please complete all review fields.";
        status.style.color = "red";
      }

      return;
    }

    const { error } = await supabase
      .from("reviews")
      .insert([
        {
          name,
          rating,
          message
        }
      ]);

    if (error) {

      console.error(error);

      if (status) {
        status.textContent =
          "Error: " + error.message;
        status.style.color = "red";
      }

      return;
    }

    if (status) {
      status.textContent =
        "Thank you! Your review has been submitted.";
      status.style.color = "green";
    }

    form.reset();

    await fetchReviews();
  });
}


// =========================================================
// PUBLIC MENU
// =========================================================

async function fetchLiveMenuItems() {

  const grid =
    document.getElementById("menu-grid");

  if (!grid || !supabase) return;

  grid.innerHTML =
    '<p style="grid-column:1/-1;">Loading menu items...</p>';

  try {

    const { data, error } = await supabase
      .from("menu_items")
      .select("*")
      .eq("in_stock", true)
      .order("id", { ascending: false });

    if (error) {

      console.error("Menu error:", error);

      grid.innerHTML =
        '<p style="grid-column:1/-1;">Unable to load menu items.</p>';

      return;
    }

    allMenuItems = data || [];

    renderMenuItems();

  } catch (error) {

    console.error(error);

    grid.innerHTML =
      '<p style="grid-column:1/-1;">Unable to load menu items.</p>';
  }
}


function renderMenuItems() {

  const grid =
    document.getElementById("menu-grid");

  if (!grid) return;

  if (currentCategoryFilter === "buffet") {
    renderBuffetPackages();
    return;
  }

  const filtered =
    currentCategoryFilter === "all"
      ? allMenuItems
      : allMenuItems.filter(
          item => item.category === currentCategoryFilter
        );

  if (!filtered.length) {

    grid.innerHTML =
      '<p style="grid-column:1/-1;">No items found in this category.</p>';

    return;
  }

  grid.innerHTML = filtered.map(item => {

    const image =
      item.img_url
        ? `
          <img
            src="${escapeHTML(item.img_url)}"
            alt="${escapeHTML(item.name)}"
            style="width:100%;height:160px;object-fit:cover;border-radius:8px;margin-bottom:.8rem;"
          >
        `
        : "";

    const sides =
      item.requires_sides
        ? `
          <small style="display:block;color:var(--text-muted);margin-bottom:.5rem;">
            Requires sides
          </small>
        `
        : "";

    return `
      <div class="card">

        ${image}

        <h3>${escapeHTML(item.name)}</h3>

        <p style="color:var(--primary-red);font-weight:bold;margin:.5rem 0;">
          ${formatUGX(item.price)}
        </p>

        ${sides}

        <button
          class="btn-primary full-width-btn"
          onclick="addToCart(${Number(item.id)})"
        >
          <i class="fa-solid fa-plus"></i>
          Add to Order
        </button>

      </div>
    `;

  }).join("");
}


// =========================================================
// MENU CATEGORY FILTER
// =========================================================

function filterCategory(category, buttonEl) {

  currentCategoryFilter = category;

  document
    .querySelectorAll(".tab-btn")
    .forEach(btn => btn.classList.remove("active"));

  if (buttonEl) {
    buttonEl.classList.add("active");
  }

  renderMenuItems();
}


// Compatibility with repaired version
function filterMenuCategory(category) {
  filterCategory(category);
}


// =========================================================
// BUFFET PACKAGES
// =========================================================

async function fetchBuffetPackages() {

  if (!supabase) return;

  try {

    const { data, error } = await supabase
      .from("buffet_packages")
      .select("*")
      .order("id", { ascending: true });

    if (error) {
      console.error("Buffet error:", error);
      return;
    }

    allBuffetPackages = data || [];

    const buffetContainer =
      document.getElementById("buffet-container");

    if (buffetContainer) {
      renderBuffetContainer();
    }

  } catch (error) {
    console.error(error);
  }
}


function renderBuffetContainer() {

  const container =
    document.getElementById("buffet-container");

  if (!container) return;

  if (!allBuffetPackages.length) {

    container.innerHTML =
      '<p>No buffet packages available.</p>';

    return;
  }

  container.innerHTML =
    allBuffetPackages.map(pkg => {

      const items = Array.isArray(pkg.items)
        ? pkg.items
        : [];

      return `
        <div class="card">

          <h3>
            ${escapeHTML(pkg.title)}
          </h3>

          <p style="color:var(--primary-red);font-weight:bold;">
            ${formatUGX(pkg.price)}
          </p>

          <p>
            ${escapeHTML(pkg.description || "")}
          </p>

          ${
            items.length
              ? `
                <ul>
                  ${items.map(item =>
                    `<li>${escapeHTML(item)}</li>`
                  ).join("")}
                </ul>
              `
              : ""
          }

        </div>
      `;

    }).join("");
}


function renderBuffetPackages() {

  const grid =
    document.getElementById("menu-grid");

  if (!grid) return;

  if (!allBuffetPackages.length) {

    grid.innerHTML =
      '<p style="grid-column:1/-1;">No buffet packages available.</p>';

    return;
  }

  grid.innerHTML =
    allBuffetPackages.map(pkg => {

      const items = Array.isArray(pkg.items)
        ? pkg.items
        : [];

      return `
        <div class="card">

          <h3>${escapeHTML(pkg.title)}</h3>

          <p style="color:var(--primary-red);font-weight:bold;margin:.5rem 0;">
            ${formatUGX(pkg.price)}
          </p>

          <p>
            ${escapeHTML(pkg.description || "")}
          </p>

          ${
            items.length
              ? `
                <ul>
                  ${items.map(item =>
                    `<li>${escapeHTML(item)}</li>`
                  ).join("")}
                </ul>
              `
              : ""
          }

        </div>
      `;

    }).join("");
}


// =========================================================
// CART
// =========================================================

function toggleCartDrawer() {

  const drawer =
    document.getElementById("cart-drawer");

  if (drawer) {
    drawer.classList.toggle("open");
  }
}


function addToCart(itemId) {

  const item =
    allMenuItems.find(
      i => Number(i.id) === Number(itemId)
    );

  if (!item) return;

  const existing =
    shoppingCart.find(
      i => Number(i.id) === Number(itemId)
    );

  if (existing) {
    existing.quantity += 1;
  } else {

    shoppingCart.push({
      ...item,
      quantity: 1
    });

  }

  updateCartUI();
  toggleCartDrawer();
}


function removeFromCart(itemId) {

  shoppingCart =
    shoppingCart.filter(
      i => Number(i.id) !== Number(itemId)
    );

  updateCartUI();
}


function updateCartUI() {

  const list =
    document.getElementById("cart-items-list");

  const countEl =
    document.getElementById("cart-badge-count");

  const totalEl =
    document.getElementById("cart-total-price");

  const totalCount =
    shoppingCart.reduce(
      (sum, item) => sum + item.quantity,
      0
    );

  const totalPrice =
    shoppingCart.reduce(
      (sum, item) =>
        sum + Number(item.price) * item.quantity,
      0
    );

  if (countEl) {
    countEl.textContent = totalCount;
  }

  if (totalEl) {
    totalEl.textContent =
      totalPrice.toLocaleString() + " UGX";
  }

  if (!list) return;

  if (!shoppingCart.length) {

    list.innerHTML =
      '<p style="text-align:center;color:var(--text-muted);padding:2rem 0;">Your cart is empty.</p>';

    return;
  }

  list.innerHTML =
    shoppingCart.map(item => `

      <div class="cart-item">

        <div>

          <strong>
            ${escapeHTML(item.name)}
          </strong>

          x ${item.quantity}

          <br>

          <small>
            ${(Number(item.price) * item.quantity).toLocaleString()} UGX
          </small>

        </div>

        <button
          class="btn-delete"
          onclick="removeFromCart(${Number(item.id)})"
        >
          &times;
        </button>

      </div>

    `).join("");
}


function checkoutToWhatsApp() {

  if (!shoppingCart.length) {
    alert("Your cart is empty.");
    return;
  }

  const name =
    document.getElementById("cust-name").value.trim();

  const phone =
    document.getElementById("cust-phone").value.trim();

  const location =
    document.getElementById("cust-location").value.trim();

  if (!name || !phone) {
    alert("Please enter your Name and Phone Number.");
    return;
  }

  let message =
    "*NEW MENU ORDER — KITEEZI RECREATIONAL CENTER*\n\n";

  message += "*Customer Details:*\n";
  message += `- Name: ${name}\n`;
  message += `- Phone: ${phone}\n`;

  if (location) {
    message += `- Table/Location: ${location}\n`;
  }

  message += "\n*Order Items:*\n";

  let totalPrice = 0;

  shoppingCart.forEach(item => {

    const itemTotal =
      Number(item.price) * item.quantity;

    totalPrice += itemTotal;

    message +=
      `• ${item.name} x${item.quantity} - ${itemTotal.toLocaleString()} UGX\n`;
  });

  message +=
    `\n*Total:* ${totalPrice.toLocaleString()} UGX`;

  const encodedUrl =
    `https://wa.me/256709763803?text=${encodeURIComponent(message)}`;

  window.open(encodedUrl, "_blank");
}


// =========================================================
// FACILITY BOOKING
// =========================================================

function openBookingModal(categoryName) {

  const modal =
    document.getElementById("bookingModal");

  const title =
    document.getElementById("bookingModalTitle");

  const catInput =
    document.getElementById("bookingCategory");

  if (!modal || !title || !catInput) return;

  title.textContent =
    `Book ${categoryName}`;

  catInput.value =
    categoryName;

  modal.style.display =
    "flex";
}


function closeBookingModal() {

  const modal =
    document.getElementById("bookingModal");

  if (modal) {
    modal.style.display = "none";
  }
}


function handleBookingSubmit(e) {

  e.preventDefault();

  const category =
    document.getElementById("bookingCategory").value;

  const name =
    document.getElementById("bookingName").value;

  const phone =
    document.getElementById("bookingPhone").value;

  const date =
    document.getElementById("bookingDate").value;

  const guests =
    document.getElementById("bookingGuests").value;

  const notes =
    document.getElementById("bookingNotes").value;

  let message =
    "*FACILITY & GAME RESERVATION — KITEEZI RECREATIONAL CENTER*\n\n";

  message += `*Booking Type:* ${category}\n`;
  message += `*Name:* ${name}\n`;
  message += `*Phone:* ${phone}\n`;
  message += `*Date:* ${date}\n`;
  message += `*People:* ${guests}\n`;

  if (notes) {
    message += `*Notes:* ${notes}\n`;
  }

  const encodedUrl =
    `https://wa.me/256709763803?text=${encodeURIComponent(message)}`;

  closeBookingModal();

  e.target.reset();

  window.open(encodedUrl, "_blank");
}


// =========================================================
// PUBLIC MEDIA
// =========================================================

async function fetchPublicMedia() {

  if (!supabase) return;

  const areas =
    document.querySelectorAll("[data-media-area]");

  if (!areas.length) return;

  try {

    const { data, error } = await supabase
      .from("media")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Media error:", error);
      return;
    }

    const mediaFiles = data || [];

    areas.forEach(container => {

      const targetArea =
        container.getAttribute("data-media-area");

      const areaMedia =
        mediaFiles.filter(
          item => item.area === targetArea
        );

      if (!areaMedia.length) {
        container.innerHTML = "";
        return;
      }

      container.innerHTML =
        areaMedia.map(item => {

          if (item.media_type === "video") {

            return `
              <video
                src="${escapeHTML(item.file_url)}"
                controls
                class="media-element"
              ></video>
            `;

          }

          return `
            <img
              src="${escapeHTML(item.file_url)}"
              alt="Kiteezi Recreational Center"
              class="media-element"
            >
          `;

        }).join("");
    });

  } catch (error) {

    console.error("Public media error:", error);
  }
}


// =========================================================
// PUBLIC PERSONNEL
// =========================================================

async function fetchPublicPersonnel() {

  const container =
    document.getElementById("personnel-container");

  if (!container || !supabase) return;

  try {

    const { data, error } = await supabase
      .from("personnel")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {

      console.error("Personnel error:", error);

      container.innerHTML =
        '<p>Unable to load personnel right now.</p>';

      return;
    }

    if (!data || !data.length) {

      container.innerHTML =
        '<p>No personnel information available.</p>';

      return;
    }

    container.innerHTML =
      data.map(person => `

        <div class="personnel-card">

          ${
            person.img_url
              ? `
                <img
                  src="${escapeHTML(person.img_url)}"
                  alt="${escapeHTML(person.name)}"
                  class="personnel-img"
                >
              `
              : ""
          }

          <h3>
            ${escapeHTML(person.name)}
          </h3>

          <p class="role">
            ${escapeHTML(person.role)}
          </p>

          ${
            person.bio
              ? `
                <p class="bio">
                  ${escapeHTML(person.bio)}
                </p>
              `
              : ""
          }

        </div>

      `).join("");

  } catch (error) {

    console.error(error);
  }
}


// =========================================================
// ADMIN AUTHENTICATION
// =========================================================

async function checkAdminSession() {

  if (!supabase) return;

  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (session) {
    showDashboard(session.user);
  } else {
    showLoginView();
  }

  supabase.auth.onAuthStateChange(
    async (event, session) => {

      if (session) {
        showDashboard(session.user);
      } else {
        showLoginView();
      }

    }
  );
}


function showDashboard(user) {

  const loginCard =
    document.getElementById("admin-login-card");

  const recoveryCard =
    document.getElementById("admin-recovery-card");

  const dashboard =
    document.getElementById("admin-dashboard-view");

  if (loginCard) {
    loginCard.style.display = "none";
  }

  if (recoveryCard) {
    recoveryCard.style.display = "none";
  }

  if (dashboard) {
    dashboard.style.display = "block";
  }

  const emailEl =
    document.getElementById("logged-in-user-email");

  if (emailEl && user) {
    emailEl.textContent =
      user.email || "";
  }

  loadAdminAnnouncement();
  loadAdminMenuItems();
  loadAdminMedia(currentMediaArea);
  loadAdminPersonnel();
  loadAdminReviews();
}


function showLoginView() {

  const loginCard =
    document.getElementById("admin-login-card");

  const recoveryCard =
    document.getElementById("admin-recovery-card");

  const dashboard =
    document.getElementById("admin-dashboard-view");

  if (loginCard) {
    loginCard.style.display = "block";
  }

  if (recoveryCard) {
    recoveryCard.style.display = "none";
  }

  if (dashboard) {
    dashboard.style.display = "none";
  }
}


function toggleRecoveryView(showRecovery) {

  const loginCard =
    document.getElementById("admin-login-card");

  const recoveryCard =
    document.getElementById("admin-recovery-card");

  if (loginCard) {
    loginCard.style.display =
      showRecovery ? "none" : "block";
  }

  if (recoveryCard) {
    recoveryCard.style.display =
      showRecovery ? "block" : "none";
  }
}


async function handleSupabaseLogin(e) {

  e.preventDefault();

  const email =
    document.getElementById("admin-email").value;

  const password =
    document.getElementById("admin-password").value;

  const { data, error } =
    await supabase.auth.signInWithPassword({
      email,
      password
    });

  if (error) {

    alert("Login failed: " + error.message);
    return;
  }

  showDashboard(data.user);
}


async function handleSupabaseLogout() {

  const { error } =
    await supabase.auth.signOut();

  if (error) {
    console.error(error);
  }

  showLoginView();
}


async function handlePasswordRecovery(e) {

  e.preventDefault();

  const email =
    document.getElementById("recovery-email").value;

  const { error } =
    await supabase.auth.resetPasswordForEmail(email);

  if (error) {

    alert(
      "Error sending email: " +
      error.message
    );

    return;
  }

  alert(
    "Password reset link sent to your email."
  );

  toggleRecoveryView(false);
}


// =========================================================
// ADMIN MENU MANAGEMENT
// =========================================================

async function handleSaveMenuItem(e) {

  e.preventDefault();

  const name =
    document.getElementById("menu-title-input").value.trim();

  const price =
    parseFloat(
      document.getElementById("menu-price-input").value
    );

  const category =
    document.getElementById("menu-category-input").value;

  const img_url =
    document.getElementById("menu-img-input").value.trim();

  const requires_sides =
    document.getElementById("menu-sides-check").checked;

  const in_stock =
    document.getElementById("menu-avail-check").checked;

  if (!name || isNaN(price) || !category) {

    alert(
      "Please enter the item name, price and category."
    );

    return;
  }

  const { error } = await supabase
    .from("menu_items")
    .insert([
      {
        name,
        price,
        category,
        img_url: img_url || null,
        requires_sides,
        in_stock
      }
    ]);

  if (error) {

    console.error(error);

    alert(
      "Failed to save menu item: " +
      error.message
    );

    return;
  }

  alert("Menu item added successfully.");

  e.target.reset();

  await loadAdminMenuItems();
  await fetchLiveMenuItems();
}


async function loadAdminMenuItems() {

  const container =
    document.getElementById("admin-menu-render-list");

  if (!container || !supabase) return;

  const { data, error } =
    await supabase
      .from("menu_items")
      .select("*")
      .order("id", { ascending: false });

  if (error) {

    console.error(error);

    container.innerHTML =
      "<p>Unable to load menu items.</p>";

    return;
  }

  if (!data || !data.length) {

    container.innerHTML =
      "<p>No menu items found.</p>";

    return;
  }

  container.innerHTML =
    data.map(item => `

      <div class="admin-list-item">

        <div>

          <strong>
            ${escapeHTML(item.name)}
          </strong>

          -
          ${formatUGX(item.price)}

          (${escapeHTML(item.category)})

          <br>

          <small>
            ${
              item.in_stock
                ? "In stock"
                : "Out of stock"
            }
          </small>

        </div>

        <button
          class="btn-delete"
          onclick="deleteMenuItem(${Number(item.id)})"
        >
          <i class="fa-solid fa-trash"></i>
        </button>

      </div>

    `).join("");
}


// Compatibility name
async function loadAdminMenu() {
  return loadAdminMenuItems();
}


async function deleteMenuItem(id) {

  if (
    !confirm(
      "Are you sure you want to delete this menu item?"
    )
  ) {
    return;
  }

  const { error } =
    await supabase
      .from("menu_items")
      .delete()
      .eq("id", id);

  if (error) {

    alert(
      "Failed to delete menu item: " +
      error.message
    );

    return;
  }

  await loadAdminMenuItems();
  await fetchLiveMenuItems();
}


// Allows future/admin controls to change stock status
async function toggleInStock(id, newStatus) {

  const { error } =
    await supabase
      .from("menu_items")
      .update({
        in_stock: newStatus
      })
      .eq("id", id);

  if (error) {

    alert(
      "Failed to update stock status: " +
      error.message
    );

    return;
  }

  await loadAdminMenuItems();
  await fetchLiveMenuItems();
}


// =========================================================
// ADMIN MEDIA MANAGEMENT
// =========================================================

async function handleMediaUpload(e) {

  e.preventDefault();

  const areaInput =
    document.getElementById("media-area-input");

  const fileInput =
    document.getElementById("media-file-input");

  if (!areaInput || !fileInput) return;

  const area =
    areaInput.value;

  const files =
    Array.from(fileInput.files || []);

  if (!files.length) {

    alert("Please select a file to upload.");
    return;
  }

  if (!area) {

    alert("Please select a media area.");
    return;
  }

  for (const file of files) {

    try {

      const safeName =
        file.name
          .replace(/[^a-zA-Z0-9._-]/g, "_");

      const uniqueName =
        `${Date.now()}_${Math.random()
          .toString(36)
          .substring(2, 8)}_${safeName}`;

      const filePath =
        `${area}/${uniqueName}`;

      // Upload to actual bucket
      const {
        error: uploadError
      } = await supabase
        .storage
        .from("media")
        .upload(
          filePath,
          file,
          {
            cacheControl: "3600",
            upsert: false
          }
        );

      if (uploadError) {

        alert(
          "Upload failed for " +
          file.name +
          ": " +
          uploadError.message
        );

        continue;
      }

      const {
        data: publicUrlData
      } =
        supabase
          .storage
          .from("media")
          .getPublicUrl(filePath);

      const file_url =
        publicUrlData.publicUrl;

      const media_type =
        file.type.startsWith("video/")
          ? "video"
          : "image";

      const {
        error: dbError
      } =
        await supabase
          .from("media")
          .insert([
            {
              area,
              file_url,
              media_type
            }
          ]);

      if (dbError) {

        // Remove uploaded file if DB record failed
        await supabase
          .storage
          .from("media")
          .remove([filePath]);

        alert(
          "Database save failed for " +
          file.name +
          ": " +
          dbError.message
        );

        continue;
      }

    } catch (error) {

      console.error(
        "Media upload error:",
        error
      );

      alert(
        "Error uploading " +
        file.name
      );
    }
  }

  alert("Media upload process completed.");

  fileInput.value = "";

  await loadAdminMedia(area);
  await fetchPublicMedia();
}


// Compatibility name
async function uploadMediaFile() {

  const fakeEvent = {
    preventDefault() {}
  };

  return handleMediaUpload(fakeEvent);
}


async function loadAdminMedia(area = currentMediaArea) {

  const container =
    document.getElementById("admin-media-list");

  if (!container || !supabase) return;

  currentMediaArea =
    area || "about";

  const { data, error } =
    await supabase
      .from("media")
      .select("*")
      .eq("area", currentMediaArea)
      .order("created_at", {
        ascending: false
      });

  if (error) {

    console.error(error);

    container.innerHTML =
      "<p>Unable to load media.</p>";

    return;
  }

  if (!data || !data.length) {

    container.innerHTML =
      "<p>No media uploaded for this section.</p>";

    return;
  }

  container.innerHTML =
    data.map(item => {

      const filename =
        item.file_url
          ? item.file_url
              .split("/")
              .pop()
          : "Media file";

      const preview =
        item.media_type === "video"
          ? `
            <video
              src="${escapeHTML(item.file_url)}"
              controls
              style="max-width:160px;max-height:100px;"
            ></video>
          `
          : `
            <img
              src="${escapeHTML(item.file_url)}"
              alt="Media"
              style="max-width:160px;max-height:100px;object-fit:cover;"
            >
          `;

      return `

        <div class="admin-list-item">

          <div>

            ${preview}

            <br>

            <small>
              ${escapeHTML(filename)}
            </small>

          </div>

          <button
            class="btn-delete"
            onclick="deleteMedia('${String(item.id)}', '${encodeURIComponent(item.file_url || "")}')"
          >
            <i class="fa-solid fa-trash"></i>
          </button>

        </div>

      `;

    }).join("");
}


async function deleteMedia(id, encodedFileUrl) {

  if (
    !confirm(
      "Are you sure you want to delete this media file?"
    )
  ) {
    return;
  }

  const fileUrl =
    encodedFileUrl
      ? decodeURIComponent(encodedFileUrl)
      : "";

  const {
    error: dbError
  } =
    await supabase
      .from("media")
      .delete()
      .eq("id", id);

  if (dbError) {

    alert(
      "Failed to delete media: " +
      dbError.message
    );

    return;
  }

  // Try to remove actual storage file too
  if (fileUrl) {

    const marker =
      "/storage/v1/object/public/media/";

    const markerIndex =
      fileUrl.indexOf(marker);

    if (markerIndex !== -1) {

      const storagePath =
        decodeURIComponent(
          fileUrl.substring(
            markerIndex + marker.length
          )
        );

      if (storagePath) {

        const {
          error: storageError
        } =
          await supabase
            .storage
            .from("media")
            .remove([storagePath]);

        if (storageError) {
          console.warn(
            "Storage deletion warning:",
            storageError
          );
        }
      }
    }
  }

  await loadAdminMedia(currentMediaArea);
  await fetchPublicMedia();
}


// =========================================================
// ADMIN PERSONNEL MANAGEMENT
// =========================================================

async function handleSavePersonnel(e) {

  e.preventDefault();

  const name =
    document
      .getElementById("personnel-name-input")
      .value
      .trim();

  const role =
    document
      .getElementById("personnel-role-input")
      .value
      .trim();

  const bio =
    document
      .getElementById("personnel-bio-input")
      .value
      .trim();

  const img_url =
    document
      .getElementById("personnel-image-input")
      .value
      .trim();

  if (!name || !role) {

    alert(
      "Please enter the person's name and role."
    );

    return;
  }

  const { error } =
    await supabase
      .from("personnel")
      .insert([
        {
          name,
          role,
          bio,
          img_url: img_url || null
        }
      ]);

  if (error) {

    console.error(error);

    alert(
      "Error adding personnel: " +
      error.message
    );

    return;
  }

  alert(
    "Personnel added successfully."
  );

  e.target.reset();

  await loadAdminPersonnel();
  await fetchPublicPersonnel();
}


// Compatibility name
async function savePersonnel() {

  const name =
    document
      .getElementById("personnel-name-input")
      .value
      .trim();

  const role =
    document
      .getElementById("personnel-role-input")
      .value
      .trim();

  const bio =
    document
      .getElementById("personnel-bio-input")
      .value
      .trim();

  const img_url =
    document
      .getElementById("personnel-image-input")
      .value
      .trim();

  const { error } =
    await supabase
      .from("personnel")
      .insert([
        {
          name,
          role,
          bio,
          img_url: img_url || null
        }
      ]);

  if (error) {

    alert(
      "Failed to add personnel: " +
      error.message
    );

    return;
  }

  alert("Personnel added.");

  await loadAdminPersonnel();
  await fetchPublicPersonnel();
}


async function loadAdminPersonnel() {

  const list =
    document.getElementById(
      "admin-personnel-list"
    );

  if (!list || !supabase) return;

  const { data, error } =
    await supabase
      .from("personnel")
      .select("*")
      .order("created_at", {
        ascending: true
      });

  if (error) {

    console.error(error);

    list.innerHTML =
      "<p>Unable to load personnel.</p>";

    return;
  }

  if (!data || !data.length) {

    list.innerHTML =
      "<p>No personnel added yet.</p>";

    return;
  }

  list.innerHTML =
    data.map(person => `

      <div class="admin-list-item">

        <div>

          <strong>
            ${escapeHTML(person.name)}
          </strong>

          -
          ${escapeHTML(person.role)}

        </div>

        <button
          class="btn-delete"
          onclick="deletePersonnel('${String(person.id)}')"
        >
          <i class="fa-solid fa-trash"></i>
        </button>

      </div>

    `).join("");
}


async function deletePersonnel(id) {

  if (
    !confirm(
      "Are you sure you want to remove this person?"
    )
  ) {
    return;
  }

  const { error } =
    await supabase
      .from("personnel")
      .delete()
      .eq("id", id);

  if (error) {

    alert(
      "Failed to delete personnel: " +
      error.message
    );

    return;
  }

  await loadAdminPersonnel();
  await fetchPublicPersonnel();
}


// =========================================================
// ADMIN REVIEWS
// =========================================================

async function loadAdminReviews() {

  const container =
    document.getElementById(
      "admin-reviews-list"
    );

  if (!container || !supabase) return;

  const { data, error } =
    await supabase
      .from("reviews")
      .select("*")
      .order("created_at", {
        ascending: false
      });

  if (error) {

    console.error(error);

    container.innerHTML =
      "<p>Unable to load reviews.</p>";

    return;
  }

  if (!data || !data.length) {

    container.innerHTML =
      "<p>No customer reviews yet.</p>";

    return;
  }

  container.innerHTML =
    data.map(review => `

      <div class="admin-list-item">

        <div>

          <strong>
            ${escapeHTML(review.name)}
          </strong>

          (${Number(review.rating) || 0}★)

          <br>

          <em>
            "${escapeHTML(review.message)}"
          </em>

        </div>

        <button
          class="btn-delete"
          onclick="deleteReview('${String(review.id)}')"
        >
          <i class="fa-solid fa-trash"></i>
        </button>

      </div>

    `).join("");
}


async function deleteReview(id) {

  if (
    !confirm(
      "Are you sure you want to delete this review?"
    )
  ) {
    return;
  }

  const { error } =
    await supabase
      .from("reviews")
      .delete()
      .eq("id", id);

  if (error) {

    alert(
      "Failed to delete review: " +
      error.message
    );

    return;
  }

  await loadAdminReviews();
  await fetchReviews();
}


// =========================================================
// LOAD ALL ADMIN DATA
// =========================================================

async function loadAllAdminData() {

  await loadAdminAnnouncement();
  await loadAdminMenuItems();
  await loadAdminMedia(currentMediaArea);
  await loadAdminPersonnel();
  await loadAdminReviews();
}

