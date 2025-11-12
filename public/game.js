const socket = io();

// DOM elements
const homeScreen = document.getElementById("homeScreen");
const gameScreen = document.getElementById("gameScreen");
const playerNameInput = document.getElementById("playerName");
const roomIdInput = document.getElementById("roomId");
const roomInfo = document.getElementById("roomInfo");
const createRoomBtn = document.getElementById("createRoom");
const joinRoomBtn = document.getElementById("joinRoom");
const randomRoomBtn = document.getElementById("randomRoom");
const gameMessageEl = document.getElementById("gameMessage");
const restartBtn = document.getElementById("restartBtn");
const exitBtn = document.getElementById("exitBtn");

let currentRoom = null;
let message = "";

// ========== NÚT ==========
createRoomBtn.addEventListener("click", () => {
  const name = playerNameInput.value.trim();
  if (!name) return alert("Vui lòng nhập tên!");
  socket.emit("createRoom", name);
});

joinRoomBtn.addEventListener("click", () => {
  const name = playerNameInput.value.trim();
  const roomId = roomIdInput.value.trim();
  if (!name || !roomId) return alert("Vui lòng nhập đầy đủ!");
  socket.emit("joinRoom", { roomId, playerName: name });
});

randomRoomBtn.addEventListener("click", () => {
  const name = playerNameInput.value.trim();
  if (!name) return alert("Vui lòng nhập tên!");
  socket.emit("joinRandom", name);
});

exitBtn.addEventListener("click", () => {
  switchToHomeScreen();
});

// ========== SỰ KIỆN SOCKET ==========
socket.on("roomCreated", ({ roomId }) => {
  currentRoom = roomId;
  roomInfo.textContent = roomId;
  switchToGameScreen("⏳ Đang chờ người chơi khác...");
});

socket.on("roomJoined", ({ roomId }) => {
  currentRoom = roomId;
  roomInfo.textContent = roomId;
  switchToGameScreen("✅ Đã vào phòng thành công!");
});

socket.on("error", (msg) => alert(msg));

socket.on("playerLeft", (msg) => {
  setGameMessage(msg);
  setTimeout(() => switchToHomeScreen(), 2000);
});

// ========== ĐIỀU HƯỚNG ==========
function switchToGameScreen(msg) {
  homeScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");
  setGameMessage(msg);
}

function switchToHomeScreen() {
  homeScreen.classList.remove("hidden");
  gameScreen.classList.add("hidden");
  currentRoom = null;
  setGameMessage("");
}

function setGameMessage(msg) {
  message = msg;
  if (gameMessageEl) gameMessageEl.textContent = msg;
}
