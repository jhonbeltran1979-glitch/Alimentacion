// VitalTrack — Service Worker para notificaciones push
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (_) {
    data = { title: 'VitalTrack', body: event.data ? event.data.text() : '¡Tienes un pendiente!' };
  }
  const title = data.title || 'VitalTrack';
  const options = {
    body: data.body || 'No olvides registrar tus hábitos de hoy.',
    icon: './favicon.svg',
    badge: './favicon.svg',
    tag: data.tag || 'vitaltrack-recordatorio',
    renotify: true,
    data: { url: data.url || './' }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || './';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.registration.scope) && 'focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
