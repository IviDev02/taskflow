import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import request from "supertest";
import { io as connect } from "socket.io-client";
import { connectDB, disconnectDB } from "../src/db.js";
import { createApp } from "../src/app.js";
import { createRealtime } from "../src/realtime.js";

let server, api, url;
const sockets = [];

before(async () => {
  await connectDB(""); // MongoDB en memoria
  const app = createApp({ clientOrigin: "*" });
  server = http.createServer(app);
  app.locals.rt = createRealtime(server, { clientOrigin: "*" });
  await new Promise((r) => server.listen(0, r));
  url = `http://localhost:${server.address().port}`;
  api = request(server);
});

after(async () => {
  sockets.forEach((s) => s.close());
  server.close();
  await disconnectDB();
});

const register = async (name) => {
  const res = await api
    .post("/api/auth/register")
    .send({ name, email: `${name.toLowerCase()}@test.dev`, password: "password123" })
    .expect(201);
  return res.body;
};
const auth = (token) => ({ Authorization: `Bearer ${token}` });

const openSocket = (token, transports = ["websocket"]) =>
  new Promise((resolve, reject) => {
    const s = connect(url, { auth: { token }, transports });
    sockets.push(s);
    s.on("connect", () => resolve(s));
    s.on("connect_error", reject);
  });
const nextEvent = (socket, event) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout esperando ${event}`)), 2000);
    socket.once(event, (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });

test("registro, login y perfil", async () => {
  const { token, user } = await register("Ana");
  assert.equal(user.email, "ana@test.dev");
  assert.ok(token);

  await api.post("/api/auth/register").send({ name: "Ana", email: "ana@test.dev", password: "password123" }).expect(409);
  await api.post("/api/auth/login").send({ email: "ana@test.dev", password: "incorrecta" }).expect(401);
  const login = await api.post("/api/auth/login").send({ email: "ANA@test.dev", password: "password123" }).expect(200);

  const me = await api.get("/api/auth/me").set(auth(login.body.token)).expect(200);
  assert.equal(me.body.user.name, "Ana");
  assert.equal(me.body.user.passwordHash, undefined);
});

test("valida los datos y protege las rutas", async () => {
  const res = await api.post("/api/auth/register").send({ name: "X", email: "no-es-email", password: "1" }).expect(400);
  assert.match(res.body.error, /nombre|Email|contraseña/);
  await api.get("/api/boards").expect(401);
  await api.get("/api/boards").set(auth("token-falso")).expect(401);
});

test("tableros, tareas, movimientos y eventos en tiempo real", async () => {
  const owner = await register("Bruno");
  const guest = await register("Carla");
  const stranger = await register("Dani");

  const { body: { board } } = await api.post("/api/boards").set(auth(owner.token)).send({ name: "Sprint 1" }).expect(201);

  // Un usuario ajeno no puede ver el tablero
  await api.get(`/api/boards/${board.id}`).set(auth(stranger.token)).expect(404);
  await api.get("/api/boards/id-invalido").set(auth(owner.token)).expect(404);

  // Invitación: Carla recibe una notificación por WebSocket
  const guestSocket = await openSocket(guest.token);
  const invited = nextEvent(guestSocket, "notification");
  await api.post(`/api/boards/${board.id}/members`).set(auth(owner.token)).send({ email: "carla@test.dev" }).expect(201);
  assert.equal((await invited).type, "board:invited");
  await api.post(`/api/boards/${board.id}/members`).set(auth(guest.token)).send({ email: "dani@test.dev" }).expect(403);

  // Carla entra en el tablero y ve la presencia
  const presence = nextEvent(guestSocket, "presence");
  const joined = await guestSocket.emitWithAck("board:join", board.id);
  assert.equal(joined.ok, true);
  assert.deepEqual((await presence).users.map((u) => u.name), ["Carla"]);

  const strangerSocket = await openSocket(stranger.token);
  assert.equal((await strangerSocket.emitWithAck("board:join", board.id)).ok, false);

  // Crear tareas: Carla recibe task:created y la notificación de asignación
  const created = nextEvent(guestSocket, "task:created");
  const assigned = nextEvent(guestSocket, "notification");
  const t1 = (await api.post(`/api/boards/${board.id}/tasks`).set(auth(owner.token))
    .send({ title: "Diseñar API", assignee: guest.user.id }).expect(201)).body.task;
  assert.equal((await created).task.id, t1.id);
  assert.equal((await assigned).type, "task:assigned");

  const t2 = (await api.post(`/api/boards/${board.id}/tasks`).set(auth(owner.token)).send({ title: "Maquetar" }).expect(201)).body.task;
  const t3 = (await api.post(`/api/boards/${board.id}/tasks`).set(auth(owner.token)).send({ title: "Tests" }).expect(201)).body.task;
  assert.deepEqual([t1.position, t2.position, t3.position], [0, 1, 2]);

  // No se puede asignar a alguien que no es miembro
  await api.patch(`/api/tasks/${t2.id}`).set(auth(owner.token)).send({ assignee: stranger.user.id }).expect(400);
  await api.patch(`/api/tasks/${t2.id}`).set(auth(stranger.token)).send({ title: "hack" }).expect(404);

  // Mover t3 a "En curso" y luego t2 encima de t3
  const moved = nextEvent(guestSocket, "tasks:moved");
  await api.patch(`/api/tasks/${t3.id}/move`).set(auth(owner.token)).send({ status: "doing", index: 0 }).expect(200);
  const evt = await moved;
  assert.equal(evt.to, "doing");
  assert.match(evt.message, /En curso/);
  await api.patch(`/api/tasks/${t2.id}/move`).set(auth(owner.token)).send({ status: "doing", index: 0 }).expect(200);

  const { body: detail } = await api.get(`/api/boards/${board.id}`).set(auth(guest.token)).expect(200);
  const column = (s) => detail.tasks.filter((t) => t.status === s).sort((a, b) => a.position - b.position).map((t) => t.title);
  assert.deepEqual(column("todo"), ["Diseñar API"]);
  assert.deepEqual(column("doing"), ["Maquetar", "Tests"]);

  // Recuento por estado en el listado
  const { body: list } = await api.get("/api/boards").set(auth(owner.token)).expect(200);
  assert.deepEqual(list.boards[0].counts, { todo: 1, doing: 2, done: 0 });

  // Al quitar a Carla, su tarea queda sin asignar
  await api.delete(`/api/boards/${board.id}/members/${guest.user.id}`).set(auth(owner.token)).expect(200);
  const { body: after } = await api.get(`/api/boards/${board.id}`).set(auth(owner.token)).expect(200);
  assert.equal(after.tasks.find((t) => t.id === t1.id).assignee, null);
  await api.get(`/api/boards/${board.id}`).set(auth(guest.token)).expect(404);

  // Borrar tarea y tablero
  await api.delete(`/api/tasks/${t1.id}`).set(auth(owner.token)).expect(204);
  await api.delete(`/api/boards/${board.id}`).set(auth(owner.token)).expect(204);
  await api.get(`/api/boards/${board.id}`).set(auth(owner.token)).expect(404);
});

test("prioridad, etiquetas y fecha límite", async () => {
  const { token } = await register("Fran");
  const { body: { board } } = await api.post("/api/boards").set(auth(token)).send({ name: "Etiquetas" }).expect(201);
  const tasksUrl = `/api/boards/${board.id}/tasks`;

  const { body: { task: basic } } = await api.post(tasksUrl).set(auth(token)).send({ title: "Por defecto" }).expect(201);
  assert.equal(basic.priority, "medium");
  assert.deepEqual(basic.labels, []);
  assert.equal(basic.dueDate, null);

  const { body: { task } } = await api.post(tasksUrl).set(auth(token))
    .send({ title: "Arreglar login", priority: "urgent", labels: ["bug", "backend", "bug"], dueDate: "2026-11-15" }).expect(201);
  assert.equal(task.priority, "urgent");
  assert.deepEqual(task.labels, ["bug", "backend"]); // sin duplicados
  assert.equal(task.dueDate, "2026-11-15");

  await api.post(tasksUrl).set(auth(token)).send({ title: "x", priority: "altísima" }).expect(400);
  await api.post(tasksUrl).set(auth(token)).send({ title: "x", labels: ["inventada"] }).expect(400);
  await api.post(tasksUrl).set(auth(token)).send({ title: "x", dueDate: "15/11/2026" }).expect(400);

  const { body: { task: edited } } = await api.patch(`/api/tasks/${task.id}`).set(auth(token))
    .send({ priority: "low", labels: ["docs"], dueDate: null }).expect(200);
  assert.equal(edited.priority, "low");
  assert.deepEqual(edited.labels, ["docs"]);
  assert.equal(edited.dueDate, null);
  assert.equal(edited.title, "Arreglar login"); // lo no enviado no cambia
});

// El navegador empieza por long-polling HTTP: Express no debe interferir en /socket.io
test("funciona por long-polling HTTP, como el navegador al conectar", async () => {
  const { token } = await register("Elena");
  const s = await openSocket(token, ["polling"]);
  assert.equal(s.io.engine.transport.name, "polling");
  const res = await s.emitWithAck("board:join", "000000000000000000000000");
  assert.equal(res.ok, false);
  await api.get("/api/health").expect(200); // el servidor sigue vivo
});

test("el socket rechaza conexiones sin token válido", async () => {
  await assert.rejects(openSocket("token-falso"), /No autenticado/);
});
