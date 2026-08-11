const PRODUCTS = [
  {
    id: 1,
    name: 'Signature Cotton Shirt',
    category: 'shirts',
    categoryLabel: 'Shirts',
    price: 699000,
    image: 'images/classic-white-shirt.jpg',
    alt: 'Folded premium cotton shirts in white, navy and burgundy'
  },
  {
    id: 2,
    name: 'Tailored Black Trousers',
    category: 'trousers',
    categoryLabel: 'Trousers',
    price: 899000,
    image: 'images/slim-black-trousers.jpg',
    alt: 'Man styling tailored black trousers with a white T-shirt'
  },
  {
    id: 3,
    name: 'Midnight Bomber Jacket',
    category: 'jackets',
    categoryLabel: 'Jackets',
    price: 1590000,
    image: 'images/bomber-jacket.jpg',
    alt: 'Male model wearing a dark casual jacket'
  },
  {
    id: 4,
    name: 'Suede Oxford Brogues',
    category: 'shoes',
    categoryLabel: 'Shoes',
    price: 1290000,
    image: 'images/leather-shoes.jpg',
    alt: 'Pair of brown suede Oxford brogue shoes'
  }
];

const CART_STORAGE_KEY = 'urbangentCart';

function formatCurrency(value) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(value);
}

function getCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(CART_STORAGE_KEY)) || [];
    return saved.map((savedItem) => {
      const product = PRODUCTS.find((item) => item.id === Number(savedItem.id));
      if (!product) return null;
      return {
        ...product,
        quantity: Math.max(1, Number(savedItem.quantity) || 1)
      };
    }).filter(Boolean);
  } catch (error) {
    localStorage.removeItem(CART_STORAGE_KEY);
    return [];
  }
}

function saveCart(cart) {
  const minimalCart = cart.map(({ id, quantity }) => ({ id, quantity }));
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(minimalCart));
  updateCartCount();
}

function updateCartCount() {
  const count = getCart().reduce((sum, item) => sum + item.quantity, 0);
  document.querySelectorAll('.cart-count').forEach((element) => {
    element.textContent = count;
    element.setAttribute('aria-label', `${count} items in cart`);
  });
}

function addToCart(productId) {
  const product = PRODUCTS.find((item) => item.id === productId);
  if (!product) return;

  const cart = getCart();
  const existing = cart.find((item) => item.id === productId);

  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ ...product, quantity: 1 });
  }

  saveCart(cart);
  showAlert(`${product.name} was added to your cart.`, 'success');
}

function removeFromCart(productId) {
  const cart = getCart().filter((item) => item.id !== productId);
  saveCart(cart);
  renderCartPage();
  showAlert('Item removed from your cart.', 'info');
}

function changeQuantity(productId, quantity) {
  const cart = getCart();
  const item = cart.find((product) => product.id === productId);
  if (!item) return;

  item.quantity = Math.min(10, Math.max(1, Number(quantity) || 1));
  saveCart(cart);
  renderCartPage();
}

function renderCartPage() {
  const cartContainer = document.getElementById('cartItems');
  if (!cartContainer) return;

  const subtotalElement = document.getElementById('cartSubtotal');
  const deliveryElement = document.getElementById('cartDelivery');
  const totalElement = document.getElementById('cartTotal');
  const checkoutButton = document.getElementById('checkoutButton');
  const cart = getCart();

  if (cart.length === 0) {
    cartContainer.innerHTML = `
      <div class="empty-cart">
        <div class="trust-icon mx-auto mb-3" aria-hidden="true">0</div>
        <h2 class="h4">Your cart is waiting</h2>
        <p class="text-muted mb-4">Explore the collection and add a piece that fits your everyday style.</p>
        <a class="btn btn-dark" href="index.html#products">Browse products</a>
      </div>`;
    if (subtotalElement) subtotalElement.textContent = formatCurrency(0);
    if (deliveryElement) deliveryElement.textContent = formatCurrency(0);
    if (totalElement) totalElement.textContent = formatCurrency(0);
    if (checkoutButton) checkoutButton.disabled = true;
    return;
  }

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const delivery = subtotal >= 1500000 ? 0 : 50000;

  cartContainer.innerHTML = cart.map((item) => `
    <article class="cart-item-card mb-3">
      <div class="p-3 d-flex gap-3 align-items-center flex-wrap flex-sm-nowrap">
        <img class="cart-item-image" src="${item.image}" alt="${item.alt}" loading="lazy">
        <div class="flex-grow-1">
          <span class="product-category">${item.categoryLabel}</span>
          <h2 class="h5 mb-1">${item.name}</h2>
          <p class="text-muted small mb-2">Size M · Ready to ship</p>
          <span class="product-price">${formatCurrency(item.price)}</span>
        </div>
        <div class="d-flex align-items-center gap-3 ms-sm-auto">
          <div class="input-group input-group-sm" style="width: 116px">
            <button class="btn btn-outline-secondary" type="button" aria-label="Decrease quantity for ${item.name}" onclick="changeQuantity(${item.id}, ${item.quantity - 1})" ${item.quantity <= 1 ? 'disabled' : ''}>−</button>
            <label class="visually-hidden" for="quantity-${item.id}">Quantity for ${item.name}</label>
            <input id="quantity-${item.id}" type="number" class="form-control text-center" value="${item.quantity}" readonly>
            <button class="btn btn-outline-secondary" type="button" aria-label="Increase quantity for ${item.name}" onclick="changeQuantity(${item.id}, ${item.quantity + 1})">+</button>
          </div>
          <div class="text-end" style="min-width: 124px">
            <strong class="d-block">${formatCurrency(item.price * item.quantity)}</strong>
            <button class="btn btn-link btn-sm px-0 text-danger" type="button" onclick="removeFromCart(${item.id})">Remove</button>
          </div>
        </div>
      </div>
    </article>`).join('');

  if (subtotalElement) subtotalElement.textContent = formatCurrency(subtotal);
  if (deliveryElement) deliveryElement.textContent = delivery === 0 ? 'Free' : formatCurrency(delivery);
  if (totalElement) totalElement.textContent = formatCurrency(subtotal + delivery);
  if (checkoutButton) checkoutButton.disabled = false;
}

function showAlert(message, type = 'info') {
  const alertBox = document.getElementById('alertBox');
  if (!alertBox) return;

  alertBox.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close message"></button>
    </div>`;
  alertBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function setFieldState(field, isValid, message) {
  field.classList.toggle('is-valid', isValid);
  field.classList.toggle('is-invalid', !isValid);
  field.setAttribute('aria-invalid', String(!isValid));
  const feedback = document.querySelector(`[data-feedback-for="${field.id}"]`);
  if (feedback) feedback.textContent = isValid ? '' : message;
  return isValid;
}

function clearFieldState(form) {
  form.querySelectorAll('.is-valid, .is-invalid').forEach((field) => {
    field.classList.remove('is-valid', 'is-invalid');
    field.removeAttribute('aria-invalid');
  });
}

function setupLoginForm() {
  const form = document.getElementById('loginForm');
  if (!form) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const emailField = document.getElementById('loginEmail');
    const passwordField = document.getElementById('loginPassword');
    const emailValid = setFieldState(emailField, validateEmail(emailField.value.trim()), 'Enter a valid email address.');
    const passwordValid = setFieldState(passwordField, passwordField.value.length >= 8, 'Password must contain at least 8 characters.');

    if (!emailValid || !passwordValid) {
      showAlert('Please check the highlighted fields.', 'danger');
      form.querySelector('.is-invalid')?.focus();
      return;
    }

    localStorage.setItem('urbangentSession', JSON.stringify({ email: emailField.value.trim() }));
    showAlert('Login details are valid. You can now view your profile.', 'success');
  });
}

function setupRegisterForm() {
  const form = document.getElementById('registerForm');
  if (!form) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const nameField = document.getElementById('registerName');
    const emailField = document.getElementById('registerEmail');
    const phoneField = document.getElementById('registerPhone');
    const passwordField = document.getElementById('registerPassword');
    const confirmField = document.getElementById('confirmPassword');
    const termsField = document.getElementById('terms');

    const digits = phoneField.value.replace(/[\s.-]/g, '');
    const checks = [
      setFieldState(nameField, nameField.value.trim().length >= 2, 'Enter your full name.'),
      setFieldState(emailField, validateEmail(emailField.value.trim()), 'Enter a valid email address.'),
      setFieldState(phoneField, /^(\+84|0)\d{9,10}$/.test(digits), 'Enter a valid Vietnamese phone number.'),
      setFieldState(passwordField, /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(passwordField.value), 'Use at least 8 characters with a letter and a number.'),
      setFieldState(confirmField, confirmField.value === passwordField.value && confirmField.value !== '', 'Passwords do not match.'),
      setFieldState(termsField, termsField.checked, 'You must accept the terms and privacy policy.')
    ];

    if (checks.some((value) => !value)) {
      showAlert('Please check the highlighted fields.', 'danger');
      form.querySelector('.is-invalid')?.focus();
      return;
    }

    const user = {
      name: nameField.value.trim(),
      email: emailField.value.trim(),
      phone: phoneField.value.trim()
    };
    localStorage.setItem('urbangentUser', JSON.stringify(user));
    localStorage.setItem('urbangentSession', JSON.stringify({ email: user.email }));
    showAlert('Your account has been created on this device.', 'success');
    form.reset();
    clearFieldState(form);
  });
}

function setupContactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const nameField = document.getElementById('contactName');
    const emailField = document.getElementById('contactEmail');
    const topicField = document.getElementById('contactTopic');
    const messageField = document.getElementById('contactMessage');

    const checks = [
      setFieldState(nameField, nameField.value.trim().length >= 2, 'Enter your full name.'),
      setFieldState(emailField, validateEmail(emailField.value.trim()), 'Enter a valid email address.'),
      setFieldState(topicField, topicField.value !== '', 'Choose a support topic.'),
      setFieldState(messageField, messageField.value.trim().length >= 10, 'Write at least 10 characters so we can help.')
    ];

    if (checks.some((value) => !value)) {
      showAlert('Please complete all required fields.', 'danger');
      form.querySelector('.is-invalid')?.focus();
      return;
    }

    showAlert('Thanks for contacting UrbanGent. We will reply within one business day.', 'success');
    form.reset();
    clearFieldState(form);
  });
}

function setupPasswordToggles() {
  document.querySelectorAll('[data-password-toggle]').forEach((button) => {
    button.addEventListener('click', () => {
      const field = document.getElementById(button.dataset.passwordToggle);
      if (!field) return;
      const revealing = field.type === 'password';
      field.type = revealing ? 'text' : 'password';
      button.textContent = revealing ? 'Hide' : 'Show';
      button.setAttribute('aria-pressed', String(revealing));
    });
  });
}

function setupMobileNavigation() {
  const collapseElement = document.getElementById('mainNavbar');
  const toggler = document.querySelector('.navbar-toggler');
  if (!collapseElement || !toggler || !window.bootstrap) return;

  collapseElement.querySelectorAll('.nav-link').forEach((link) => {
    link.addEventListener('click', () => {
      if (window.getComputedStyle(toggler).display !== 'none') {
        bootstrap.Collapse.getOrCreateInstance(collapseElement, { toggle: false }).hide();
      }
    });
  });
}

function setupCatalog() {
  const productCards = [...document.querySelectorAll('[data-product-card]')];
  if (productCards.length === 0) return;

  const filterButtons = [...document.querySelectorAll('[data-filter]')];
  const searchField = document.getElementById('productSearch');
  const resultText = document.getElementById('productResultCount');
  const emptyText = document.getElementById('productEmptyState');
  let activeCategory = 'all';

  const applyFilters = () => {
    const query = searchField?.value.trim().toLowerCase() || '';
    let visibleCount = 0;

    productCards.forEach((card) => {
      const categoryMatches = activeCategory === 'all' || card.dataset.category === activeCategory;
      const searchMatches = card.dataset.name.includes(query);
      const visible = categoryMatches && searchMatches;
      card.classList.toggle('d-none', !visible);
      if (visible) visibleCount += 1;
    });

    if (resultText) resultText.textContent = `${visibleCount} product${visibleCount === 1 ? '' : 's'} shown`;
    if (emptyText) emptyText.classList.toggle('d-none', visibleCount !== 0);
  };

  const chooseCategory = (category) => {
    activeCategory = category;
    filterButtons.forEach((button) => {
      const selected = button.dataset.filter === category;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    applyFilters();
  };

  filterButtons.forEach((button) => {
    button.addEventListener('click', () => chooseCategory(button.dataset.filter));
  });
  searchField?.addEventListener('input', applyFilters);
  document.querySelectorAll('[data-category-link]').forEach((link) => {
    link.addEventListener('click', () => chooseCategory(link.dataset.categoryLink));
  });
}

function setupProfile() {
  const nameElement = document.getElementById('profileName');
  if (!nameElement) return;

  try {
    const user = JSON.parse(localStorage.getItem('urbangentUser'));
    if (!user) return;
    nameElement.textContent = user.name;
    const nameField = document.getElementById('profileNameField');
    const emailField = document.getElementById('profileEmailField');
    const phoneField = document.getElementById('profilePhoneField');
    const initials = document.getElementById('profileInitials');
    if (nameField) nameField.value = user.name;
    if (emailField) emailField.value = user.email;
    if (phoneField) phoneField.value = user.phone;
    if (initials) initials.textContent = user.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  } catch (error) {
    localStorage.removeItem('urbangentUser');
  }
}

function setupCheckout() {
  const button = document.getElementById('checkoutButton');
  if (!button) return;
  button.addEventListener('click', () => {
    if (getCart().length === 0) {
      showAlert('Your cart is empty.', 'warning');
      return;
    }
    showAlert('Your order is ready for payment and delivery details.', 'success');
  });
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.current-year').forEach((element) => {
    element.textContent = new Date().getFullYear();
  });
  updateCartCount();
  renderCartPage();
  setupLoginForm();
  setupRegisterForm();
  setupContactForm();
  setupPasswordToggles();
  setupMobileNavigation();
  setupCatalog();
  setupProfile();
  setupCheckout();
});
