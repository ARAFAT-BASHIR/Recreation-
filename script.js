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
