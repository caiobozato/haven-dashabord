/*
 * Haven service worker.
 *
 * Its only job is installability: Android requires a registered worker with a
 * fetch handler before it offers "Add to Home screen". It deliberately caches
 * nothing — the dashboard is useless without a live Home Assistant connection,
 * and an offline shell would only show stale, wrong state.
 */
self.addEventListener('install', () => {
	self.skipWaiting();
});

self.addEventListener('activate', (event) => {
	event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
	const url = new URL(event.request.url);

	// Never touch the SSE stream, camera MJPEG or any service call.
	if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
	if (url.pathname.startsWith('/api/')) return;

	event.respondWith(fetch(event.request));
});
