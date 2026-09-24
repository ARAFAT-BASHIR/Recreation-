// Storage Key
const STORAGE_KEY = 'kiteezi_menu_data';

// Initial Menu Fallback
const defaultMenuItems = [
  { id: 1, name: "Whole Fish", price: 35000, category: "fish", requiresSides: true, inStock: true, img: "https://i.ibb.co/68S7mG8/fish.png" },
  { id: 2, name: "Fish Fillet (Tilapia)", price: 18000, category: "fish", requiresSides: true, inStock: true, img: "https://i.ibb.co/68S7mG8/fish.png" },
  { id: 3, name: "Kiteezi Fried Chicken (KFC)", price: 12000, category: "chicken", requiresSides: true, inStock: true, img: "https://i.ibb.co/xS9B9tL/chicken.png" },
  { id: 4, name: "Goat (1/2 kg)", price: 22000, category: "goat", requiresSides: true, inStock: true, img: "https://i.ibb.co/2n9mJtL/goat.png" },
  { id: 5, name: "Pan Fried Liver (1/4)", price: 11000, category: "liver", requiresSides: true, inStock: true, img: "https://i.ibb.co/q18vJtL/liver.png" },
  { id: 6, name: "Chicken Pizza (Large)", price: 30000, category: "burgers-pizza", requiresSides: false, inStock: true, img: "https://i.ibb.co/37V9mJt/pizza.png" },
  { id: 7, name: "Beef Burger", price: 12000, category: "burgers-pizza", requiresSides: false, inStock: true, img: "https://i.ibb.co/1n9mJtL/burger.png" },
  { id: 8, name: "Ordinary Rolex", price: 4000, category: "breakfast", requiresSides: false, inStock: true, img: "https://i.ibb.co/1n9mJtL/burger.png" }
];

// Load local items or default
function getStoredMenuItems() {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : defaultMenuItems;
}

function saveMenuItems(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

let menuItems = getStoredMenuItems();

const sideOptions = [
  "White Rice (5,000 UGX)",
  "Vegetable Rice (8,000 UGX)",
  "Egg Fried Rice (8,000 UGX)",
  "Chips Big (10,000 UGX)",
  "Chips Small (8,000 UGX)",
  "Potato Wedges (10,000 UGX)",
  "Posho (5,000 UGX)",
  "Boiled Potatoes (5,000 UGX)",
  "Mashed Potatoes (5,000 UGX)"
];

const prepOptionsMap = {
  goat: ["Panfried", "Stir Fried", "Oven Baked"],
  fish: ["Deep Fried", "Oven Baked (No oil)"],
  chicken: ["Fried", "Grilled", "Stew Curry"]
};

let cart = [];
let currentSelectedItem = null;

// RENDER MENU PAGE
function renderMenuItems(category = 'all') {
  const grid = document.getElementById('menu-grid');
  if(!grid) return;

  grid.innerHTML = '';
  menuItems = getStoredMenuItems();

  const filtered = category === 'all' 
    ? menuItems 
    : menuItems.filter(item => item.category === category);

  filtered.forEach(item => {
    if(!item.inStock) return;

    const card = document.createElement('div');
    card.className = 'menu-card';
    card.innerHTML = `
      <div>
        <img src="${item.img || 'https://via.placeholder.com/200'}" class="menu-img" alt="${item.name}">
        <div class="menu-card-title">${item.name}</div>
        <div class="menu-card-price">${item.price.toLocaleString()} UGX</div>
      </div>
      <button class="btn-primary full-width-btn" onclick="openCustomizeModal(${item.id})">
        <i class="fa-solid fa-plus"></i> Select & Order
      </button>
    `;
    grid.appendChild(card);
  });
}

function filterCategory(cat, btn) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderMenuItems(cat);
}

// CUSTOMIZE MODAL
function openCustomizeModal(id) {
  currentSelectedItem = menuItems.find(i => i.id === id);
  
  document.getElementById('modal-item-name').innerText = currentSelectedItem.name;
  document.getElementById('modal-item-price').innerText = `${currentSelectedItem.price.toLocaleString()} UGX`;
  
  const prepContainer = document.getElementById('prep-options-container');
  prepContainer.innerHTML = '';
  const preps = prepOptionsMap[currentSelectedItem.category] || ["Standard Preparation"];
  preps.forEach((p, idx) => {
    prepContainer.innerHTML += `
      <label><input type="radio" name="prep-choice" value="${p}" ${idx === 0 ? 'checked' : ''}> ${p}</label>
    `;
  });

  const sidesContainer = document.getElementById('side-options-container');
  const sideGroup = document.getElementById('side-group');
  sidesContainer.innerHTML = '';
  
  if (currentSelectedItem.requiresSides) {
    sideGroup.style.display = 'block';
    sideOptions.forEach((s, idx) => {
      sidesContainer.innerHTML += `
        <label><input type="radio" name="side-choice" value="${s}" ${idx === 0 ? 'checked' : ''}> ${s}</label>
      `;
    });
  } else {
    sideGroup.style.display = 'none';
  }

  document.getElementById('item-special-notes').value = '';
  document.getElementById('customize-modal').style.display = 'flex';
}

function closeModal(modalId) {
  document.getElementById(modalId).style.display = 'none';
}

// CART SYSTEM
function confirmAddToCart() {
  const prepChoice = document.querySelector('input[name="prep-choice"]:checked')?.value || 'Standard';
  const sideChoice = currentSelectedItem.requiresSides ? document.querySelector('input[name="side-choice"]:checked')?.value : 'None';
  const notes = document.getElementById('item-special-notes').value;

  const cartEntry = {
    cartId: Date.now(),
    name: currentSelectedItem.name,
    price: currentSelectedItem.price,
    prep: prepChoice,
    side: sideChoice,
    notes: notes
  };

  cart.push(cartEntry);
  updateCartUI();
  closeModal('customize-modal');
  toggleCartDrawer(true);
}

function updateCartUI() {
  const badge = document.getElementById('cart-badge-count');
  if(badge) badge.innerText = cart.length;

  const cartList = document.getElementById('cart-items-list');
  if(!cartList) return;

  cartList.innerHTML = '';
  let total = 0;

  cart.forEach(item => {
    total += item.price;
    cartList.innerHTML += `
      <div class="cart-item-row">
        <div>
          <strong>${item.name}</strong>
          <br><small>Style: ${item.prep}</small>
          ${item.side !== 'None' ? `<br><small>Side: ${item.side}</small>` : ''}
          ${item.notes ? `<br><small>Notes: ${item.notes}</small>` : ''}
          <br><strong>${item.price.toLocaleString()} UGX</strong>
        </div>
        <button onclick="removeFromCart(${item.cartId})" style="background:none; border:none; color:red; cursor:pointer;"><i class="fa-solid fa-trash"></i></button>
      </div>
    `;
  });

  document.getElementById('cart-total-price').innerText = `${total.toLocaleString()} UGX`;
}

function removeFromCart(cartId) {
  cart = cart.filter(i => i.cartId !== cartId);
  updateCartUI();
}

function toggleCartDrawer(forceOpen = false) {
  const drawer = document.getElementById('cart-drawer');
  if (!drawer) return;
  if (forceOpen) {
    drawer.classList.add('open');
  } else {
    drawer.classList.toggle('open');
  }
}

// WHATSAPP CHECKOUT
function checkoutToWhatsApp() {
  if (cart.length === 0) {
    alert("Your cart is empty!");
    return;
  }

  const name = document.getElementById('cust-name').value;
  const phone = document.getElementById('cust-phone').value;
  const location = document.getElementById('cust-location').value;

  if (!name || !phone) {
    alert("Please enter your name and phone number.");
    return;
  }

  let message = `*NEW ORDER - KITEEZI RECREATIONAL CENTER*\n`;
  message += `*Customer:* ${name}\n*Phone:* ${phone}\n*Location/Table:* ${location || 'N/A'}\n\n`;
  message += `*ORDER ITEMS:*\n`;

  let total = 0;
  cart.forEach((item, index) => {
    total += item.price;
    message += `${index + 1}. *${item.name}* (${item.price.toLocaleString()} UGX)\n`;
    message += `   - Style: ${item.prep}\n`;
    if (item.side !== 'None') message += `   - Side: ${item.side}\n`;
    if (item.notes) message += `   - Note: ${item.notes}\n`;
  });

  message += `\n*TOTAL AMOUNT:* ${total.toLocaleString()} UGX`;

  const encodedMsg = encodeURIComponent(message);
  const whatsappNumber = "256700000000"; // Venue contact number
  window.open(`https://wa.me/${whatsappNumber}?text=${encodedMsg}`, '_blank');
}

// ADMIN FUNCTIONS
function handleAdminLogin(e) {
  e.preventDefault();
  const pass = document.getElementById('admin-pass-input').value;
  if (pass === 'kiteezi2026') {
    document.getElementById('admin-login-view').style.display = 'none';
    document.getElementById('admin-dashboard-view').style.display = 'block';
    renderAdminMenuList();
  } else {
    alert("Incorrect admin passcode.");
  }
}

function renderAdminMenuList() {
  const list = document.getElementById('admin-menu-render-list');
  if (!list) return;

  list.innerHTML = '';
  menuItems = getStoredMenuItems();

  menuItems.forEach(item => {
    list.innerHTML += `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:0.6rem 0; border-bottom:1px solid #e2e8f0;">
        <div>
          <strong>${item.name}</strong> 
          <br><small>${item.price.toLocaleString()} UGX - Category: ${item.category}</small>
        </div>
        <button onclick="deleteMenuItem(${item.id})" style="color:red; border:none; background:none; cursor:pointer; font-weight:bold;"><i class="fa-solid fa-trash"></i></button>
      </div>
    `;
  });
}

function handleSaveMenuItem(e) {
  e.preventDefault();
  const newItem = {
    id: Date.now(),
    name: document.getElementById('menu-title-input').value,
    price: parseInt(document.getElementById('menu-price-input').value),
    category: document.getElementById('menu-category-input').value,
    requiresSides: document.getElementById('menu-sides-check').checked,
    inStock: document.getElementById('menu-avail-check').checked,
    img: document.getElementById('menu-img-input').value || "https://via.placeholder.com/200"
  };

  menuItems.push(newItem);
  saveMenuItems(menuItems);
  renderAdminMenuList();
  alert("New item added successfully!");
  document.getElementById('add-menu-form').reset();
}

function deleteMenuItem(id) {
  menuItems = menuItems.filter(i => i.id !== id);
  saveMenuItems(menuItems);
  renderAdminMenuList();
}

// AUTO INIT
document.addEventListener('DOMContentLoaded', () => {
  renderMenuItems('all');
});
