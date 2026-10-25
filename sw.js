
"use strict";

const CACHE_NAME = "music-visualizer-v1";

const APP_FILES = [
  "./index.html",
  "./manifest.webmanifest"
];

// インストール時にアプリ本体を保存
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_FILES))
      .then(() => self.skipWaiting())
  );
});

// 古いバージョンのキャッシュを削除
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(async names => {
      await Promise.all(
        names
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );

      await self.clients.claim();
    })
  );
});

// 通信できないときは保存済みファイルを使用
self.addEventListener("fetch", event => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  // 自分のWebサイトのファイルのみ処理
  if (url.origin !== self.location.origin) {
    return;
  }

  // HTMLはオンラインなら最新版を優先
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).then(response => {
        if (response.ok) {
          const copy = response.clone();

          event.waitUntil(
            caches.open(CACHE_NAME).then(cache =>
              cache.put("./index.html", copy)
            )
          );
        }

        return response;
      }).catch(async () => {
        const cache = await caches.open(CACHE_NAME);

        return (
          await cache.match("./index.html")
        ) || Response.error();
      })
    );

    return;
  }

  // その他はキャッシュ優先
  event.respondWith(
    caches.match(request).then(cached => {
      return cached || fetch(request);
    })
  );
});
