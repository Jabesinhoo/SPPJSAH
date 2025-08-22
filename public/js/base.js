// Lógica de "anti-flicker" para el modo oscuro, se ejecuta inmediatamente
(function() {
    if (
        localStorage.theme === 'dark' ||
        (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)
    ) {
        document.documentElement.classList.add('dark');
    } else {
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
        if (window.innerWidth >= 768 && sidebar) { // 768px es el breakpoint 'md' de Tailwind
            sidebar.classList.remove('-translate-x-full');
        }
    });

    // Lógica para el modo oscuro
    const isDarkMode = () => document.documentElement.classList.contains('dark');

    const updateIcons = () => {
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

    const loadTheme = () => {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else if (savedTheme === 'light') {
            document.documentElement.classList.remove('dark');
        } else {
            // Si no hay tema guardado, usa el tema del sistema
            if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        }
        updateIcons();
    };

    // Aplica el tema guardado y los listeners
    loadTheme();

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
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            window.location.href = '/logout';
        });
    }
});