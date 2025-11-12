const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname + "/public"));

const rooms = {}; // lưu danh sách phòng

io.on("connection", (socket) => {
  console.log("🟢 Client connected:", socket.id);

  // 🏠 Tạo phòng mới
  socket.on("createRoom", (playerName) => {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    rooms[roomId] = { players: {}, status: "waiting" };
    rooms[roomId].players[socket.id] = { name: playerName, score: 0 };
    socket.join(roomId);
    socket.emit("roomCreated", { roomId });
    console.log(`${playerName} đã tạo phòng ${roomId}`);
  });

  // 🚪 Tham gia phòng
  socket.on("joinRoom", ({ roomId, playerName }) => {
    const room = rooms[roomId];
    if (!room) return socket.emit("error", "❌ Phòng không tồn tại!");
    if (Object.keys(room.players).length >= 2)
      return socket.emit("error", "⚠️ Phòng đã đầy!");

    room.players[socket.id] = { name: playerName, score: 0 };
    socket.join(roomId);
    io.to(roomId).emit("roomJoined", { roomId });
    console.log(`${playerName} đã vào phòng ${roomId}`);
  });

  // 🎲 Tham gia ngẫu nhiên
  socket.on("joinRandom", (playerName) => {
    let availableRoom = Object.keys(rooms).find(
      (id) => Object.keys(rooms[id].players).length === 1
    );

    if (!availableRoom) {
      const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
      rooms[newRoomId] = { players: {}, status: "waiting" };
      rooms[newRoomId].players[socket.id] = { name: playerName, score: 0 };
      socket.join(newRoomId);
      socket.emit("roomCreated", { roomId: newRoomId });
      console.log(`${playerName} đã tạo phòng ${newRoomId}`);
    } else {
      rooms[availableRoom].players[socket.id] = { name: playerName, score: 0 };
      socket.join(availableRoom);
      io.to(availableRoom).emit("roomJoined", { roomId: availableRoom });
      console.log(`${playerName} đã vào phòng ngẫu nhiên ${availableRoom}`);
    }
  });

  // 🔴 Người chơi rời phòng
  socket.on("disconnect", () => {
    for (const [roomId, room] of Object.entries(rooms)) {
      if (room.players[socket.id]) {
        delete room.players[socket.id];
        io.to(roomId).emit("playerLeft", "❌ Người chơi đã rời phòng!");
        if (Object.keys(room.players).length === 0) delete rooms[roomId];
        console.log(`🔴 Người chơi ${socket.id} rời phòng ${roomId}`);
        break;
      }
    }
  });
});

const PORT = 3000;
server.listen(PORT, () =>
  console.log(`🚀 Server chạy tại http://localhost:${PORT}`)
);
