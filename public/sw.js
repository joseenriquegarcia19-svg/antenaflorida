self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {};
  const options = {
    body: data.body || '',
    icon: data.icon || '/favicon-32x32.png',
    badge: data.badge || '/favicon-32x32.png',
    data: { url: data.url || data.link || '/' }
  };
  event.waitUntil(
    self.registration.showNotification(data.title || 'Antena Florida', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  var path = event.notification.data?.url || '/';
  var fullUrl = path.startsWith('http') ? path : (self.location.origin + (path.startsWith('/') ? path : '/' + path));
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (var i = 0; i < clientList.length; i++) {
        if (clientList[i].url && 'focus' in clientList[i]) {
          clientList[i].navigate(fullUrl);
          return clientList[i].focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(fullUrl);
      }
    })
  );
});