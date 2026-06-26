let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
    await checkAuthUI();
    bindSortSelect();
    bindNewPostForm();
    await loadPosts('recent');
});

async function checkAuthUI() {
    try {
        currentUser = await API.me();
        document.getElementById('new-post-form').classList.remove('d-none');
        document.getElementById('new-post-login').classList.add('d-none');
    } catch {
        currentUser = null;
        document.getElementById('new-post-form').classList.add('d-none');
        document.getElementById('new-post-login').classList.remove('d-none');
    }
}

function bindSortSelect() {
    $('#sort-select').on('change', function () {
        loadPosts(this.value);
    });
}

function bindNewPostForm() {
    const form = document.getElementById('new-post-form');
    const errorBox = document.getElementById('post-error');

    form.addEventListener('submit', async e => {
        e.preventDefault();
        errorBox.classList.add('d-none');

        const title = document.getElementById('post-title').value.trim();
        const content = document.getElementById('post-content').value.trim();
        const tagsRaw = document.getElementById('post-tags').value.trim();
        const tags = tagsRaw
            ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean).slice(0, 5)
            : [];

        try {
            await API.createPost({ title, content, tags });
            form.reset();
            await loadPosts(document.getElementById('sort-select').value);
        } catch (err) {
            errorBox.textContent = err.message;
            errorBox.classList.remove('d-none');
        }
    });
}

async function loadPosts(sort) {
    const list = document.getElementById('posts-list');
    const count = document.getElementById('posts-count');
    try {
        const posts = await API.getPosts(sort);
        count.textContent = `${posts.length} post`;
        list.innerHTML = posts.map(postCardHTML).join('');
        $('#posts-list .post-card').hide().each(function (i) {
            $(this).delay(i * 60).fadeIn(300);
        });
        bindPostCardEvents();
    } catch (err) {
        list.innerHTML = `<p class="text-danger">Errore: ${escapeHTML(err.message)}</p>`;
    }
}

function postCardHTML(p) {
    return `
        <article class="post-card" data-post-id="${escapeHTML(p.id)}">
            <div class="post-card__meta">
                ${escapeHTML(p.authorName)} · ${new Date(p.createdAt).toLocaleDateString('it-IT')}
            </div>
            <h3 class="post-card__title">${escapeHTML(p.title)}</h3>
            <p class="post-card__excerpt">${escapeHTML(p.content)}</p>
            <div class="post-card__tags">
                ${(p.tags || []).map(t => `<span class="tag">#${escapeHTML(t)}</span>`).join('')}
            </div>
            <div class="post-actions">
                <button class="like-btn" aria-pressed="${p.likedByMe}"
                        data-action="like" data-post-id="${escapeHTML(p.id)}">
                    <span class="like-icon">${p.likedByMe ? '❤️' : '🤍'}</span>
                    <span class="like-count">${p.likeCount}</span>
                </button>
                <button class="like-btn" data-action="toggle-comments"
                        data-post-id="${escapeHTML(p.id)}">
                    💬 <span class="comment-count">${p.commentCount}</span> commenti
                </button>
            </div>
            <div class="comments-area d-none mt-3"></div>
        </article>`;
}

function bindPostCardEvents() {
    const $list = $('#posts-list').off('click.postcard');

    $list.on('click.postcard', '[data-action="like"]', async function () {
        if (!currentUser) { alert('Accedi per mettere like'); return; }
        const $btn = $(this);
        const postId = $btn.data('post-id');
        try {
            const res = await API.toggleLike(postId);
            $btn.attr('aria-pressed', res.likedByMe);
            $btn.find('.like-count').text(res.likeCount);
            $btn.find('.like-icon').text(res.likedByMe ? '❤️' : '🤍');
        } catch (err) { alert('Errore: ' + err.message); }
    });

    $list.on('click.postcard', '[data-action="toggle-comments"]', async function () {
        const $btn = $(this);
        const postId = $btn.data('post-id');
        const $area = $btn.closest('.post-card').find('.comments-area');
        if ($area.is(':visible')) {
            $area.slideUp(200, () => $area.addClass('d-none'));
            return;
        }
        $area.removeClass('d-none').hide();
        await renderComments(postId, $area.get(0), $btn.get(0));
        $area.slideDown(250);
    });
}

async function renderComments(postId, area, toggleBtn) {
    try {
        const post = await API.getPost(postId);
        const commentsHtml = (post.comments || []).map(c => `
            <div class="mb-2 p-2" style="background: var(--color-bg); border-radius: 8px;">
                <small class="text-muted-eco">
                    <strong>${escapeHTML(c.authorName)}</strong> ·
                    ${new Date(c.createdAt).toLocaleString('it-IT')}
                </small>
                <p class="mb-0 mt-1">${escapeHTML(c.content)}</p>
            </div>
        `).join('');

        const formHtml = currentUser ? `
            <form class="comment-form mt-2" data-post-id="${escapeHTML(postId)}">
                <textarea class="form-control mb-2" rows="2" required
                          minlength="3" maxlength="1000"
                          placeholder="Scrivi un commento..."></textarea>
                <button type="submit" class="btn-eco">Invia</button>
            </form>` :
            `<p class="text-muted-eco"><a href="login.html">Accedi</a> per commentare.</p>`;

        area.innerHTML = (commentsHtml || '<p class="text-muted-eco">Nessun commento.</p>') + formHtml;

        const form = area.querySelector('.comment-form');
        if (form) {
            form.addEventListener('submit', async e => {
                e.preventDefault();
                const content = form.querySelector('textarea').value.trim();
                try {
                    await API.addComment(postId, content);
                    await renderComments(postId, area, toggleBtn);
                    const counter = toggleBtn.querySelector('.comment-count');
                    if (counter) counter.textContent = (parseInt(counter.textContent) || 0) + 1;
                } catch (err) { alert('Errore: ' + err.message); }
            });
        }
    } catch (err) {
        area.innerHTML = `<p class="text-danger">Errore: ${escapeHTML(err.message)}</p>`;
    }
}
