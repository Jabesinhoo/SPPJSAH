// Aplica el tema antes de que se termine de cargar la página.
(function () {
    const prefersDark =
        !('theme' in localStorage) &&
        window.matchMedia('(prefers-color-scheme: dark)').matches;

    document.documentElement.classList.toggle(
        'dark',
        localStorage.theme === 'dark' || prefersDark
    );
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

    if (currentYearSpan) {
        currentYearSpan.textContent = new Date().getFullYear();
    }

    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('-translate-x-full');
        });
    }

    if (mainContent && sidebar) {
        mainContent.addEventListener('click', () => {
            sidebar.classList.add('-translate-x-full');
        });
    }

    window.addEventListener('resize', () => {
        if (window.innerWidth >= 768 && sidebar) {
            sidebar.classList.remove('-translate-x-full');
        }
    });

    const isDarkMode = () =>
        document.documentElement.classList.contains('dark');

    const updateIcons = () => {
        if (sunIcon && moonIcon) {
            const dark = isDarkMode();
            sunIcon.classList.toggle('hidden', !dark);
            moonIcon.classList.toggle('hidden', dark);
        }
    };

    updateIcons();

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const dark = !isDarkMode();
            document.documentElement.classList.toggle('dark', dark);
            localStorage.setItem('theme', dark ? 'dark' : 'light');
            updateIcons();
        });
    }

    const modal = document.getElementById('warningModal');
    const message = document.getElementById('warningMessage');
    const closeModal = document.getElementById('closeModal');

    function showModal(msg) {
        if (modal && message) {
            message.textContent = msg;
            modal.classList.remove('hidden');
        }
    }

    if (closeModal && modal) {
        closeModal.addEventListener('click', () => {
            modal.classList.add('hidden');
        });
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            try {
                const response = await fetch('/api/logout', { method: 'POST' });
                const data = await response.json();

                if (response.ok) {
                    window.location.href = data.redirect || '/registro_inicio';
                } else {
                    console.error('Error al cerrar sesión:', data.error || data.message);
                }
            } catch (error) {
                console.error('Error de red:', error);
            }
        });
    }

    const dropdownButton = document.getElementById('dropdownButton');
    const dropdownMenu = document.getElementById('dropdownMenu');
    const arrowIcon = document.getElementById('arrowIcon');

    if (dropdownButton && dropdownMenu) {
        const setDirectoryOpen = (open) => {
            dropdownMenu.classList.toggle('hidden', !open);
            dropdownButton.setAttribute('aria-expanded', String(open));
            arrowIcon?.classList.toggle('rotate-180', open);
        };

        dropdownButton.addEventListener('click', () => {
            setDirectoryOpen(dropdownMenu.classList.contains('hidden'));
        });

        document.addEventListener('click', (event) => {
            if (
                !dropdownButton.contains(event.target) &&
                !dropdownMenu.contains(event.target)
            ) {
                setDirectoryOpen(false);
            }
        });

        document.addEventListener('keydown', (event) => {
            if (
                event.key === 'Escape' &&
                !dropdownMenu.classList.contains('hidden') &&
                (dropdownButton.contains(event.target) ||
                    dropdownMenu.contains(event.target))
            ) {
                setDirectoryOpen(false);
                dropdownButton.focus();
            }
        });
    }
});
