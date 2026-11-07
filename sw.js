const CACHE = 'app-factory-v2';
const APPS = 'apps-v1'; // تطبيقات المستخدم المثبّتة (لا تُحذف عند تحديث المصنع)
const SHELL = ['./', 'index.html', 'manifest.json', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== APPS).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  // لا نتدخل في الطلبات الخارجية (مثل Gemini) ولا في غير GET
  if (req.method !== 'GET' || url.origin !== location.origin) return;

  // التطبيقات المثبّتة تُخدَّم من التخزين المحلي (تعمل دون إنترنت)
  if (url.pathname.includes('/a/')) {
    e.respondWith(
      caches.open(APPS).then(c => c.match(req)).then(r => r || fetch(req))
    );
    return;
  }

  e.respondWith(
    fetch(req)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req).then(r => r || caches.match('./')))
  );
});
