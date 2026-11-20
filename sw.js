// Service worker do António: abre sempre a versão mais recente, recebe notificações e trata dos botões ("Feito", "+30 min").

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

// Ao abrir a app (atalho da barra de tarefas, ecrã principal), pergunta sempre ao servidor se a página mudou.
// Sem isto, o browser pode mostrar a cópia guardada (o GitHub Pages deixa-a 10 min em cache) com a versão antiga.
// Custa um pedido pequeno: se nada mudou, o servidor responde só "304 igual".
self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(fetch(event.request, { cache: "no-cache" }).catch(() => fetch(event.request)));
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "António", body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "António", {
      body: data.body || "",
      tag: data.tag,
      icon: "icon-192.png",
      badge: "icon-192.png",
      data: { taskId: data.taskId, url: data.url || "./", open: data.open },
      actions: data.actions || [],
      requireInteraction: !!data.requireInteraction,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  const { taskId, url, open } = event.notification.data || {};
  const action = event.action || (taskId && event.notification.tag?.startsWith("checkin") ? "checkin" : "");
  event.notification.close();

  const target = new URL(url || "./", self.registration.scope);
  if (taskId && action) {
    target.searchParams.set("tarefa", String(taskId));
    target.searchParams.set("acao", action);
  } else if (open) {
    target.searchParams.set("vista", open);
  }

  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const client = all.find((c) => c.url.startsWith(self.registration.scope));
    if (client) {
      if (taskId && action) client.postMessage({ type: "acao", taskId, action });
      else if (open) client.postMessage({ type: "abrir", vista: open });
      return client.focus();
    }
    return self.clients.openWindow(target.href);
  })());
});
