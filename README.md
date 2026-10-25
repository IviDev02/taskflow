# TaskFlow

Gestor de tareas colaborativo con **tableros kanban en tiempo real**. Varias personas pueden trabajar en el mismo tablero y ver los cambios de los demás al instante, sin recargar.

**Stack:** React · Node.js · Express · Socket.io · MongoDB · JWT · Docker

> [!IMPORTANT]
> **Este proyecto solo funciona en local.** No hay ninguna versión desplegada en internet: para probarlo tienes que descargarlo y ejecutarlo en tu ordenador. Mira [Cómo probarlo](#cómo-probarlo); en unos minutos lo tienes funcionando.

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

## Cómo probarlo

TaskFlow **no está alojado en ningún servidor**: se ejecuta en tu propio ordenador y solo es accesible desde él (`localhost`). Puedes probarlo de dos formas.

### Requisitos

| Necesitas | Opción A: Node.js (recomendada) | Opción B: Docker |
|---|---|---|
| [Node.js](https://nodejs.org) **20 o superior** (incluye npm) | ✅ | — |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | — | ✅ |
| [Git](https://git-scm.com), o bien descargar el ZIP desde GitHub (*Code → Download ZIP*) | ✅ | ✅ |
| Conexión a internet la primera vez | ✅ (descarga ~800 MB de MongoDB) | ✅ (descarga las imágenes) |
| Instalar MongoDB | ❌ No hace falta | ❌ No hace falta |

Funciona en Windows, macOS y Linux. Comprueba tu versión de Node con `node -v`.

### Opción A: con Node.js (recomendada, incluye datos de ejemplo)

```bash
git clone https://github.com/IviDev02/taskflow.git
cd taskflow
npm install
npm run dev
```

Abre **http://localhost:5173** (si ese puerto está ocupado, Vite usará otro y lo mostrará en la terminal) y entra con la cuenta demo:

- **Email:** `demo@taskflow.dev`
- **Contraseña:** `demo12345`

La API arranca un **MongoDB en memoria** automáticamente, así que no tienes que instalar ni configurar ninguna base de datos. La primera vez tarda un poco porque descarga el binario de MongoDB (~800 MB). Ten en cuenta que **los datos se borran al parar el servidor** (`Ctrl + C`).

**Para probar el tiempo real**, abre la app en dos navegadores distintos (o en una ventana normal y otra de incógnito), entra con dos cuentas distintas e invita a la segunda al tablero. Los cambios que hagas en una ventana aparecerán al instante en la otra.

Si prefieres que los datos se conserven, apunta a un MongoDB propio (local o MongoDB Atlas):

```bash
MONGO_URI="mongodb+srv://..." npm run dev
```

### Opción B: con Docker

```bash
git clone https://github.com/IviDev02/taskflow.git
cd taskflow
cp .env.example .env      # y cambia JWT_SECRET
docker compose up --build
```

Abre **http://localhost:8080**. Levanta MongoDB, la API y la web, con Nginx como proxy de `/api` y de los WebSockets. Aquí los datos sí se conservan entre reinicios, pero la base de datos empieza vacía: crea una cuenta desde la pantalla de registro.

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
