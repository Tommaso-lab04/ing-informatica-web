document.addEventListener('DOMContentLoaded', async () => {
    let me;
    try {
        me = await API.me();
    } catch {
        document.getElementById('admin-guest').classList.remove('d-none');
        return;
    }
    if (me.role !== 'admin') {
        document.getElementById('admin-guest').classList.remove('d-none');
        document.querySelector('#admin-guest p').textContent =
            'Accesso riservato agli amministratori.';
        return;
    }

    document.getElementById('admin-content').classList.remove('d-none');
    bindTabs();
    await loadDashboard();
});

function bindTabs() {
    document.querySelectorAll('#admin-tabs a').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            const tab = link.dataset.tab;
            document.querySelectorAll('#admin-tabs a').forEach(a => a.classList.remove('active'));
            link.classList.add('active');
            document.querySelectorAll('.admin-tab-panel').forEach(p => p.classList.add('d-none'));
            document.getElementById('tab-' + tab).classList.remove('d-none');
            ({
                dashboard: loadDashboard,
                products:  loadProducts,
                orders:    loadOrders,
                users:     loadUsers,
                coupons:   loadCoupons,
                log:       loadLog
            }[tab] || (()=>{}))();
        });
    });

    document.getElementById('btn-new-product').addEventListener('click', () => editProduct(null));
    document.getElementById('btn-new-coupon').addEventListener('click', editCoupon);
}

async function loadDashboard() {
    try {
        const d = await API.admin.getDashboard();
        const cards = [
            { label: 'Utenti registrati', value: d.users },
            { label: 'Prodotti', value: d.products },
            { label: 'Ordini totali', value: d.orders },
            { label: 'Ordini ultimi 7gg', value: d.ordersLast7Days },
            { label: 'Fatturato (€)', value: d.revenue.toFixed(2) },
            { label: 'Fatturato 7gg (€)', value: d.revenueLast7Days.toFixed(2) }
        ];
        document.getElementById('dashboard-cards').innerHTML = cards.map(c => `
            <div class="col-6 col-md-4 col-lg-2">
                <div class="filters text-center">
                    <div style="font-size:1.6rem;color:var(--color-primary);font-weight:700;">
                        ${escapeHTML(String(c.value))}
                    </div>
                    <div class="text-muted-eco small">${escapeHTML(c.label)}</div>
                </div>
            </div>
        `).join('');

        document.getElementById('dashboard-top-products').innerHTML =
            d.topProducts.length === 0
                ? '<p class="text-muted-eco">Ancora nessuna vendita.</p>'
                : `<table class="table table-sm">
                       <thead><tr><th>Prodotto</th><th>Pezzi</th><th>€</th></tr></thead>
                       <tbody>${d.topProducts.map(p => `
                           <tr>
                               <td>${escapeHTML(p.name)}</td>
                               <td>${p.units}</td>
                               <td>${p.revenue.toFixed(2)}</td>
                           </tr>`).join('')}
                       </tbody>
                   </table>`;

        document.getElementById('dashboard-low-stock').innerHTML =
            d.lowStock.length === 0
                ? '<p class="text-muted-eco">Stock OK ovunque.</p>'
                : `<table class="table table-sm">
                       <thead><tr><th>Prodotto</th><th>Pezzi rimasti</th></tr></thead>
                       <tbody>${d.lowStock.map(p => `
                           <tr>
                               <td>${escapeHTML(p.name)}</td>
                               <td><strong style="color:#c0392b;">${p.stock}</strong></td>
                           </tr>`).join('')}
                       </tbody>
                   </table>`;
    } catch (err) {
        document.getElementById('dashboard-cards').innerHTML =
            `<p class="text-danger">Errore: ${escapeHTML(err.message)}</p>`;
    }
}

async function loadProducts() {
    const c = document.getElementById('products-table');
    c.innerHTML = '<p class="text-muted-eco">Caricamento...</p>';
    try {
        const list = await API.getProducts();
        c.innerHTML = `
            <table class="table">
                <thead>
                    <tr>
                        <th>Nome</th><th>Categoria</th><th>Prezzo</th>
                        <th>Stock</th><th>Eco</th><th>Azioni</th>
                    </tr>
                </thead>
                <tbody>
                    ${list.map(p => `
                        <tr>
                            <td>${escapeHTML(p.name)}</td>
                            <td>${escapeHTML(p.category)}</td>
                            <td>€ ${p.price.toFixed(2)}</td>
                            <td>${p.stock}</td>
                            <td>${p.ecoScore}/10</td>
                            <td>
                                <button class="btn btn-sm btn-outline-primary" data-edit="${escapeHTML(p.id)}">Modifica</button>
                                <button class="btn btn-sm btn-outline-danger" data-del="${escapeHTML(p.id)}">Elimina</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>`;

        c.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => {
            const p = list.find(x => x.id === b.dataset.edit);
            editProduct(p);
        }));
        c.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => {
            if (!confirm('Eliminare questo prodotto?')) return;
            try { await API.admin.deleteProduct(b.dataset.del); await loadProducts(); }
            catch (e) { alert('Errore: ' + e.message); }
        }));
    } catch (err) {
        c.innerHTML = `<p class="text-danger">Errore: ${escapeHTML(err.message)}</p>`;
    }
}

function editProduct(p) {
    const isNew = !p;
    showModal(`
        <h3>${isNew ? 'Nuovo prodotto' : 'Modifica ' + escapeHTML(p.name)}</h3>
        <form id="product-form">
            <div class="mb-2"><label>Nome</label><input class="form-control" name="name" value="${isNew?'':escapeHTML(p.name)}" required></div>
            <div class="mb-2"><label>Categoria</label><input class="form-control" name="category" value="${isNew?'':escapeHTML(p.category)}" required></div>
            <div class="row">
                <div class="col-6 mb-2"><label>Prezzo €</label><input type="number" step="0.01" class="form-control" name="price" value="${isNew?'':p.price}" required></div>
                <div class="col-6 mb-2"><label>Stock</label><input type="number" class="form-control" name="stock" value="${isNew?'0':p.stock}" required></div>
            </div>
            <div class="row">
                <div class="col-6 mb-2"><label>Eco-score (1-10)</label><input type="number" min="1" max="10" class="form-control" name="ecoScore" value="${isNew?'5':p.ecoScore}" required></div>
                <div class="col-6 mb-2"><label>CO₂ kg/pezzo</label><input type="number" step="0.01" class="form-control" name="co2Saved" value="${isNew?'0':p.co2Saved||0}"></div>
            </div>
            <div class="mb-2"><label>Immagine (URL/path)</label><input class="form-control" name="img" value="${isNew?'':escapeHTML(p.img||'')}"></div>
            <div class="mb-3"><label>Descrizione</label><textarea class="form-control" name="description" rows="3">${isNew?'':escapeHTML(p.description||'')}</textarea></div>
            <div class="d-flex gap-2 justify-content-end">
                <button type="button" class="btn btn-outline-secondary" id="cancel-modal">Annulla</button>
                <button type="submit" class="btn-eco">Salva</button>
            </div>
        </form>
    `);
    document.getElementById('cancel-modal').addEventListener('click', closeModal);
    document.getElementById('product-form').addEventListener('submit', async e => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const data = Object.fromEntries(fd);
        data.price    = Number(data.price);
        data.stock    = parseInt(data.stock);
        data.ecoScore = parseInt(data.ecoScore);
        data.co2Saved = Number(data.co2Saved);
        try {
            if (isNew) await API.admin.createProduct(data);
            else       await API.admin.updateProduct(p.id, data);
            closeModal();
            await loadProducts();
        } catch (err) { alert('Errore: ' + err.message); }
    });
}

async function loadOrders() {
    const c = document.getElementById('orders-table');
    c.innerHTML = '<p class="text-muted-eco">Caricamento...</p>';
    try {
        const list = await API.admin.getOrders();
        c.innerHTML = list.length === 0 ? '<p class="text-muted-eco">Nessun ordine.</p>' : `
            <table class="table">
                <thead><tr><th>ID</th><th>Utente</th><th>Totale</th><th>Stato</th><th>Data</th><th>Azione</th></tr></thead>
                <tbody>${list.map(o => `
                    <tr>
                        <td><code>${escapeHTML(o.id)}</code></td>
                        <td>${escapeHTML(o.user.username)}</td>
                        <td>€ ${o.total.toFixed(2)}</td>
                        <td>
                            <select data-status="${escapeHTML(o.id)}" class="form-select form-select-sm">
                                ${['confirmed','shipped','delivered','cancelled'].map(s =>
                                    `<option value="${s}" ${s===o.status?'selected':''}>${s}</option>`
                                ).join('')}
                            </select>
                        </td>
                        <td>${new Date(o.createdAt).toLocaleString('it-IT')}</td>
                        <td>${escapeHTML(o.shippingAddress.city)}</td>
                    </tr>`).join('')}
                </tbody>
            </table>`;
        c.querySelectorAll('[data-status]').forEach(sel => {
            sel.addEventListener('change', async () => {
                try { await API.admin.setOrderStatus(sel.dataset.status, sel.value); }
                catch (e) { alert('Errore: ' + e.message); }
            });
        });
    } catch (err) {
        c.innerHTML = `<p class="text-danger">Errore: ${escapeHTML(err.message)}</p>`;
    }
}

async function loadUsers() {
    const c = document.getElementById('users-table');
    c.innerHTML = '<p class="text-muted-eco">Caricamento...</p>';
    try {
        const list = await API.admin.getUsers();
        c.innerHTML = `
            <table class="table">
                <thead><tr><th>Username</th><th>Email</th><th>Ruolo</th><th>Eco-points</th><th>Iscritto il</th><th>Azioni</th></tr></thead>
                <tbody>${list.map(u => `
                    <tr>
                        <td>${u.avatar ? escapeHTML(u.avatar) + ' ' : ''}${escapeHTML(u.username)}</td>
                        <td>${escapeHTML(u.email)}</td>
                        <td>
                            <select data-role="${escapeHTML(u.id)}" class="form-select form-select-sm">
                                <option value="user" ${u.role==='user'?'selected':''}>user</option>
                                <option value="admin" ${u.role==='admin'?'selected':''}>admin</option>
                            </select>
                        </td>
                        <td>${u.eco_points}</td>
                        <td>${new Date(u.created_at).toLocaleDateString('it-IT')}</td>
                        <td><button class="btn btn-sm btn-outline-danger" data-del-u="${escapeHTML(u.id)}">Elimina</button></td>
                    </tr>`).join('')}
                </tbody>
            </table>`;
        c.querySelectorAll('[data-role]').forEach(sel => {
            sel.addEventListener('change', async () => {
                try { await API.admin.setUserRole(sel.dataset.role, sel.value); }
                catch (e) { alert('Errore: ' + e.message); }
            });
        });
        c.querySelectorAll('[data-del-u]').forEach(b => {
            b.addEventListener('click', async () => {
                if (!confirm('Eliminare questo utente? L\'azione cancella anche ordini, post, commenti...')) return;
                try { await API.admin.deleteUser(b.dataset.delU); await loadUsers(); }
                catch (e) { alert('Errore: ' + e.message); }
            });
        });
    } catch (err) {
        c.innerHTML = `<p class="text-danger">Errore: ${escapeHTML(err.message)}</p>`;
    }
}

async function loadCoupons() {
    const c = document.getElementById('coupons-table');
    c.innerHTML = '<p class="text-muted-eco">Caricamento...</p>';
    try {
        const list = await API.admin.getCoupons();
        c.innerHTML = list.length === 0 ? '<p class="text-muted-eco">Nessun coupon.</p>' : `
            <table class="table">
                <thead><tr><th>Codice</th><th>Sconto</th><th>Min €</th><th>Usi (max)</th><th>Scade</th><th>Stato</th><th>Azioni</th></tr></thead>
                <tbody>${list.map(c2 => `
                    <tr>
                        <td><code>${escapeHTML(c2.code)}</code><br><small>${escapeHTML(c2.description||'')}</small></td>
                        <td>${c2.discount_pct}%</td>
                        <td>€ ${(c2.min_total||0).toFixed(2)}</td>
                        <td>${c2.used_count} / ${c2.max_uses||'∞'}</td>
                        <td>${c2.valid_until ? new Date(c2.valid_until).toLocaleDateString('it-IT') : '∞'}</td>
                        <td>${c2.active ? '<span class="text-success">attivo</span>' : '<span class="text-muted-eco">disattivato</span>'}</td>
                        <td>${c2.active ? `<button class="btn btn-sm btn-outline-danger" data-del-c="${escapeHTML(c2.code)}">Disattiva</button>` : ''}</td>
                    </tr>`).join('')}
                </tbody>
            </table>`;
        c.querySelectorAll('[data-del-c]').forEach(b => {
            b.addEventListener('click', async () => {
                try { await API.admin.deleteCoupon(b.dataset.delC); await loadCoupons(); }
                catch (e) { alert('Errore: ' + e.message); }
            });
        });
    } catch (err) {
        c.innerHTML = `<p class="text-danger">Errore: ${escapeHTML(err.message)}</p>`;
    }
}

function editCoupon() {
    showModal(`
        <h3>Nuovo coupon</h3>
        <form id="coupon-form">
            <div class="mb-2"><label>Codice (maiuscolo)</label><input class="form-control" name="code" required></div>
            <div class="mb-2"><label>Descrizione</label><input class="form-control" name="description"></div>
            <div class="row">
                <div class="col-6 mb-2"><label>Sconto %</label><input type="number" min="1" max="100" class="form-control" name="discountPct" required></div>
                <div class="col-6 mb-2"><label>Spesa minima €</label><input type="number" step="0.01" min="0" class="form-control" name="minTotal" value="0"></div>
            </div>
            <div class="row">
                <div class="col-6 mb-2"><label>Utilizzi max (0 = ∞)</label><input type="number" min="0" class="form-control" name="maxUses" value="0"></div>
                <div class="col-6 mb-3"><label>Scade il</label><input type="date" class="form-control" name="validUntil"></div>
            </div>
            <div class="d-flex gap-2 justify-content-end">
                <button type="button" class="btn btn-outline-secondary" id="cancel-modal">Annulla</button>
                <button type="submit" class="btn-eco">Crea</button>
            </div>
        </form>
    `);
    document.getElementById('cancel-modal').addEventListener('click', closeModal);
    document.getElementById('coupon-form').addEventListener('submit', async e => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const data = Object.fromEntries(fd);
        if (data.validUntil) data.validUntil = new Date(data.validUntil).toISOString();
        try {
            await API.admin.createCoupon(data);
            closeModal();
            await loadCoupons();
        } catch (err) { alert('Errore: ' + err.message); }
    });
}

async function loadLog() {
    const c = document.getElementById('log-table');
    c.innerHTML = '<p class="text-muted-eco">Caricamento...</p>';
    try {
        const list = await API.admin.getLog(200);
        c.innerHTML = list.length === 0 ? '<p class="text-muted-eco">Log vuoto.</p>' : `
            <table class="table table-sm">
                <thead><tr><th>Data</th><th>Admin</th><th>Azione</th><th>Target</th><th>Dettagli</th></tr></thead>
                <tbody>${list.map(l => `
                    <tr>
                        <td>${new Date(l.created_at).toLocaleString('it-IT')}</td>
                        <td>${escapeHTML(l.adminName||'-')}</td>
                        <td><code>${escapeHTML(l.action)}</code></td>
                        <td>${escapeHTML(l.target||'-')}</td>
                        <td><small>${escapeHTML(l.details||'')}</small></td>
                    </tr>`).join('')}
                </tbody>
            </table>`;
    } catch (err) {
        c.innerHTML = `<p class="text-danger">Errore: ${escapeHTML(err.message)}</p>`;
    }
}

function showModal(html) {
    document.getElementById('modal-content').innerHTML = html;
    document.getElementById('modal').classList.remove('d-none');
}
function closeModal() {
    document.getElementById('modal').classList.add('d-none');
    document.getElementById('modal-content').innerHTML = '';
}
