/// <reference lib="webworker" />
import { clientsClaim, skipWaiting } from 'workbox-core';
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkOnly } from 'workbox-strategies';

declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

skipWaiting();
clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

registerRoute(
  ({ url }) => url.pathname.endsWith('/version.json'),
  new NetworkOnly(),
);

type PushPayload = {
  title?: string;
  body?: string;
  link?: string;
};

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload: PushPayload = {};
  try {
    payload = event.data.json() as PushPayload;
  } catch {
    payload = { title: 'إشعار', body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title ?? 'أولمبياد النخبة', {
      body: payload.body ?? '',
      icon: '/icon.jpeg',
      badge: '/icon.jpeg',
      data: { url: payload.link ?? '/' },
      dir: 'rtl',
      lang: 'ar',
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data as { url?: string } | undefined)?.url ?? '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          void client.navigate(url);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
      return undefined;
    }),
  );
});
