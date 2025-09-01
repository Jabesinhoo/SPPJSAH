// Lógica "anti-flicker": se ejecuta de inmediato para evitar el parpadeo.
// Esto revisa el almacenamiento local o la preferencia del sistema y aplica la clase 'dark'
// al elemento <html> antes de que la página se cargue por completo.
(function() {
    // Si el tema está guardado como 'dark' O no hay tema guardado Y el sistema prefiere 'dark'
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
    } else {
        // En cualquier otro caso, remueve la clase 'dark' para asegurar el modo claro.
        document.documentElement.classList.remove('dark');
    }
})();

document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const menuToggle = document.getElementById('menu-toggle');
    const mainContent = document.querySelector('main');
    const themeToggle = document.getElementById('theme-toggle');
    const sunIcon = document.getElementById('sun-icon');
    const moonIcon = document.getElementById('moon-icon');
    const currentYearSpan = document.getElementById('current-year');
    const logoutButton = document.getElementById('logout-button');

    // Lógica para el footer, muestra el año actual
    if (currentYearSpan) {
        currentYearSpan.textContent = new Date().getFullYear();
    }

    // Lógica para alternar y cerrar el sidebar en móviles
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('-translate-x-full');
        });
    }

    // Cierra el sidebar al hacer clic en el área de contenido principal
    if (mainContent) {
        mainContent.addEventListener('click', () => {
            if (sidebar && !sidebar.classList.contains('-translate-x-full')) {
                sidebar.classList.add('-translate-x-full');
            }
        });
    }

    // Cierra el sidebar si se redimensiona la ventana a un tamaño de escritorio
    window.addEventListener('resize', () => {
        if (window.innerWidth >= 768 && sidebar) {
            sidebar.classList.remove('-translate-x-full');
        }
    });

    // Lógica para el modo oscuro
    const isDarkMode = () => document.documentElement.classList.contains('dark');

    const updateIcons = () => {
        // Asegúrate de que los íconos existan antes de manipularlos
        if (sunIcon && moonIcon) {
            if (isDarkMode()) {
                sunIcon.classList.remove('hidden');
                moonIcon.classList.add('hidden');
            } else {
                sunIcon.classList.add('hidden');
                moonIcon.classList.remove('hidden');
            }
        }
    };

    // Aplica el tema guardado al cargar la página y actualiza los íconos
    updateIcons();

    // Listener para el botón de cambio de tema
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            if (isDarkMode()) {
                document.documentElement.classList.remove('dark');
                localStorage.setItem('theme', 'light');
            } else {
                document.documentElement.classList.add('dark');
                localStorage.setItem('theme', 'dark');
            }
            updateIcons();
        });
    }

    // Lógica para el botón de "Cerrar Sesión"
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            window.location.href = '/logout';
        });
    }
});