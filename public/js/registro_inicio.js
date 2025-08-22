document.addEventListener('DOMContentLoaded', () => {
    const formContainer = document.getElementById('form-container');
    const formTitle = document.getElementById('form-title');
    const authForm = document.getElementById('auth-form');
    const confirmPasswordGroup = document.getElementById('confirm-password-group');
    const submitButton = document.getElementById('submit-button');
    const toggleLink = document.getElementById('toggle-link');
    const messageElement = document.getElementById('message');
    const showPasswordCheckbox = document.getElementById('show-password');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    const themeToggle = document.getElementById('theme-toggle');
    const sunIcon = document.getElementById('sun-icon');
    const moonIcon = document.getElementById('moon-icon');

    let isRegistering = true;

    // Lógica para cargar el tema guardado al inicio
    const loadTheme = () => {
        // Anti-flicker: aplica el tema oscuro si es el preferido antes de que la página se pinte.
        if (
            localStorage.theme === 'dark' ||
            (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)
        ) {
            document.documentElement.classList.add('dark');
        } else {
            // Aplica el tema claro por defecto si no hay un tema guardado o si el sistema es claro.
            document.documentElement.classList.remove('dark');
            document.documentElement.classList.add('light');
        }

        // Lógica para aplicar el tema guardado
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            document.documentElement.classList.remove('dark', 'light');
            document.documentElement.classList.add(savedTheme);
        }
    };

    loadTheme();

    toggleLink.addEventListener('click', (e) => {
        e.preventDefault();
        isRegistering = !isRegistering;

        if (isRegistering) {
            formTitle.textContent = 'Registrarse';
            confirmPasswordGroup.style.display = 'block';
            confirmPasswordInput.disabled = false;
            confirmPasswordInput.required = true;
            submitButton.textContent = 'Registrar';
            toggleLink.textContent = 'Inicia Sesión';
            document.title = 'SPJSAH | Registrarse';
        } else {
            formTitle.textContent = 'Iniciar Sesión';
            confirmPasswordGroup.style.display = 'none';
            confirmPasswordInput.value = '';
            confirmPasswordInput.required = false;
            confirmPasswordInput.disabled = true;
            submitButton.textContent = 'Entrar';
            toggleLink.textContent = 'Regístrate';
            document.title = 'SPJSAH | Iniciar Sesión';
        }

        messageElement.textContent = '';
        authForm.reset();
    });

    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = document.getElementById('username').value;
        const password = passwordInput.value;

        // ✅ LÍNEAS AGREGADAS PARA DEPURACIÓN
        console.log('Enviando al servidor:', { username, password });

        if (isRegistering && password !== confirmPasswordInput.value) {
            messageElement.textContent = 'Las contraseñas no coinciden.';
            messageElement.classList.add('text-red-500');
            messageElement.classList.remove('text-green-500');
            return;
        }

        // ✅ LÍNEA CORREGIDA PARA USAR EL PREFIJO '/api'
        const endpoint = isRegistering ? '/api/register' : '/api/login';

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (response.ok) {
                messageElement.textContent = data.message || (isRegistering ? 'Registrado.' : 'Sesión iniciada.');
                messageElement.classList.remove('text-red-500');
                messageElement.classList.add('text-green-500');

                window.location.assign(data.redirect || '/');

            } else {
                messageElement.textContent = data.error;
                messageElement.classList.add('text-red-500');
                messageElement.classList.remove('text-green-500');
            }
        } catch (error) {
            messageElement.textContent = 'Error al conectar con el servidor.';
            messageElement.classList.add('text-red-500');
            messageElement.classList.remove('text-green-500');
        }
    });

    showPasswordCheckbox.addEventListener('change', () => {
        const passwordFields = [passwordInput, confirmPasswordInput];
        passwordFields.forEach(field => {
            if (field) {
                field.type = showPasswordCheckbox.checked ? 'text' : 'password';
            }
        });
    });

    // Lógica del modo oscuro
    const isDarkMode = () => document.documentElement.classList.contains('dark');

    const updateIcons = () => {
        if (isDarkMode()) {
            sunIcon.classList.remove('hidden');
            moonIcon.classList.add('hidden');
        } else {
            sunIcon.classList.add('hidden');
            moonIcon.classList.remove('hidden');
        }
    };

    updateIcons();

    themeToggle.addEventListener('click', () => {
        if (isDarkMode()) {
            document.documentElement.classList.remove('dark');
            document.documentElement.classList.add('light');
            localStorage.setItem('theme', 'light');
        } else {
            document.documentElement.classList.remove('light');
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        }
        updateIcons();
    });
});