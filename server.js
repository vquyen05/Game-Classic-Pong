const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname + "/public"));

let rooms = {}; // { roomId: { players: {}, ball: {}, status: 'waiting'/'playing' } }
const canvasWidth = 600;
const canvasHeight = 400;
const WIN_SCORE = 5;
const INITIAL_BALL_SPEED = 5;      // Tốc độ ban đầu của bóng
const SPEED_MULTIPLIER = 1.05;      // Hệ số nhân tốc độ sau mỗi lần chạm
const MAX_BALL_SPEED = 30;        // Giới hạn tốc độ tối đa của bóng

// Tạo ID phòng ngẫu nhiên
function generateRoomId() {
  return Math.random().toString(36).substr(2, 6).toUpperCase();
}

// Khởi tạo phòng mới
function createRoom(roomId) {
  const room = {
    players: {},
    ball: { x: canvasWidth / 2, y: canvasHeight / 2, dx: 0, dy: 0, radius: 8 },
    status: 'waiting',
    rematchSet: new Set()
  };
  rooms[roomId] = room;
  return room;
}

// Khi có client kết nối
io.on("connection", (socket) => {
  console.log("🟢", socket.id, "connected");
  let currentRoom = null;

  // Xử lý tạo phòng mới
  socket.on("createRoom", (playerName) => {
    const roomId = generateRoomId();
    currentRoom = createRoom(roomId);
    socket.join(roomId);
    currentRoom.players[socket.id] = { y: 200, score: 0, name: playerName };
    socket.emit("roomCreated", { roomId });
  });

  // Xử lý tham gia phòng
  socket.on("joinRoom", ({ roomId, playerName }) => {
    const room = rooms[roomId];
    if (!room) {
      socket.emit("error", "Phòng không tồn tại!");
      return;
    }
    if (Object.keys(room.players).length >= 2) {
      socket.emit("error", "Phòng đã đầy!");
      return;
    }

    socket.join(roomId);
    currentRoom = room;
    room.players[socket.id] = { y: 200, score: 0, name: playerName };
    room.status = 'playing';
    
    // Gửi thông tin phòng cho người chơi mới
    socket.emit("roomJoined", { roomId });
    
    // Reset điểm số và vị trí bóng khi bắt đầu game mới
    resetRoom(room);

    // Sau đó mới gửi thông báo bắt đầu game cho cả phòng
    io.to(roomId).emit("gameStart", {
      players: Object.entries(room.players).map(([id, player]) => ({
        id,
        name: player.name
      }))
    });
  });

  // Xử lý tham gia ngẫu nhiên
  socket.on("joinRandom", (playerName) => {
    const availableRoom = Object.entries(rooms).find(([_, room]) => 
      room.status === 'waiting' && Object.keys(room.players).length < 2
    );

    if (availableRoom) {
      const [roomId, room] = availableRoom;
      socket.join(roomId);
      currentRoom = room;
      room.players[socket.id] = { y: 200, score: 0, name: playerName };
      room.status = 'playing';
      
      // Gửi thông tin phòng cho người chơi mới
      socket.emit("roomJoined", { roomId });

      // Reset phòng và bắt đầu game
      resetRoom(room);
      
      // Thông báo bắt đầu game cho cả phòng
      io.to(roomId).emit("gameStart", {
        players: Object.entries(room.players).map(([id, player]) => ({
          id,
          name: player.name
        }))
      });
    } else {
      // Tạo phòng mới nếu không có phòng trống
      const roomId = generateRoomId();
      currentRoom = createRoom(roomId);
      socket.join(roomId);
      currentRoom.players[socket.id] = { y: 200, score: 0, name: playerName };
      socket.emit("roomCreated", { roomId });
    }
  });
    // Khi người chơi rời phòng chủ động
  socket.on("leaveRoom", () => {
    if (currentRoom) {
      const roomId = Object.keys(rooms).find(id => rooms[id] === currentRoom);
      if (roomId) {
        socket.leave(roomId);
        delete currentRoom.players[socket.id];
        currentRoom.rematchSet.delete(socket.id);

        const remainingPlayers = Object.keys(currentRoom.players).length;
        console.log(`👥 Còn ${remainingPlayers} người chơi trong phòng ${roomId}`);

        if (remainingPlayers === 0) {
          // Xóa phòng nếu không còn ai
          console.log(`🗑️ Xóa phòng ${roomId} vì không còn người chơi`);
          delete rooms[roomId];
        } else if (remainingPlayers === 1) {
          // Thông báo cho người chơi còn lại
          io.to(roomId).emit("playerLeft", "Đối thủ đã rời phòng!");
        }
      }
      currentRoom = null;
    }
  });

  // Khi người chơi ngắt kết nối
  socket.on("disconnect", () => {
    if (currentRoom) {
      const roomId = Object.keys(rooms).find(id => rooms[id] === currentRoom);
      if (roomId) {
        delete currentRoom.players[socket.id];
        currentRoom.rematchSet.delete(socket.id);
        
        const remainingPlayers = Object.keys(currentRoom.players).length;
        console.log(`👥 Còn ${remainingPlayers} người chơi trong phòng ${roomId}`);

        if (remainingPlayers === 0) {
          // Xóa phòng nếu không còn ai
          console.log(`🗑️ Xóa phòng ${roomId} vì không còn người chơi`);
          delete rooms[roomId];
        } else if (remainingPlayers === 1) {
          // Thông báo cho người chơi còn lại
          io.to(roomId).emit("playerLeft", "Đối thủ đã rời phòng!");
        }
      }
    }
    console.log("🔴", socket.id, "disconnected");
  });
});

// Khởi động server
server.listen(3000, () => {
  console.log("✅ Server running at http://localhost:3000");
});
// Vòng lặp cập nhật bóng & gửi dữ liệu cho client
setInterval(() => {
  // Cập nhật từng phòng
  for (const [roomId, room] of Object.entries(rooms)) {
    const ids = Object.keys(room.players);
    if (ids.length < 2 || room.status !== 'playing') continue;

    const playerLeft = room.players[ids[0]];
    const playerRight = room.players[ids[1]];
    const ball = room.ball;

    // Kiểm tra game over
    const isGameOver = playerLeft.score >= WIN_SCORE || playerRight.score >= WIN_SCORE;

    // Nếu game chưa kết thúc thì mới cập nhật vị trí bóng
    if (!isGameOver) {
      ball.x += ball.dx;
      ball.y += ball.dy;

      // Va chạm cạnh trên/dưới
      if (ball.y + ball.radius > canvasHeight || ball.y - ball.radius < 0) {
        ball.dy *= -1;
      }

      // Paddle trái
      if (
        ball.x - ball.radius < 30 &&
        ball.y > playerLeft.y - 40 &&
        ball.y < playerLeft.y + 40
      ) {
  // Tăng tốc độ bóng lên 1.1 lần nhưng không vượt quá MAX_BALL_SPEED
  ball.speed = Math.min(ball.speed * SPEED_MULTIPLIER, MAX_BALL_SPEED);

        // Tính toán góc mới ngẫu nhiên (từ -30 đến 30 độ)
        const deflectionAngle = (Math.random() * 60 - 30) * Math.PI / 180;
        // Sau khi va chạm paddle trái, bóng phải bật sang phải -> baseAngle = 0 (0 radian)
        const baseAngle = 0; // hướng sang phải

        // Tính toán vector vận tốc mới (đảm bảo dx > 0)
        ball.dx = ball.speed * Math.cos(baseAngle + deflectionAngle);
        ball.dy = ball.speed * Math.sin(baseAngle + deflectionAngle);

        // Đặt bóng ra ngoài paddle 1px để tránh va chạm liên tiếp
        ball.x = 30 + ball.radius + 1;
      }

      // Paddle phải
      if (
        ball.x + ball.radius > canvasWidth - 30 &&
        ball.y > playerRight.y - 40 &&
        ball.y < playerRight.y + 40
      ) {
  // Tăng tốc độ bóng lên 1.1 lần nhưng không vượt quá MAX_BALL_SPEED
  ball.speed = Math.min(ball.speed * SPEED_MULTIPLIER, MAX_BALL_SPEED);

        // Tính toán góc mới ngẫu nhiên (từ -30 đến 30 độ)
        const deflectionAngle = (Math.random() * 60 - 30) * Math.PI / 180;
        // Sau khi va chạm paddle phải, bóng phải bật sang trái -> baseAngle = Math.PI
        const baseAngle = Math.PI; // hướng sang trái

        // Tính toán vector vận tốc mới (đảm bảo dx < 0)
        ball.dx = ball.speed * Math.cos(baseAngle + deflectionAngle);
        ball.dy = ball.speed * Math.sin(baseAngle + deflectionAngle);

        // Đặt bóng ra ngoài paddle 1px để tránh va chạm liên tiếp
        ball.x = canvasWidth - 30 - ball.radius - 1;
      }

      // Nếu bóng ra khỏi biên ngang
      if (ball.x < 0) {
        playerRight.score++;
        io.to(roomId).emit("message", `🏓 ${playerRight.name} ghi điểm!`);
        resetBall(room, -1); // Bóng bay về phía người thua điểm (bên trái)
      } else if (ball.x > canvasWidth) {
        playerLeft.score++;
        io.to(roomId).emit("message", `🏓 ${playerLeft.name} ghi điểm!`);
        resetBall(room, 1); // Bóng bay về phía người thua điểm (bên phải)
      }

      // Kiểm tra thắng cuộc
      if (playerLeft.score >= WIN_SCORE || playerRight.score >= WIN_SCORE) {
        const winner = playerLeft.score >= WIN_SCORE ? playerLeft.name : playerRight.name;
        io.to(roomId).emit("gameOver", { winner });
        // Đặt bóng về giữa và dừng lại
        ball.x = canvasWidth / 2;
        ball.y = canvasHeight / 2;
        ball.dx = 0;
        ball.dy = 0;
      }
    }

    // Gửi dữ liệu cập nhật cho client trong phòng
    io.to(roomId).emit("update", { players: room.players, ball });
  }
}, 30);
