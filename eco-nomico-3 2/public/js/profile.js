document.addEventListener('DOMContentLoaded', async () => {
    let user;
    try {
        user = await API.me();
    } catch {
        document.getElementById('profile-guest').classList.remove('d-none');
        return;
    }

    document.getElementById('profile-content').classList.remove('d-none');
    document.getElementById('profile-username').textContent = user.username;
    document.getElementById('profile-email').textContent = user.email || '-';
    document.getElementById('profile-created').textContent =
        new Date(user.createdAt).toLocaleDateString('it-IT');

    // precompilo il form profilo con i valori attuali dell'utente
    document.getElementById('input-avatar').value = user.avatar || '';
    document.getElementById('input-bio').value = user.bio || '';
    aggiornaContatoreBio();

    setupTabs();
    setupFormProfilo();
    setupFormPassword();
    setupContatoreBio();

    await loadOrders();
});


// gestione dei tab: passa da una scheda all'altra
function setupTabs() {
    const links = document.querySelectorAll('#profile-tabs a');
    links.forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            const tab = link.dataset.tab;

            // aggiorno lo stato attivo dei link
            links.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            // mostro solo il pannello giusto
            document.querySelectorAll('.profile-tab').forEach(p => p.classList.add('d-none'));
            document.getElementById('tab-' + tab).classList.remove('d-none');
        });
    });
}


// caricamento e visualizzazione degli ordini
async function loadOrders() {
    const container = document.getElementById('orders-list');
    try {
        const orders = await API.getOrders();
        if (orders.length === 0) {
            container.innerHTML = '<p class="text-muted-eco">Non hai ancora effettuato ordini.</p>';
            return;
        }
        orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

        container.innerHTML = orders.map(o => `
            <article class="post-card">
                <div class="d-flex justify-content-between align-items-start flex-wrap gap-2">
                    <div>
                        <h4 class="mb-1">Ordine <code>${escapeHTML(o.id)}</code></h4>
                        <div class="text-muted-eco small">
                            ${new Date(o.createdAt).toLocaleString('it-IT')} ·
                            Stato: <strong>${escapeHTML(o.status)}</strong>
                        </div>
                    </div>
                    <div class="text-end">
                        <div style="color: var(--color-primary); font-size: 1.2rem;">
                            <strong>€ ${o.total.toFixed(2)}</strong>
                        </div>
                    </div>
                </div>
                <hr>
                <ul class="mb-0" style="padding-left: 1.2rem;">
                    ${o.items.map(i => `
                        <li>
                            ${escapeHTML(i.name)} × ${i.quantity}
                            <span class="text-muted-eco">(€ ${(i.price * i.quantity).toFixed(2)})</span>
                        </li>
                    `).join('')}
                </ul>
                <div class="text-muted-eco small mt-2">
                    Spedizione:
                    ${escapeHTML(o.shippingAddress.street)},
                    ${escapeHTML(o.shippingAddress.city)}
                    ${escapeHTML(o.shippingAddress.zip)}
                </div>
            </article>
        `).join('');
    } catch (err) {
        container.innerHTML = `<p class="text-danger">Errore: ${escapeHTML(err.message)}</p>`;
    }
}


// contatore caratteri della biografia
function setupContatoreBio() {
    document.getElementById('input-bio').addEventListener('input', aggiornaContatoreBio);
}
function aggiornaContatoreBio() {
    const txt = document.getElementById('input-bio').value;
    document.getElementById('bio-counter').textContent = txt.length;
}


// form profilo pubblico: salva avatar + bio
function setupFormProfilo() {
    const form = document.getElementById('form-profile');
    const msg = document.getElementById('profile-msg');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        msg.textContent = '';
        msg.className = 'small mb-2';

        const avatar = document.getElementById('input-avatar').value.trim();
        const bio = document.getElementById('input-bio').value;

        try {
            await API.updateMe({ avatar: avatar, bio: bio });
            msg.textContent = '✓ Profilo aggiornato.';
            msg.classList.add('text-success');
        } catch (err) {
            msg.textContent = 'Errore: ' + err.message;
            msg.classList.add('text-danger');
        }
    });
}


// form sicurezza: cambia password
function setupFormPassword() {
    const form = document.getElementById('form-password');
    const msg = document.getElementById('password-msg');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        msg.textContent = '';
        msg.className = 'small mb-2';

        const oldPwd = document.getElementById('input-old-password').value;
        const newPwd = document.getElementById('input-new-password').value;
        const newPwd2 = document.getElementById('input-new-password-2').value;

        // controllo: le due nuove password coincidono
        if (newPwd !== newPwd2) {
            msg.textContent = 'Le due nuove password non coincidono.';
            msg.classList.add('text-danger');
            return;
        }

        // controllo: lunghezza minima
        if (newPwd.length < 4) {
            msg.textContent = 'La nuova password deve avere almeno 4 caratteri.';
            msg.classList.add('text-danger');
            return;
        }

        try {
            await API.changePassword(oldPwd, newPwd);
            msg.textContent = '✓ Password cambiata.';
            msg.classList.add('text-success');
            form.reset();
        } catch (err) {
            msg.textContent = 'Errore: ' + err.message;
            msg.classList.add('text-danger');
        }
    });
}
