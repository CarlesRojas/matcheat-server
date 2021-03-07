// Fetch api
const fetch = require("node-fetch");

// Get express Router
const router = require("express").Router();

// Token verification
const verify = require("./verifyToken");

// Encrypt password
const bcrypt = require("bcryptjs");

// Get the Validation schemas
const {
    getPlacesValidation,
    getRoomRestaurantsValidation,
    addToRestaurantScoreValidation,
    changeUsernameValidation,
    changeEmailValidation,
    changePasswordValidation,
    changeImageValidation,
    changeSettingsValidation,
} = require("../validation");

// Dot env constants
const dotenv = require("dotenv");
dotenv.config();

// Google API key
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

// Google API URLS
const gapiNearbyURL = "https://maps.googleapis.com/maps/api/place/nearbysearch/json?";
const gapiDetailsURL = "https://maps.googleapis.com/maps/api/place/details/json?";
const gapiPhotoURL = "https://maps.googleapis.com/maps/api/place/photo?";

// Get the User, Room & Restaurant schemes
const User = require("../models/User");
const Room = require("../models/Room");
const Restaurant = require("../models/Restaurant");

// API to test the token with
router.get("/testToken", verify, (request, response) => {
    response.json({ data: "Random Private Data" });
});

// Get places for a location and save them for use in a room
router.post("/getPlaces", verify, async (request, response) => {
    // Validate data
    const { error } = getPlacesValidation(request.body);

    // If there is a validation error
    if (error) return response.status(400).json({ error: error.details[0].message });

    try {
        // Body deconstruction
        const { lat, lon, roomID, bossName } = request.body;

        // Return if room does not exist or if it is closed
        const room = await Room.findOne({ roomID });
        if (!room) return response.status(400).json({ error: "Room does not exist" });

        // Restaurants
        const desiredNumPhotosPerRestaurants = 3;
        const desiredNumberOfRestaurants = 5;
        var numRestaurants = 0;

        // Token to get te next 20 restaurats
        var pageToken = null;

        // Max nuumber of iterations
        const maxIterations = 5;

        // Minimum image size
        const imageSize = 500;

        // Get restaurants until we have enough
        for (let i = 0; i < maxIterations; i++) {
            // Get the restaurants from the google API
            if (i === 0) var rawNearbyResponse = await fetch(`${gapiNearbyURL}location=${lat},${lon}&rankby=distance&opennow&type=restaurant&language=en&key=${GOOGLE_API_KEY}`);
            // On subsequent iterations -> Fetch using pageToken
            else if (pageToken) {
                // Sleep for 2 seconds to wait for the pageToken to become valid (Google rule)
                await new Promise((r) => setTimeout(r, 1500));

                // Fetch with the pagetoken
                rawNearbyResponse = await fetch(`${gapiNearbyURL}location=${lat},${lon}&pagetoken=${pageToken}&key=${GOOGLE_API_KEY}`);
            } else break;

            // Get data from response
            const nearbyResponse = await rawNearbyResponse.json();

            // Set the page token
            if ("next_page_token" in nearbyResponse) pageToken = nearbyResponse.next_page_token;

            // Return if there is an error in the google response
            if (!("results" in nearbyResponse) || !nearbyResponse.results.length) return response.status(400).json({ error: "Google Services not available" });

            // Iterate for every restaurant
            for (let j = 0; j < nearbyResponse.results.length; j++) {
                const { name, geometry, place_id, rating, types } = nearbyResponse.results[j];

                // Ignore if we are missing any parameter
                if (!name || !geometry || !("location" in geometry) || !("lat" in geometry.location) || !("lng" in geometry.location) || !place_id || !rating || !types) continue;

                // Discard Hotels, Bars & Coffe shops
                if (types.includes("lodging") || types.includes("bar") || types.includes("cafe")) continue;

                // Get the place details
                var rawDetailsResponse = await fetch(`${gapiDetailsURL}place_id=${place_id}&language=en&fields=formatted_address,photos,price_level&key=${GOOGLE_API_KEY}`);

                // Get data from response
                const detailsResponse = await rawDetailsResponse.json();

                // Deconstruct result
                const { formatted_address, photos, price_level } = detailsResponse.result;

                // Ignore if we are missing any parameter
                if (!formatted_address || !price_level || !photos) continue;

                // Get image from google function
                const getImage = async (photoInfo) => {
                    const { photo_reference, height, width } = photoInfo;

                    // Get the photo
                    if (height > width) var rawPhotoResponse = await fetch(`${gapiPhotoURL}photoreference=${photo_reference}&maxwidth=${imageSize}&key=${GOOGLE_API_KEY}`);
                    else rawPhotoResponse = await fetch(`${gapiPhotoURL}photoreference=${photo_reference}&maxheight=${imageSize}&key=${GOOGLE_API_KEY}`);

                    return rawPhotoResponse.url;
                };

                // Trim to the desied number of pictures
                var trimmedPhotos = [];
                for (let k = 0; k < photos.length && trimmedPhotos.length < desiredNumPhotosPerRestaurants; k++) {
                    const { photo_reference, height, width } = photos[k];

                    // Ignore photos that are too small or don't have a reference
                    if (!photo_reference || height < imageSize || width < imageSize) continue;

                    trimmedPhotos.push({ photo_reference, height, width });
                }

                // Get te url for each picture
                var photoUrls = await Promise.all(trimmedPhotos.map(getImage));

                // Ignore if there are no photos
                if (!photoUrls.length) continue;

                // Create the restaurant
                const restaurant = new Restaurant({
                    name,
                    lat: geometry.location.lat,
                    lon: geometry.location.lng,
                    latBoss: lat,
                    lonBoss: lon,
                    bossName,
                    restaurantID: place_id,
                    rating,
                    adress: formatted_address,
                    price: price_level,
                    photos: photoUrls,
                    likes: [],
                    loves: [],
                    roomID,
                });

                // Save restaurant to DB
                await restaurant.save();

                // Break if we have enough restaurants
                if (++numRestaurants >= desiredNumberOfRestaurants) break;
            }

            // Break the loop once we have enough restaurants
            if (numRestaurants >= desiredNumberOfRestaurants) break;
        }

        // Close the room
        await Room.findOneAndUpdate({ roomID }, { $set: { open: false } });

        // Set the hasFinished variable to false for all people in the room
        await User.updateMany({ roomID }, { $set: { hasFinished: false } });

        // Return success
        return response.json({ success: true });
    } catch (error) {
        return response.status(400).json({ error });
    }
});

// Get the restaurants for a room
router.post("/getRoomRestaurants", verify, async (request, response) => {
    // Validate data
    const { error } = getRoomRestaurantsValidation(request.body);

    // If there is a validation error
    if (error) return response.status(400).json({ error: error.details[0].message });

    try {
        // Body deconstruction
        const { roomID } = request.body;

        // Get all restaurants in a room
        const restaurants = await Restaurant.find({ roomID });

        // Return the restaurants
        return response.json(restaurants);
    } catch (error) {
        return response.status(400).json({ error });
    }
});

// Add to the score of a restaurant
router.post("/addToRestaurantScore", verify, async (request, response) => {
    // Validate data
    const { error } = addToRestaurantScoreValidation(request.body);

    // If there is a validation error
    if (error) return response.status(400).json({ error: error.details[0].message });

    try {
        // Body deconstruction
        const { username, roomID, restaurantID, score } = request.body;

        // Get user
        const user = await User.findOne({ username });
        if (!user) return socket.emit("error", { error: "User does not exist", errorCode: 620 });

        // Get the restaurant
        const restaurant = await Restaurant.findOne({ roomID, restaurantID });
        if (!restaurant) return socket.emit("error", { error: "Restaurant does not exist", errorCode: 640 });

        // If the user likes the restaurant
        if (score === 1) {
            // Update the score and add the likes array
            await Restaurant.findOneAndUpdate({ roomID, restaurantID }, { $push: { likes: { username: user.username, image: user.image } } });
        }

        // If the user loves the restaurant
        else if (score === 2) {
            // Update the score and add the loves array
            await Restaurant.findOneAndUpdate({ roomID, restaurantID }, { $push: { loves: { username: user.username, image: user.image } } });
        }

        // Return success
        return response.json({ success: true });
    } catch (error) {
        return response.status(400).json({ error });
    }
});

// API to change the username
router.post("/changeUsername", verify, async (request, response) => {
    // Validate data
    const { error } = changeUsernameValidation(request.body);

    // If there is a validation error
    if (error) return response.status(400).json({ error: error.details[0].message });

    try {
        // Deconstruct body
        const { username, newUsername, password } = request.body;

        // Get user
        const user = await User.findOne({ username });
        if (!user) return response.status(400).json({ error: "User does not exist" });

        // Check if the password is correct
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return response.status(400).json({ error: "Invalid password." });

        // Update User
        await User.findOneAndUpdate({ username }, { $set: { username: newUsername } });

        // Return success
        response.json({ success: true });
    } catch (error) {
        // Return error
        response.status(400).json({ error });
    }
});

// API to change the email
router.post("/changeEmail", verify, async (request, response) => {
    // Validate data
    const { error } = changeEmailValidation(request.body);

    // If there is a validation error
    if (error) return response.status(400).json({ error: error.details[0].message });

    try {
        // Deconstruct body
        const { username, email, password } = request.body;

        // Get user
        const user = await User.findOne({ username });
        if (!user) return response.status(400).json({ error: "User does not exist" });

        // Check if the password is correct
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return response.status(400).json({ error: "Invalid password." });

        // Update User
        await User.findOneAndUpdate({ username }, { $set: { email } });

        // Return success
        response.json({ success: true });
    } catch (error) {
        // Return error
        response.status(400).json({ error });
    }
});

// API to change the password
router.post("/changePassword", verify, async (request, response) => {
    // Validate data
    const { error } = changePasswordValidation(request.body);

    // If there is a validation error
    if (error) return response.status(400).json({ error: error.details[0].message });

    try {
        // Deconstruct body
        const { username, password, newPassword } = request.body;

        // Get user
        const user = await User.findOne({ username });
        if (!user) return response.status(400).json({ error: "User does not exist" });

        // Check if the password is correct
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return response.status(400).json({ error: "Invalid password." });

        // Hash the new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update User
        await User.findOneAndUpdate({ username }, { $set: { password: hashedPassword } });

        // Return success
        response.json({ success: true });
    } catch (error) {
        // Return error
        response.status(400).json({ error });
    }
});

// API to change the image
router.post("/changeImage", verify, async (request, response) => {
    // Validate data
    const { error } = changeImageValidation(request.body);

    // If there is a validation error
    if (error) return response.status(400).json({ error: error.details[0].message });

    try {
        // Deconstruct body
        const { username, password, image } = request.body;

        // Get user
        const user = await User.findOne({ username });
        if (!user) return response.status(400).json({ error: "User does not exist" });

        // Check if the password is correct
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return response.status(400).json({ error: "Invalid password." });

        // Update User
        await User.findOneAndUpdate({ username }, { $set: { image } });

        // Return success
        response.json({ success: true });
    } catch (error) {
        // Return error
        response.status(400).json({ error });
    }
});

// API to change the image
router.post("/changeSettings", verify, async (request, response) => {
    // Validate data
    const { error } = changeSettingsValidation(request.body);

    // If there is a validation error
    if (error) return response.status(400).json({ error: error.details[0].message });

    try {
        // Deconstruct body
        const { username, settings } = request.body;

        // Get user
        const user = await User.findOne({ username });
        if (!user) return response.status(400).json({ error: "User does not exist" });

        // Update User
        await User.findOneAndUpdate({ username }, { $set: { settings } });

        // Return success
        response.json({ success: true });
    } catch (error) {
        // Return error
        response.status(400).json({ error });
    }
});

module.exports = router;
