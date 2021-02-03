// Dot env constants
const dotenv = require("dotenv");
dotenv.config();

// No Cors
const cors = require("cors");

// Server port
const port = process.env.PORT || 3100;

// Express Server
const express = require("express");
const app = express();

// Import routes
const authRoutes = require("./routes/auth");
const restApiRoutes = require("./routes/restApi");

// Connect to Mongoose DB
const mongoose = require("mongoose");
mongoose.connect(process.env.DB_URL, { useNewUrlParser: true, useUnifiedTopology: true }, () => console.log("Connected to DB."));

// No Cors Middleware
app.use(cors());

// Middleware
app.use(express.json());

// Routes middlewares
app.use("/api_v1/user", authRoutes);
app.use("/api_v1/", restApiRoutes);

// Start the server
app.listen(port, () => console.log(`Server up and running on port ${port}.`));
