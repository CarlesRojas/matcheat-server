const Joi = require("joi");

// Register validation
const registerValidation = (data) => {
    const schema = Joi.object({
        username: Joi.string().alphanum().min(3).max(12).required(),
        email: Joi.string().min(6).max(256).required().email(),
        password: Joi.string().min(6).max(1024).required(),
        image: Joi.string().min(6).max(1024).required(),
    });

    return schema.validate(data);
};

// Login validation
const loginValidation = (data) => {
    const schema = Joi.object({
        email: Joi.string().min(6).max(256).required().email(),
        password: Joi.string().min(6).max(1024).required(),
    });

    return schema.validate(data);
};

// Upload to S3 validation
const getS3URLValidation = (data) => {
    const schema = Joi.object({
        fileName: Joi.string().min(6).max(1024).required(),
        fileType: Joi.string().min(6).max(1024).required(),
    });

    return schema.validate(data);
};

// Upload to S3 validation
const getPlacesValidation = (data) => {
    const schema = Joi.object({
        roomID: Joi.string().alphanum().min(2).max(16).required(),
        lat: Joi.number().min(-90).max(90).required(),
        lon: Joi.number().min(-180).max(180).required(),
    });

    return schema.validate(data);
};

module.exports.registerValidation = registerValidation;
module.exports.loginValidation = loginValidation;
module.exports.getS3URLValidation = getS3URLValidation;
module.exports.getPlacesValidation = getPlacesValidation;
