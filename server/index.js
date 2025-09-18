const { Server } = require("socket.io");

const io = new Server(8000, {
  cors: true,
});

// Maps to track user data
const emailToSocketIdMap = new Map();
const socketidToEmailMap = new Map();
const socketIdToRoomMap = new Map(); // NEW: Tracks which room a socket is in

io.on("connection", (socket) => {
  console.log(`Socket Connected`, socket.id);

  // Handle user joining a room
  socket.on("room:join", (data) => {
    const { email, room } = data;
    emailToSocketIdMap.set(email, socket.id);
    socketidToEmailMap.set(socket.id, email);
    socketIdToRoomMap.set(socket.id, room); // NEW: Store the room for this user
    io.to(room).emit("user:joined", { email, id: socket.id });
    socket.join(room);
    io.to(socket.id).emit("room:join", data);
  });

  // Handle WebRTC signaling (no changes here)
  socket.on("user:call", ({ to, offer }) => {
    io.to(to).emit("incomming:call", { from: socket.id, offer });
  });

  socket.on("call:accepted", ({ to, ans }) => {
    io.to(to).emit("call:accepted", { from: socket.id, ans });
  });

  socket.on("peer:nego:needed", ({ to, offer }) => {
    io.to(to).emit("peer:nego:needed", { from: socket.id, offer });
  });

  socket.on("peer:nego:done", ({ to, ans }) => {
    io.to(to).emit("peer:nego:final", { from: socket.id, ans });
  });

  // NEW: Handle user explicitly leaving the call
  socket.on("user:leave", ({ roomId }) => {
    socket.to(roomId).emit("user:left");
  });

  // NEW: Handle user disconnecting (e.g., closing the tab)
  socket.on("disconnect", () => {
    console.log("Socket Disconnected", socket.id);
    const email = socketidToEmailMap.get(socket.id);
    const roomId = socketIdToRoomMap.get(socket.id);

    // Notify the other user in the room
    if (roomId) {
      socket.to(roomId).emit("user:left");
    }

    // Clean up maps
    if (email) {
      emailToSocketIdMap.delete(email);
    }
    socketidToEmailMap.delete(socket.id);
    socketIdToRoomMap.delete(socket.id);
  });
});
