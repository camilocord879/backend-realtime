import { Server } from "socket.io";

export const setupSockets = (io: Server) => {

  io.on("connection", (socket) => {

    console.log("User connected:", socket.id);

    socket.on("join-room", (roomId: string) => {

      socket.join(roomId);

      console.log(`${socket.id} joined ${roomId}`);

      socket.to(roomId).emit("user-joined", {
        socketId: socket.id
      });

    });

    socket.on("leave-room", (roomId: string) => {

      socket.leave(roomId);

      console.log(`${socket.id} left ${roomId}`);

    });

    socket.on("disconnect", () => {

      console.log("Disconnected:", socket.id);

    });

  });

};