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

// Track active users per room: Map<roomId, Map<socketId, username>>
const roomParticipants = new Map<string, Map<string, string>>();

function getRoomUsers(roomId: string): { socketId: string; username: string }[] {
  const map = roomParticipants.get(roomId);
  if (!map) return [];
  return Array.from(map.entries()).map(([socketId, username]) => ({ socketId, username }));
}

io.on("connection", (socket: Socket) => {
  console.log("Usuario conectado:", socket.id);

  socket.on("join-room", (data: string | { roomId: string; username?: string }) => {
    // Support both old format (string) and new format ({roomId, username})
    const roomId = typeof data === "string" ? data : data.roomId;
    const username = typeof data === "string" ? "Anónimo" : (data.username || "Anónimo");

    socket.join(roomId);
    console.log(`${username} (${socket.id}) unido a sala ${roomId}`);

    // Track participant presence with username
    if (!roomParticipants.has(roomId)) {
      roomParticipants.set(roomId, new Map());
    }
    roomParticipants.get(roomId)!.set(socket.id, username);

    // Notify others that a new user joined (with username)
    socket.to(roomId).emit("user-joined", { socketId: socket.id, username });

    // Send updated participants list to everyone in the room
    io.to(roomId).emit("room:participants", {
      roomId,
      participants: getRoomUsers(roomId),
    });
  });

  socket.on("leave-room", (roomId: string) => {
    socket.leave(roomId);
    console.log(`Usuario salió de sala ${roomId}`);

    // Remove from participants tracking
    const participants = roomParticipants.get(roomId);
    if (participants) {
      participants.delete(socket.id);
      if (participants.size === 0) {
        roomParticipants.delete(roomId);
      }
    }

    // Notify remaining users
    socket.to(roomId).emit("user-left", { socketId: socket.id });
    io.to(roomId).emit("room:participants", {
      roomId,
      participants: getRoomUsers(roomId),
    });
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

  // ─── WebRTC Signaling ───────────────────────────────────────────

  // Relay offer to a specific peer or to the room
  socket.on("webrtc:offer", ({ roomId, offer, to }: { roomId: string; offer: unknown; to?: string }) => {
    console.log(`[WebRTC] Offer from ${socket.id} in room ${roomId}${to ? ` to ${to}` : ""}`);
    if (to) {
      io.to(to).emit("webrtc:offer", { offer, from: socket.id });
    } else {
      socket.to(roomId).emit("webrtc:offer", { offer, from: socket.id });
    }
  });

  // Relay answer to a specific peer or to the room
  socket.on("webrtc:answer", ({ roomId, answer, to }: { roomId: string; answer: unknown; to?: string }) => {
    console.log(`[WebRTC] Answer from ${socket.id} in room ${roomId}${to ? ` to ${to}` : ""}`);
    if (to) {
      io.to(to).emit("webrtc:answer", { answer, from: socket.id });
    } else {
      socket.to(roomId).emit("webrtc:answer", { answer, from: socket.id });
    }
  });

  // Relay ICE candidates to a specific peer or to the room
  socket.on("webrtc:ice-candidate", ({ roomId, candidate, to }: { roomId: string; candidate: unknown; to?: string }) => {
    if (to) {
      io.to(to).emit("webrtc:ice-candidate", { candidate, from: socket.id });
    } else {
      socket.to(roomId).emit("webrtc:ice-candidate", { candidate, from: socket.id });
    }
  });

  // ─── AV Stream Synchronization ─────────────────────────────────────

  // User started streaming (audio/video)
  socket.on("stream:start", ({ roomId }: { roomId: string }) => {
    console.log(`[Stream] ${socket.id} started streaming in room ${roomId}`);
    socket.to(roomId).emit("stream:started", { socketId: socket.id });
  });

  // User stopped streaming
  socket.on("stream:stop", ({ roomId }: { roomId: string }) => {
    console.log(`[Stream] ${socket.id} stopped streaming in room ${roomId}`);
    socket.to(roomId).emit("stream:stopped", { socketId: socket.id });
  });

  // User toggled audio/video track
  socket.on("stream:toggle-track", ({ roomId, kind, enabled }: { roomId: string; kind: "audio" | "video"; enabled: boolean }) => {
    socket.to(roomId).emit("stream:track-toggled", {
      socketId: socket.id,
      kind,
      enabled,
    });
  });

  // Heartbeat to keep connection alive during active transmission
  socket.on("stream:heartbeat", ({ roomId }: { roomId: string }) => {
    socket.to(roomId).emit("stream:heartbeat-ack", { socketId: socket.id });
  });

  // ─── Disconnect ───────────────────────────────────────────────────

  socket.on("disconnect", () => {
    console.log("Usuario desconectado:", socket.id);

    // Remove from all rooms and notify participants
    roomParticipants.forEach((participants, roomId) => {
      if (participants.has(socket.id)) {
        participants.delete(socket.id);
        socket.to(roomId).emit("user-left", { socketId: socket.id });
        io.to(roomId).emit("room:participants", {
          roomId,
          participants: getRoomUsers(roomId),
        });

        if (participants.size === 0) {
          roomParticipants.delete(roomId);
        }
      }
    });
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