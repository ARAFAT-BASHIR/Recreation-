// SUPABASE CLIENT INITIALIZATION
const SUPABASE_URL = "https://qxdtxlphhzkjleqtmuen.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_tVPfEkEPgHfYB8kA_sVw_w_i2b2PVZW";

const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

document.addEventListener('DOMContentLoaded', () => {
  // Update year dynamically
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Navigation Toggle
  const menuToggle = document.getElementById('menuToggle');
  const mainNav = document.getElementById('mainNav');

  if (menuToggle && mainNav) {
    menuToggle.addEventListener('click', () => {
      mainNav.classList.toggle('active');
    });
  }

  // Close Navigation on click outside or item select
  document.querySelectorAll('#mainNav a').forEach(link => {
    link.addEventListener('click', () => {
      if (mainNav) mainNav.classList.remove('active');
    });
  });

  // Fetch Public Content
  fetchAnnouncements();
  fetchReviews();
  setupReviewSubmission();
});

// BANNER DISMISSAL
function closeBanner() {
  const banner = document.getElementById('announcement-banner');
  if (banner) banner.style.display = 'none';
}

// FETCH ANNOUNCEMENTS FROM SUPABASE
async function fetchAnnouncements() {
  if (!supabase) return;
  try {
    const { data, error } = await supabase
      .from('site_announcements')
      .select('*')
      .order('id', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) return;

    const banner = document.getElementById('announcement-banner');
    const textEl = document.getElementById('announcement-text');

    if (banner && textEl && data[0].message) {
      textEl.innerHTML = `<i class="fa-solid fa-bullhorn"></i> ${data[0].message}`;
      banner.style.display = 'block';
    }
  } catch (e) {
    console.error("Announcement load error:", e);
  }
}

// FETCH REVIEWS FROM SUPABASE
async function fetchReviews() {
  const container = document.getElementById('reviewsContainer');
  if (!container || !supabase) return;

  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(6);

    if (error || !data || data.length === 0) {
      container.innerHTML = '<p style="color: var(--text-muted); grid-column: 1/-1;">No reviews posted yet. Be the first to leave one!</p>';
      return;
    }

    container.innerHTML = '';
    data.forEach(item => {
      const stars = '★'.repeat(item.rating || 5) + '☆'.repeat(5 - (item.rating || 5));
      const reviewCard = document.createElement('div');
      reviewCard.className = 'card';
      reviewCard.innerHTML = `
        <div style="color: #f59e0b; margin-bottom: 0.5rem; font-size: 1.1rem;">${stars}</div>
        <p style="font-style: italic; margin-bottom: 1rem;">"${item.message}"</p>
        <strong style="display: block; color: var(--primary-red);">- ${item.name}</strong>
      `;
      container.appendChild(reviewCard);
    });
  } catch (e) {
    container.innerHTML = '<p style="color: var(--text-muted); grid-column: 1/-1;">Unable to load reviews right now.</p>';
  }
}

// SUBMIT REVIEWS TO SUPABASE
function setupReviewSubmission() {
  const form = document.getElementById('reviewForm');
  const status = document.getElementById('reviewStatus');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (status) {
      status.textContent = 'Submitting...';
      status.style.color = 'var(--text-muted)';
    }

    const name = document.getElementById('reviewName').value;
    const rating = parseInt(document.getElementById('reviewRating').value);
    const message = document.getElementById('reviewMessage').value;

    if (!supabase) {
      if (status) {
        status.textContent = 'Service unavailable. Please try again later.';
        status.style.color = 'red';
      }
      return;
    }

    const { error } = await supabase
      .from('reviews')
      .insert([{ name, rating, message }]);

    if (error) {
      if (status) {
        status.textContent = 'Error: ' + error.message;
        status.style.color = 'red';
      }
    } else {
      if (status) {
        status.textContent = 'Thank you! Your review has been submitted.';
        status.style.color = 'green';
      }
      form.reset();
      fetchReviews();
    }
  });
}

// =========================================================
// ADMIN PORTAL LOGIC & SUPABASE AUTHENTICATION
// =========================================================

let currentMediaArea = 'about';

// Check session status on page load
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('admin-login-card')) {
    checkAdminSession();
  }
});

async function checkAdminSession() {
  if (!supabase) return;
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session) {
    showDashboard(session.user);
  } else {
    showLoginView();
  }
}

function showDashboard(user) {
  document.getElementById('admin-login-card').style.display = 'none';
  document.getElementById('admin-recovery-card').style.display = 'none';
  document.getElementById('admin-dashboard-view').style.display = 'block';
  
  const emailEl = document.getElementById('logged-in-user-email');
  if (emailEl) emailEl.textContent = user.email;

  // Load Admin Data
  loadAdminMenuItems();
  loadAdminMedia(currentMediaArea);
  loadAdminPersonnel();
  loadAdminReviews();
}

function showLoginView() {
  document.getElementById('admin-login-card').style.display = 'block';
  document.getElementById('admin-recovery-card').style.display = 'none';
  document.getElementById('admin-dashboard-view').style.display = 'none';
}

function toggleRecoveryView(showRecovery) {
  document.getElementById('admin-login-card').style.display = showRecovery ? 'none' : 'block';
  document.getElementById('admin-recovery-card').style.display = showRecovery ? 'block' : 'none';
}

// AUTH HANDLERS
async function handleSupabaseLogin(e) {
  e.preventDefault();
  const email = document.getElementById('admin-email').value;
  const password = document.getElementById('admin-password').value;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    alert('Login failed: ' + error.message);
  } else {
    showDashboard(data.user);
  }
}

async function handleSupabaseLogout() {
  await supabase.auth.signOut();
  showLoginView();
}

async function handlePasswordRecovery(e) {
  e.preventDefault();
  const email = document.getElementById('recovery-email').value;
  const { error } = await supabase.auth.resetPasswordForEmail(email);

  if (error) {
    alert('Error sending email: ' + error.message);
  } else {
    alert('Password reset link sent to your email.');
    toggleRecoveryView(false);
  }
}

// 1. UPDATE ANNOUNCEMENT
async function updateAnnouncement(e) {
  e.preventDefault();
  const message = document.getElementById('admin-announcement-input').value;

  const { error } = await supabase
    .from('site_announcements')
    .insert([{ message }]);

  if (error) {
    alert('Failed to update announcement: ' + error.message);
  } else {
    alert('Announcement updated successfully!');
    document.getElementById('admin-announcement-input').value = '';
  }
}

// 2. MENU MANAGEMENT
async function handleSaveMenuItem(e) {
  e.preventDefault();
  const name = document.getElementById('menu-title-input').value;
  const price = parseFloat(document.getElementById('menu-price-input').value);
  const category = document.getElementById('menu-category-input').value;
  const image_url = document.getElementById('menu-img-input').value;
  const requires_side = document.getElementById('menu-sides-check').checked;
  const available = document.getElementById('menu-avail-check').checked;

  const { error } = await supabase
    .from('menu_items')
    .insert([{ name, price, category, image_url, requires_side, available }]);

  if (error) {
    alert('Failed to save item: ' + error.message);
  } else {
    alert('Menu item added!');
    e.target.reset();
    loadAdminMenuItems();
  }
}

async function loadAdminMenuItems() {
  const container = document.getElementById('admin-menu-render-list');
  if (!container) return;

  const { data, error } = await supabase.from('menu_items').select('*').order('id', { ascending: false });

  if (error || !data) {
    container.innerHTML = '<p>No menu items found.</p>';
    return;
  }

  container.innerHTML = data.map(item => `
    <div class="admin-list-item">
      <div>
        <strong>${item.name}</strong> - ${item.price} UGX (${item.category})
      </div>
      <button class="btn-delete" onclick="deleteMenuItem(${item.id})"><i class="fa-solid fa-trash"></i></button>
    </div>
  `).join('');
}

async function deleteMenuItem(id) {
  if (!confirm('Delete this menu item?')) return;
  await supabase.from('menu_items').delete().eq('id', id);
  loadAdminMenuItems();
}

// 3. MEDIA MANAGEMENT
async function handleMediaUpload(e) {
  e.preventDefault();
  const area = document.getElementById('media-area-input').value;
  const fileInput = document.getElementById('media-file-input');
  const file = fileInput.files[0];

  if (!file) return;

  const filePath = `public/${Date.now()}_${file.name}`;
  const { data, error: uploadError } = await supabase.storage.from('website-media').upload(filePath, file);

  if (uploadError) {
    alert('Upload failed: ' + uploadError.message);
    return;
  }

  const { data: publicUrlData } = supabase.storage.from('website-media').getPublicUrl(filePath);

  const { error: dbError } = await supabase.from('site_media').insert([{
    area,
    media_url: publicUrlData.publicUrl,
    media_type: file.type.startsWith('video/') ? 'video' : 'image'
  }]);

  if (dbError) {
    alert('Database save failed: ' + dbError.message);
  } else {
    alert('Media uploaded!');
    fileInput.value = '';
    loadAdminMedia(area);
  }
}

async function loadAdminMedia(area) {
  const container = document.getElementById('admin-media-list');
  if (!container) return;

  const { data } = await supabase.from('site_media').select('*').eq('area', area);

  if (!data || data.length === 0) {
    container.innerHTML = '<p>No media uploaded for this section.</p>';
    return;
  }

  container.innerHTML = data.map(item => `
    <div class="admin-list-item">
      <span>${item.media_type.toUpperCase()} - ${item.media_url.substring(item.media_url.lastIndexOf('/') + 1)}</span>
      <button class="btn-delete" onclick="deleteMedia(${item.id})"><i class="fa-solid fa-trash"></i></button>
    </div>
  `).join('');
}

async function deleteMedia(id) {
  if (!confirm('Delete this media file?')) return;
  await supabase.from('site_media').delete().eq('id', id);
  loadAdminMedia(currentMediaArea);
}

// 4. PERSONNEL MANAGEMENT
async function handleSavePersonnel(e) {
  e.preventDefault();
  const name = document.getElementById('personnel-name-input').value;
  const role = document.getElementById('personnel-role-input').value;
  const bio = document.getElementById('personnel-bio-input').value;
  const image_url = document.getElementById('personnel-image-input').value;

  const { error } = await supabase.from('personnel').insert([{ name, role, bio, image_url }]);

  if (error) {
    alert('Error adding personnel: ' + error.message);
  } else {
    alert('Personnel added successfully!');
    e.target.reset();
    loadAdminPersonnel();
  }
}

async function loadAdminPersonnel() {
  const container = document.getElementById('admin-personnel-list');
  if (!container) return;

  const { data } = await supabase.from('personnel').select('*');

  if (!data || data.length === 0) {
    container.innerHTML = '<p>No personnel added yet.</p>';
    return;
  }

  container.innerHTML = data.map(person => `
    <div class="admin-list-item">
      <div><strong>${person.name}</strong> - ${person.role}</div>
      <button class="btn-delete" onclick="deletePersonnel(${person.id})"><i class="fa-solid fa-trash"></i></button>
    </div>
  `).join('');
}

async function deletePersonnel(id) {
  if (!confirm('Remove this person?')) return;
  await supabase.from('personnel').delete().eq('id', id);
  loadAdminPersonnel();
}

// 5. REVIEWS MANAGEMENT
async function loadAdminReviews() {
  const container = document.getElementById('admin-reviews-list');
  if (!container) return;

  const { data } = await supabase.from('reviews').select('*').order('created_at', { ascending: false });

  if (!data || data.length === 0) {
    container.innerHTML = '<p>No customer reviews yet.</p>';
    return;
  }

  container.innerHTML = data.map(rev => `
    <div class="admin-list-item">
      <div>
        <strong>${rev.name}</strong> (${rev.rating}★): <em>"${rev.message}"</em>
      </div>
      <button class="btn-delete" onclick="deleteReview(${rev.id})"><i class="fa-solid fa-trash"></i></button>
    </div>
  `).join('');
}

async function deleteReview(id) {
  if (!confirm('Delete this review?')) return;
  await supabase.from('reviews').delete().eq('id', id);
  loadAdminReviews();
}
