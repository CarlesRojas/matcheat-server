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
    likes: [
        {
            username: {
                type: String,
                required: true,
                min: 3,
                max: 12,
            },
            image: {
                type: String,
                required: true,
                min: 6,
                max: 1024,
            },
        },
    ],
    loves: [
        {
            username: {
                type: String,
                required: true,
                min: 3,
                max: 12,
            },
            image: {
                type: String,
                required: true,
                min: 6,
                max: 1024,
            },
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
