import { Server, Socket } from "socket.io";

export const setupSockets = (io: Server) => {

  io.on("connection", (socket: Socket) => {

    console.log(`User connected: ${socket.id}`);

    // JOIN ROOM
    socket.on("join-room", async (roomId: string) => {

      try {

        socket.join(roomId);

        console.log(`${socket.id} joined room ${roomId}`);

        socket.to(roomId).emit("user-joined", {
          socketId: socket.id
        });

      } catch (error) {

        console.error(error);

        socket.emit("room-error", {
          message: "Error joining room"
        });

      }

    });

    // LEAVE ROOM
    socket.on("leave-room", (roomId: string) => {

      socket.leave(roomId);

      console.log(`${socket.id} left room ${roomId}`);

    });

    // DISCONNECT
    socket.on("disconnect", () => {

      console.log(`Disconnected: ${socket.id}`);

    });

  });

};