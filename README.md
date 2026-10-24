# TaskFlow

Gestor de tareas colaborativo con **tableros kanban en tiempo real**. Varias personas pueden trabajar en el mismo tablero y ver los cambios de los demás al instante, sin recargar.

**Stack:** React · Node.js · Express · Socket.io · MongoDB · JWT · Docker

## Funcionalidades

- **Autenticación JWT**: registro e inicio de sesión con contraseñas cifradas con bcrypt. El mismo token protege la API REST y la conexión WebSocket.
- **Tableros kanban**: columnas *Por hacer*, *En curso* y *Hecho*, con arrastrar y soltar para reordenar y mover tareas.
- **Prioridades, etiquetas y fechas límite**: cuatro niveles de prioridad con color, etiquetas (Bug, Feature, Diseño, Frontend, Backend, DevOps, Docs) y avisos de tareas vencidas o que vencen pronto.
- **Filtros**: búsqueda por texto, prioridad, etiqueta y "mis tareas". El arrastrar y soltar sigue funcionando con los filtros activos.
- **Tiempo real con Socket.io**: crear, editar, mover o borrar una tarea se refleja al instante en todos los navegadores conectados al tablero.
- **Presencia**: un punto verde indica quién está viendo el tablero en ese momento.
- **Notificaciones**: avisos en vivo cuando te invitan a un tablero, te asignan una tarea o alguien mueve algo.
- **Colaboración**: invitación de miembros por email, asignación de tareas y roles (propietario / miembro).
- **UI optimista**: los movimientos se aplican al momento y se resincronizan si la API falla o se pierde la conexión.

## Arquitectura

```
client/   React 19 + Vite + React Router — SPA servida por Nginx en producción
server/   Express 5 + Mongoose + Socket.io — API REST + WebSockets
          ├─ routes/      auth, boards, tasks (validación con Zod)
          ├─ realtime.js  salas por tablero y por usuario, presencia
          └─ test/        tests de integración (API + sockets)
```

- La API emite los eventos después de cada cambio en la base de datos, a la sala `board:<id>` (cambios del tablero) o `user:<id>` (notificaciones personales).
- El orden de las tareas se guarda como `position` por columna. Al mover una tarea, el servidor renumera solo las columnas afectadas con un `bulkWrite`.
- Los permisos se comprueban en cada petición: un usuario que no es miembro recibe `404`, para no revelar que el tablero existe.

## Puesta en marcha

### Con Docker (recomendado)

```bash
cp .env.example .env      # y cambia JWT_SECRET
docker compose up --build
```

Abre http://localhost:8080. Levanta MongoDB, la API y la web; Nginx hace de proxy de `/api` y de los WebSockets.

### Sin Docker (desarrollo)

Requiere Node.js 20 o superior.

```bash
npm install
npm run dev
```

- Web: http://localhost:5173 (Vite usará otro puerto si ese está ocupado)
- API: http://localhost:4000

Si no defines `MONGO_URI`, la API arranca un **MongoDB en memoria** automáticamente con datos de ejemplo. Puedes entrar con la cuenta demo `demo@taskflow.dev` / `demo12345`. La primera vez descarga el binario (~800 MB); los datos se pierden al parar. Para persistirlos, usa MongoDB Atlas (gratis) o un MongoDB local:

```bash
MONGO_URI="mongodb+srv://..." npm run dev
```

### Tests

```bash
npm test
```

Tests de integración con `node:test`, Supertest y `socket.io-client` contra un MongoDB en memoria: autenticación, permisos, tableros, tareas, reordenación y eventos en tiempo real.

## Variables de entorno (API)

| Variable | Por defecto | Descripción |
|---|---|---|
| `PORT` | `4000` | Puerto de la API |
| `MONGO_URI` | *(vacío → en memoria)* | Cadena de conexión de MongoDB |
| `JWT_SECRET` | `dev-secret-cambiame` | Secreto para firmar los tokens (**obligatorio en producción**) |
| `JWT_EXPIRES_IN` | `7d` | Caducidad del token |
| `CLIENT_ORIGIN` | `http://localhost:5173` | Origen permitido por CORS |

## API

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/auth/register` | Crear cuenta |
| `POST` | `/api/auth/login` | Iniciar sesión |
| `GET` | `/api/auth/me` | Usuario actual |
| `GET` | `/api/boards` | Mis tableros (con recuento por estado) |
| `POST` | `/api/boards` | Crear tablero |
| `GET` | `/api/boards/:id` | Tablero con sus tareas |
| `PATCH` | `/api/boards/:id` | Renombrar *(propietario)* |
| `DELETE` | `/api/boards/:id` | Eliminar *(propietario)* |
| `POST` | `/api/boards/:id/members` | Invitar por email *(propietario)* |
| `DELETE` | `/api/boards/:id/members/:userId` | Quitar miembro o salir |
| `POST` | `/api/boards/:id/tasks` | Crear tarea |
| `PATCH` | `/api/tasks/:id` | Editar título, descripción o asignación |
| `PATCH` | `/api/tasks/:id/move` | Mover a `{ status, index }` |
| `DELETE` | `/api/tasks/:id` | Eliminar tarea |

**Eventos de Socket.io:** `board:join`, `board:leave` (cliente → servidor) · `task:created`, `task:updated`, `task:deleted`, `tasks:moved`, `board:updated`, `board:deleted`, `presence`, `notification`, `boards:changed` (servidor → cliente).
