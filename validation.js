const Joi = require("joi");

// Register validation
const registerValidation = (data) => {
    const registerSchema = Joi.object({
        name: Joi.string().alphanum().min(5).max(16).required(),
        email: Joi.string().min(6).max(256).required().email(),
        password: Joi.string().min(6).max(1024).required(),
        image: Joi.string().min(6).max(1024).required(),
    });

    return registerSchema.validate(data);
};

// Login validation
const loginValidation = (data) => {
    const loginSchema = Joi.object({
        email: Joi.string().min(6).max(256).required().email(),
        password: Joi.string().min(6).max(1024).required(),
    });

    return loginSchema.validate(data);
};

// Upload to S3 validation
const getS3URLValidation = (data) => {
    const getS3URLSchema = Joi.object({
        fileName: Joi.string().min(6).max(1024).required(),
        fileType: Joi.string().min(6).max(1024).required(),
    });

    return getS3URLSchema.validate(data);
};

module.exports.registerValidation = registerValidation;
module.exports.loginValidation = loginValidation;
module.exports.getS3URLValidation = getS3URLValidation;
