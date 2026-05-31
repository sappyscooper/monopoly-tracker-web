self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const windowClients = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    });

    await Promise.all(windowClients.map(client => {
      if ('navigate' in client && client.url) return client.navigate(client.url);
      return client.postMessage({ type: 'MONOPOLY_TRACKER_SW_UPDATED' });
    }));
  })());
});
