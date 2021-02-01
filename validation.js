const Joi = require("joi");

// Register validation
const registerValidation = (data) => {
    const registerSchema = Joi.object({
        name: Joi.string().alphanum().min(6).max(32).required(),
        email: Joi.string().min(6).max(256).required().email(),
        password: Joi.string().min(6).max(1024).required(),
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

module.exports.registerValidation = registerValidation;
module.exports.loginValidation = loginValidation;
