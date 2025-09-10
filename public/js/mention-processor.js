// public/js/mention-processor.js
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('form').forEach(form => {
    form.addEventListener('submit', async (e) => {
      try {
        let textContent = '';
        form.querySelectorAll('textarea, input[type="text"]').forEach(el => {
          textContent += ' ' + (el.value || '');
        });

        const mentionRegex = /@(\w+)/g;
        const mentions = [];
        let match;
        while ((match = mentionRegex.exec(textContent)) !== null) {
          mentions.push(match[1]);
        }

        if (mentions.length > 0) {
          await fetch('/api/notifications/process-mentions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': document
                .querySelector('meta[name="csrf-token"]')
                ?.content
            },
            body: JSON.stringify({
              text: textContent,
              mentions: mentions,
              context: {
                section: window.location.pathname,
                redirectUrl: window.location.href
              }
            })
          });
        }
      } catch (err) {
        console.error('❌ Error al procesar menciones:', err);
      }
    });
  });
});
