document.addEventListener('DOMContentLoaded', async () => {
    const guestBox = document.getElementById('wishlist-guest');
    const emptyBox = document.getElementById('wishlist-empty');
    const itemsBox = document.getElementById('wishlist-items');

    const me = await API.me();
    if (!me) {
        guestBox.classList.remove('d-none');
        return;
    }

    await render();

    async function render() {
        guestBox.classList.add('d-none');
        emptyBox.classList.add('d-none');
        itemsBox.classList.add('d-none');
        itemsBox.innerHTML = '';

        let list;
        try {
            list = await API.getWishlist();
        } catch (err) {
            itemsBox.innerHTML =
                `<div class="col-12"><div class="alert alert-danger">
                  Errore nel caricamento: ${escapeHtml(err.message || '')}
                </div></div>`;
            itemsBox.classList.remove('d-none');
            return;
        }

        if (!list || list.length === 0) {
            emptyBox.classList.remove('d-none');
            return;
        }

        for (const p of list) {
            const col = document.createElement('div');
            col.className = 'col-md-6 col-lg-4';
            const stockBadge = p.stock > 0
                ? `<span class="badge bg-success">Disponibile</span>`
                : `<span class="badge bg-secondary">Esaurito</span>`;
            col.innerHTML = `
                <article class="product-card h-100">
                    <img class="product-card__image"
                         src="${escapeHtml(p.img || p.image || '')}"
                         alt="${escapeHtml(p.name)}"
                         loading="lazy">
                    <div class="product-card__body d-flex flex-column">
                        <div class="product-card__category">${escapeHtml(p.category || '')}</div>
                        <h3 class="product-card__name">
                            ${escapeHtml(p.name)}
                            <span class="product-card__eco">Eco ${p.ecoScore || 5}/10</span>
                        </h3>
                        <div class="product-card__price">€ ${Number(p.price).toFixed(2)}</div>
                        <div class="my-2">${stockBadge}</div>
                        <div class="mt-auto d-flex gap-2">
                            <button class="btn-eco flex-grow-1"
                                    data-action="cart" data-id="${p.id}"
                                    ${p.stock > 0 ? '' : 'disabled'}>
                                🛒 Aggiungi
                            </button>
                            <button class="btn btn-outline-danger"
                                    data-action="remove" data-id="${p.id}"
                                    title="Rimuovi dalla lista">✕</button>
                        </div>
                    </div>
                </article>`;
            itemsBox.appendChild(col);
        }

        itemsBox.classList.remove('d-none');
    }

    itemsBox.addEventListener('click', async (e) => {
        const btn = e.target.closest('button[data-action]');
        if (!btn) return;
        const id = btn.dataset.id;
        const action = btn.dataset.action;
        btn.disabled = true;

        try {
            if (action === 'cart') {
                await API.addToCart(id, 1);
                await refreshCartBadge();
                btn.textContent = '✓ Aggiunto';
                setTimeout(() => { btn.innerHTML = '🛒 Aggiungi'; btn.disabled = false; }, 1200);
            } else if (action === 'remove') {
                await API.removeFromWishlist(id);
                await render();
            }
        } catch (err) {
            alert('Errore: ' + (err.message || ''));
            btn.disabled = false;
        }
    });
});

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
        '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    })[c]);
}
