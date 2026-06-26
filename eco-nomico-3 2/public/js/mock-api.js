const API = (() => {
    const BASE = '/api';

    
    function http(method, path, body) {
        const settings = {
            url: BASE + path,
            method: method,
            dataType: 'json',
            xhrFields: { withCredentials: true },   // invia il cookie di sessione
            headers: { 'Accept': 'application/json' }
        };
        if (body !== undefined) {
            settings.contentType = 'application/json';
            settings.data = JSON.stringify(body);
        }

        return new Promise((resolve, reject) => {
            $.ajax(settings)
                .done(data => resolve(data))
                .fail(jqXHR => {
                    const payload = jqXHR.responseJSON
                        || (jqXHR.responseText ? safeJson(jqXHR.responseText) : null);
                    const msg = (payload && payload.error) || `HTTP ${jqXHR.status}`;
                    reject(new Error(msg));
                });
        });
    }

    function safeJson(s) {
        try { return JSON.parse(s); } catch (e) { return null; }
    }

    function qs(obj) {
        const clean = {};
        for (const k in obj) {
            const v = obj[k];
            if (v !== undefined && v !== null && v !== '') clean[k] = v;
        }
        const s = $.param(clean);
        return s ? '?' + s : '';
    }

    return {
        // PRODOTTI 
        getProducts(filters = {}) {
            return http('GET', '/products' + qs({
                q: filters.q,
                category: filters.category,
                maxPrice: filters.maxPrice,
                minEco: filters.minEco,
                sort: filters.sort
            }));
        },
        getProduct(id)        { return http('GET', `/products/${encodeURIComponent(id)}`); },
        getCategories()       { return http('GET', '/products/categories'); },
        getReviews(productId) { return http('GET', `/products/${encodeURIComponent(productId)}/reviews`); },
        addReview(productId, { rating, title, content }) {
            return http('POST', `/products/${encodeURIComponent(productId)}/reviews`,
                        { rating, title, content });
        },

        // UTENTI / AUTH 
        register({ username, email, password }) {
            return http('POST', '/auth/register', { username, email, password });
        },
        login(username, password) {
            return http('POST', '/auth/login', { username, password });
        },
        logout()      { return http('POST', '/auth/logout'); },
        me()          { return http('GET',  '/auth/me'); },
        updateMe(p)   { return http('PATCH','/auth/me', p); },
        changePassword(oldPassword, newPassword) {
            return http('POST', '/auth/change-password', { oldPassword, newPassword });
        },

        // CARRELLO 
        getCart()                              { return http('GET',    '/cart'); },
        addToCart(productId, quantity = 1)     { return http('POST',   '/cart', { productId, quantity }); },
        updateCart(productId, quantity)        { return http('PATCH',  `/cart/${encodeURIComponent(productId)}`, { quantity }); },
        removeFromCart(productId)              { return http('DELETE', `/cart/${encodeURIComponent(productId)}`); },
        clearCart()                            { return http('DELETE', '/cart'); },

        // ORDINI 
        createOrder(shippingAddress, couponCode) {
            return http('POST', '/orders', { shippingAddress, couponCode });
        },
        getOrders()           { return http('GET',  '/orders'); },
        getOrder(id)          { return http('GET',  `/orders/${encodeURIComponent(id)}`); },
        cancelOrder(id)       { return http('POST', `/orders/${encodeURIComponent(id)}/cancel`); },

        // COMMUNITY 
        getPosts(sort = 'recent')     { return http('GET', '/community/posts' + qs({ sort })); },
        getPost(id)                   { return http('GET', `/community/posts/${encodeURIComponent(id)}`); },
        createPost({ title, content, tags }) {
            return http('POST', '/community/posts', { title, content, tags });
        },
        deletePost(id)                { return http('DELETE', `/community/posts/${encodeURIComponent(id)}`); },
        addComment(postId, content)   { return http('POST', `/community/posts/${encodeURIComponent(postId)}/comments`, { content }); },
        toggleLike(postId)            { return http('POST', `/community/posts/${encodeURIComponent(postId)}/like`); },
        getTags()                     { return http('GET', '/community/tags'); },

        // WISHLIST 
        getWishlist()              { return http('GET',    '/wishlist'); },
        addToWishlist(productId)   { return http('POST',   '/wishlist', { productId }); },
        removeFromWishlist(pid)    { return http('DELETE', `/wishlist/${encodeURIComponent(pid)}`); },

        // COUPON   
        validateCoupon(code, subtotal) {
            return http('GET', `/coupons/validate/${encodeURIComponent(code)}` + qs({ subtotal }));
        },

        // NEWSLETTER 
        subscribeNewsletter(email)   { return http('POST', '/newsletter/subscribe',   { email }); },
        unsubscribeNewsletter(email) { return http('POST', '/newsletter/unsubscribe', { email }); },

        // STATISTICHE 
        getPublicStats() { return http('GET', '/stats/public'); },
        getMyStats()     { return http('GET', '/stats/me'); },

        // ADMIN 
        admin: {
            getDashboard()           { return http('GET',    '/admin/dashboard'); },
            getUsers()               { return http('GET',    '/admin/users'); },
            setUserRole(id, role)    { return http('PATCH',  `/admin/users/${encodeURIComponent(id)}/role`, { role }); },
            deleteUser(id)           { return http('DELETE', `/admin/users/${encodeURIComponent(id)}`); },
            getOrders()              { return http('GET',    '/admin/orders'); },
            setOrderStatus(id, status) { return http('PATCH', `/orders/${encodeURIComponent(id)}/status`, { status }); },
            getLog(limit = 100)      { return http('GET',    '/admin/log' + qs({ limit })); },
            createProduct(p)         { return http('POST',   '/products', p); },
            updateProduct(id, p)     { return http('PATCH',  `/products/${encodeURIComponent(id)}`, p); },
            deleteProduct(id)        { return http('DELETE', `/products/${encodeURIComponent(id)}`); },
            getCoupons()             { return http('GET',    '/coupons'); },
            createCoupon(c)          { return http('POST',   '/coupons', c); },
            deleteCoupon(code)       { return http('DELETE', `/coupons/${encodeURIComponent(code)}`); }
        }
    };
})();

window.API = API;
