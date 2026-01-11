require("module-alias/register");
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");
const http = require("http");

// Sử dụng đường dẫn mới theo cấu trúc thư mục trong src
const connectDB = require("@config/db");
const errorHandler = require("@middlewares/error.middleware");
const routes = require("@routes");
const initializeSocket = require("@config/socket");
const { chatHandler } = require("./sockets");

// Load biến môi trường từ file .env
dotenv.config();

// Kết nối đến CSDL
connectDB();

const app = express();
const server = http.createServer(app);
const io = initializeSocket(server);

// Make io accessible globally for emitting events from controllers
app.set("io", io);
global.io = io;

// Các middleware
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://nhom02-tranngocbien-21110140-fe.vercel.app",
      "https://nhom02-tranngocbien-21110140-fe-*.vercel.app", // Vercel preview URLs
    ],
    credentials: true,
  })
);

app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(morgan("dev"));

// Sử dụng các routes từ thư mục src/api/routes
app.use("/api/v1", routes);

// Serve static assets nếu đang trong môi trường production
if (process.env.NODE_ENV === "production") {
  app.use(express.static("client/build"));

  app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "client", "build", "index.html"));
  });
}

// Error handler middleware
app.use(errorHandler);

// Socket.IO Chat Handler
io.on("connection", (socket) => {
  console.log(`[SOCKET] Client connected: ${socket.id}`);
  chatHandler(io, socket);

  socket.on("disconnect", () => {
    console.log(`[SOCKET] Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5005;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Socket.IO ready for real-time chat`);
});
