let products = [];
let wishlist = [];
let selectedReviews = {};

const CART_KEY = "shopease-cart";
const HISTORY_KEY = "shopease-order-history";
const AUTH_TOKEN_KEY = "shopease-token";
const USER_KEY = "shopease-user";

const state = {
    cart: loadCart(),
    customer: null,
    deliverySpeed: "standard",
    orderHistory: loadOrderHistory(),
    authToken: localStorage.getItem(AUTH_TOKEN_KEY),
    user: JSON.parse(localStorage.getItem(USER_KEY) || "null")
};

const money = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
});

const productGrid = document.querySelector("#product-grid");
const wishlistGrid = document.querySelector("#wishlist-grid");
const productSearch = document.querySelector("#product-search");
const categoryFilter = document.querySelector("#category-filter");
const sortFilter = document.querySelector("#sort-filter");
const emptyProducts = document.querySelector("#empty-products");
const emptyWishlist = document.querySelector("#empty-wishlist");
const cartList = document.querySelector("#cart-list");
const emptyCartWrapper = document.querySelector("#empty-cart-wrapper");
const checkoutButton = document.querySelector("#checkout-button");
const checkoutReadiness = document.querySelector("#checkout-readiness");
const checkoutForm = document.querySelector("#checkout-form");
const paymentForm = document.querySelector("#payment-form");
const cardFields = document.querySelector("#card-fields");
const upiFields = document.querySelector("#upi-fields");
const successMessage = document.querySelector("#success-message");
const cartCount = document.querySelector("#cart-count");
const deliverySpeed = document.querySelector("#delivery-speed");
const deliveryNote = document.querySelector("#delivery-note");
const toast = document.querySelector("#toast");
const orderBox = document.querySelector("#order-box");
const orderId = document.querySelector("#order-id");
const newOrderButton = document.querySelector("#new-order-button");
const historyList = document.querySelector("#history-list");
const emptyHistoryWrap = document.querySelector("#empty-history-wrap");
const cartItemLabel = document.querySelector("#cart-item-label");
const cartQtyLabel = document.querySelector("#cart-qty-label");
const loginBtn = document.querySelector("#login-btn");
const mobileLoginBtn = document.querySelector("#mobile-login-btn");
const themeToggle = document.querySelector("#theme-toggle");
const signinForm = document.querySelector("#signin-form");
const signupForm = document.querySelector("#signup-form");
const signinMessage = document.querySelector("#signin-message");
const signupMessage = document.querySelector("#signup-message");

let toastTimer;

function loadCart() {
    try {
        return JSON.parse(localStorage.getItem(CART_KEY)) || [];
    } catch {
        return [];
    }
}

function loadOrderHistory() {
    try {
        return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
    } catch {
        return [];
    }
}

function saveCart() {
    try {
        localStorage.setItem(CART_KEY, JSON.stringify(state.cart));
    } catch {
        // localStorage may be blocked in private browsing.
    }
}

function saveOrderHistory() {
    try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(state.orderHistory));
    } catch {
        // Order history still works for the current session.
    }
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function formatMoney(value) {
    return money.format(value || 0);
}

function getDiscountMeta(price) {
    const mrp = Math.round(price * 1.28);
    const discount = Math.max(10, Math.round((1 - price / mrp) * 100));
    return { mrp, discount };
}

function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
}

function pulseCartBadge() {
    if (!cartCount) return;
    cartCount.classList.remove("bump");
    void cartCount.offsetWidth;
    cartCount.classList.add("bump");
    setTimeout(() => cartCount.classList.remove("bump"), 350);
}

async function loadProducts() {
    try {
        const response = await fetch("/api/products");
        if (!response.ok) throw new Error("Failed to fetch products");
        products = await response.json();
        renderProducts();
        renderWishlist();
        renderCart();
    } catch (error) {
        console.error(error);
        showToast("Could not load products. Is the server running?");
    }
}

function setAuthMessage(element, message = "", type = "error") {
    if (!element) return;
    element.textContent = message;
    element.classList.toggle("visible", Boolean(message));
    element.classList.toggle("error", Boolean(message) && type === "error");
    element.classList.toggle("success", Boolean(message) && type === "success");
}

function persistSession({ token, userId, email, name }) {
    state.authToken = token;
    state.user = { userId, email, name };
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(state.user));
    updateAuthUI();
}

async function register({ email, password, name }) {
    try {
        const response = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, name })
        });

        const data = await response.json();
        if (!response.ok) {
            const message = data.error || "Registration failed";
            setAuthMessage(signupMessage, message);
            showToast(message);
            return false;
        }

        persistSession(data);
        await loadWishlist();
        showToast(`Welcome, ${name}!`);
        setAuthMessage(signupMessage, "Account created. Taking you to the store...", "success");
        setTimeout(() => setView("shop"), 600);
        return true;
    } catch (error) {
        setAuthMessage(signupMessage, "Registration error. Please try again.");
        showToast("Registration error");
        return false;
    }
}

async function login({ email, password }) {
    try {
        const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        if (!response.ok) {
            const message = data.error || "Login failed";
            setAuthMessage(signinMessage, message);
            showToast(message);
            return false;
        }

        persistSession(data);
        await loadWishlist();
        showToast(`Welcome back, ${data.name}!`);
        setAuthMessage(signinMessage, "Signed in. Taking you to the store...", "success");
        setTimeout(() => setView("shop"), 600);
        return true;
    } catch (error) {
        setAuthMessage(signinMessage, "Login error. Please try again.");
        showToast("Login error");
        return false;
    }
}

function logout() {
    state.authToken = null;
    state.user = null;
    wishlist = [];
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    updateAuthUI();
    renderProducts();
    renderWishlist();
    showToast("Logged out");
}

function updateAuthUI() {
    if (loginBtn) {
        if (state.user) {
            loginBtn.innerHTML = `<span class="fk-nav-label">Hello,</span><strong>${escapeHtml(state.user.name)}</strong>`;
            loginBtn.removeAttribute("data-step-target");
            loginBtn.onclick = logout;
        } else {
            loginBtn.innerHTML = '<span class="fk-nav-label">Hello,</span><strong>Sign in</strong>';
            loginBtn.dataset.stepTarget = "signin";
            loginBtn.onclick = null;
        }
    }

    if (mobileLoginBtn) {
        if (state.user) {
            mobileLoginBtn.removeAttribute("data-step-target");
            mobileLoginBtn.onclick = logout;
            mobileLoginBtn.querySelector("small").textContent = "Logout";
        } else {
            mobileLoginBtn.dataset.stepTarget = "signin";
            mobileLoginBtn.onclick = null;
            mobileLoginBtn.querySelector("small").textContent = "Account";
        }
    }
}

async function loadWishlist() {
    if (!state.authToken) {
        wishlist = [];
        renderWishlist();
        return;
    }

    try {
        const response = await fetch("/api/wishlist", {
            headers: { Authorization: `Bearer ${state.authToken}` }
        });
        if (response.ok) {
            wishlist = await response.json();
            renderWishlist();
        }
    } catch (error) {
        console.error("Failed to load wishlist:", error);
    }
}

async function toggleWishlist(productId) {
    if (!state.authToken) {
        showToast("Please sign in to save wishlist items");
        setView("signin");
        return;
    }

    try {
        const isInWishlist = wishlist.some((product) => product.id === productId);
        const response = await fetch(`/api/wishlist/${productId}`, {
            method: isInWishlist ? "DELETE" : "POST",
            headers: { Authorization: `Bearer ${state.authToken}` }
        });

        if (!response.ok) throw new Error("Wishlist update failed");
        await loadWishlist();
        renderProducts();
        showToast(isInWishlist ? "Removed from wishlist" : "Added to wishlist");
    } catch (error) {
        showToast("Wishlist action failed");
    }
}

async function loadReviews(productId) {
    try {
        const response = await fetch(`/api/products/${productId}/reviews`);
        if (response.ok) {
            selectedReviews[productId] = await response.json();
        }
    } catch (error) {
        console.error("Failed to load reviews:", error);
    }
}

async function submitReview(productId) {
    if (!state.authToken) {
        showToast("Please sign in to leave a review");
        setView("signin");
        return;
    }

    const rating = Number.parseInt(prompt("Rate product from 1 to 5:"), 10);
    const comment = prompt("Enter your review:");
    if (!rating || rating < 1 || rating > 5 || !comment?.trim()) return;

    try {
        const response = await fetch(`/api/products/${productId}/reviews`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${state.authToken}`
            },
            body: JSON.stringify({ rating, comment: comment.trim() })
        });

        if (!response.ok) throw new Error("Review submission failed");
        await loadReviews(productId);
        await loadProducts();
        showToast("Review submitted");
    } catch (error) {
        showToast("Failed to submit review");
    }
}

function getReviewCount(productId) {
    return (selectedReviews[productId]?.length || 0) + (100 + productId * 23);
}

function toggleTheme() {
    const html = document.documentElement;
    const newTheme = html.getAttribute("data-theme") === "dark" ? "light" : "dark";
    html.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
    if (themeToggle) themeToggle.textContent = newTheme === "dark" ? "Moon" : "Sun";
}

function initTheme() {
    const savedTheme = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);
    if (themeToggle) {
        themeToggle.textContent = savedTheme === "dark" ? "Moon" : "Sun";
        themeToggle.addEventListener("click", toggleTheme);
    }
}

function setView(viewId) {
    if ((viewId === "cart" || viewId === "checkout" || viewId === "payment") && state.cart.length === 0) {
        viewId = "shop";
        showToast("Your cart is empty. Add products first.");
    }

    if (viewId === "payment" && !state.customer) {
        viewId = "checkout";
        showToast("Please enter delivery address first.");
    }

    document.querySelectorAll(".view").forEach((view) => {
        view.classList.toggle("active", view.id === viewId);
    });

    document.querySelectorAll(".nav-item").forEach((item) => {
        item.classList.toggle("active", item.dataset.stepTarget === viewId);
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
    renderCart();
    renderWishlist();
    renderOrderHistory();
}

function getFilteredProducts() {
    const selectedCategory = categoryFilter?.value || "all";
    const searchText = (productSearch?.value || "").trim().toLowerCase();
    const sortMode = sortFilter?.value || "featured";

    let visibleProducts = products.filter((product) => {
        const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;
        const matchesSearch = `${product.name} ${product.category} ${product.description}`.toLowerCase().includes(searchText);
        return matchesCategory && matchesSearch;
    });

    if (sortMode === "low-high") {
        visibleProducts = [...visibleProducts].sort((a, b) => a.price - b.price);
    } else if (sortMode === "high-low") {
        visibleProducts = [...visibleProducts].sort((a, b) => b.price - a.price);
    } else {
        visibleProducts = [...visibleProducts].sort((a, b) => b.rating - a.rating);
    }

    return visibleProducts;
}

function getStockMeta(product) {
    if (!product || product.inventory <= 0) {
        return { label: "Out of stock", className: "out" };
    }

    if (product.inventory <= 10) {
        return { label: `Low stock - ${product.inventory} left`, className: "low" };
    }

    return { label: `In stock - ${product.inventory} left`, className: "in" };
}

function renderProductCard(product, context = "shop") {
    const { mrp, discount } = getDiscountMeta(product.price);
    const reviewCount = getReviewCount(product.id);
    const inWishlist = wishlist.some((item) => item.id === product.id);
    const stock = getStockMeta(product);
    const safeName = escapeHtml(product.name);

    return `
        <article class="product-card" data-product-id="${product.id}">
            <div class="product-image-wrap">
                <img class="product-image" src="${escapeHtml(product.image)}" alt="${safeName}" loading="lazy">
                <span class="product-chip sale-chip">${discount}% off</span>
                ${product.rating >= 4.5 ? '<span class="assured-badge">&#10003; Assured</span>' : ""}
                <button class="wishlist-btn ${inWishlist ? "active" : ""}" type="button" data-wishlist="${product.id}" aria-label="${inWishlist ? "Remove from wishlist" : "Add to wishlist"}" title="${inWishlist ? "Remove from wishlist" : "Add to wishlist"}">
                    ${inWishlist ? "♥" : "♡"}
                </button>
            </div>
            <div class="product-body">
                <span class="product-category">${escapeHtml(product.category)}</span>
                <h3>${safeName}</h3>
                <p class="product-description">${escapeHtml(product.description)}</p>
                <div class="product-rating-row">
                    <span class="product-rating">&#9733; ${Number(product.rating).toFixed(1)}</span>
                    <span class="rating-count">(${reviewCount.toLocaleString("en-IN")})</span>
                </div>
                <div class="price-row">
                    <span class="price">${formatMoney(product.price)}</span>
                    <span class="mrp">${formatMoney(mrp)}</span>
                    <span class="discount-label">${discount}% off</span>
                </div>
                <p class="product-stock ${stock.className}">${stock.label}</p>
                <div class="product-actions">
                    <button class="primary-action" type="button" data-add-product="${product.id}" ${product.inventory <= 0 ? "disabled" : ""}>
                        ${context === "wishlist" ? "MOVE TO CART" : "ADD TO CART"}
                    </button>
                    <button class="secondary-action" type="button" data-review-product="${product.id}" title="Leave a review">Review</button>
                </div>
            </div>
        </article>
    `;
}

function renderProducts() {
    if (!productGrid) return;
    const visibleProducts = getFilteredProducts();
    const query = productSearch?.value.trim() || "";

    if (emptyProducts) {
        emptyProducts.hidden = visibleProducts.length > 0;
        emptyProducts.textContent = visibleProducts.length > 0
            ? ""
            : query
                ? `Sorry, no results for "${query}".`
                : "No products in this category.";
    }

    productGrid.innerHTML = visibleProducts.map((product) => renderProductCard(product)).join("");
}

function renderWishlist() {
    if (!wishlistGrid || !emptyWishlist) return;
    const hasWishlist = state.authToken && wishlist.length > 0;

    wishlistGrid.innerHTML = hasWishlist
        ? wishlist.map((product) => renderProductCard(product, "wishlist")).join("")
        : "";

    emptyWishlist.style.display = hasWishlist ? "none" : "flex";
    const message = emptyWishlist.querySelector(".empty-message");
    if (message) {
        message.textContent = state.authToken
            ? "Your wishlist is empty. Add items to save them for later."
            : "Sign in to save products and view your wishlist here.";
    }
}

function addToCart(productId) {
    const product = products.find((item) => item.id === productId);
    if (!product || product.inventory <= 0) {
        showToast("This product is out of stock");
        return;
    }

    const item = state.cart.find((cartItem) => cartItem.id === productId);
    if (item) {
        if (item.quantity >= product.inventory) {
            showToast("Not enough stock available");
            return;
        }
        item.quantity += 1;
    } else {
        state.cart.push({ id: productId, quantity: 1 });
    }

    saveCart();
    renderCart();
    pulseCartBadge();
    showToast(`${product.name} added to cart`);
}

function updateQuantity(productId, change) {
    const item = state.cart.find((cartItem) => cartItem.id === productId);
    const product = products.find((productItem) => productItem.id === productId);
    if (!item) return;

    const nextQuantity = item.quantity + change;
    if (nextQuantity <= 0) {
        state.cart = state.cart.filter((cartItem) => cartItem.id !== productId);
    } else if (product && nextQuantity > product.inventory) {
        showToast("Not enough stock available");
        return;
    } else {
        item.quantity = nextQuantity;
    }

    saveCart();
    renderCart();
}

function removeFromCart(productId) {
    state.cart = state.cart.filter((item) => item.id !== productId);
    saveCart();
    renderCart();
    showToast("Item removed from cart");
}

function getCartItems() {
    return state.cart
        .map((item) => ({
            ...products.find((product) => product.id === item.id),
            quantity: item.quantity
        }))
        .filter((item) => item.id);
}

function getTotals() {
    const subtotal = getCartItems().reduce((sum, item) => sum + item.price * item.quantity, 0);
    const baseDelivery = subtotal > 0 && subtotal < 2000 ? 99 : 0;
    const expressDelivery = subtotal > 0 && state.deliverySpeed === "express" ? 149 : 0;
    return { subtotal, delivery: baseDelivery + expressDelivery, total: subtotal + baseDelivery + expressDelivery };
}

function getCartQuantity() {
    return state.cart.reduce((sum, item) => sum + item.quantity, 0);
}

function getDeliveryNote(subtotal) {
    if (subtotal === 0) return "";

    const remaining = Math.max(0, 2000 - subtotal);
    const speedText = state.deliverySpeed === "express" ? " Express adds Rs 149." : "";

    if (remaining > 0) {
        return `Add ${formatMoney(remaining)} more for FREE delivery.${speedText}`;
    }

    return `You get FREE delivery on this order.${speedText}`;
}

function renderCart() {
    const items = getCartItems();
    const totals = getTotals();
    const quantity = getCartQuantity();

    if (emptyCartWrapper) emptyCartWrapper.hidden = items.length > 0;
    if (checkoutButton) {
        checkoutButton.disabled = items.length === 0;
        checkoutButton.textContent = items.length > 0 ? "PLACE ORDER" : "ADD ITEMS TO CART";
    }
    if (cartCount) cartCount.textContent = quantity;
    if (cartItemLabel) cartItemLabel.textContent = `(${quantity} item${quantity === 1 ? "" : "s"})`;
    if (cartQtyLabel) cartQtyLabel.textContent = quantity;

    if (checkoutReadiness) {
        checkoutReadiness.textContent = items.length > 0
            ? `${quantity} item${quantity === 1 ? "" : "s"} ready for checkout`
            : "Add at least one item to place order.";
        checkoutReadiness.classList.toggle("ready", items.length > 0);
    }

    if (cartList) {
        cartList.innerHTML = items.map((item) => {
            const { mrp, discount } = getDiscountMeta(item.price);
            const stock = getStockMeta(item);
            return `
                <article class="cart-item">
                    <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}">
                    <div>
                        <h3>${escapeHtml(item.name)}</h3>
                        <p class="category">${formatMoney(item.price)} <s>${formatMoney(mrp)}</s> (${discount}% off)</p>
                        <p class="cart-stock ${stock.className}">${stock.label}</p>
                        <div class="quantity-controls">
                            <button class="quantity-button" type="button" data-quantity="${item.id}" data-change="-1" aria-label="Decrease quantity">-</button>
                            <strong>${item.quantity}</strong>
                            <button class="quantity-button" type="button" data-quantity="${item.id}" data-change="1" aria-label="Increase quantity" ${item.quantity >= item.inventory ? "disabled" : ""}>+</button>
                            <button class="remove-button" type="button" data-remove="${item.id}">REMOVE</button>
                        </div>
                    </div>
                    <strong>${formatMoney(item.price * item.quantity)}</strong>
                </article>
            `;
        }).join("");
    }

    const cartSubtotalEl = document.querySelector("#cart-subtotal");
    const cartDeliveryEl = document.querySelector("#cart-delivery");
    const cartTotalEl = document.querySelector("#cart-total");
    const checkoutTotalEl = document.querySelector("#checkout-total");
    const paymentTotalEl = document.querySelector("#payment-total");

    if (cartSubtotalEl) cartSubtotalEl.textContent = formatMoney(totals.subtotal);
    if (cartDeliveryEl) cartDeliveryEl.textContent = totals.delivery === 0 && totals.subtotal > 0 ? "FREE" : formatMoney(totals.delivery);
    if (cartTotalEl) cartTotalEl.textContent = formatMoney(totals.total);
    if (checkoutTotalEl) checkoutTotalEl.textContent = formatMoney(totals.total);
    if (paymentTotalEl) paymentTotalEl.textContent = formatMoney(totals.total);
    if (deliveryNote) deliveryNote.textContent = getDeliveryNote(totals.subtotal);

    const miniListEl = document.querySelector("#checkout-mini-list");
    if (miniListEl) {
        miniListEl.innerHTML = items.map((item) => `
            <div class="mini-item">
                <span>${escapeHtml(item.name)} x ${item.quantity}</span>
                <strong>${formatMoney(item.price * item.quantity)}</strong>
            </div>
        `).join("");
    }
}

function renderOrderHistory() {
    const hasOrders = state.orderHistory.length > 0;
    if (emptyHistoryWrap) emptyHistoryWrap.classList.toggle("visible", !hasOrders);

    if (!historyList) return;
    historyList.innerHTML = state.orderHistory.map((order) => `
        <article class="history-card">
            <div class="history-card-header">
                <div>
                    <span class="history-id">${escapeHtml(order.id)}</span>
                    <h3>${escapeHtml(order.customer.name)}</h3>
                    <p>${new Date(order.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p>
                </div>
                <strong>${formatMoney(order.total)}</strong>
            </div>
            <div class="history-meta">
                <span>${escapeHtml(order.paymentMethod)}</span>
                <span>${order.deliverySpeed === "express" ? "Express" : "Standard"} delivery</span>
                <span>${escapeHtml(order.customer.city)}, ${escapeHtml(order.customer.pin)}</span>
                <span class="history-status">Confirmed</span>
            </div>
            <div class="history-items">
                ${order.items.map((item) => `
                    <div class="mini-item">
                        <span>${escapeHtml(item.name)} x ${item.quantity}</span>
                        <strong>${formatMoney(item.price * item.quantity)}</strong>
                    </div>
                `).join("")}
            </div>
        </article>
    `).join("");
}

function updatePaymentFields() {
    const selectedMethod = document.querySelector("input[name='payment']:checked")?.value || "cod";
    const usesCard = selectedMethod === "card";
    const usesUpi = selectedMethod === "upi";

    if (cardFields) cardFields.classList.toggle("hidden", !usesCard);
    if (upiFields) upiFields.classList.toggle("hidden", !usesUpi);

    cardFields?.querySelectorAll("input").forEach((input) => {
        input.required = usesCard;
    });
    upiFields?.querySelectorAll("input").forEach((input) => {
        input.required = usesUpi;
    });
}

function setCategory(category) {
    if (!categoryFilter) return;
    categoryFilter.value = category;
    syncCategoryPills();
    renderProducts();
}

function syncCategoryPills() {
    document.querySelectorAll(".category-pill[data-category]").forEach((pill) => {
        pill.classList.toggle("active", pill.dataset.category === (categoryFilter?.value || "all"));
    });
}

function resetOrderState() {
    state.cart = [];
    state.customer = null;
    state.deliverySpeed = "standard";
    if (deliverySpeed) deliverySpeed.value = "standard";
    if (checkoutForm) checkoutForm.reset();
    if (paymentForm) paymentForm.reset();
    if (successMessage) successMessage.textContent = "";
    if (orderBox) orderBox.hidden = true;
    if (newOrderButton) newOrderButton.classList.add("hidden");
    paymentForm?.querySelector("button[type='submit']")?.removeAttribute("disabled");
    saveCart();
    updatePaymentFields();
    renderCart();
    setView("shop");
}

document.addEventListener("click", (event) => {
    const addButton = event.target.closest("[data-add-product]");
    const stepButton = event.target.closest("[data-step-target]");
    const quantityButton = event.target.closest("[data-quantity]");
    const removeButton = event.target.closest("[data-remove]");
    const wishlistButton = event.target.closest("[data-wishlist]");
    const reviewButton = event.target.closest("[data-review-product]");
    const tile = event.target.closest(".fk-tile");

    if (addButton) addToCart(Number(addButton.dataset.addProduct));

    if (stepButton) {
        event.preventDefault();
        setView(stepButton.dataset.stepTarget);
    }

    if (tile?.dataset.category) {
        setCategory(tile.dataset.category);
        setView("shop");
    }

    if (quantityButton) {
        updateQuantity(Number(quantityButton.dataset.quantity), Number(quantityButton.dataset.change));
    }

    if (removeButton) removeFromCart(Number(removeButton.dataset.remove));

    if (wishlistButton) {
        event.preventDefault();
        toggleWishlist(Number(wishlistButton.dataset.wishlist));
    }

    if (reviewButton) {
        event.preventDefault();
        submitReview(Number(reviewButton.dataset.reviewProduct));
    }
});

productSearch?.addEventListener("input", renderProducts);

categoryFilter?.addEventListener("change", () => {
    syncCategoryPills();
    renderProducts();
});

sortFilter?.addEventListener("change", renderProducts);

document.querySelectorAll(".category-pill[data-category]").forEach((pill) => {
    pill.addEventListener("click", () => {
        setCategory(pill.dataset.category);
        setView("shop");
    });
});

deliverySpeed?.addEventListener("change", () => {
    state.deliverySpeed = deliverySpeed.value;
    renderCart();
});

document.querySelectorAll("input[name='payment']").forEach((input) => {
    input.addEventListener("change", updatePaymentFields);
});

checkoutButton?.addEventListener("click", () => setView("checkout"));

checkoutForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    state.customer = {
        name: document.querySelector("#customer-name").value.trim(),
        email: document.querySelector("#customer-email").value.trim(),
        phone: document.querySelector("#customer-phone").value.trim(),
        address: document.querySelector("#customer-address").value.trim(),
        city: document.querySelector("#customer-city").value.trim(),
        pin: document.querySelector("#customer-pin").value.trim(),
        userId: state.user?.userId || null
    };

    const paymentCustomerEl = document.querySelector("#payment-customer");
    if (paymentCustomerEl) {
        paymentCustomerEl.textContent = `Delivering to ${state.customer.name}, ${state.customer.city} ${state.customer.pin}. Confirmation will be sent to ${state.customer.email}.`;
    }
    setView("payment");
});

paymentForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitButton = paymentForm.querySelector("button[type='submit']");
    const selectedMethod = document.querySelector("input[name='payment']:checked")?.value || "cod";
    const methodLabel = { card: "Card", upi: "UPI", cod: "Cash on Delivery" }[selectedMethod];
    const totals = getTotals();

    if (!state.customer || state.cart.length === 0 || totals.total <= 0) {
        showToast("Please complete your cart and delivery address first.");
        return;
    }

    const currentOrderId = `OD${Date.now().toString().slice(-8)}`;
    const order = {
        id: currentOrderId,
        createdAt: new Date().toISOString(),
        customer: state.customer,
        items: getCartItems().map((item) => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity
        })),
        subtotal: totals.subtotal,
        delivery: totals.delivery,
        total: totals.total,
        deliverySpeed: state.deliverySpeed,
        paymentMethod: methodLabel
    };

    try {
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = "PLACING ORDER...";
        }

        const response = await fetch("/api/orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(order)
        });

        if (!response.ok) throw new Error("Failed to save order");

        state.orderHistory = [order, ...state.orderHistory];
        saveOrderHistory();
        renderOrderHistory();

        if (orderId) orderId.textContent = currentOrderId;
        if (orderBox) orderBox.hidden = false;
        if (successMessage) successMessage.textContent = `Your order has been placed successfully via ${methodLabel}.`;
        if (newOrderButton) newOrderButton.classList.remove("hidden");
        if (submitButton) submitButton.textContent = "ORDER PLACED";
        showToast("Order placed successfully");
        await loadProducts();
    } catch (error) {
        console.error(error);
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = "PAY & PLACE ORDER";
        }
        showToast("Could not place order. Please try again.");
    }
});

newOrderButton?.addEventListener("click", resetOrderState);

signinForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setAuthMessage(signinMessage);
    const submitButton = signinForm.querySelector("button[type='submit']");
    submitButton.disabled = true;
    submitButton.textContent = "Signing in...";
    await login({
        email: document.querySelector("#signin-email").value.trim(),
        password: document.querySelector("#signin-password").value
    });
    submitButton.disabled = false;
    submitButton.textContent = "Sign in";
});

signupForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setAuthMessage(signupMessage);

    const password = document.querySelector("#signup-password").value;
    const confirmPassword = document.querySelector("#signup-confirm").value;
    if (password !== confirmPassword) {
        setAuthMessage(signupMessage, "Passwords do not match.");
        return;
    }

    const submitButton = signupForm.querySelector("button[type='submit']");
    submitButton.disabled = true;
    submitButton.textContent = "Creating account...";
    const created = await register({
        name: document.querySelector("#signup-name").value.trim(),
        email: document.querySelector("#signup-email").value.trim(),
        password
    });
    submitButton.disabled = false;
    submitButton.textContent = "Create account";
    if (created) signupForm.reset();
});

syncCategoryPills();
renderCart();
renderWishlist();
renderOrderHistory();
updatePaymentFields();
initTheme();
updateAuthUI();
if (state.authToken && state.user) {
    loadWishlist();
}
loadProducts();
