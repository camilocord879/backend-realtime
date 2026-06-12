import express from "express";
import http from "http";
import { Server, Socket } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const API_URL = process.env.API_URL || "http://localhost:3000";

const CLIENT_URL = process.env.CLIENT_URL || "*";

const io = new Server(server, {
  cors: {
    origin: CLIENT_URL === "*" ? "*" : [CLIENT_URL, "http://localhost:5173"],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

io.on("connection", (socket: Socket) => {
  console.log("Usuario conectado:", socket.id);

  socket.on("join-room", (roomId: string) => {
    socket.join(roomId);
    console.log(`Usuario unido a sala ${roomId}`);
    io.to(roomId).emit("user-joined", { socketId: socket.id });
  });

  socket.on("leave-room", (roomId: string) => {

    socket.leave(roomId);

    console.log(`Usuario salió de sala ${roomId}`);

  });

  socket.on("send-message", async (data: { roomId: string; content: string; token: string }) => {

    const { roomId, content, token } = data;

    if (!roomId || !content || !content.trim()) {
      socket.emit("message-error", { message: "El contenido del mensaje es requerido." });
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ roomId, content: content.trim() }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        socket.emit("message-error", { message: (errorBody as any).error || "Error al guardar mensaje." });
        return;
      }

      const message = await response.json();

      io.to(roomId).emit("new-message", message);

    } catch (error) {
      console.error("Error al enviar mensaje:", error);
      socket.emit("message-error", { message: "Error interno al enviar mensaje." });
    }

  });

  socket.on("disconnect", () => {
    console.log("Usuario desconectado");
  });
});

app.get("/", (_req, res) => {
  res.json({
    message: "Realtime backend funcionando"
  });
});

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log(`Realtime server running on port ${PORT}`);
});

app.get("/ping", (_req, res) => {
  res.json({
    status: "ok",
    socket: true
  });
});