(function () {
  'use strict';

  const STORAGE_KEYS = Object.freeze({
    users: 'urbangent.users.v2',
    session: 'urbangent.session.v2',
    carts: 'urbangent.carts.v2',
    orders: 'urbangent.orders.v2',
    migrated: 'urbangent.migrated.v2'
  });

  const DEFAULT_CUSTOMER = Object.freeze({
    id: 'customer-dangquocphi',
    email: 'dangquocphi111@gmail.com',
    salt: 'urbangent-default-2026',
    passwordHash: 'eb64520fa92993038357626613c49960003c37e9a5aab1e373d555f21527e81b',
    role: 'customer',
    profile: {
      name: 'Dang Quoc Phi',
      phone: '',
      preferredStyle: 'Smart casual',
      address: ''
    },
    createdAt: '2026-08-12T00:00:00.000Z'
  });

  const BANK_DETAILS = Object.freeze({
    bankName: 'MB Bank',
    bankBin: '970422',
    accountNo: '0916514282'
  });

  const PRODUCTS = Object.freeze([
    Object.freeze({
      id: 1,
      name: 'Signature Cotton Shirt',
      category: 'shirts',
      categoryLabel: 'Shirts',
      price: 699000,
      sizes: Object.freeze(['S', 'M', 'L', 'XL']),
      image: 'images/classic-white-shirt.jpg',
      alt: 'Folded premium cotton shirts in white, navy and burgundy'
    }),
    Object.freeze({
      id: 2,
      name: 'Tailored Black Trousers',
      category: 'trousers',
      categoryLabel: 'Trousers',
      price: 899000,
      sizes: Object.freeze(['29', '30', '31', '32']),
      image: 'images/slim-black-trousers.jpg',
      alt: 'Man styling tailored black trousers with a white T-shirt'
    }),
    Object.freeze({
      id: 3,
      name: 'Midnight Bomber Jacket',
      category: 'jackets',
      categoryLabel: 'Jackets',
      price: 1590000,
      sizes: Object.freeze(['S', 'M', 'L', 'XL']),
      image: 'images/bomber-jacket.jpg',
      alt: 'Male model wearing a dark casual jacket'
    }),
    Object.freeze({
      id: 4,
      name: 'Suede Oxford Brogues',
      category: 'shoes',
      categoryLabel: 'Shoes',
      price: 1290000,
      sizes: Object.freeze(['39', '40', '41', '42']),
      image: 'images/leather-shoes.jpg',
      alt: 'Pair of brown suede Oxford brogue shoes'
    })
  ]);

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function readJson(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : clone(fallback);
    } catch (error) {
      localStorage.removeItem(key);
      return clone(fallback);
    }
  }

  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
  }

  function makeId(prefix) {
    const random = new Uint8Array(8);
    crypto.getRandomValues(random);
    const suffix = Array.from(random, (byte) => byte.toString(16).padStart(2, '0')).join('');
    return `${prefix}-${Date.now().toString(36)}-${suffix}`;
  }

  function makeSalt() {
    const random = new Uint8Array(16);
    crypto.getRandomValues(random);
    return Array.from(random, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  async function hashPassword(password, salt) {
    if (!crypto.subtle) {
      throw new Error('Secure password hashing is not supported by this browser.');
    }
    const bytes = new TextEncoder().encode(`${salt}:${password}`);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  function migrateLegacyDataOnce() {
    if (localStorage.getItem(STORAGE_KEYS.migrated)) return;
    ['urbangentCart', 'urbangentUser', 'urbangentSession'].forEach((key) => localStorage.removeItem(key));
    localStorage.setItem(STORAGE_KEYS.migrated, 'true');
  }

  function ensureDefaultAccount() {
    migrateLegacyDataOnce();
    const users = readJson(STORAGE_KEYS.users, []);
    const defaultEmail = normalizeEmail(DEFAULT_CUSTOMER.email);
    const existingIndex = users.findIndex((user) => normalizeEmail(user.email) === defaultEmail);
    const customer = clone(DEFAULT_CUSTOMER);

    if (existingIndex === -1) {
      users.push(customer);
    } else {
      users[existingIndex] = {
        ...users[existingIndex],
        id: customer.id,
        email: customer.email,
        salt: customer.salt,
        passwordHash: customer.passwordHash,
        role: 'customer',
        profile: {
          ...customer.profile,
          ...(users[existingIndex].profile || {})
        }
      };
    }
    writeJson(STORAGE_KEYS.users, users);
  }

  function getUsers() {
    ensureDefaultAccount();
    return readJson(STORAGE_KEYS.users, []);
  }

  function saveUsers(users) {
    writeJson(STORAGE_KEYS.users, users);
  }

  function getSession() {
    const session = readJson(STORAGE_KEYS.session, null);
    if (!session || !session.userId || !session.token || Number(session.expiresAt) <= Date.now()) {
      localStorage.removeItem(STORAGE_KEYS.session);
      return null;
    }
    const userExists = getUsers().some((user) => user.id === session.userId);
    if (!userExists) {
      localStorage.removeItem(STORAGE_KEYS.session);
      return null;
    }
    return session;
  }

  function getCurrentUser() {
    const session = getSession();
    if (!session) return null;
    const user = getUsers().find((item) => item.id === session.userId);
    return user ? clone(user) : null;
  }

  function createSession(userId, remember) {
    const lifetime = remember ? 30 * 24 * 60 * 60 * 1000 : 8 * 60 * 60 * 1000;
    const session = {
      userId,
      token: makeId('session'),
      createdAt: Date.now(),
      expiresAt: Date.now() + lifetime
    };
    writeJson(STORAGE_KEYS.session, session);
    mergeGuestCart(userId);
    return session;
  }

  async function login(email, password, remember) {
    ensureDefaultAccount();
    const normalizedEmail = normalizeEmail(email);
    const user = getUsers().find((item) => normalizeEmail(item.email) === normalizedEmail);
    if (!user) {
      return { ok: false, message: 'The email or password is incorrect.' };
    }
    const submittedHash = await hashPassword(password, user.salt);
    if (submittedHash !== user.passwordHash) {
      return { ok: false, message: 'The email or password is incorrect.' };
    }
    createSession(user.id, Boolean(remember));
    return { ok: true, user: clone(user) };
  }

  async function register(payload) {
    ensureDefaultAccount();
    const users = getUsers();
    const email = normalizeEmail(payload.email);
    if (users.some((user) => normalizeEmail(user.email) === email)) {
      return { ok: false, field: 'email', message: 'This email address is already registered.' };
    }

    const salt = makeSalt();
    const user = {
      id: makeId('customer'),
      email,
      salt,
      passwordHash: await hashPassword(payload.password, salt),
      role: 'customer',
      profile: {
        name: String(payload.name || '').trim(),
        phone: String(payload.phone || '').trim(),
        preferredStyle: 'Smart casual',
        address: ''
      },
      createdAt: new Date().toISOString()
    };
    users.push(user);
    saveUsers(users);
    createSession(user.id, true);
    return { ok: true, user: clone(user) };
  }

  function logout() {
    localStorage.removeItem(STORAGE_KEYS.session);
  }

  function updateCurrentUserProfile(profile) {
    const session = getSession();
    if (!session) return { ok: false, message: 'Please log in again.' };
    const users = getUsers();
    const index = users.findIndex((user) => user.id === session.userId);
    if (index === -1) return { ok: false, message: 'Your account could not be found.' };

    const email = normalizeEmail(profile.email);
    if (users[index].id === DEFAULT_CUSTOMER.id && email !== normalizeEmail(DEFAULT_CUSTOMER.email)) {
      return { ok: false, field: 'email', message: 'The default customer email must remain available.' };
    }
    const duplicate = users.some((user) => user.id !== session.userId && normalizeEmail(user.email) === email);
    if (duplicate) return { ok: false, field: 'email', message: 'This email address is already registered.' };

    users[index] = {
      ...users[index],
      email,
      profile: {
        ...users[index].profile,
        name: String(profile.name || '').trim(),
        phone: String(profile.phone || '').trim(),
        preferredStyle: String(profile.preferredStyle || '').trim(),
        address: String(profile.address || '').trim()
      },
      updatedAt: new Date().toISOString()
    };
    saveUsers(users);
    return { ok: true, user: clone(users[index]) };
  }

  function getCartOwner() {
    return getCurrentUser()?.id || 'guest';
  }

  function getAllCarts() {
    return readJson(STORAGE_KEYS.carts, {});
  }

  function sanitizeCart(items) {
    if (!Array.isArray(items)) return [];
    return items.map((item) => {
      const product = PRODUCTS.find((candidate) => candidate.id === Number(item.productId || item.id));
      const size = String(item.size || '');
      if (!product || !product.sizes.includes(size)) return null;
      return {
        productId: product.id,
        size,
        quantity: Math.min(10, Math.max(1, Number(item.quantity) || 1))
      };
    }).filter(Boolean);
  }

  function getCart(ownerId = getCartOwner()) {
    const carts = getAllCarts();
    return sanitizeCart(carts[ownerId] || []);
  }

  function saveCart(items, ownerId = getCartOwner()) {
    const carts = getAllCarts();
    carts[ownerId] = sanitizeCart(items);
    writeJson(STORAGE_KEYS.carts, carts);
    window.dispatchEvent(new CustomEvent('urbangent:cart-updated'));
  }

  function mergeGuestCart(userId) {
    const carts = getAllCarts();
    const guestItems = sanitizeCart(carts.guest || []);
    if (guestItems.length === 0) return;
    const userItems = sanitizeCart(carts[userId] || []);
    guestItems.forEach((guestItem) => {
      const existing = userItems.find((item) => item.productId === guestItem.productId && item.size === guestItem.size);
      if (existing) {
        existing.quantity = Math.min(10, existing.quantity + guestItem.quantity);
      } else {
        userItems.push(guestItem);
      }
    });
    carts[userId] = userItems;
    delete carts.guest;
    writeJson(STORAGE_KEYS.carts, carts);
  }

  function addCartItem(productId, size) {
    const product = PRODUCTS.find((item) => item.id === Number(productId));
    const selectedSize = String(size || '');
    if (!product) return { ok: false, message: 'This product is unavailable.' };
    if (!product.sizes.includes(selectedSize)) {
      return { ok: false, message: 'Please select a size.' };
    }
    const cart = getCart();
    const existing = cart.find((item) => item.productId === product.id && item.size === selectedSize);
    if (existing) existing.quantity = Math.min(10, existing.quantity + 1);
    else cart.push({ productId: product.id, size: selectedSize, quantity: 1 });
    saveCart(cart);
    return { ok: true, product };
  }

  function changeCartQuantity(productId, size, quantity) {
    const cart = getCart();
    const item = cart.find((entry) => entry.productId === Number(productId) && entry.size === String(size));
    if (!item) return;
    item.quantity = Math.min(10, Math.max(1, Number(quantity) || 1));
    saveCart(cart);
  }

  function removeCartItem(productId, size) {
    const cart = getCart().filter((item) => !(item.productId === Number(productId) && item.size === String(size)));
    saveCart(cart);
  }

  function getCartDetails() {
    const items = getCart().map((item) => {
      const product = PRODUCTS.find((candidate) => candidate.id === item.productId);
      return {
        ...item,
        product: clone(product),
        lineTotal: product.price * item.quantity
      };
    });
    const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
    const delivery = subtotal === 0 || subtotal >= 1500000 ? 0 : 50000;
    return { items, subtotal, delivery, total: subtotal + delivery };
  }

  function makeOrderId() {
    const date = new Date();
    const datePart = [
      String(date.getFullYear()).slice(-2),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0')
    ].join('');
    const random = new Uint8Array(2);
    crypto.getRandomValues(random);
    const suffix = Array.from(random, (byte) => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
    return `UG${datePart}${suffix}`;
  }

  function buildVietQrUrl(order) {
    const transferContent = String(order.payment.transferContent).replace(/[^A-Za-z0-9 ]/g, '').slice(0, 50);
    const params = new URLSearchParams({
      amount: String(order.total),
      addInfo: transferContent
    });
    return `https://img.vietqr.io/image/${BANK_DETAILS.bankBin}-${BANK_DETAILS.accountNo}-compact2.png?${params.toString()}`;
  }

  function createOrder(deliveryDetails) {
    const user = getCurrentUser();
    if (!user) return { ok: false, code: 'AUTH_REQUIRED', message: 'Please log in before checkout.' };
    const cart = getCartDetails();
    if (cart.items.length === 0) return { ok: false, code: 'EMPTY_CART', message: 'Your cart is empty.' };
    const missingSize = cart.items.some((item) => !item.product.sizes.includes(item.size));
    if (missingSize) return { ok: false, code: 'SIZE_REQUIRED', message: 'Every item must have a valid size.' };

    const paymentMethod = ['cash', 'card', 'bank_transfer'].includes(deliveryDetails.paymentMethod)
      ? deliveryDetails.paymentMethod
      : 'bank_transfer';
    const paymentConfig = {
      cash: { label: 'Cash', orderStatus: 'awaiting_fulfillment', paymentStatus: 'pay_on_delivery' },
      card: { label: 'Card', orderStatus: 'awaiting_card_payment', paymentStatus: 'pay_on_delivery' },
      bank_transfer: { label: 'Bank transfer', orderStatus: 'awaiting_payment', paymentStatus: 'awaiting_transfer' }
    }[paymentMethod];
    const orderId = makeOrderId();
    const order = {
      id: orderId,
      userId: user.id,
      customer: {
        name: String(deliveryDetails.name || '').trim(),
        email: normalizeEmail(deliveryDetails.email),
        phone: String(deliveryDetails.phone || '').trim(),
        address: String(deliveryDetails.address || '').trim()
      },
      items: cart.items.map((item) => ({
        productId: item.productId,
        name: item.product.name,
        image: item.product.image,
        alt: item.product.alt,
        size: item.size,
        quantity: item.quantity,
        unitPrice: item.product.price,
        lineTotal: item.lineTotal
      })),
      subtotal: cart.subtotal,
      delivery: cart.delivery,
      total: cart.total,
      status: paymentConfig.orderStatus,
      payment: {
        method: paymentMethod,
        label: paymentConfig.label,
        status: paymentConfig.paymentStatus
      },
      createdAt: new Date().toISOString()
    };
    if (paymentMethod === 'bank_transfer') {
      Object.assign(order.payment, {
        bankName: BANK_DETAILS.bankName,
        accountNo: BANK_DETAILS.accountNo,
        transferContent: `TT ${orderId}`
      });
      order.payment.qrUrl = buildVietQrUrl(order);
    }
    const orders = readJson(STORAGE_KEYS.orders, []);
    orders.push(order);
    writeJson(STORAGE_KEYS.orders, orders);
    saveCart([], user.id);
    return { ok: true, order: clone(order) };
  }

  function getOrdersForCurrentUser() {
    const user = getCurrentUser();
    if (!user) return [];
    return readJson(STORAGE_KEYS.orders, [])
      .filter((order) => order.userId === user.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(clone);
  }

  function getOrderForCurrentUser(orderId) {
    const user = getCurrentUser();
    if (!user) return null;
    const order = readJson(STORAGE_KEYS.orders, []).find((item) => item.id === orderId && item.userId === user.id);
    return order ? clone(order) : null;
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0
    }).format(Number(value) || 0);
  }

  ensureDefaultAccount();

  window.UrbanGentStore = Object.freeze({
    PRODUCTS,
    BANK_DETAILS,
    normalizeEmail,
    ensureDefaultAccount,
    getCurrentUser,
    login,
    register,
    logout,
    updateCurrentUserProfile,
    getCart,
    getCartDetails,
    addCartItem,
    changeCartQuantity,
    removeCartItem,
    createOrder,
    getOrdersForCurrentUser,
    getOrderForCurrentUser,
    buildVietQrUrl,
    formatCurrency
  });
}());
