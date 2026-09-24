// ==========================================
// 1. SUPABASE CLIENT INITIALIZATION
// ==========================================
// MUST NOT include '/rest/v1/' at the end!
const SUPABASE_URL = "https://qxdtxlphhzkjleqtmuen.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_tVPfEkEPgHfYB8kA_sVw_w_i2b2PVZW";

const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

let cart = [];

// ==========================================
// 2. FETCH MENU ITEMS FROM SUPABASE
// ==========================================
async function fetchSupabaseMenuItems(category = 'all') {
  const grid = document.getElementById('menu-grid');
  if (!grid) return;

  grid.innerHTML = '<p>Loading live menu...</p>';

  if (!supabase) {
    grid.innerHTML = '<p>Please configure your Supabase URL and Key in script.js</p>';
    return;
  }

  let query = supabase.from('menu_items').select('*');
  if (category !== 'all') {
    query = query.eq('category', category);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Supabase Error:', error);
    grid.innerHTML = '<p>Error loading menu items.</p>';
    return;
  }

  grid.innerHTML = '';
  
  if (!data || data.length === 0) {
    grid.innerHTML = '<p>No items found in this category.</p>';
    return;
  }

  data.forEach(item => {
    // Only show available items
    if (item.in_stock === false) return;

    const card = document.createElement('div');
    card.className = 'menu-card';
    card.innerHTML = `
      <div>
        <img src="${item.img_url || 'https://via.placeholder.com/200'}" class="menu-img" alt="${item.name}">
        <div class="menu-card-title">${item.name}</div>
        <div class="menu-card-price">${Number(item.price).toLocaleString()} UGX</div>
      </div>
      <button class="btn-primary full-width-btn" onclick="addToCart('${item.name}', ${item.price})">
        <i class="fa-solid fa-plus"></i> Add to Order
      </button>
    `;
    grid.appendChild(card);
  });
}

// ==========================================
// 3. FETCH BUFFET PACKAGES
// ==========================================
async function fetchBuffetPackages() {
  const container = document.getElementById('buffet-packages-grid');
  if (!container || !supabase) return;

  const { data, error } = await supabase.from('buffet_packages').select('*');
  if (error) {
    console.error('Error fetching buffet packages:', error);
    return;
  }

  container.innerHTML = '';
  data.forEach(pkg => {
    const card = document.createElement('div');
    card.className = 'card highlight';
    card.innerHTML = `
      <i class="${pkg.icon_class || 'fa-solid fa-utensils'} icon"></i>
      <h3>${pkg.title}</h3>
      <p>${pkg.description || ''}</p>
      <div style="font-weight: bold; margin-top: 10px; color: var(--primary-color, #e63946);">
        ${Number(pkg.price || 0).toLocaleString()} UGX / Person
      </div>
    `;
    container.appendChild(card);
  });
}

// ==========================================
// 4. ADMIN AUTHENTICATION & LOGIN LOGIC
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
  checkAdminSession();
  fetchSupabaseMenuItems();
  fetchBuffetPackages();
});

async function checkAdminSession() {
  const loginCard = document.getElementById('admin-login-card');
  const dashboard = document.getElementById('admin-dashboard-view');
  if (!loginCard || !dashboard || !supabase) return;

  const { data: { session } } = await supabase.auth.getSession();

  if (session) {
    loginCard.style.display = 'none';
    const recoveryCard = document.getElementById('admin-recovery-card');
    if (recoveryCard) recoveryCard.style.display = 'none';

    dashboard.style.display = 'block';
    
    const userDisplay = document.getElementById('logged-in-user-email');
    if (userDisplay) userDisplay.innerText = `Logged in: ${session.user.email}`;

    fetchAdminItems();
  } else {
    loginCard.style.display = 'block';
    dashboard.style.display = 'none';
  }
}

async function handleSupabaseLogin(e) {
  e.preventDefault();
  const email = document.getElementById('admin-email').value;
  const password = document.getElementById('admin-password').value;

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: password
  });

  if (error) {
    alert("Login Error: " + error.message);
  } else {
    alert("Login Successful!");
    checkAdminSession();
  }
}

async function handleSupabaseLogout() {
  if (!supabase) return;
  await supabase.auth.signOut();
  alert("Logged out successfully.");
  checkAdminSession();
}

function toggleRecoveryView(showRecovery) {
  const loginCard = document.getElementById('admin-login-card');
  const recoveryCard = document.getElementById('admin-recovery-card');

  if (loginCard) loginCard.style.display = showRecovery ? 'none' : 'block';
  if (recoveryCard) recoveryCard.style.display = showRecovery ? 'block' : 'none';
}

async function handlePasswordRecovery(e) {
  e.preventDefault();
  const email = document.getElementById('recovery-email').value;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + '/admin.html'
  });

  if (error) {
    alert("Recovery Error: " + error.message);
  } else {
    alert("Password reset link sent! Check your inbox.");
    toggleRecoveryView(false);
  }
}

// ==========================================
// 5. ADMIN MENU ITEM LIST & DELETE
// ==========================================
async function fetchAdminItems() {
  const container = document.getElementById('admin-menu-render-list');
  if (!container || !supabase) return;

  const { data, error } = await supabase.from('menu_items').select('*').order('id', { ascending: false });
  if (error) return;

  container.innerHTML = '';
  data.forEach(item => {
    const row = document.createElement('div');
    row.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; border-bottom: 1px solid #ddd; background: white; margin-bottom: 5px; border-radius: 4px;';
    row.innerHTML = `
      <div>
        <strong>${item.name}</strong><br>
        <small>${Number(item.price).toLocaleString()} UGX - Category: ${item.category}</small>
      </div>
      <button onclick="deleteMenuItem(${item.id})" style="background: #dc3545; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer;">
        <i class="fa-solid fa-trash"></i>
      </button>
    `;
    container.appendChild(row);
  });
}

async function deleteMenuItem(id) {
  if (!confirm("Are you sure you want to delete this menu item?")) return;
  const { error } = await supabase.from('menu_items').delete().eq('id', id);
  if (error) {
    alert("Could not delete item: " + error.message);
  } else {
    fetchAdminItems();
  }
}
