import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import fileUpload from "express-fileupload";
import { Server } from "socket.io";
import { createServer } from "http";
import hospitalRoutes from "./routes/hospitalRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import patientRoutes from "./routes/patientRoutes.js";
import doctorRoutes from "./routes/doctorRoutes.js";
import managerRoutes from "./routes/managerRoutes.js";
import nurseRoutes from "./routes/nurseRoutes.js";
import cleanerRoutes from "./routes/cleanerRoutes.js";
import receptionistRoutes from "./routes/receptionistRoutes.js";
import { errorHandler } from "./utils/errorHandler.js";

// Setup environment variables
dotenv.config();

export const app = express();
const httpServer = createServer(app);
const port = process.env.PORT || 5000;
const mongoUrl = process.env.MONGO_URL;

// Connect to MongoDB
(async () => {
  try {
    await mongoose.connect(mongoUrl, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to the database");
  } catch (error) {
    console.error("Database connection error:", error);
    process.exit(1); // Exit the application if database connection fails
  }
})();

// Middleware setup
const allowedOrigins = [process.env.FRONTEND_URL, process.env.DASHBOARD_URL];

app.use(
  cors({
    origin: function (origin, callback) {
      if (allowedOrigins.includes(origin) || !origin) {
        callback(null, origin);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Authorization", "Content-Type", "Accept", "X-Requested-With"],
  })
);

app.options("*", cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use(cookieParser());
app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: "./temp/",
  })
);

// Routes setup
app.use("/admin", adminRoutes);
app.use("/patient", patientRoutes);
app.use("/doctor", doctorRoutes);
app.use("/manager", managerRoutes);
app.use("/nurse", nurseRoutes);
app.use("/cleaner", cleanerRoutes);
app.use("/receptionist", receptionistRoutes);
app.use("/user", userRoutes);
app.use("/hospital", hospitalRoutes);

// Error handling middleware
app.use(errorHandler);

// Start the HTTP server
httpServer.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// Socket.IO - Set up the socket server
export const io = new Server(httpServer, {
  cors: {
    origin: [process.env.FRONTEND_URL],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log(`User connected with Socket ID: ${socket.id}`);

  // Emit a welcome message when a client connects
  socket.emit("Data", "Welcome to the server!");

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log(`Socket ID ${socket.id} disconnected`);
  });

  // Example: Function to send updated hospital data to all connected clients
  socket.on('addHospital', (newHospital) => {
    console.log('New hospital added:', newHospital);
    io.emit('hospitalAdded', newHospital);  // Broadcast to all connected clients
  });
});
