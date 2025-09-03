// public/js/password-strength.js
import zxcvbn from 'zxcvbn';

class PasswordStrength {
    constructor(passwordInput, strengthContainer) {
        this.passwordInput = passwordInput;
        this.strengthContainer = strengthContainer;
        this.init();
    }

    init() {
        this.passwordInput.addEventListener('input', this.updateStrength.bind(this));
        this.createStrengthMeter();
    }

    createStrengthMeter() {
        this.strengthMeter = document.createElement('div');
        this.strengthMeter.className = 'password-strength-meter';
        this.strengthMeter.innerHTML = `
            <div class="strength-bars">
                <div class="strength-bar"></div>
                <div class="strength-bar"></div>
                <div class="strength-bar"></div>
                <div class="strength-bar"></div>
            </div>
            <div class="strength-feedback"></div>
        `;
        this.strengthContainer.appendChild(this.strengthMeter);
    }

    updateStrength() {
        const password = this.passwordInput.value;
        
        if (password.length === 0) {
            this.clearFeedback();
            return;
        }

        const result = zxcvbn(password);
        this.updateVisualFeedback(result);
        this.updateTextFeedback(result, password);
    }

    updateVisualFeedback(result) {
        const bars = this.strengthMeter.querySelectorAll('.strength-bar');
        const strengthLevel = result.score;
        
        bars.forEach(bar => {
            bar.className = 'strength-bar';
        });

        for (let i = 0; i <= strengthLevel; i++) {
            if (i < bars.length) {
                bars[i].classList.add(this.getStrengthClass(strengthLevel));
            }
        }
    }

    updateTextFeedback(result, password) {
        const feedbackElement = this.strengthMeter.querySelector('.strength-feedback');
        const strengthLevel = result.score;
        
        const messages = [
            'Muy débil 😟 - Fácil de adivinar',
            'Débil 😐 - Mejorable',
            'Regular 🙂 - Aceptable',
            'Fuerte 😊 - Buena contraseña',
            'Muy fuerte 🎉 - Excelente contraseña'
        ];

        const suggestions = result.feedback.suggestions.length > 0 
            ? `<div class="suggestions">💡 ${result.feedback.suggestions.join(' ')}</div>`
            : '';

        feedbackElement.innerHTML = `
            <div class="strength-text ${this.getStrengthClass(strengthLevel)}">
                ${messages[strengthLevel]}
                ${suggestions}
                ${password.length > 0 ? `<div class="crack-time">⏱️ ${result.crack_times_display.offline_slow_hashing_1e4_per_second}</div>` : ''}
            </div>
        `;
    }

    clearFeedback() {
        const bars = this.strengthMeter.querySelectorAll('.strength-bar');
        bars.forEach(bar => {
            bar.className = 'strength-bar';
        });
        
        const feedbackElement = this.strengthMeter.querySelector('.strength-feedback');
        feedbackElement.innerHTML = '';
    }

    getStrengthClass(score) {
        const classes = [
            'very-weak',
            'weak',
            'medium',
            'strong',
            'very-strong'
        ];
        return classes[score];
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    const passwordInput = document.getElementById('password');
    const strengthContainer = document.getElementById('passwordStrength');
    
    if (passwordInput && strengthContainer) {
        new PasswordStrength(passwordInput, strengthContainer);
    }
});

export default PasswordStrength;