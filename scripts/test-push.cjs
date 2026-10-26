const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const crypto = require("node:crypto");
const ts = require("typescript");

function load(file, dependencies = {}, globals = {}) {
  const source = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const context = { exports: {}, URL, console, process: { env: {} }, ...globals,
    require(name) { if (name in dependencies) return dependencies[name]; throw Error(`Unexpected dependency: ${name}`); } };
  vm.runInNewContext(source, context);
  return context.exports;
}
const validation = load("src/lib/push-validation.ts");
const ecdh = crypto.createECDH("prime256v1");
ecdh.generateKeys();
const subscription = (host = "fcm.googleapis.com", suffix = "test") => ({
  endpoint: `https://${host}/push/${suffix}`,
  keys: { p256dh: ecdh.getPublicKey().toString("base64url"), auth: crypto.randomBytes(16).toString("base64url") },
});

function fakeFirestore() {
  const documents = new Map();
  const stats = { reads: 0, writes: 0, queries: 0 };
  let lock = Promise.resolve();
  const snapshot = (path) => ({ id: path.split("/").at(-1), exists: documents.has(path), data: () => documents.get(path), ref: ref(path) });
  function ref(path) {
    return {
      id: path.split("/").at(-1),
      async get() { stats.reads++; return snapshot(path); },
      async set(value, options) { stats.writes++; documents.set(path, options?.merge ? { ...documents.get(path), ...value } : value); },
      async delete() { stats.writes++; documents.delete(path); },
      async create(value) { if (documents.has(path)) throw Error("already exists"); return this.set(value); },
      async update(value) { if (!documents.has(path)) throw Error("missing"); return this.set(value, { merge: true }); },
    };
  }
  const db = {
    collection(name) {
      return {
        doc(id) { return ref(`${name}/${id}`); },
        limit(limit) { return { async get() {
          stats.queries++;
          const docs = [...documents.keys()].filter((path) => path.startsWith(`${name}/`)).slice(0, limit).map(snapshot);
          stats.reads += Math.max(1, docs.length);
          return { docs, size: docs.length, empty: !docs.length };
        } }; },
      };
    },
    async runTransaction(callback, options) {
      assert.equal(options.maxAttempts, 1);
      const previous = lock;
      let release;
      lock = new Promise((resolve) => { release = resolve; });
      await previous;
      try { return await callback({ get: (r) => r.get(), set: (r, ...args) => r.set(...args),
        create: (r, ...args) => r.create(...args), update: (r, ...args) => r.update(...args) }); }
      finally { release(); }
    },
  };
  return { db, documents, stats };
}

function harness() {
  const store = fakeFirestore();
  const sent = [];
  let fail = null;
  const env = { VAPID_PUBLIC_KEY: "test-public", VAPID_PRIVATE_KEY: "test-private", APP_ACCESS_PASSWORD: "test-only" };
  const backend = load("src/lib/web-push.ts", {
    "web-push": { async sendNotification(target, payload) { sent.push({ target, payload: JSON.parse(payload) }); if (fail) throw fail; } },
    "node:crypto": crypto,
    "@/lib/firebase-admin": { adminDb: store.db }, "./push-validation": validation,
  }, { process: { env } });
  let authenticated = true;
  const route = load("src/app/api/push/route.ts", {
    "node:crypto": crypto,
    "next/server": { NextResponse: { json(body, options = {}) { return { body, status: options.status || 200,
      headers: options.headers, cookieValues: {}, cookies: { set(name, value) { this.values[name] = value; }, values: {} } }; } } },
    "@/lib/auth-utils": { verifyToken: async () => authenticated },
    "@/lib/session": { getCurrentUser: async () => null },
    "@/lib/firebase-admin": { adminDb: store.db },
    "@/lib/push-validation": validation, "@/lib/web-push": backend,
  }, { process: { env }, SyntaxError });
  function request(body, owner = "device-owner", origin = "https://kotobase.example") {
    return { nextUrl: new URL("https://kotobase.example/api/push"),
      headers: { get(name) { return name === "origin" ? origin : null; } },
      cookies: { get(name) { return name === "kotobase_push_device" && owner ? { value: owner } : undefined; } },
      text: async () => JSON.stringify(body) };
  }
  return { ...store, sent, env, backend, route, request,
    fail(error) { fail = error; }, unauthorized() { authenticated = false; } };
}

test("subscription validation allows browser services and rejects SSRF, malformed keys and credentials", () => {
  for (const host of ["fcm.googleapis.com", "web.push.apple.com", "updates.push.services.mozilla.com", "wns2-example.notify.windows.com"])
    assert.ok(validation.parsePushSubscription(subscription(host)));
  for (const endpoint of ["http://127.0.0.1/push", "https://fcm.googleapis.com.evil.test/push", "https://fcm.googleapis.com:444/push",
    "https://user:password@fcm.googleapis.com/push", "https://169.254.169.254/", "https://fcm.googleapis.com/push#fragment"])
    assert.equal(validation.parsePushSubscription({ ...subscription(), endpoint }), null);
  assert.equal(validation.parsePushSubscription({ ...subscription(), keys: { p256dh: "bad", auth: "bad" } }), null);
  assert.equal(validation.parsePushSubscription(null), null);
});

test("push navigation stays on origin; iPhone requires installation and Android supports opt-in", () => {
  for (const value of ["//evil.test", "https://evil.test", "/\\evil.test", "/\nevil", null]) assert.equal(validation.safePushPath(value), "/");
  assert.equal(validation.safePushPath("/?notifications=1"), "/?notifications=1");
  assert.equal(validation.pushPlatform({ ios: true, standalone: false, secure: true, supported: false }), "install-ios");
  assert.equal(validation.pushPlatform({ ios: true, standalone: true, secure: true, supported: true }), "ready");
  assert.equal(validation.pushPlatform({ ios: false, standalone: false, secure: true, supported: true }), "ready");
  assert.equal(validation.pushPlatform({ ios: false, standalone: true, secure: false, supported: true }), "unsupported");
});

test("public configuration uses no Firestore and never exposes private keys; denied auth/origin does no I/O", async () => {
  const h = harness();
  const config = await h.route.GET();
  assert.equal(config.body.publicKey, "test-public");
  assert.equal(JSON.stringify(config.body).includes("test-private"), false);
  assert.equal(h.stats.reads, 0);
  const input = { action: "subscribe", subscription: subscription() };
  assert.equal((await h.route.POST(h.request(input, "owner", "https://evil.test"))).status, 403);
  h.unauthorized();
  assert.equal((await h.route.POST(h.request(input))).status, 401);
  assert.equal(h.stats.reads + h.stats.writes, 0);
  assert.equal(h.sent.length, 0);
});

test("subscribe is idempotent, requires valid subscription and isolates device ownership", async () => {
  const h = harness();
  const input = { action: "subscribe", subscription: subscription() };
  assert.equal((await h.route.POST(h.request(input))).status, 200);
  assert.equal((await h.route.POST(h.request(input))).status, 200);
  assert.equal(h.stats.writes, 1);
  assert.equal(h.stats.reads, 2);
  assert.equal((await h.route.POST(h.request({ ...input, subscription: {} }))).status, 400);
  await h.route.DELETE(h.request({ endpoint: input.subscription.endpoint }, "other-device"));
  assert.equal(h.documents.size, 1);
  await h.route.DELETE(h.request({ endpoint: input.subscription.endpoint }));
  assert.equal(h.documents.size, 0);
});

test("origin checks use public Host/proxy scheme when Next exposes an internal hostname", async () => {
  const h = harness();
  const request = h.request({ action: "subscribe", subscription: subscription() });
  request.nextUrl = new URL("http://localhost:3000/api/push");
  request.headers.get = (name) => ({ origin: "https://kotobase.example", host: "kotobase.example", "x-forwarded-proto": "https" })[name] || null;
  assert.equal((await h.route.POST(request)).status, 200);
  request.headers.get = (name) => ({ origin: "https://evil.test", host: "kotobase.example", "x-forwarded-proto": "https" })[name] || null;
  assert.equal((await h.route.POST(request)).status, 403);
});

test("self-test reads only own subscription once, uses stored keys and enforces persistent cooldown", async () => {
  const h = harness();
  const sub = subscription();
  await h.route.POST(h.request({ action: "subscribe", subscription: sub }));
  const before = h.stats.reads;
  const result = await h.route.POST(h.request({ action: "test", subscription: { ...sub, keys: subscription().keys } }));
  assert.equal(result.status, 200);
  assert.equal(h.stats.reads - before, 1);
  assert.equal(h.sent[0].target.keys.auth, sub.keys.auth);
  assert.equal(h.sent[0].payload.url, "/?notifications=1");
  assert.equal((await h.route.POST(h.request({ action: "test", subscription: sub }))).status, 429);
  assert.equal(h.sent.length, 1);
  assert.equal((await h.route.POST(h.request({ action: "test", subscription: sub }, "another-owner"))).status, 404);
});

test("expired self-test registration is removed; raw provider endpoints/errors never reach client", async () => {
  const h = harness(); const sub = subscription();
  await h.route.POST(h.request({ action: "subscribe", subscription: sub }));
  h.fail({ statusCode: 410, message: "sensitive provider detail" });
  const result = await h.route.POST(h.request({ action: "test", subscription: sub }));
  assert.equal(result.status, 410);
  assert.equal(h.documents.size, 0);
  assert.equal(JSON.stringify(result.body).includes("sensitive"), false);
});

test("broadcast reads devices once, bounds concurrency, records receipt and rejects a repeat before scanning", async () => {
  const h = harness();
  h.documents.set("system_notifications/new-feature", { title: "New feature", summary: "Ready", isActive: true, link: "https://evil.test" });
  for (let i = 0; i < 10; i++) h.documents.set(`push_subscriptions/${i}`, { subscription: subscription("web.push.apple.com", String(i)) });
  const result = await h.backend.broadcastSystemPush("new-feature");
  assert.equal(result.accepted, 10);
  assert.equal(h.sent.length, 10);
  assert.equal(h.sent[0].payload.url, "/");
  assert.equal(h.stats.reads, 13); // Receipt + announcement + ten devices + transactional receipt.
  assert.equal(h.stats.queries, 1);
  const before = h.stats.reads;
  await assert.rejects(h.backend.broadcastSystemPush("new-feature"), /đã được gửi/);
  assert.equal(h.stats.reads - before, 1);
  assert.equal(h.stats.queries, 1);
});

test("broadcast refuses oversize batch before sending and concurrent duplicate cannot send twice", async () => {
  const large = harness();
  large.documents.set("system_notifications/large", { title: "Large", isActive: true });
  for (let i = 0; i < 101; i++) large.documents.set(`push_subscriptions/${i}`, { subscription: subscription() });
  await assert.rejects(large.backend.broadcastSystemPush("large"), /hơn 100/);
  assert.equal(large.sent.length, 0);
  assert.equal(large.documents.has("push_broadcasts/large"), false);
  const h = harness();
  h.documents.set("system_notifications/new", { title: "New" });
  h.documents.set("push_subscriptions/one", { subscription: subscription() });
  const results = await Promise.allSettled([h.backend.broadcastSystemPush("new"), h.backend.broadcastSystemPush("new")]);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(h.sent.length, 1);
});

test("broadcast cleans expired endpoints, records partial failure and never retries automatically", async () => {
  const h = harness();
  h.documents.set("system_notifications/new", { title: "New" });
  h.documents.set("push_subscriptions/one", { subscription: subscription() });
  h.fail({ statusCode: 410 });
  const result = await h.backend.broadcastSystemPush("new");
  assert.equal(result.expired, 1);
  assert.equal(h.documents.has("push_subscriptions/one"), false);
  assert.equal(h.sent.length, 1);
});

function workerHarness() {
  const callbacks = {}, displayed = [], opened = [], navigated = [];
  let cached = 0;
  const self = { location: { origin: "https://kotobase.example" },
    addEventListener(name, callback) { callbacks[name] = callback; }, skipWaiting() {},
    registration: { showNotification: async (title, options) => displayed.push({ title, options }) },
    clients: { claim() {}, matchAll: async () => [], openWindow: async (url) => opened.push(url) } };
  vm.runInNewContext(fs.readFileSync("public/sw.js", "utf8"), { self, URL, console,
    caches: { open: async () => { cached++; return {}; } }, fetch() { throw Error("Unexpected network request"); } });
  async function emit(name, details) { let pending; callbacks[name]({ ...details, waitUntil(promise) { pending = promise; } }); await pending; }
  return { self, callbacks, displayed, opened, navigated, emit, get cached() { return cached; } };
}

test("service worker shows push without app/network, malformed payload still visible and click stays local", async () => {
  const h = workerHarness();
  await h.emit("push", { data: { json: () => ({ title: "KotoBase", body: "Hello", id: "one", url: "/?notifications=1" }) } });
  assert.equal(h.displayed[0].options.tag, "kotobase-one");
  await h.emit("notificationclick", { notification: { data: h.displayed[0].options.data, close() {} } });
  assert.equal(h.opened[0], "https://kotobase.example/?notifications=1");
  await h.emit("push", { data: { json() { throw Error("bad JSON"); } } });
  assert.equal(h.displayed.length, 2);
  assert.ok(h.displayed[1].title);
  await h.emit("notificationclick", { notification: { data: { url: "https://evil.test" }, close() {} } });
  assert.equal(h.opened[1], "https://kotobase.example/");
  assert.equal(h.cached, 0);
});

test("service worker focuses existing window and push settings requests bypass offline cache", async () => {
  const h = workerHarness();
  let focused = false;
  h.self.clients.matchAll = async () => [{ url: "https://kotobase.example/", focus() {},
    async navigate(url) { h.navigated.push(url); return { focus: async () => { focused = true; } }; } }];
  await h.emit("notificationclick", { notification: { data: { url: "/grammar" }, close() {} } });
  assert.equal(focused, true); assert.equal(h.opened.length, 0);
  let intercepted = false;
  h.callbacks.fetch({ request: { method: "GET", url: "https://kotobase.example/api/push" }, respondWith() { intercepted = true; } });
  assert.equal(intercepted, false);
  assert.equal(h.cached, 0);
});

test("real web-push builds encrypted VAPID requests for Apple, Chrome and Firefox without sending", () => {
  const webpush = require("web-push");
  const keys = webpush.generateVAPIDKeys();
  for (const host of ["web.push.apple.com", "fcm.googleapis.com", "updates.push.services.mozilla.com"]) {
    const details = webpush.generateRequestDetails(subscription(host), JSON.stringify({ title: "KotoBase", body: "Test" }), {
      vapidDetails: { ...keys, subject: "https://kotobase.example" }, contentEncoding: "aes128gcm", TTL: 86400,
    });
    assert.ok(details.body.length > 0);
    assert.equal(details.headers["Content-Encoding"], "aes128gcm");
    assert.equal(details.headers.Authorization.startsWith("vapid "), true);
  }
});
