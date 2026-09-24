// Menu Data based on the Kiteezi menu sheet
const menuData = [
  // CHICKEN
  { id: 1, name: "Kiteezi Fried Chicken (KFC)", price: 12000, category: "chicken", options: ["Bread coated chicken"], sides: true },
  { id: 2, name: "Indian Curry Chicken", price: 15000, category: "chicken", options: ["Garam masala curry"], sides: true },
  { id: 3, name: "African Curry Chicken", price: 13000, category: "chicken", options: ["Soy sauce & spices"], sides: true },
  { id: 4, name: "Chicken Wings (6pcs)", price: 12000, category: "chicken", sides: true },
  { id: 5, name: "Chicken Drumsticks (4pcs)", price: 15000, category: "chicken", sides: true },
  { id: 6, name: "Chicken Sizzler", price: 17000, category: "chicken", sides: true },

  // FISH
  { id: 7, name: "Whole Fish", price: 35000, category: "fish", sides: true },
  { id: 8, name: "Fish Fillet (Nile Perch)", price: 15000, category: "fish", sides: true },
  { id: 9, name: "Fish Fillet (Tilapia)", price: 18000, category: "fish", sides: true },
  { id: 10, name: "Oven Baked Fish (Whole)", price: 36000, category: "fish", options: ["Marinated with no cooking oil added"], sides: true },

  // GOAT & LIVER
  { id: 11, name: "Goat (1/2 kg)", price: 22000, category: "goat", options: ["Panfried", "Stir fried"], sides: true },
  { id: 12, name: "Goat (1 kg)", price: 42000, category: "goat", options: ["Panfried", "Stir fried", "Oven baked"], sides: true },
  { id: 13, name: "Pan Fried Liver (1/4)", price: 11000, category: "liver", sides: true },

  // BURGERS & PIZZAS
  { id: 14, name: "Chicken Burger", price: 14000, category: "burgers-pizza", options: ["Served with chips (8,000 extra)"] },
  { id: 15, name: "Beef Burger", price: 12000, category: "burgers-pizza" },
  { id: 16, name: "Chicken Pizza (Large)", price: 30000, category: "burgers-pizza" },
  { id: 17, name: "Chicken Pizza (Small)", price: 11000, category: "burgers-pizza" },
  { id: 18, name: "Margherita Pizza (Large)", price: 30000, category: "burgers-pizza" },

  // BREAKFAST & SNACKS
  { id: 19, name: "Cup of Coffee/Tea Combo", price: 20000, category: "breakfast", options: ["Eggs", "Sausages", "Toasted bread"] },
  { id: 20, name: "Beef Samosa (Pair)", price: 3000, category: "breakfast" },
  { id: 21, name: "Chicken Rolex", price: 15000, category: "breakfast" },
  { id: 22, name: "Ordinary Rolex", price: 4000, category: "breakfast" }
];

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

let selectedItem = null;

// Render Menu
function renderMenu(category = 'all') {
  const grid = document.getElementById('menu-grid');
  grid.innerHTML = '';

  const filtered = category === 'all' 
    ? menuData 
    : menuData.filter(item => item.category === category);

  filtered.forEach(item => {
    const card = document.createElement('div');
    card.className = 'menu-card';
    card.innerHTML = `
      <div>
        <h4>${item.name}</h4>
        <p class="price">${item.price.toLocaleString()} UGX</p>
      </div>
      <button class="btn-primary" onclick="openModal(${item.id})">Customize & Order</button>
    `;
    grid.appendChild(card);
  });
}

// Filter Menu Tabs
function filterMenu(category) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');
  renderMenu(category);
}

// Open Order Modal
function openModal(itemId) {
  selectedItem = menuData.find(i => i.id === itemId);
  
  document.getElementById('modal-title').innerText = selectedItem.name;
  document.getElementById('modal-price').innerText = `Base Price: ${selectedItem.price.toLocaleString()} UGX`;

  const prepContainer = document.getElementById('modal-prep-options');
  prepContainer.innerHTML = '';
  if (selectedItem.options) {
    selectedItem.options.forEach((opt, index) => {
      prepContainer.innerHTML += `
        <label><input type="radio" name="prep" value="${opt}" ${index === 0 ? 'checked' : ''}> ${opt}</label>
      `;
    });
  } else {
    prepContainer.innerHTML = '<p>Standard preparation</p>';
  }

  const sidesContainer = document.getElementById('modal-sides-options');
  sidesContainer.innerHTML = '';
  if (selectedItem.sides) {
    sideOptions.forEach((side, index) => {
      sidesContainer.innerHTML += `
        <label><input type="radio" name="side" value="${side}" ${index === 0 ? 'checked' : ''}> ${side}</label>
      `;
    });
  } else {
    sidesContainer.innerHTML = '<p>No side option required</p>';
  }

  document.getElementById('item-modal').style.display = 'flex';
}

function closeModal() {
  document.getElementById('item-modal').style.display = 'none';
}

function addToOrder() {
  alert(`Added ${selectedItem.name} to your cart!`);
  closeModal();
}

// Initial Load
document.addEventListener('DOMContentLoaded', () => {
  renderMenu('all');
});
