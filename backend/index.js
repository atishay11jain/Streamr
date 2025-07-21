const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { spawn } = require('child_process');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173"
  },
});

const activeStreams = new Map();

io.on("connection", (socket) => {
 socket.on("video-stream", (data) => {
    const { data: videoData, streamKey } = data;

    let ffmpegProcess = activeStreams.get(streamKey);
    if (!ffmpegProcess) {
      ffmpegProcess = createFFmpegProcess(streamKey, socket);
      activeStreams.set(streamKey, ffmpegProcess);
    }

    if (ffmpegProcess && ffmpegProcess.stdin.writable) {
      console.log(`Received video data for stream key: ${streamKey}`);
      ffmpegProcess.stdin.write(Buffer.from(videoData));
    }
  });

  socket.on("stop-stream", (data) => {
    const { streamKey } = data;
    stopStream(streamKey, socket);
  });

  socket.on("disconnect", () => {
    activeStreams.forEach((streamKey, ffmpegProcess) => {
      if (ffmpegProcess.socketId === socket.id) {
        stopStream(streamKey, socket);
      }
    });
  });
});

function createFFmpegProcess(streamKey, socket) {
  const ffmpegArgs = [
    "-f",
    "webm",
    "-i",
    "pipe:0",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-tune",
    "zerolatency",
    "-c:a",
    "aac",
    "-ar",
    "44100",
    "-b:a",
    "128k",
    "-pix_fmt",
    "yuv420p",
    "-g",
    "50",
    "-keyint_min",
    "25",
    "-b:v",
    "2500k",
    "-maxrate",
    "2500k",
    "-bufsize",
    "5000k",
    "-f",
    "flv",
    streamKey,
  ];

  const ffmpegProcess = spawn("ffmpeg", ffmpegArgs, {
    stdio: ["pipe", "pipe", "pipe"],
  });

  ffmpegProcess.socketId = socket.id;

  ffmpegProcess.on("error", (err) => {
    activeStreams.delete(streamKey);
    socket.emit("stream-error", { error: err.message });
  });

  ffmpegProcess.on("close", () => {
    activeStreams.delete(streamKey);
    socket.emit("stream-status", {
      status: "disconnected",
      message: "Stream ended",
    });
  });

  return ffmpegProcess;
}

function stopStream(streamKey, socket){
    const ffmpegProcess = activeStreams.get(streamKey);
    ffmpegProcess.stdin.end();
    activeStreams.delete(streamKey);
    socket.emit('stream-status', { status: 'stopped', message: 'Stream stopped' });
}

server.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});