const state = {
    filters: { q: '', category: '', maxPrice: 100 }
};

document.addEventListener('DOMContentLoaded', async () => {
    bindFilterEvents();
    await loadCategories();
    await applyFilters();
});

function bindFilterEvents() {
    const searchInput = document.getElementById('search');
    const maxPrice = document.getElementById('maxPrice');
    const maxPriceVal = document.getElementById('maxPriceVal');
    const resetBtn = document.getElementById('reset-filters');

    let timer;
    searchInput.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            state.filters.q = searchInput.value.trim();
            applyFilters();
        }, 250);
    });

    maxPrice.addEventListener('input', () => {
        maxPriceVal.textContent = maxPrice.value;
        state.filters.maxPrice = Number(maxPrice.value);
        applyFilters();
    });

    resetBtn.addEventListener('click', () => {
        state.filters = { q: '', category: '', maxPrice: 100 };
        searchInput.value = '';
        maxPrice.value = 100;
        maxPriceVal.textContent = '100';
        document.querySelectorAll('#category-filters input').forEach(i => i.checked = false);
        const allRadio = document.querySelector('#category-filters input[value=""]');
        if (allRadio) allRadio.checked = true;
        applyFilters();
    });
}

async function loadCategories() {
    const container = document.getElementById('category-filters');
    try {
        const categories = await API.getCategories();
        container.innerHTML = `
            <label>
                <input type="radio" name="category" value="" checked>
                <span>Tutte</span>
            </label>` +
            categories.map(cat => `
                <label>
                    <input type="radio" name="category" value="${escapeHTML(cat)}">
                    <span>${escapeHTML(cat)}</span>
                </label>
            `).join('');

        container.querySelectorAll('input[name="category"]').forEach(input => {
            input.addEventListener('change', () => {
                state.filters.category = input.value;
                applyFilters();
            });
        });
    } catch (err) {
        container.innerHTML = `<p class="text-danger">Errore: ${escapeHTML(err.message)}</p>`;
    }
}

async function applyFilters() {
    const grid = document.getElementById('product-grid');
    const count = document.getElementById('product-count');
    try {
        const products = await API.getProducts(state.filters);
        count.textContent = `${products.length} prodott${products.length === 1 ? 'o' : 'i'} trovat${products.length === 1 ? 'o' : 'i'}`;
        grid.innerHTML = products.map(productCardHTML).join('');

        // click su "Aggiungi al carrello"
        grid.querySelectorAll('.btn-add-cart').forEach(btn => {
            btn.addEventListener('click', async e => {
                e.preventDefault();
                e.stopPropagation();
                btn.disabled = true;
                btn.textContent = 'Aggiunto ✓';
                try {
                    await API.addToCart(btn.dataset.productId, 1);
                    await Shared.refreshCartBadge();
                } catch (err) { alert('Errore: ' + err.message); }
                setTimeout(() => {
                    btn.disabled = false;
                    btn.textContent = 'Aggiungi al carrello';
                }, 1200);
            });
        });

        // click sulla card (zone non bottone) apre la modale dettaglio
        grid.querySelectorAll('.product-card').forEach(card => {
            card.addEventListener('click', e => {
                // se il click è partito da un bottone o dall'immagine zoom, ignora
                if (e.target.closest('.btn-add-cart')) return;
                if (e.target.classList.contains('product-card__image')) return;
                const id = card.dataset.productId;
                if (id) openProductModal(id);
            });
        });
        grid.querySelectorAll('.btn-add-wishlist').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                try {
                    await API.addToWishlist(btn.dataset.productId);
                    btn.textContent = '♥';
                    btn.disabled = true;
                    btn.title = 'Già nella wishlist';
                } catch (err) {
                    alert('Errore: ' + err.message);
                }
            });
        });
    

    } catch (err) {
        grid.innerHTML = `<p class="text-danger">Errore: ${escapeHTML(err.message)}</p>`;
    }
}

// converte un voto numerico (0-5) in una stringa di stelline
function renderStars(rating) {
    const r = Math.round(Number(rating) || 0);
    return '★'.repeat(r) + '☆'.repeat(5 - r);
}

function productCardHTML(p) {
    const stars = (p.avgRating && p.avgRating > 0)
        ? `<div class="product-card__stars" style="color: var(--color-accent); font-size: 0.95rem;">${renderStars(p.avgRating)}</div>`
        : '';

    return `
        <div class="col-6 col-md-4">
            <article class="product-card" data-product-id="${escapeHTML(p.id)}" style="cursor: pointer;">
                <img class="product-card__image" src="${escapeHTML(p.img)}"
                     alt="${escapeHTML(p.name)}" loading="lazy" onclick="openZoom('${escapeHTML(p.img)}')">
                <div class="product-card__body">
                    <div class="product-card__category">${escapeHTML(p.category)}</div>
                    <h3 class="product-card__name">
                        ${escapeHTML(p.name)}
                        <span class="product-card__eco">Eco ${p.ecoScore}/10</span>
                    </h3>
                    ${stars}
                    <p class="text-muted-eco small">${escapeHTML(p.description.slice(0, 100))}…</p>
                    <div class="product-card__price">€ ${p.price.toFixed(2)}</div>
                    <button class="btn-eco btn-add-cart mt-2" data-product-id="${escapeHTML(p.id)}">
                        Aggiungi al carrello
                    </button>
                    <button class="btn btn-sm btn-outline-secondary btn-add-wishlist" 
                            data-product-id="${escapeHTML(p.id)}" 
                            title="Aggiungi alla wishlist">
                        ♡
                    </button>
                </div>
            </article>
        </div>`;
}

function openZoom(imageSrc) {
    const overlay = document.createElement('div');
    overlay.style = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.8); display: flex; align-items: center;
        justify-content: center; z-index: 1000; cursor: zoom-out;
    `;

    const img = document.createElement('img');
    img.src = imageSrc;
    img.style = "max-width: 90%; max-height: 90%; border-radius: 8px; box-shadow: 0 0 20px rgba(0,0,0,0.5);";

    overlay.appendChild(img);
    document.body.appendChild(overlay);

    overlay.onclick = () => overlay.remove();
}

async function openProductModal(productId) {
    const modal = document.getElementById('product-modal');
    modal.classList.remove('d-none');
    modal.innerHTML = `
        <div class="product-modal-overlay">
            <div class="product-modal-box">
                <p class="text-muted-eco">Caricamento...</p>
            </div>
        </div>
    `;
    applyModalStyle(modal);

    try {
        // recupero in parallelo prodotto e recensioni
        const [product, reviews] = await Promise.all([
            API.getProduct(productId),
            API.getReviews(productId)
        ]);
        renderProductModal(product, reviews);
    } catch (err) {
        modal.querySelector('.product-modal-box').innerHTML =
            `<p class="text-danger">Errore: ${escapeHTML(err.message)}</p>
             <button class="btn btn-sm btn-outline-secondary mt-2" onclick="closeProductModal()">Chiudi</button>`;
    }
}

function applyModalStyle(modal) {
    const overlay = modal.querySelector('.product-modal-overlay');
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.6); display: flex; align-items: center;
        justify-content: center; z-index: 1100; padding: 1rem; overflow-y: auto;
    `;
    const box = modal.querySelector('.product-modal-box');
    box.style.cssText = `
        background: var(--color-surface); color: var(--color-text);
        border-radius: var(--radius); padding: 1.5rem; max-width: 720px;
        width: 100%; max-height: 90vh; overflow-y: auto;
        box-shadow: var(--shadow-md);
    `;
    // chiude la modale se clicco fuori
    overlay.addEventListener('click', e => {
        if (e.target === overlay) closeProductModal();
    });
}

function closeProductModal() {
    const modal = document.getElementById('product-modal');
    modal.classList.add('d-none');
    modal.innerHTML = '';
}

function renderProductModal(p, reviews) {
    const modal = document.getElementById('product-modal');
    const stars = renderStars(p.avgRating || 0);
    const reviewCount = reviews.length;

    modal.innerHTML = `
        <div class="product-modal-overlay">
            <div class="product-modal-box">
                <div class="d-flex justify-content-between align-items-start mb-3">
                    <h2 class="m-0">${escapeHTML(p.name)}</h2>
                    <button class="btn btn-sm btn-outline-secondary" onclick="closeProductModal()">✕</button>
                </div>

                <div class="row mb-3">
                    <div class="col-md-5 mb-3">
                        <img src="${escapeHTML(p.img)}" alt="${escapeHTML(p.name)}"
                             style="width: 100%; border-radius: var(--radius-sm);">
                    </div>
                    <div class="col-md-7">
                        <div class="text-muted-eco small">${escapeHTML(p.category)}</div>
                        <div style="color: var(--color-accent); font-size: 1.1rem;">${stars}
                            <span class="text-muted-eco small">(${reviewCount})</span>
                        </div>
                        <p class="mt-2">${escapeHTML(p.description)}</p>
                        <div style="color: var(--color-primary); font-size: 1.4rem; font-weight: bold;">
                            € ${p.price.toFixed(2)}
                        </div>
                        <div class="text-muted-eco small">
                            Eco-score: ${p.ecoScore}/10 · CO₂ risparmiata: ${p.co2Saved} kg
                        </div>
                        <button class="btn btn-eco mt-3" onclick="addToCartFromModal('${escapeHTML(p.id)}')">
                            Aggiungi al carrello
                        </button>
                    </div>
                </div>

                <hr>

                <h4>Recensioni ${reviewCount > 0 ? `(${reviewCount})` : ''}</h4>
                <div id="reviews-list" class="mb-3">
                    ${reviewCount === 0
                        ? '<p class="text-muted-eco">Nessuna recensione ancora. Sii il primo a scriverne una.</p>'
                        : reviews.map(reviewHTML).join('')}
                </div>

                <hr>

                <h4>Scrivi una recensione</h4>
                <div id="review-form-area">
                    <p class="text-muted-eco small">Caricamento...</p>
                </div>
            </div>
        </div>
    `;
    applyModalStyle(modal);
    setupReviewForm(p.id);
}

function reviewHTML(r) {
    const stars = renderStars(r.rating);
    return `
        <article class="post-card mb-2">
            <div class="d-flex justify-content-between flex-wrap gap-2">
                <div>
                    <strong>${escapeHTML(r.authorName)}</strong>
                    <span style="color: var(--color-accent);">${stars}</span>
                </div>
                <div class="text-muted-eco small">
                    ${new Date(r.created_at).toLocaleDateString('it-IT')}
                </div>
            </div>
            ${r.title ? `<h5 class="mt-2 mb-1">${escapeHTML(r.title)}</h5>` : ''}
            ${r.content ? `<p class="mb-0">${escapeHTML(r.content)}</p>` : ''}
        </article>
    `;
}

// imposta il form delle recensioni; mostra messaggio se utente non loggato
async function setupReviewForm(productId) {
    const area = document.getElementById('review-form-area');

    let user;
    try {
        user = await API.me();
    } catch {
        area.innerHTML = `
            <p class="text-muted-eco">
                Devi <a href="login.html">accedere</a> per scrivere una recensione.
            </p>`;
        return;
    }

    area.innerHTML = `
        <form id="form-review">
            <div class="mb-2">
                <label class="form-label">Voto</label>
                <div id="rating-stars" style="font-size: 1.5rem; cursor: pointer; color: #ccc;">
                    <span data-val="1">☆</span><span data-val="2">☆</span><span data-val="3">☆</span><span data-val="4">☆</span><span data-val="5">☆</span>
                </div>
                <input type="hidden" id="input-rating" value="0">
            </div>
            <div class="mb-2">
                <label for="input-review-title" class="form-label">Titolo (opzionale)</label>
                <input type="text" id="input-review-title" class="form-control" maxlength="120">
            </div>
            <div class="mb-2">
                <label for="input-review-content" class="form-label">Commento (opzionale)</label>
                <textarea id="input-review-content" class="form-control" rows="3" maxlength="2000"></textarea>
            </div>
            <div id="review-msg" class="small mb-2"></div>
            <button type="submit" class="btn btn-eco">Pubblica recensione</button>
        </form>
    `;

    // gestione delle stelline cliccabili
    const stars = area.querySelectorAll('#rating-stars span');
    const ratingInput = document.getElementById('input-rating');
    stars.forEach(star => {
        star.addEventListener('click', () => {
            const val = parseInt(star.dataset.val);
            ratingInput.value = val;
            stars.forEach(s => {
                const v = parseInt(s.dataset.val);
                s.textContent = v <= val ? '★' : '☆';
                s.style.color = v <= val ? 'var(--color-accent)' : '#ccc';
            });
        });
    });

    // submit del form
    document.getElementById('form-review').addEventListener('submit', async e => {
        e.preventDefault();
        const msg = document.getElementById('review-msg');
        msg.textContent = '';
        msg.className = 'small mb-2';

        const rating = parseInt(ratingInput.value);
        if (!rating || rating < 1 || rating > 5) {
            msg.textContent = 'Seleziona un voto da 1 a 5 stelle.';
            msg.classList.add('text-danger');
            return;
        }

        const title = document.getElementById('input-review-title').value.trim();
        const content = document.getElementById('input-review-content').value.trim();

        try {
            await API.addReview(productId, { rating, title, content });
            msg.textContent = '✓ Recensione pubblicata. +5 eco-points!';
            msg.classList.add('text-success');
            // ricarica la modale per mostrare la nuova recensione
            setTimeout(() => openProductModal(productId), 1000);
        } catch (err) {
            msg.textContent = 'Errore: ' + err.message;
            msg.classList.add('text-danger');
        }
    });
}

// aggiungi al carrello dal bottone dentro la modale
async function addToCartFromModal(productId) {
    try {
        await API.addToCart(productId, 1);
        await Shared.refreshCartBadge();
        alert('Aggiunto al carrello.');
    } catch (err) {
        alert('Errore: ' + err.message);
    }
}
