let appliedCoupon = null;  
let currentSubtotal = 0;

document.addEventListener('DOMContentLoaded', async () => {
    await loadCart();
    setupCouponBox();
    await setupCheckoutForm();
});

async function loadCart() {
    try {
        const cart = await API.getCart();
        renderCart(cart);
    } catch (err) {
        document.getElementById('cart-items').innerHTML =
            `<p class="text-danger">Errore: ${escapeHTML(err.message)}</p>`;
    }
}

function renderCart(cart) {
    const empty = document.getElementById('cart-empty');
    const content = document.getElementById('cart-content');
    const items = cart.items || [];

    if (items.length === 0) {
        empty.classList.remove('d-none');
        content.classList.add('d-none');
        return;
    }

    empty.classList.add('d-none');
    content.classList.remove('d-none');

    const itemsContainer = document.getElementById('cart-items');
    itemsContainer.innerHTML = items.map(i => cartItemHTML(i)).join('');

    currentSubtotal = cart.total;
    updateTotals();
    bindCartItemEvents();
}

function updateTotals() {
    const sub = currentSubtotal;
    document.getElementById('cart-subtotal').textContent = `€ ${sub.toFixed(2)}`;

    const discountRow = document.getElementById('cart-discount-row');
    if (appliedCoupon) {
        const discount = sub * (appliedCoupon.discountPct / 100);
        const total = sub - discount;
        document.getElementById('cart-discount-label').textContent =
            `Sconto (${appliedCoupon.code} −${appliedCoupon.discountPct}%)`;
        document.getElementById('cart-discount').textContent = `− € ${discount.toFixed(2)}`;
        document.getElementById('cart-total').textContent = `€ ${total.toFixed(2)}`;
        discountRow.classList.remove('d-none');
    } else {
        discountRow.classList.add('d-none');
        document.getElementById('cart-total').textContent = `€ ${sub.toFixed(2)}`;
    }
}

function cartItemHTML(item) {
    const p = item.product;
    return `
        <article class="post-card d-flex gap-3 align-items-center"
                 data-product-id="${escapeHTML(item.productId)}">
            <img src="${escapeHTML(p.image)}" alt="${escapeHTML(p.name)}"
                 style="width: 90px; height: 90px; object-fit: cover; border-radius: 8px;">
            <div class="flex-grow-1">
                <h4 class="mb-1">${escapeHTML(p.name)}</h4>
                <div class="text-muted-eco small">
                    € ${p.price.toFixed(2)} · Eco ${p.ecoScore}/10
                </div>
                <div class="d-flex gap-2 align-items-center mt-2">
                    <button class="btn btn-sm btn-outline-secondary qty-dec">−</button>
                    <input type="number" class="form-control form-control-sm qty-input"
                           style="width: 70px;" value="${item.quantity}" min="1">
                    <button class="btn btn-sm btn-outline-secondary qty-inc">+</button>
                    <button class="btn btn-sm btn-outline-danger ms-auto qty-remove">
                        Rimuovi
                    </button>
                </div>
            </div>
            <div class="text-end">
                <strong>€ ${item.subtotal.toFixed(2)}</strong>
            </div>
        </article>`;
}

function bindCartItemEvents() {
    document.querySelectorAll('[data-product-id]').forEach(card => {
        const productId = card.dataset.productId;
        const input = card.querySelector('.qty-input');
        if (!input) return;
        card.querySelector('.qty-dec').addEventListener('click', async () => {
            const q = Math.max(1, parseInt(input.value) - 1);
            await updateQty(productId, q);
        });
        card.querySelector('.qty-inc').addEventListener('click', async () => {
            const q = parseInt(input.value) + 1;
            await updateQty(productId, q);
        });
        input.addEventListener('change', async () => {
            const q = Math.max(1, parseInt(input.value) || 1);
            await updateQty(productId, q);
        });
        card.querySelector('.qty-remove').addEventListener('click', async () => {
            await API.removeFromCart(productId);
            await Shared.refreshCartBadge();
            await loadCart();
        });
    });
}

async function updateQty(productId, quantity) {
    try {
        await API.updateCart(productId, quantity);
        await Shared.refreshCartBadge();
        await loadCart();
    } catch (err) { alert('Errore: ' + err.message); }
}

function setupCouponBox() {
    const input    = document.getElementById('coupon-input');
    const btn      = document.getElementById('coupon-apply');
    const msgEl    = document.getElementById('coupon-msg');

    function showMsg(text, type) {
        msgEl.textContent = text;
        msgEl.className = `small mt-1 text-${type}`;   // text-success / text-danger / text-muted-eco
    }

    async function apply() {
        const code = input.value.trim().toUpperCase();
        if (!code) {
            // Click su "Applica" con campo vuoto = rimuove coupon eventualmente attivo
            appliedCoupon = null;
            updateTotals();
            showMsg('', 'muted-eco');
            btn.textContent = 'Applica';
            return;
        }
        showMsg('Verifica…', 'muted-eco');
        try {
            const r = await API.validateCoupon(code, currentSubtotal);
            if (!r.valid) {
                appliedCoupon = null;
                updateTotals();
                showMsg('❌ ' + (r.error || 'Coupon non valido'), 'danger');
                btn.textContent = 'Applica';
                return;
            }
            appliedCoupon = { code: r.code, discountPct: r.discountPct, description: r.description };
            updateTotals();
            showMsg(`✅ ${r.description} applicato`, 'success');
            btn.textContent = 'Rimuovi';
        } catch (err) {
            appliedCoupon = null;
            updateTotals();
            showMsg('❌ ' + (err.message || 'Coupon non valido'), 'danger');
            btn.textContent = 'Applica';
        }
    }

    btn.addEventListener('click', () => {
        if (btn.textContent === 'Rimuovi') {
            appliedCoupon = null;
            input.value = '';
            updateTotals();
            msgEl.textContent = '';
            btn.textContent = 'Applica';
        } else {
            apply();
        }
    });
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); apply(); }
    });
}

async function setupCheckoutForm() {
    const form = document.getElementById('checkout-form');
    const loginBox = document.getElementById('checkout-login');
    const errorBox = document.getElementById('checkout-error');

    try {
        await API.me();
        form.classList.remove('d-none');
        loginBox.classList.add('d-none');
    } catch {
        form.classList.add('d-none');
        loginBox.classList.remove('d-none');
    }

    form.addEventListener('submit', async e => {
        e.preventDefault();
        errorBox.classList.add('d-none');
        const shippingAddress = {
            street: document.getElementById('ship-street').value.trim(),
            city:   document.getElementById('ship-city').value.trim(),
            zip:    document.getElementById('ship-zip').value.trim()
        };
        try {
            const couponCode = appliedCoupon ? appliedCoupon.code : undefined;
            const order = await API.createOrder(shippingAddress, couponCode);
            document.getElementById('cart-content').classList.add('d-none');
            document.getElementById('order-success').classList.remove('d-none');
            document.getElementById('order-id').textContent = order.id;
            await Shared.refreshCartBadge();
        } catch (err) {
            errorBox.textContent = err.message;
            errorBox.classList.remove('d-none');
        }
    });
}
