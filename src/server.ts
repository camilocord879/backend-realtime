import http from "http";
import { Server } from "socket.io";

import app from "./app";
import { setupSockets } from "./socket";

const PORT = process.env.PORT || 4000;

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

setupSockets(io);

server.listen(PORT, () => {
  console.log(`Realtime server running on port ${PORT}`);
});