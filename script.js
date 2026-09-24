// SUPABASE CLIENT INITIALIZATION
const SUPABASE_URL = "https://qxdtxlphhzkjleqtmuen.supabase.co/rest/v1/";
const SUPABASE_ANON_KEY = "sb_publishable_tVPfEkEPgHfYB8kA_sVw_w_i2b2PVZW";
const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

let cart = [];

// FETCH MENU ITEMS FROM SUPABASE
async function fetchSupabaseMenuItems(category = 'all') {
  const grid = document.getElementById('menu-grid');
  if(!grid) return;

  grid.innerHTML = '<p>Loading live menu...</p>';

  if(!supabase) {
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
  data.forEach(item => {
    if(!item.in_stock) return;

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

// FETCH BUFFET PACKAGES
async function fetchBuffetPackages() {
  const container = document.getElementById('buffet-packages-grid');
  if(!container || !supabase) return;

  const { data, error } = await supabase.from('buffet_packages').select('*');
  if(error) return;

  container.innerHTML = '';
  data.forEach(pkg => {
    const card = document.createElement('div');
    card.className = 'card highlight';
    card.innerHTML = `
      <i class="fa-solid fa-bowl-food icon"></i>
      <h3>${pkg.title}</h3>
      <p><strong>${Number(pkg.price_per_head).toLocaleString()} UGX per Head</strong></p>
      <p style="margin-top:0.5rem;">${pkg.description}</p>
      <ul style="margin-top:0.8rem; padding-left:1.2rem;">
        ${pkg.included_items.map(item => `<li>${item}</li>`).join('')}
      </ul>
    `;
    container.appendChild(card);
  });
}

// FETCH LIVE ANNOUNCEMENTS
async function fetchAnnouncementBanner() {
  const bar = document.getElementById('live-announcement-bar');
  if(!bar || !supabase) return;

  const { data, error } = await supabase.from('site_announcements').select('*').eq('is_active', true).limit(1);
  if(error || !data.length) {
    bar.innerHTML = `<i class="fa-solid fa-water-ladder"></i> Special Event: Pool Party Every Last Saturday of the Month!`;
    return;
  }

  bar.innerHTML = `<i class="fa-solid fa-bullhorn"></i> ${data[0].banner_text}`;
}

// ADMIN FUNCTIONS
async function updateAnnouncement(e) {
  e.preventDefault();
  const text = document.getElementById('admin-announcement-input').value;
  
  const { error } = await supabase.from('site_announcements').insert([{ banner_text: text, is_active: true }]);
  if(!error) {
    alert("Live Announcement Updated!");
  }
}

async function handleSaveMenuItem(e) {
  e.preventDefault();
  const newItem = {
    name: document.getElementById('menu-title-input').value,
    price: parseInt(document.getElementById('menu-price-input').value),
    category: document.getElementById('menu-category-input').value,
    requires_sides: document.getElementById('menu-sides-check').checked,
    in_stock: document.getElementById('menu-avail-check').checked,
    img_url: document.getElementById('menu-img-input').value || "https://via.placeholder.com/200"
  };

  const { error } = await supabase.from('menu_items').insert([newItem]);
  if (!error) {
    alert("Menu Item Saved directly to Supabase!");
    fetchSupabaseMenuItems();
  }
}

function filterCategory(category, btn) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  fetchSupabaseMenuItems(category);
}

document.addEventListener('DOMContentLoaded', () => {
  fetchSupabaseMenuItems('all');
  fetchBuffetPackages();
  fetchAnnouncementBanner();
});

// CHECK SESSION ON LOAD
document.addEventListener('DOMContentLoaded', async () => {
  checkAdminSession();
});

// CHECK IF USER IS LOGGED IN
async function checkAdminSession() {
  const loginCard = document.getElementById('admin-login-card');
  const dashboard = document.getElementById('admin-dashboard-view');
  if(!loginCard || !dashboard) return;

  const { data: { session } } = await supabase.auth.getSession();

  if (session) {
    loginCard.style.display = 'none';
    document.getElementById('admin-recovery-card').style.display = 'none';
    dashboard.style.display = 'block';
    document.getElementById('logged-in-user-email').innerText = `Logged in as: ${session.user.email}`;
    fetchAdminItems();
  } else {
    loginCard.style.display = 'block';
    dashboard.style.display = 'none';
  }
}

// HANDLE SUPABASE LOGIN
async function handleSupabaseLogin(e) {
  e.preventDefault();
  const email = document.getElementById('admin-email').value;
  const password = document.getElementById('admin-password').value;

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: password,
  });

  if (error) {
    alert("Login failed: " + error.message);
  } else {
    alert("Login successful!");
    checkAdminSession();
  }
}

// HANDLE LOGOUT
async function handleSupabaseLogout() {
  await supabase.auth.signOut();
  alert("Logged out successfully.");
  checkAdminSession();
}

// TOGGLE RECOVERY VIEW
function toggleRecoveryView(showRecovery) {
  document.getElementById('admin-login-card').style.display = showRecovery ? 'none' : 'block';
  document.getElementById('admin-recovery-card').style.display = showRecovery ? 'block' : 'none';
}

// SEND PASSWORD RECOVERY EMAIL
async function handlePasswordRecovery(e) {
  e.preventDefault();
  const email = document.getElementById('recovery-email').value;

  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + '/admin.html',
  });

  if (error) {
    alert("Error: " + error.message);
  } else {
    alert("Password reset link sent! Check your email inbox.");
    toggleRecoveryView(false);
  }
}

// RENDER ADMIN ITEMS LIST WITH DELETE OPTION
async function fetchAdminItems() {
  const container = document.getElementById('admin-menu-render-list');
  if(!container) return;

  const { data, error } = await supabase.from('menu_items').select('*').order('id', { ascending: false });
  if(error) return;

  container.innerHTML = '';
  data.forEach(item => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex; justify-between; align-items:center; padding:0.5rem; border-bottom:1fr solid #ddd; background:white; margin-bottom:5px; border-radius:4px;';
    row.innerHTML = `
      <div>
        <strong>${item.name}</strong><br>
        <small>${Number(item.price).toLocaleString()} UGX - Category: ${item.category}</small>
      </div>
      <button onclick="deleteMenuItem(${item.id})" style="background:#dc3545; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;"><i class="fa-solid fa-trash"></i></button>
    `;
    container.appendChild(row);
  });
}

// DELETE ITEM
async function deleteMenuItem(id) {
  if(!confirm("Are you sure you want to delete this menu item?")) return;
  const { error } = await supabase.from('menu_items').delete().eq('id', id);
  if(!error) fetchAdminItems();
}
