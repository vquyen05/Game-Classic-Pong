const socket = io();

// DOM Elements
const homeScreen = document.getElementById("homeScreen");
const gameScreen = document.getElementById("gameScreen");
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const roomInfo = document.getElementById("roomInfo");
const playerNameInput = document.getElementById("playerName");
const createRoomBtn = document.getElementById("createRoom");
const joinRoomBtn = document.getElementById("joinRoom");
const randomRoomBtn = document.getElementById("randomRoom");
const roomIdInput = document.getElementById("roomId");

const gameMessageEl = document.getElementById("gameMessage");

// Read theme colors from CSS variables so canvas elements contrast with background
const rootStyles = getComputedStyle(document.documentElement);
const CANVAS_BALL_COLOR = (rootStyles.getPropertyValue('--text') || '#07203f').trim();
const CANVAS_PADDLE_COLOR = (rootStyles.getPropertyValue('--primary') || '#0b66ff').trim();

let players = {};
let ball = { x: 300, y: 200 };
let message = "";
let gameOver = false;
let currentRoom = null;

// Event Listeners
createRoomBtn.addEventListener("click", () => {
    const playerName = playerNameInput.value.trim();
    if (!playerName) {
        alert("Vui lòng nhập tên của bạn!");
        return;
    }
    socket.emit("createRoom", playerName);
});

joinRoomBtn.addEventListener("click", () => {
    const playerName = playerNameInput.value.trim();
    const roomId = roomIdInput.value.trim();
    if (!playerName || !roomId) {
        alert("Vui lòng nhập đầy đủ thông tin!");
        return;
    }
    socket.emit("joinRoom", { roomId, playerName });
});

randomRoomBtn.addEventListener("click", () => {
    const playerName = playerNameInput.value.trim();
    if (!playerName) {
        alert("Vui lòng nhập tên của bạn!");
        return;
    }
    socket.emit("joinRandom", playerName);
});
// Di chuyển paddle
document.addEventListener("mousemove", (e) => {
  if (gameOver) return;
  const rect = canvas.getBoundingClientRect();
  const posY = e.clientY - rect.top;
  socket.emit("move", posY);
});

// Socket Events
socket.on("roomCreated", ({ roomId }) => {
    // Reset game state trước khi vào phòng mới
    resetGameState();
    currentRoom = roomId;
    roomInfo.textContent = roomId;
    homeScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");
    message = "⏳ Đang chờ người chơi khác...";
    draw();
});


socket.on("roomJoined", ({ roomId }) => {
    // Reset game state trước khi vào phòng mới
    resetGameState();
    currentRoom = roomId;
    roomInfo.textContent = roomId;
    homeScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");
    message = "✅ Đã vào phòng thành công!";
    draw();
});


function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

     // 🎾 Vẽ bóng nổi bật màu đỏ
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, 11, 0, Math.PI * 2);
    ctx.shadowColor = "#ff0000ff";
    ctx.shadowBlur = 15;
    ctx.fillStyle = "#ff0000ff";
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#ff0202ff";
    ctx.stroke();

    // Vẽ paddle 
    ctx.fillStyle = CANVAS_PADDLE_COLOR;
    const ids = Object.keys(players);
    ids.forEach((id, i) => {
        const x = i === 0 ? 20 : canvas.width - 30;
        const y = players[id].y - 40;
        ctx.fillRect(x, y, 10, 80);
    });

    // (Optional) If no DOM message element, draw small message
    if (!gameMessageEl && message) {
        ctx.font = "18px Arial";
        ctx.textAlign = "center";
        ctx.fillText(message, canvas.width / 2, 30);
        ctx.textAlign = "left";
    }
}


// Hiển thị nút thoát khi game kết thúc
// Reset trạng thái game
function resetGameState(keepExitButton = false) {
    gameOver = false;
    message = "";
    // Reset players và ball
    players = {};
    ball = { x: 300, y: 200 };
    // Xóa các nút điều khiển
    const restartBtn = document.getElementById("restartBtn");
    if (restartBtn) restartBtn.remove();
    
    // Chỉ ẩn nút thoát nếu không có yêu cầu giữ lại
    if (!keepExitButton) {
        const exitBtn = document.getElementById("exitBtn");
        if (exitBtn) exitBtn.classList.add("hidden");
    }
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}
