document.addEventListener('DOMContentLoaded', async () => {
    try {
        await API.me();
        location.href = 'profile.html';
        return;
    } catch {}

    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const formTitle = document.getElementById('form-title');

    // Switch tra i due form
    document.getElementById('show-register').addEventListener('click', e => {
        e.preventDefault();
        loginForm.classList.add('d-none');
        registerForm.classList.remove('d-none');
        formTitle.textContent = 'Registrati';
    });
    document.getElementById('show-login').addEventListener('click', e => {
        e.preventDefault();
        registerForm.classList.add('d-none');
        loginForm.classList.remove('d-none');
        formTitle.textContent = 'Accedi';
    });

    loginForm.addEventListener('submit', async e => {
        e.preventDefault();
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;
        const errorBox = document.getElementById('login-error');
        errorBox.classList.add('d-none');
        try {
            await API.login(username, password);
            location.href = 'profile.html';
        } catch (err) {
            errorBox.textContent = err.message;
            errorBox.classList.remove('d-none');
        }
    });

    registerForm.addEventListener('submit', async e => {
        e.preventDefault();
        const username = document.getElementById('reg-username').value.trim();
        const email = document.getElementById('reg-email').value.trim();
        const password = document.getElementById('reg-password').value;
        const errorBox = document.getElementById('register-error');
        errorBox.classList.add('d-none');
        try {
            await API.register({ username, email, password });
            location.href = 'profile.html';
        } catch (err) {
            errorBox.textContent = err.message;
            errorBox.classList.remove('d-none');
        }
    });
});
