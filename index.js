// #################################################
//   IMPORTS
// #################################################

// Libraries
const dotenv = require("dotenv");
const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const startSockets = require("./sockets");

// Routes
const restApiRoutes = require("./routes/restApi");
const authRoutes = require("./routes/auth");
const awsApiRoutes = require("./routes/aws");

// #################################################
//   ENVIROMENT
// #################################################

// Dot env constants
dotenv.config();

// #################################################
//   SERVER
// #################################################

// Express Server
const app = express();

// HTTP access
const server = http.createServer(app);

// #################################################
//   DATABASE
// #################################################

// Connect to Mongoose DB
mongoose.connect(process.env.DB_URL, { useNewUrlParser: true, useUnifiedTopology: true }, () => console.log("Connected to DB."));
mongoose.set("useFindAndModify", false);

// #################################################
//   SOCKETS
// #################################################

// Start using sockets
startSockets(server);

// #################################################
//   ROUTES
// #################################################

// No Cors Middleware
app.use(cors());

// Middleware to parse the body of requests
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Routes middlewares
app.use("/api_v1/aws", awsApiRoutes);
app.use("/api_v1/user", authRoutes);
app.use("/api_v1/", restApiRoutes);

// #################################################
//   START SERVER
// #################################################

// Get port
const port = process.env.PORT || 3100;

// Start the server
server.listen(port, () => console.log(`Server up and running on port ${port}.`));
