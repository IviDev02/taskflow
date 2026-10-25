# TaskFlow

Gestor de tareas colaborativo con **tableros kanban en tiempo real**. Varias personas pueden trabajar en el mismo tablero y ver los cambios de los demás al instante, sin recargar.

**Stack:** React · Node.js · Express · Socket.io · MongoDB · JWT · Docker

> [!IMPORTANT]
> **Este proyecto funciona en local.** Es un proyecto personal, así que no hay ninguna versión desplegada en internet: para usarlo tienes que descargarlo y ejecutarlo en tu ordenador. Es gratis y en unos minutos lo tienes funcionando.
>
> - [Instalarlo y usarlo](#instalarlo-y-usarlo): requisitos, puesta en marcha y uso diario (tus datos se guardan).
> - [Usarlo con más personas](#usarlo-con-más-personas): cómo compartirlo con tu equipo, en tu misma red o desde otras casas.

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
client/   React 19 + Vite + React Router — SPA servida por Express (npm start) o Nginx (Docker)
server/   Express 5 + Mongoose + Socket.io — API REST + WebSockets
          ├─ routes/      auth, boards, tasks (validación con Zod)
          ├─ realtime.js  salas por tablero y por usuario, presencia
          └─ test/        tests de integración (API + sockets)
```

- La API emite los eventos después de cada cambio en la base de datos, a la sala `board:<id>` (cambios del tablero) o `user:<id>` (notificaciones personales).
- El orden de las tareas se guarda como `position` por columna. Al mover una tarea, el servidor renumera solo las columnas afectadas con un `bulkWrite`.
- Los permisos se comprueban en cada petición: un usuario que no es miembro recibe `404`, para no revelar que el tablero existe.

## Instalarlo y usarlo

Al ser un proyecto personal, TaskFlow **no está alojado en ningún servidor**: se ejecuta en tu propio ordenador. Mientras esté en marcha, puedes usarlo desde el navegador como cualquier otra web, y [también compartirlo con otras personas](#usarlo-con-más-personas).

### Requisitos

| Necesitas | Con Node.js (recomendado) | Con Docker |
|---|---|---|
| [Node.js](https://nodejs.org) **20 o superior** (incluye npm) | ✅ | — |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | — | ✅ |
| [Git](https://git-scm.com), o bien descargar el ZIP desde GitHub (*Code → Download ZIP*) | ✅ | ✅ |
| Conexión a internet la primera vez | ✅ (descarga ~800 MB de MongoDB) | ✅ (descarga las imágenes) |
| Instalar MongoDB | ❌ No hace falta | ❌ No hace falta |

Funciona en Windows, macOS y Linux. Comprueba tu versión de Node con `node -v`.

### Instalación (solo la primera vez)

Abre una terminal (en Windows, *PowerShell* o *Símbolo del sistema*) y ejecuta:

```bash
git clone https://github.com/IviDev02/taskflow.git
cd taskflow
npm install
```

`npm install` tarda unos minutos porque, además de las dependencias, descarga MongoDB (~800 MB). Solo pasa la primera vez.

### Arrancarlo

Dentro de la carpeta `taskflow`:

```bash
npm start
```

Cuando veas `✔ TaskFlow en http://localhost:4000`, abre **http://localhost:4000** en el navegador. Arranca en unos segundos.

Puedes crear tu propia cuenta desde la pantalla de registro o entrar con la **cuenta demo**, que ya trae un tablero de ejemplo:

- **Email:** `demo@taskflow.dev`
- **Contraseña:** `demo12345`

Para **pararlo**, vuelve a la terminal y pulsa `Ctrl + C`, o simplemente ciérrala. Mientras esté parado, la web no funciona.

### ¿Se guardan mis datos?

**Sí.** Puedes cerrarlo y volver a abrirlo todas las veces que quieras: tus cuentas, tableros y tareas siguen ahí. No hace falta instalar MongoDB: la app arranca su propio MongoDB y guarda los datos en la carpeta **`server/data/`** del proyecto. Aunque se cierre de golpe o se apague el ordenador, al volver a arrancar recupera los datos.

| Quiero… | Cómo |
|---|---|
| **Hacer una copia de seguridad** | Para TaskFlow y copia la carpeta `server/data/` a otro sitio. Para restaurarla, vuelve a ponerla en su lugar. |
| **Empezar de cero** (borrar todo) | Para TaskFlow y ejecuta `npm run reset`. Al arrancar de nuevo se vuelve a crear la cuenta demo. |
| **Actualizar a la última versión** | `git pull` y después `npm install`. Tus datos no se tocan. |

> [!WARNING]
> No borres la carpeta `server/data/` si no quieres perder tus datos: es tu base de datos.

### Uso diario

1. Abre una terminal en la carpeta `taskflow` y ejecuta `npm start`.
2. Entra en **http://localhost:4000** (te recomiendo guardarlo en marcadores).
3. Cuando termines, pulsa `Ctrl + C` en la terminal.

La sesión dura 7 días, así que no tendrás que iniciar sesión cada vez.

### Con Docker (alternativa)

Si prefieres no instalar Node.js y ya tienes Docker Desktop:

```bash
git clone https://github.com/IviDev02/taskflow.git
cd taskflow
cp .env.example .env      # y cambia JWT_SECRET por un texto largo y aleatorio
docker compose up --build -d
```

Abre **http://localhost:8080**. Levanta MongoDB, la API y la web, con Nginx como proxy de `/api` y de los WebSockets. Los datos se guardan en un volumen de Docker (`mongo-data`) y se conservan entre reinicios. Aquí la base de datos empieza vacía, sin cuenta demo: crea una cuenta desde la pantalla de registro. Para pararlo: `docker compose down` (sin `-v`, o borrarás los datos).

### Modo desarrollo

Si quieres modificar el código, `npm run dev` arranca la API y Vite con recarga automática. Entra en **http://localhost:5173** (si ese puerto está ocupado, Vite usará otro y lo mostrará en la terminal). Usa la misma carpeta `server/data/` que `npm start`.

```bash
npm run dev     # desarrollo con recarga automática
npm test        # tests
```

Los tests son de integración, con `node:test`, Supertest y `socket.io-client`, y usan un MongoDB en memoria aparte, así que no tocan tus datos. Cubren autenticación, permisos, tableros, tareas, reordenación y eventos en tiempo real.

## Usarlo con más personas

TaskFlow está pensado para trabajar en equipo. Así funciona cuando lo compartes:

- **Una persona hace de anfitrión**: es quien tiene TaskFlow instalado y en marcha (`npm start`). Todos los datos se guardan en su ordenador.
- **El resto solo necesita un navegador**: no instalan nada (salvo en la [opción 2](#opción-2-personas-en-otras-casas-con-tailscale-recomendado)). Entran con una dirección que les pasa el anfitrión.
- **El ordenador del anfitrión tiene que estar encendido**, con TaskFlow en marcha, mientras los demás lo usan. Si lo apaga, los demás no podrán entrar hasta que lo vuelva a arrancar (sin perder nada).

### Cómo invitar a alguien a un tablero

Da igual la opción que elijas para conectaros; dentro de la app siempre se hace así:

1. Cada persona entra en la dirección que le ha pasado el anfitrión y **se crea su propia cuenta** desde la pantalla de registro.
2. El propietario del tablero abre el tablero y **la invita con el email** con el que se ha registrado. La invitación solo funciona si esa persona ya tiene cuenta, así que el paso 1 va primero.
3. A la persona invitada le llega una notificación y el tablero le aparece en su lista. A partir de ahí, lo que haga cualquiera se ve al instante en las pantallas de los demás.

> [!CAUTION]
> La contraseña de la cuenta demo es pública (está en este README). **No la uses para datos reales** cuando compartas TaskFlow: que cada persona use su propia cuenta.

### Opción 1: misma red (casa, oficina, misma Wi-Fi)

La más sencilla. Sirve cuando todos estáis conectados al mismo router.

1. El anfitrión arranca TaskFlow con `npm start`. En la terminal verá algo así:

   ```
   ✔ TaskFlow en http://localhost:4000
     En tu red: http://192.168.1.35:4000
   ```

2. Pasa la dirección de **"En tu red"** a los demás. La abren en su navegador (también funciona en el móvil).
3. **Si no carga**, casi siempre es el cortafuegos:
   - **Windows:** la primera vez que arrancas TaskFlow, Windows pregunta si quieres permitir el acceso a *Node.js*. Marca **Redes privadas** y pulsa *Permitir*. Si ya lo rechazaste, ve a *Seguridad de Windows → Firewall y protección de red → Permitir una aplicación a través del firewall* y activa *Node.js* para redes privadas. Comprueba también que tu Wi-Fi está configurada como **red privada** (*Configuración → Red e Internet → Wi-Fi → tu red → Tipo de perfil de red: Privada*).
   - **macOS:** acepta el aviso de *¿Permitir conexiones entrantes a "node"?* o actívalo en *Ajustes del Sistema → Red → Firewall → Opciones*.
   - Asegúrate de que todos estáis en la **misma red** (una red de invitados o un móvil con datos no sirven).

> La dirección (`192.168.x.x`) la asigna tu router y puede cambiar algún día. Si deja de funcionar, mira la nueva en la terminal al arrancar.

### Opción 2: personas en otras casas, con Tailscale (recomendado)

[Tailscale](https://tailscale.com) crea una red privada entre vuestros dispositivos a través de internet, como si estuvierais en la misma Wi-Fi. Es gratis para uso personal y es la forma más segura: **solo las personas que invites pueden llegar a TaskFlow**, nadie más en internet.

**El anfitrión:**

1. Instala Tailscale desde [tailscale.com/download](https://tailscale.com/download) e inicia sesión (con Google, Microsoft, GitHub…).
2. En la app de Tailscale verás la dirección de tu ordenador, del estilo **`100.101.102.103`**.
3. Entra en el panel [login.tailscale.com/admin/machines](https://login.tailscale.com/admin/machines), pulsa los tres puntos junto a tu ordenador → **Share…** y genera un enlace de invitación. Mándaselo a las personas con las que quieras compartirlo.
4. Arranca TaskFlow con `npm start` y permite el acceso en el cortafuegos si te lo pide (ver la opción 1).

**Cada invitado:**

1. Instala Tailscale en su ordenador o móvil e inicia sesión con su propia cuenta.
2. Abre el enlace de invitación que le ha mandado el anfitrión y lo acepta.
3. Entra en el navegador en **`http://100.101.102.103:4000`** (la dirección de Tailscale del anfitrión, con `:4000` al final).

Mientras el ordenador del anfitrión esté encendido con TaskFlow en marcha, los invitados pueden entrar desde cualquier sitio.

### Opción 3: enlace público rápido, con Cloudflare Tunnel

Si no quieres que los demás instalen nada, [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/do-more-with-tunnels/trycloudflare/) te da un enlace `https://` público hacia tu TaskFlow, sin cuenta y sin tocar el router. Es ideal para una sesión puntual.

1. El anfitrión instala `cloudflared`:
   - **Windows:** `winget install --id Cloudflare.cloudflared`
   - **macOS:** `brew install cloudflared`
   - **Linux:** descárgalo desde la [página de descargas](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/).
2. Con TaskFlow en marcha (`npm start`), abre **otra** terminal y ejecuta:

   ```bash
   cloudflared tunnel --url http://localhost:4000
   ```

3. Al cabo de unos segundos aparece un enlace como `https://palabras-al-azar.trycloudflare.com`. Pásaselo a los demás: funciona desde cualquier navegador.

Ten en cuenta que:

- **El enlace cambia cada vez** que vuelves a lanzar el comando, y deja de funcionar al cerrar esa terminal.
- **Cualquiera que tenga el enlace puede abrir la app y registrarse.** Solo verá los tableros a los que le invites, pero no lo publiques en abierto.

### Opción 4: alojarlo en internet gratis (Render + MongoDB Atlas)

Si queréis usarlo a diario sin depender de que el ordenador del anfitrión esté encendido, puedes subirlo a internet sin pagar nada. Es la opción más trabajosa de montar.

**1. Base de datos en MongoDB Atlas (gratis)**

1. Crea una cuenta en [mongodb.com/atlas](https://www.mongodb.com/atlas) y crea un clúster **M0 (Free)**.
2. En *Database Access*, crea un usuario con contraseña (evita símbolos raros en la contraseña para no tener que escaparlos).
3. En *Network Access*, añade la IP `0.0.0.0/0` (necesario porque Render no tiene una IP fija).
4. En *Connect → Drivers*, copia la cadena de conexión y añade el nombre de la base de datos (`/taskflow`) antes del `?`:
   `mongodb+srv://usuario:contraseña@cluster0.xxxxx.mongodb.net/taskflow?retryWrites=true&w=majority`

**2. La app en Render (gratis)**

1. Haz un *fork* de este repositorio en tu cuenta de GitHub.
2. Crea una cuenta en [render.com](https://render.com) con tu GitHub y pulsa **New → Web Service**. Elige tu fork.
3. Rellena la configuración:

   | Campo | Valor |
   |---|---|
   | Runtime | `Node` |
   | Build Command | `npm install --include=dev && npm run build` |
   | Start Command | `npm start -w server` |
   | Instance Type | `Free` |

4. En **Environment Variables**, añade:

   | Variable | Valor |
   |---|---|
   | `NODE_ENV` | `production` |
   | `MONGO_URI` | la cadena de conexión de Atlas del paso anterior |
   | `JWT_SECRET` | un texto largo y aleatorio (genera uno con `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) |
   | `MONGOMS_DISABLE_POSTINSTALL` | `1` (evita descargar el MongoDB local, que en Render no hace falta, y acelera el despliegue) |

5. Pulsa **Create Web Service**. Cuando termine, Render te da una dirección como `https://taskflow-xxxx.onrender.com`. Esa es la que compartes.

Ten en cuenta que:

- En el plan gratuito, **el servidor se duerme tras unos 15 minutos sin visitas**. La primera persona que entre después esperará entre 30 y 60 segundos a que despierte; luego va normal.
- La base de datos de Atlas empieza vacía, sin cuenta demo: cada persona se registra.
- Cualquiera con la dirección puede registrarse, pero solo ve los tableros a los que le invitan.

### ¿Qué opción elijo?

| Situación | Opción |
|---|---|
| Todos estáis en la misma casa u oficina | [1. Misma red](#opción-1-misma-red-casa-oficina-misma-wi-fi) |
| Equipo pequeño en distintos sitios, uso habitual | [2. Tailscale](#opción-2-personas-en-otras-casas-con-tailscale-recomendado) |
| Enseñárselo a alguien un rato, sin que instale nada | [3. Cloudflare Tunnel](#opción-3-enlace-público-rápido-con-cloudflare-tunnel) |
| Que esté disponible siempre, sin depender de tu ordenador | [4. Render + Atlas](#opción-4-alojarlo-en-internet-gratis-render--mongodb-atlas) |

## Variables de entorno (API)

Ninguna es obligatoria para usarlo en local. Puedes definirlas antes del comando (`PORT=5000 npm start` en macOS/Linux, o `$env:PORT=5000; npm start` en PowerShell).

| Variable | Por defecto | Descripción |
|---|---|---|
| `PORT` | `4000` | Puerto del servidor |
| `MONGO_URI` | *(vacío → MongoDB propio con los datos en `DATA_DIR`)* | Cadena de conexión de un MongoDB externo |
| `DATA_DIR` | `server/data` | Carpeta donde se guardan los datos cuando no hay `MONGO_URI` |
| `JWT_SECRET` | *(se genera solo y se guarda en `DATA_DIR`)* | Secreto para firmar los tokens (**obligatorio con `NODE_ENV=production`**) |
| `JWT_EXPIRES_IN` | `7d` | Caducidad de la sesión |
| `CLIENT_ORIGIN` | `http://localhost:5173` | Origen permitido por CORS (solo afecta si la web y la API están en dominios distintos) |

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
