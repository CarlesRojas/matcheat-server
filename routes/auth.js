// Encrypt password
const bcrypt = require("bcryptjs");

// Token management
const webToken = require("jsonwebtoken");

// Get express Router
const router = require("express").Router();

// Get User scheme
const User = require("../models/User");

// Get the Validation schemas
const { registerValidation, loginValidation } = require("../validation");

// Register API
router.post("/register", async (request, response) => {
    // Validate data
    const { error } = registerValidation(request.body);

    // If there is a validation error
    if (error) return response.status(400).json({ error: error.details[0].message });

    // Body deconstruction
    const { email, username, password, image } = request.body;

    // Check if the email has already been used
    const emailExists = await User.findOne({ email });
    if (emailExists) return response.status(400).json({ error: "This email is already registered in MatchEat." });

    // Check if the username has already been used
    const userExists = await User.findOne({ username });
    if (userExists) return response.status(400).json({ error: "Username not available." });

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create User
    const user = new User({
        username,
        email,
        password: hashedPassword,
        image,
        hasFinished: false,
        settings: { vibrate: true },
    });

    try {
        // Save user to DB
        await user.save();

        // Return the user in the response
        response.json({ id: user._id });
    } catch (error) {
        // Return DB error
        response.status(400).json({ error });
    }
});

// Login API
router.post("/login", async (request, response) => {
    // Validate data
    const { error } = loginValidation(request.body);

    // If there is a validation error
    if (error) return response.status(400).json({ error: error.details[0].message });

    // Body deconstruction
    const { email, password } = request.body;

    // Check if the email exists
    const user = await User.findOne({ email });
    if (!user) return response.status(400).json({ error: "This email does not exist." });

    // Check if the password is correct
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return response.status(400).json({ error: "Invalid password." });

    // Create and assign token
    const token = webToken.sign({ _id: user._id }, process.env.TOKEN_SECRET);
    response.header("token", token).json({
        token,
        username: user.username,
        id: user._id,
        image: user.image,
        settings: user.settings,
    });
});

module.exports = router;
