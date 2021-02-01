// Express Server
const express = require("express");
const app = express();

// Dot env constants
const dotenv = require("dotenv");
dotenv.config();

// Import routes
const authRoutes = require("./routes/auth");
const restApiRoutes = require("./routes/restApi");

// Connect to Mongoose DB
const mongoose = require("mongoose");
mongoose.connect(process.env.DB_URL, { useNewUrlParser: true, useUnifiedTopology: true }, () => console.log("Connected to DB."));

// Middleware
app.use(express.json());

// Routes middlewares
app.use("/api_v1/user", authRoutes);
app.use("/api_v1/", restApiRoutes);

// Start the server
app.listen(3100, () => console.log("Server up and running."));
