const socket = io();

// DOM Elements
const homeScreen = document.getElementById("homeScreen");
const gameScreen = document.getElementById("gameScreen");
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const background = new Image();
background.src = "background.jpg";
const roomInfo = document.getElementById("roomInfo");
const playerNameInput = document.getElementById("playerName");
const createRoomBtn = document.getElementById("createRoom");
const joinRoomBtn = document.getElementById("joinRoom");
const randomRoomBtn = document.getElementById("randomRoom");
const roomIdInput = document.getElementById("roomId");

// Top scoreboard elements (inside game frame)
const topLeftNameEl = document.getElementById("topLeftName");
const topLeftScoreEl = document.getElementById("topLeftScore");
const topRightNameEl = document.getElementById("topRightName");
const topRightScoreEl = document.getElementById("topRightScore");
const gameMessageEl = document.getElementById("gameMessage");

// Read theme colors from CSS variables so canvas elements contrast with background
const rootStyles = getComputedStyle(document.documentElement);
const CANVAS_BALL_COLOR = (rootStyles.getPropertyValue('--text') || '#ea3114ff').trim();
const CANVAS_PADDLE_COLOR = (rootStyles.getPropertyValue('--primary') || '#ff2c2cff').trim();

let players = {};
let ball = { x: 300, y: 200 };
let message = "";
let gameOver = false;
let currentRoom = null;