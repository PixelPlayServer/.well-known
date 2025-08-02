class PixelPlayWebsite {
    constructor() {
        this.targetDate = new Date('2025-06-06T00:00:00').getTime();
        this.countdownInterval = null;
        this.isTimerPage = document.getElementById('countdown') !== null;
        this.init();
    }

    init() {
        this.checkDateAndRedirect();
        if (this.isTimerPage) {
            this.initCountdown();
        }
    }

    checkDateAndRedirect() {
        const now = new Date().getTime();
        const currentPage = window.location.pathname;
        const isTimer = currentPage.includes('timer.html');

        if (now >= this.targetDate && isTimer) {
            window.location.href = 'index.html';
        } else if (now < this.targetDate && !isTimer) {
            window.location.href = 'timer.html';
        }
    }

    initCountdown() {
        const elements = {
            days: document.getElementById('days'),
            hours: document.getElementById('hours'),
            minutes: document.getElementById('minutes'),
            seconds: document.getElementById('seconds'),
            container: document.getElementById('countdown'),
            accessGranted: document.getElementById('accessGranted')
        };

        if (!elements.days || !elements.hours || !elements.minutes || !elements.seconds) return;

        const update = () => {
            const timeLeft = this.targetDate - new Date().getTime();

            if (timeLeft > 0) {
                elements.days.textContent = Math.floor(timeLeft / (1000 * 60 * 60 * 24)).toString().padStart(2, '0');
                elements.hours.textContent = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)).toString().padStart(2, '0');
                elements.minutes.textContent = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, '0');
                elements.seconds.textContent = Math.floor((timeLeft % (1000 * 60)) / 1000).toString().padStart(2, '0');
            } else {
                if (elements.container) elements.container.style.display = 'none';
                if (elements.accessGranted) elements.accessGranted.style.display = 'block';
                clearInterval(this.countdownInterval);
                setTimeout(() => window.location.href = 'index.html', 3000);
            }
        };

        update();
        this.countdownInterval = setInterval(update, 1000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new PixelPlayWebsite();
});