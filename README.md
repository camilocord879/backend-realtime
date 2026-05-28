# Backend Realtime — Study Room

Servidor de tiempo real para la plataforma colaborativa de estudio.

## Tecnologías

- Node.js
- TypeScript
- Socket.io
- Express

## Responsabilidades

Este servicio maneja:

- Comunicación en tiempo real
- Eventos Socket.io
- Presencia de usuarios
- Unión y salida de salas
- Señalización WebRTC (Sprint 4)
- Estados AV en tiempo real
- Compartición de pantalla (Sprint 5)

## Scripts

Instalar dependencias:

```bash
npm install
```

Modo desarrollo:

```bash
npm run dev
```

Build producción:

```bash
npm run build
```

Iniciar producción:

```bash
npm start
```

---

## Estructura

```txt
src/
 ├── socket/
 │    ├── handlers/
 │    ├── events/
 │    └── index.ts
 │
 ├── config/
 │
 ├── app.ts
 └── server.ts
```

---

## Variables de entorno

Crear archivo `.env`

```env
PORT=4000
CLIENT_URL=http://localhost:5173
```

---

## Eventos Socket.io

### join-room

Permite unirse a una sala.

### leave-room

Permite abandonar una sala.

### disconnect

Maneja desconexiones de usuarios.

---

## Deploy

Backend desplegado en Render.

---

## Futuras funcionalidades

- WebRTC signaling
- ICE candidates
- Audio/video streams
- Screen sharing
- Estados AV sincronizados
