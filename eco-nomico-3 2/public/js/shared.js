document.addEventListener('DOMContentLoaded', async () => {
    injectChrome();
    applyStoredTheme();
    await refreshAuthUI();
    await refreshCartBadge();
    bindGlobalHandlers();
});


function injectChrome() {
    const page = document.body.dataset.page || '';

    const navHtml = `
    <nav class="navbar navbar-eco navbar-expand-lg">
        <div class="container">
            <a class="brand navbar-brand" href="index.html">
    <img src="img/LOGO_BRAND.png" alt="Eco-Nomico" width="120" height="80" class="d-inline-block align-center">
</a>
            <button class="navbar-toggler" type="button"
                    data-bs-toggle="collapse" data-bs-target="#mainNav">
                <span class="navbar-toggler-icon"></span>
            </button>
            <div class="collapse navbar-collapse" id="mainNav">
                <ul class="navbar-nav me-auto">
                    <li class="nav-item">
                        <a class="nav-link ${page==='home'?'active':''}" href="index.html">Home</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link ${page==='shop'?'active':''}" href="shop.html">Shop</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link ${page==='community'?'active':''}" href="community.html">Community</a>
                    </li>
                    <li class="nav-item d-none" id="nav-admin-item">
                        <a class="nav-link ${page==='admin'?'active':''}" href="admin.html">Admin</a>
                    </li>
                </ul>
                <div class="d-flex align-items-center gap-2">
                    <button id="theme-toggle" class="btn btn-sm btn-outline-secondary"
                            aria-label="Cambia tema">🌙</button>
                    <a href="cart.html" class="btn btn-sm btn-outline-secondary cart-badge"
                       id="cart-link" data-count="0">🛒 Carrello</a>
                    <a href="wishlist.html" class="btn btn-sm btn-outline-secondary"
                        title="Wishlist">❤️</a>
                    <div id="auth-area"></div>
                </div>
            </div>
        </div>
    </nav>`;

    const footerHtml = '';

    const navSlot = document.getElementById('navbar-slot');
    const footerSlot = document.getElementById('footer-slot');
    if (navSlot) navSlot.innerHTML = navHtml;
    if (footerSlot) footerSlot.innerHTML = footerHtml;
}

function applyStoredTheme() {
    const savedTheme = localStorage.getItem('eco-theme') || 'light';
    
    document.body.setAttribute('data-theme', savedTheme);
    
    const btn = document.getElementById('theme-toggle');
    if (btn) {
        btn.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
    }
}


function toggleTheme() {
    const cur = document.body.getAttribute('data-theme');
    const next = cur === 'dark' ? 'light' : 'dark';
       
    document.body.setAttribute('data-theme', next);
    
    localStorage.setItem('eco-theme', next); 
    
    const btn = document.getElementById('theme-toggle');
    if (btn) btn.textContent = next === 'dark' ? '☀️' : '🌙';
}

async function refreshAuthUI() {
    const area = document.getElementById('auth-area');
    const adminItem = document.getElementById('nav-admin-item');
    if (!area) return;
    try {
        const user = await API.me();
        area.innerHTML = `
            <a href="profile.html" class="btn btn-sm btn-outline-secondary">
                👤 ${escapeHTML(user.username)}
            </a>
            <button id="btn-logout" class="btn btn-sm btn-outline-danger">Esci</button>
        `;
        document.getElementById('btn-logout').addEventListener('click', async () => {
            await API.logout();
            location.href = 'index.html';
        });
        if (adminItem && user.role === 'admin') adminItem.classList.remove('d-none');
        else if (adminItem) adminItem.classList.add('d-none');
    } catch {
        area.innerHTML = `<a href="login.html" class="btn btn-sm btn-eco">Accedi</a>`;
        if (adminItem) adminItem.classList.add('d-none');
    }
}

async function refreshCartBadge() {
    const link = document.getElementById('cart-link');
    if (!link) return;
    try {
        const cart = await API.getCart();
        const count = (cart.items || []).reduce((s, i) => s + i.quantity, 0);
        link.dataset.count = count;
    } catch {
        link.dataset.count = '0';
    }
}

function bindGlobalHandlers() {
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) themeBtn.addEventListener('click', toggleTheme);
}

window.Shared = { refreshCartBadge, refreshAuthUI };

window.escapeHTML = function (s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
};
