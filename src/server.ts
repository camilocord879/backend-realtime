import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();

app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

io.on("connection", (socket) => {

  console.log("Usuario conectado:", socket.id);

  socket.on("join-room", (roomId: string) => {

    socket.join(roomId);

    console.log(`Usuario unido a sala ${roomId}`);

    io.to(roomId).emit("user-joined", {
      socketId: socket.id,
    });

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
server.listen(4000, () => {
  console.log("Realtime server running on port 4000");
});
app.get("/ping", (_req, res) => {
  res.json({
    status: "ok",
    socket: true
  });
});