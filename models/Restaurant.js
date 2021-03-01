const mongoose = require("mongoose");

const restaurantSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    lat: {
        type: Number,
        required: true,
    },
    lon: {
        type: Number,
        required: true,
    },
    latBoss: {
        type: Number,
        required: true,
    },
    lonBoss: {
        type: Number,
        required: true,
    },
    bossName: {
        type: String,
        required: true,
        min: 3,
        max: 12,
    },
    restaurantID: {
        type: String,
        required: true,
    },
    rating: {
        type: Number,
        required: true,
    },
    adress: {
        type: String,
        required: true,
    },
    price: {
        type: Number,
        required: true,
    },
    photos: [
        {
            type: String,
        },
    ],
    roomID: {
        type: String,
        required: true,
        min: 2,
        max: 16,
    },
    score: {
        type: Number,
        required: true,
    },
});

module.exports = mongoose.model("Restaurant", restaurantSchema);
