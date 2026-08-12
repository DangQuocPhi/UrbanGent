(function () {
  'use strict';

  const store = window.UrbanGentStore;
  if (!store) throw new Error('UrbanGent data store was not loaded.');

  const PROTECTED_PAGES = new Set(['profile.html', 'checkout.html', 'order.html']);
  const GUEST_ONLY_PAGES = new Set(['login.html', 'register.html']);

  function pageName() {
    const name = window.location.pathname.split('/').pop();
    return name || 'index.html';
  }

  function safeNextPage(value) {
    const allowed = new Set(['index.html', 'profile.html', 'cart.html', 'checkout.html']);
    const candidate = String(value || '').split('?')[0].split('#')[0];
    return allowed.has(candidate) ? candidate : 'profile.html';
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function showAlert(message, type = 'info') {
    showToast(message, type);
  }

  function showToast(message, type = 'info') {
    let region = document.getElementById('toastRegion');
    if (!region) {
      region = document.createElement('div');
      region.id = 'toastRegion';
      region.className = 'toast-region';
      region.setAttribute('aria-live', type === 'danger' ? 'assertive' : 'polite');
      region.setAttribute('aria-atomic', 'false');
      document.body.append(region);
    }

    const toast = document.createElement('div');
    toast.className = `site-toast site-toast-${type}`;
    toast.setAttribute('role', type === 'danger' ? 'alert' : 'status');
    const messageElement = document.createElement('span');
    messageElement.className = 'site-toast-message';
    messageElement.textContent = message;
    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'site-toast-close';
    closeButton.setAttribute('aria-label', 'Close notification');
    closeButton.textContent = '×';
    toast.append(messageElement, closeButton);
    region.append(toast);

    const removeToast = () => {
      toast.classList.remove('show');
      window.setTimeout(() => toast.remove(), 180);
    };
    closeButton.addEventListener('click', removeToast);
    window.requestAnimationFrame(() => toast.classList.add('show'));
    window.setTimeout(removeToast, 4500);
  }

  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
  }

  function validatePhone(phone) {
    const digits = String(phone || '').replace(/[\s.-]/g, '');
    return /^(\+84|0)\d{9,10}$/.test(digits);
  }

  function setFieldState(field, isValid, message = '') {
    if (!field) return Boolean(isValid);
    field.classList.toggle('is-valid', Boolean(isValid));
    field.classList.toggle('is-invalid', !isValid);
    field.setAttribute('aria-invalid', String(!isValid));
    const feedback = document.querySelector(`[data-feedback-for="${field.id}"]`);
    if (feedback) feedback.textContent = isValid ? '' : message;
    return Boolean(isValid);
  }

  function clearFieldState(form) {
    form.querySelectorAll('.is-valid, .is-invalid').forEach((field) => {
      field.classList.remove('is-valid', 'is-invalid');
      field.removeAttribute('aria-invalid');
    });
  }

  function setSubmitBusy(form, busy, busyText) {
    const button = form.querySelector('button[type="submit"]');
    if (!button) return;
    if (!button.dataset.defaultText) button.dataset.defaultText = button.textContent;
    button.disabled = busy;
    button.textContent = busy ? busyText : button.dataset.defaultText;
  }

  function guardCurrentPage() {
    const currentPage = pageName();
    const user = store.getCurrentUser();
    if (PROTECTED_PAGES.has(currentPage) && !user) {
      const destination = `login.html?next=${encodeURIComponent(currentPage)}&reason=login`;
      window.location.replace(destination);
      return false;
    }
    if (GUEST_ONLY_PAGES.has(currentPage) && user) {
      window.location.replace('profile.html');
      return false;
    }
    return true;
  }

  function renderAccountNavigation() {
    const user = store.getCurrentUser();
    document.querySelectorAll('a[href="profile.html"]').forEach((link) => {
      link.closest('.nav-item')?.toggleAttribute('hidden', !user);
      if (!link.closest('.nav-item')) link.toggleAttribute('hidden', !user);
    });
    document.querySelectorAll('nav a[href="login.html"], nav a[href="register.html"]').forEach((link) => {
      link.closest('.nav-item')?.toggleAttribute('hidden', Boolean(user));
    });

    document.querySelectorAll('[data-account-name]').forEach((element) => {
      element.textContent = user?.profile?.name || '';
    });

    document.querySelectorAll('.account-logout-item').forEach((item) => item.remove());
    if (user) {
      document.querySelectorAll('#mainNavbar .navbar-nav').forEach((list) => {
        const cartItem = list.querySelector('a[href="cart.html"]')?.closest('.nav-item');
        const item = document.createElement('li');
        item.className = 'nav-item account-logout-item';
        const button = document.createElement('button');
        button.className = 'nav-link nav-button';
        button.type = 'button';
        button.dataset.logout = 'true';
        button.textContent = 'Logout';
        item.append(button);
        if (cartItem) list.insertBefore(item, cartItem);
        else list.append(item);
      });
    }
  }

  function setupLogout() {
    document.addEventListener('click', (event) => {
      const button = event.target.closest('[data-logout]');
      if (!button) return;
      store.logout();
      renderAccountNavigation();
      updateCartCount();
      window.location.assign('index.html?loggedOut=1');
    });
  }

  function updateCartCount() {
    const count = store.getCart().reduce((sum, item) => sum + item.quantity, 0);
    document.querySelectorAll('.cart-count').forEach((element) => {
      element.textContent = count;
      element.setAttribute('aria-label', `${count} items in cart`);
    });
  }

  function setupLoginForm() {
    const form = document.getElementById('loginForm');
    if (!form) return;

    const params = new URLSearchParams(window.location.search);
    if (params.get('reason') === 'login') {
      showAlert('Please log in to access that page.', 'warning');
    }

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const emailField = document.getElementById('loginEmail');
      const passwordField = document.getElementById('loginPassword');
      const email = emailField.value.trim();
      const password = passwordField.value;
      const emailValid = setFieldState(emailField, validateEmail(email), 'Enter a valid email address.');
      const passwordValid = setFieldState(passwordField, password.length >= 8, 'Password must contain at least 8 characters.');

      if (!emailValid || !passwordValid) {
        showAlert('Please check the highlighted fields.', 'danger');
        form.querySelector('.is-invalid')?.focus();
        return;
      }

      setSubmitBusy(form, true, 'Signing in...');
      try {
        const result = await store.login(email, password, document.getElementById('rememberMe')?.checked);
        if (!result.ok) {
          setFieldState(emailField, false, result.message);
          setFieldState(passwordField, false, result.message);
          showAlert(result.message, 'danger');
          emailField.focus();
          return;
        }
        setFieldState(emailField, true);
        setFieldState(passwordField, true);
        window.location.assign('index.html?loggedIn=1');
      } catch (error) {
        showAlert(error.message || 'Login could not be completed.', 'danger');
      } finally {
        setSubmitBusy(form, false, 'Signing in...');
      }
    });
  }

  function setupRegisterForm() {
    const form = document.getElementById('registerForm');
    if (!form) return;

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const nameField = document.getElementById('registerName');
      const emailField = document.getElementById('registerEmail');
      const phoneField = document.getElementById('registerPhone');
      const passwordField = document.getElementById('registerPassword');
      const confirmField = document.getElementById('confirmPassword');
      const termsField = document.getElementById('terms');

      const checks = [
        setFieldState(nameField, nameField.value.trim().length >= 2, 'Enter your full name.'),
        setFieldState(emailField, validateEmail(emailField.value), 'Enter a valid email address.'),
        setFieldState(phoneField, validatePhone(phoneField.value), 'Enter a valid Vietnamese phone number.'),
        setFieldState(passwordField, /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(passwordField.value), 'Use at least 8 characters with a letter and a number.'),
        setFieldState(confirmField, confirmField.value === passwordField.value && confirmField.value !== '', 'Passwords do not match.'),
        setFieldState(termsField, termsField.checked, 'You must accept the terms and privacy policy.')
      ];

      if (checks.some((value) => !value)) {
        showAlert('Please check the highlighted fields.', 'danger');
        form.querySelector('.is-invalid')?.focus();
        return;
      }

      setSubmitBusy(form, true, 'Creating account...');
      try {
        const result = await store.register({
          name: nameField.value,
          email: emailField.value,
          phone: phoneField.value,
          password: passwordField.value
        });
        if (!result.ok) {
          if (result.field === 'email') {
            setFieldState(emailField, false, result.message);
            emailField.focus();
          }
          showAlert(result.message, 'danger');
          return;
        }
        window.location.assign('index.html?registered=1');
      } catch (error) {
        showAlert(error.message || 'Registration could not be completed.', 'danger');
      } finally {
        setSubmitBusy(form, false, 'Creating account...');
      }
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
        setFieldState(emailField, validateEmail(emailField.value), 'Enter a valid email address.'),
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

    filterButtons.forEach((button) => button.addEventListener('click', () => chooseCategory(button.dataset.filter)));
    searchField?.addEventListener('input', applyFilters);
    document.querySelectorAll('[data-category-link]').forEach((link) => {
      link.addEventListener('click', () => chooseCategory(link.dataset.categoryLink));
    });

    document.querySelectorAll('[data-add-to-cart]').forEach((button) => {
      button.addEventListener('click', () => {
        const productId = Number(button.dataset.addToCart);
        const select = document.getElementById(button.dataset.sizeSelect);
        if (!select?.value) {
          select?.classList.add('is-invalid');
          showToast('Please select a size before adding this product to your cart.', 'warning');
          return;
        }
        select.classList.remove('is-invalid');
        const result = store.addCartItem(productId, select.value);
        if (!result.ok) {
          showAlert(result.message, 'warning');
          return;
        }
        updateCartCount();
        showAlert(`${result.product.name}, size ${select.value}, was added to your cart.`, 'success');
      });
    });
  }

  function orderStatus(status) {
    const map = {
      awaiting_payment: { label: 'Awaiting payment', className: 'text-bg-warning' },
      awaiting_fulfillment: { label: 'Cash on delivery', className: 'text-bg-info' },
      awaiting_card_payment: { label: 'Card on delivery', className: 'text-bg-info' },
      payment_submitted: { label: 'Transfer submitted', className: 'text-bg-info' },
      paid: { label: 'Paid', className: 'text-bg-success' },
      cancelled: { label: 'Cancelled', className: 'text-bg-secondary' }
    };
    return map[status] || { label: 'Processing', className: 'text-bg-secondary' };
  }

  function renderProfileOrders() {
    const tableBody = document.getElementById('recentOrdersBody');
    const emptyState = document.getElementById('ordersEmptyState');
    if (!tableBody) return;
    const orders = store.getOrdersForCurrentUser();
    tableBody.innerHTML = orders.map((order) => {
      const status = orderStatus(order.status);
      return `<tr>
        <td><strong>#${escapeHtml(order.id)}</strong><small class="d-block text-muted">${order.items.length} item${order.items.length === 1 ? '' : 's'}</small></td>
        <td>${escapeHtml(new Date(order.createdAt).toLocaleDateString('en-GB'))}</td>
        <td><span class="badge ${status.className}">${status.label}</span></td>
        <td class="text-end"><strong>${escapeHtml(store.formatCurrency(order.total))}</strong><a class="d-block small" href="order.html?id=${encodeURIComponent(order.id)}">View order</a></td>
      </tr>`;
    }).join('');
    emptyState?.classList.toggle('d-none', orders.length !== 0);
  }

  function renderProfile(user) {
    if (!user) return;
    const profile = user.profile || {};
    const fields = {
      profileNameField: profile.name || '',
      profileEmailField: user.email || '',
      profilePhoneField: profile.phone || '',
      profileStyle: profile.preferredStyle || '',
      profileAddress: profile.address || ''
    };
    Object.entries(fields).forEach(([id, value]) => {
      const field = document.getElementById(id);
      if (field) field.value = value;
    });
    const nameElement = document.getElementById('profileName');
    if (nameElement) nameElement.textContent = profile.name || user.email;
    const initials = document.getElementById('profileInitials');
    if (initials) {
      initials.textContent = (profile.name || user.email)
        .split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
    }

    const orders = store.getOrdersForCurrentUser();
    const points = Math.floor(orders.reduce((sum, order) => sum + order.total, 0) / 10000);
    const target = Math.max(500, Math.ceil((points + 1) / 500) * 500);
    const progress = Math.min(100, Math.round((points / target) * 100));
    const pointsElement = document.getElementById('loyaltyPoints');
    const progressElement = document.getElementById('loyaltyProgress');
    const progressText = document.getElementById('loyaltyProgressText');
    if (pointsElement) pointsElement.textContent = `${points.toLocaleString('en-US')} loyalty points`;
    if (progressElement) {
      progressElement.style.width = `${progress}%`;
      progressElement.parentElement?.setAttribute('aria-valuenow', String(progress));
    }
    if (progressText) progressText.textContent = `${target - points} more points to reach the next reward.`;
    renderProfileOrders();
  }

  function setupProfilePage() {
    const form = document.getElementById('profileForm');
    if (!form) return;
    let currentUser = store.getCurrentUser();
    if (!currentUser) return;
    const editButton = document.getElementById('editProfileButton');
    const cancelButton = document.getElementById('cancelProfileButton');
    const saveButton = document.getElementById('saveProfileButton');
    const editableFields = [...form.querySelectorAll('[data-profile-editable]')];
    const defaultCustomer = currentUser.id === 'customer-dangquocphi';

    const setEditing = (editing) => {
      editableFields.forEach((field) => {
        if (defaultCustomer && field.id === 'profileEmailField') {
          field.readOnly = true;
          return;
        }
        if (field.tagName === 'SELECT') field.disabled = !editing;
        else field.readOnly = !editing;
      });
      editButton?.classList.toggle('d-none', editing);
      cancelButton?.classList.toggle('d-none', !editing);
      saveButton?.classList.toggle('d-none', !editing);
      if (editing) editableFields[0]?.focus();
      else clearFieldState(form);
    };

    renderProfile(currentUser);
    setEditing(false);
    editButton?.addEventListener('click', () => setEditing(true));
    cancelButton?.addEventListener('click', () => {
      renderProfile(currentUser);
      setEditing(false);
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const nameField = document.getElementById('profileNameField');
      const emailField = document.getElementById('profileEmailField');
      const phoneField = document.getElementById('profilePhoneField');
      const styleField = document.getElementById('profileStyle');
      const addressField = document.getElementById('profileAddress');
      const checks = [
        setFieldState(nameField, nameField.value.trim().length >= 2, 'Enter your full name.'),
        setFieldState(emailField, validateEmail(emailField.value), 'Enter a valid email address.'),
        setFieldState(phoneField, phoneField.value.trim() === '' || validatePhone(phoneField.value), 'Enter a valid Vietnamese phone number.'),
        setFieldState(styleField, styleField.value.trim() !== '', 'Choose your preferred style.'),
        setFieldState(addressField, addressField.value.trim().length <= 180, 'Address must be 180 characters or fewer.')
      ];
      if (checks.some((value) => !value)) {
        showAlert('Please check the highlighted profile fields.', 'danger');
        form.querySelector('.is-invalid')?.focus();
        return;
      }
      const result = store.updateCurrentUserProfile({
        name: nameField.value,
        email: emailField.value,
        phone: phoneField.value,
        preferredStyle: styleField.value,
        address: addressField.value
      });
      if (!result.ok) {
        if (result.field === 'email') setFieldState(emailField, false, result.message);
        showAlert(result.message, 'danger');
        return;
      }
      currentUser = result.user;
      renderProfile(currentUser);
      renderAccountNavigation();
      setEditing(false);
      showAlert('Your personal details were saved on this device.', 'success');
    });
  }

  function cartItemHtml(item) {
    const product = item.product;
    return `<article class="cart-item-card mb-3">
      <div class="p-3 d-flex gap-3 align-items-center flex-wrap flex-sm-nowrap">
        <img class="cart-item-image" src="${escapeHtml(product.image)}" alt="${escapeHtml(product.alt)}" loading="lazy">
        <div class="flex-grow-1">
          <span class="product-category">${escapeHtml(product.categoryLabel)}</span>
          <h2 class="h5 mb-1">${escapeHtml(product.name)}</h2>
          <p class="mb-2"><span class="size-chip">Size ${escapeHtml(item.size)}</span><span class="text-muted small ms-2">Ready to ship</span></p>
          <span class="product-price">${escapeHtml(store.formatCurrency(product.price))}</span>
        </div>
        <div class="d-flex align-items-center gap-3 ms-sm-auto">
          <div class="input-group input-group-sm quantity-control">
            <button class="btn btn-outline-secondary" type="button" data-cart-action="decrease" data-product-id="${product.id}" data-size="${escapeHtml(item.size)}" aria-label="Decrease quantity for ${escapeHtml(product.name)}, size ${escapeHtml(item.size)}" ${item.quantity <= 1 ? 'disabled' : ''}>-</button>
            <input type="number" class="form-control text-center" value="${item.quantity}" aria-label="Quantity for ${escapeHtml(product.name)}, size ${escapeHtml(item.size)}" readonly>
            <button class="btn btn-outline-secondary" type="button" data-cart-action="increase" data-product-id="${product.id}" data-size="${escapeHtml(item.size)}" aria-label="Increase quantity for ${escapeHtml(product.name)}, size ${escapeHtml(item.size)}" ${item.quantity >= 10 ? 'disabled' : ''}>+</button>
          </div>
          <div class="text-end cart-line-total">
            <strong class="d-block">${escapeHtml(store.formatCurrency(item.lineTotal))}</strong>
            <button class="btn btn-link btn-sm px-0 text-danger" type="button" data-cart-action="remove" data-product-id="${product.id}" data-size="${escapeHtml(item.size)}">Remove</button>
          </div>
        </div>
      </div>
    </article>`;
  }

  function renderCartPage() {
    const container = document.getElementById('cartItems');
    if (!container) return;
    const details = store.getCartDetails();
    if (details.items.length === 0) {
      container.innerHTML = `<div class="empty-cart">
        <div class="trust-icon mx-auto mb-3" aria-hidden="true">0</div>
        <h2 class="h4">Your cart is waiting</h2>
        <p class="text-muted mb-4">Choose a product and size to begin your order.</p>
        <a class="btn btn-dark" href="index.html#products">Browse products</a>
      </div>`;
    } else {
      container.innerHTML = details.items.map(cartItemHtml).join('');
    }
    const subtotal = document.getElementById('cartSubtotal');
    const delivery = document.getElementById('cartDelivery');
    const total = document.getElementById('cartTotal');
    const checkout = document.getElementById('checkoutButton');
    if (subtotal) subtotal.textContent = store.formatCurrency(details.subtotal);
    if (delivery) delivery.textContent = details.delivery === 0 ? 'Free' : store.formatCurrency(details.delivery);
    if (total) total.textContent = store.formatCurrency(details.total);
    if (checkout) checkout.disabled = details.items.length === 0;
    updateCartCount();
  }

  function setupCartPage() {
    const container = document.getElementById('cartItems');
    if (!container) return;
    renderCartPage();
    container.addEventListener('click', (event) => {
      const button = event.target.closest('[data-cart-action]');
      if (!button) return;
      const productId = Number(button.dataset.productId);
      const size = button.dataset.size;
      const item = store.getCart().find((entry) => entry.productId === productId && entry.size === size);
      if (!item) return;
      if (button.dataset.cartAction === 'increase') store.changeCartQuantity(productId, size, item.quantity + 1);
      if (button.dataset.cartAction === 'decrease') store.changeCartQuantity(productId, size, item.quantity - 1);
      if (button.dataset.cartAction === 'remove') {
        store.removeCartItem(productId, size);
        showAlert('The selected item was removed from your cart.', 'info');
      }
      renderCartPage();
    });

    document.getElementById('checkoutButton')?.addEventListener('click', () => {
      if (store.getCart().length === 0) {
        showAlert('Your cart is empty.', 'warning');
        return;
      }
      if (!store.getCurrentUser()) {
        showAlert('Please log in before checkout. Your cart will be kept.', 'warning');
        window.setTimeout(() => window.location.assign('login.html?next=checkout.html&reason=login'), 650);
        return;
      }
      window.location.assign('checkout.html');
    });
  }

  function checkoutItemHtml(item) {
    return `<div class="checkout-item d-flex gap-3 py-3">
      <img src="${escapeHtml(item.product.image)}" alt="${escapeHtml(item.product.alt)}" class="checkout-item-image">
      <div class="flex-grow-1"><strong class="d-block">${escapeHtml(item.product.name)}</strong><span class="text-muted small">Size ${escapeHtml(item.size)} x ${item.quantity}</span></div>
      <strong>${escapeHtml(store.formatCurrency(item.lineTotal))}</strong>
    </div>`;
  }

  function setupCheckoutPage() {
    const form = document.getElementById('checkoutForm');
    if (!form) return;
    const user = store.getCurrentUser();
    if (!user) return;
    const details = store.getCartDetails();
    if (details.items.length === 0) {
      showAlert('Your cart is empty. Add a product before checkout.', 'warning');
      form.querySelector('button[type="submit"]').disabled = true;
    }
    const values = {
      checkoutName: user.profile?.name || '',
      checkoutEmail: user.email || '',
      checkoutPhone: user.profile?.phone || '',
      checkoutAddress: user.profile?.address || ''
    };
    Object.entries(values).forEach(([id, value]) => {
      const field = document.getElementById(id);
      if (field) field.value = value;
    });
    const items = document.getElementById('checkoutItems');
    if (items) items.innerHTML = details.items.map(checkoutItemHtml).join('');
    document.getElementById('checkoutSubtotal').textContent = store.formatCurrency(details.subtotal);
    document.getElementById('checkoutDelivery').textContent = details.delivery === 0 ? 'Free' : store.formatCurrency(details.delivery);
    document.getElementById('checkoutTotal').textContent = store.formatCurrency(details.total);

    const paymentOptions = Array.from(form.querySelectorAll('input[name="paymentMethod"]'));
    const submitButton = document.getElementById('checkoutSubmit');
    const paymentCopy = {
      cash: 'Create cash order',
      card: 'Create card order',
      bank_transfer: 'Create order and show VietQR'
    };
    const updatePaymentChoice = () => {
      const selected = paymentOptions.find((option) => option.checked);
      paymentOptions.forEach((option) => {
        option.closest('.payment-method-option')?.classList.toggle('is-selected', option === selected);
      });
      if (submitButton) submitButton.textContent = paymentCopy[selected?.value] || paymentCopy.bank_transfer;
    };
    paymentOptions.forEach((option) => option.addEventListener('change', updatePaymentChoice));
    updatePaymentChoice();

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const nameField = document.getElementById('checkoutName');
      const emailField = document.getElementById('checkoutEmail');
      const phoneField = document.getElementById('checkoutPhone');
      const addressField = document.getElementById('checkoutAddress');
      const termsField = document.getElementById('confirmOrder');
      const paymentMethod = form.querySelector('input[name="paymentMethod"]:checked')?.value || 'bank_transfer';
      const checks = [
        setFieldState(nameField, nameField.value.trim().length >= 2, 'Enter the recipient name.'),
        setFieldState(emailField, validateEmail(emailField.value), 'Enter a valid email address.'),
        setFieldState(phoneField, validatePhone(phoneField.value), 'Enter a valid Vietnamese phone number.'),
        setFieldState(addressField, addressField.value.trim().length >= 10, 'Enter a complete delivery address.'),
        setFieldState(termsField, termsField.checked, 'Confirm that the order information is correct.')
      ];
      if (checks.some((value) => !value)) {
        showAlert('Please complete the delivery and confirmation details.', 'danger');
        form.querySelector('.is-invalid')?.focus();
        return;
      }
      const current = store.getCurrentUser();
      const profileResult = store.updateCurrentUserProfile({
        name: nameField.value,
        email: current.email,
        phone: phoneField.value,
        preferredStyle: current.profile?.preferredStyle || 'Smart casual',
        address: addressField.value
      });
      if (!profileResult.ok) {
        showAlert(profileResult.message, 'danger');
        return;
      }
      const result = store.createOrder({
        name: nameField.value,
        email: emailField.value,
        phone: phoneField.value,
        address: addressField.value,
        paymentMethod
      });
      if (!result.ok) {
        showAlert(result.message, 'danger');
        return;
      }
      window.location.assign(`order.html?id=${encodeURIComponent(result.order.id)}`);
    });
  }

  function renderOrder(order) {
    const container = document.getElementById('orderContent');
    if (!container) return;
    const status = orderStatus(order.status);
    const itemsHtml = order.items.map((item) => `<div class="checkout-item d-flex gap-3 py-3">
      <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.alt)}" class="checkout-item-image">
      <div class="flex-grow-1"><strong class="d-block">${escapeHtml(item.name)}</strong><span class="text-muted small">Size ${escapeHtml(item.size)} x ${item.quantity}</span></div>
      <strong>${escapeHtml(store.formatCurrency(item.lineTotal))}</strong>
    </div>`).join('');
    const isBankTransfer = order.payment.method === 'bank_transfer' || order.payment.method === 'vietqr';
    const paymentPanels = {
      cash: `<aside class="payment-card" aria-labelledby="payment-title">
        <span class="product-category">Payment method</span><h2 class="h3 mt-2" id="payment-title">Cash</h2>
        <div class="payment-method-confirmation"><span class="payment-method-icon" aria-hidden="true">CA</span><strong>Cash on delivery</strong></div>
        <dl class="payment-details"><div><dt>Amount due</dt><dd>${escapeHtml(store.formatCurrency(order.total))}</dd></div></dl>
        <div class="alert alert-info small mb-0">Please prepare the payment when receiving your order.</div>
      </aside>`,
      card: `<aside class="payment-card" aria-labelledby="payment-title">
        <span class="product-category">Payment method</span><h2 class="h3 mt-2" id="payment-title">Card</h2>
        <div class="payment-method-confirmation"><span class="payment-method-icon" aria-hidden="true">CC</span><strong>Card on delivery</strong></div>
        <dl class="payment-details"><div><dt>Amount due</dt><dd>${escapeHtml(store.formatCurrency(order.total))}</dd></div></dl>
        <div class="alert alert-info small mb-0">Have your card ready when receiving the order.</div>
      </aside>`
    };
    const paymentPanelHtml = isBankTransfer ? `<aside class="payment-card" aria-labelledby="vietqr-title">
      <span class="product-category">Bank transfer</span><h2 class="h3 mt-2" id="vietqr-title">Scan VietQR to pay</h2>
      <p class="text-muted small">The QR contains this order's exact total and transfer content.</p>
      <img id="vietQrImage" class="vietqr-image" src="${escapeHtml(order.payment.qrUrl)}" alt="VietQR for order ${escapeHtml(order.id)}, amount ${escapeHtml(store.formatCurrency(order.total))}">
      <dl class="payment-details">
        <div><dt>Bank</dt><dd>${escapeHtml(order.payment.bankName)}</dd></div>
        <div><dt>Account number</dt><dd>${escapeHtml(order.payment.accountNo)}</dd></div>
        <div><dt>Amount</dt><dd>${escapeHtml(store.formatCurrency(order.total))}</dd></div>
        <div><dt>Transfer content</dt><dd><code id="transferContent">${escapeHtml(order.payment.transferContent)}</code></dd></div>
      </dl>
      <button class="btn btn-outline-dark w-100" type="button" id="copyTransferContent">Copy transfer content</button>
      <a class="small d-block text-center mt-3" href="${escapeHtml(order.payment.qrUrl)}" target="_blank" rel="noopener">Open QR image in a new tab</a>
    </aside>` : paymentPanels[order.payment.method] || paymentPanels.cash;

    container.innerHTML = `<div class="row g-4 g-lg-5">
      <div class="col-lg-7">
        <section class="form-card mb-4">
          <div class="d-flex flex-wrap justify-content-between gap-2 align-items-start mb-3">
            <div><span class="product-category">Order placed</span><h2 class="h3 mt-2 mb-1">#${escapeHtml(order.id)}</h2><span class="text-muted small">${escapeHtml(new Date(order.createdAt).toLocaleString('en-GB'))}</span></div>
            <span class="badge ${status.className} px-3 py-2">${status.label}</span>
          </div>
          <div class="order-items">${itemsHtml}</div>
          <div class="border-top pt-3 mt-2">
            <div class="d-flex justify-content-between mb-2"><span class="text-muted">Subtotal</span><strong>${escapeHtml(store.formatCurrency(order.subtotal))}</strong></div>
            <div class="d-flex justify-content-between mb-2"><span class="text-muted">Delivery</span><strong>${order.delivery === 0 ? 'Free' : escapeHtml(store.formatCurrency(order.delivery))}</strong></div>
            <div class="d-flex justify-content-between h5 mb-0"><span>Total</span><strong>${escapeHtml(store.formatCurrency(order.total))}</strong></div>
          </div>
        </section>
        <section class="content-card">
          <span class="product-category">Delivery</span><h2 class="h5 mt-2">Recipient details</h2>
          <p class="mb-1"><strong>${escapeHtml(order.customer.name)}</strong></p>
          <p class="mb-1 text-muted">${escapeHtml(order.customer.phone)} · ${escapeHtml(order.customer.email)}</p>
          <p class="mb-0 text-muted">${escapeHtml(order.customer.address)}</p>
        </section>
      </div>
      <div class="col-lg-5">
        ${paymentPanelHtml}
      </div>
    </div>`;

    document.getElementById('vietQrImage')?.addEventListener('error', () => {
      showToast('The QR image could not load. Check your internet connection or use the bank details shown below.', 'warning');
    });
    document.getElementById('copyTransferContent')?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(order.payment.transferContent);
        showAlert('Transfer content copied.', 'success');
      } catch (error) {
        showAlert(`Transfer content: ${order.payment.transferContent}`, 'info');
      }
    });
  }

  function setupOrderPage() {
    const container = document.getElementById('orderContent');
    if (!container) return;
    const orderId = new URLSearchParams(window.location.search).get('id');
    const order = orderId ? store.getOrderForCurrentUser(orderId) : null;
    if (!order) {
      container.innerHTML = `<div class="empty-cart"><h2 class="h4">Order not found</h2><p class="text-muted">This order does not exist or does not belong to the signed-in customer.</p><a class="btn btn-dark" href="profile.html">Back to profile</a></div>`;
      return;
    }
    renderOrder(order);
  }

  function setupQueryNotices() {
    const params = new URLSearchParams(window.location.search);
    let hasNotice = false;
    if (params.get('loggedIn') === '1') {
      showToast('Login successful. Welcome back to UrbanGent.', 'success');
      hasNotice = true;
    }
    if (params.get('registered') === '1') {
      showToast('Your customer account was created successfully.', 'success');
      hasNotice = true;
    }
    if (params.get('loggedOut') === '1') {
      showToast('You have been logged out.', 'info');
      hasNotice = true;
    }
    if (hasNotice) window.history.replaceState({}, document.title, pageName());
  }

  document.addEventListener('DOMContentLoaded', () => {
    store.ensureDefaultAccount();
    if (!guardCurrentPage()) return;
    renderAccountNavigation();
    document.documentElement.classList.add('auth-ready');
    document.querySelectorAll('.current-year').forEach((element) => {
      element.textContent = new Date().getFullYear();
    });
    updateCartCount();
    setupLogout();
    setupPasswordToggles();
    setupMobileNavigation();
    setupCatalog();
    setupLoginForm();
    setupRegisterForm();
    setupContactForm();
    setupProfilePage();
    setupCartPage();
    setupCheckoutPage();
    setupOrderPage();
    setupQueryNotices();
    window.addEventListener('urbangent:cart-updated', updateCartCount);
  });
}());
