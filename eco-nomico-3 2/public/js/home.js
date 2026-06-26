$(function () {
    Promise.all([loadFeaturedProducts(), loadLatestPosts()]);
});

async function loadFeaturedProducts() {
    const $grid = $('#featured-products');
    try {
        const products = await API.getProducts();
        const featured = products.slice(0, 4);
        $grid.html(featured.map(productCardHTML).join(''));

        $grid.children().hide().each(function (i) {
            $(this).delay(i * 80).fadeIn(350);
        });

        
        $grid.off('click.addcart').on('click.addcart', '.btn-add-cart', async function (e) {
            e.preventDefault();
            const $btn = $(this);
            await API.addToCart($btn.data('product-id'), 1);
            await Shared.refreshCartBadge();
            $btn.text('Aggiunto ✓');
            setTimeout(() => $btn.text('Aggiungi al carrello'), 1200);
        });
    } catch (err) {
        $grid.html(`<p class="text-danger">Errore: ${escapeHTML(err.message)}</p>`);
    }
}

async function loadLatestPosts() {
    const $list = $('#latest-posts');
    try {
        const posts = await API.getPosts('recent');
        const latest = posts.slice(0, 3);
        $list.html(latest.map(postCardHTML).join(''));
        $list.children().hide().each(function (i) {
            $(this).delay(i * 80).fadeIn(350);
        });
    } catch (err) {
        $list.html(`<p class="text-danger">Errore: ${escapeHTML(err.message)}</p>`);
    }
}

function productCardHTML(p) {
    return `
        <div class="col-6 col-md-4 col-lg-3">
            <article class="product-card">
                <img class="product-card__image" src="${escapeHTML(p.img)}"
                     alt="${escapeHTML(p.name)}" loading="lazy">
                <div class="product-card__body">
                    <div class="product-card__category">${escapeHTML(p.category)}</div>
                    <h3 class="product-card__name">
                        ${escapeHTML(p.name)}
                        <span class="product-card__eco">Eco ${p.ecoScore}/10</span>
                    </h3>
                    <div class="product-card__price">€ ${p.price.toFixed(2)}</div>
                    <button class="btn-eco btn-add-cart mt-2" data-product-id="${escapeHTML(p.id)}">
                        Aggiungi al carrello
                    </button>
                </div>
            </article>
        </div>`;
}

function postCardHTML(p) {
    const excerpt = p.content.length > 180 ? p.content.slice(0, 180) + '…' : p.content;
    return `
        <article class="post-card">
            <div class="post-card__meta">
                ${escapeHTML(p.authorName)} · ${new Date(p.createdAt).toLocaleDateString('it-IT')}
            </div>
            <h3 class="post-card__title">${escapeHTML(p.title)}</h3>
            <p class="post-card__excerpt">${escapeHTML(excerpt)}</p>
            <div class="post-card__tags">
                ${(p.tags || []).map(t => `<span class="tag">#${escapeHTML(t)}</span>`).join('')}
            </div>
            <div class="post-actions">
                <span> ${p.likeCount}</span>
                <span> ${p.commentCount}</span>
            </div>
        </article>`;
}
