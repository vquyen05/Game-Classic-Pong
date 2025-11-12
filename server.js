const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname + "/public"));
let rooms ={}; //{ roomId: { player: {}, ball: {},status: 'waiting'/'playing}}
Const canvasWidth = 600;
const canvasHeight = 400;
const Win_SCORE = 5;// Tốc độ ban đầu của bóng
const INITIAL_BALL-SPEED =5;
const SPEED_MULTIPLIER = 1.05;// Hệ số nhân tốc độ sau mỗi lần chạm
const MAX_BALL_SPEED = 30;// Giới hạn tốc độ tối đa của bóng

