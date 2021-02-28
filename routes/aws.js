// Get express Router
const router = require("express").Router();

// Get aws sdk
var aws = require("aws-sdk");

// Get the Validation schemas
const { getS3URLValidation } = require("../validation");

// Dot env constants
const dotenv = require("dotenv");
dotenv.config();

// AWS S3 configuration
aws.config.update({
    region: "eu-west-1",
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

// Bucket name
const S3_BUCKET = process.env.AWS_BUCKET_NAME;

// Register API
router.post("/getS3URL", async (request, response) => {
    // Validate data
    const { error } = getS3URLValidation(request.body);

    // If there is a validation error
    if (error) return response.status(400).json({ error: error.details[0].message });

    // Create a new instance of S3
    const s3 = new aws.S3();

    // Body deconstruction
    const { fileName, fileType } = request.body;

    // Payload for the S3 API
    const s3Params = {
        Bucket: S3_BUCKET,
        Key: fileName,
        Expires: 60,
        ContentType: fileType,
        ACL: "public-read",
    };

    // Make a request to the S3 API to get a signed URL which we can use to upload our file
    s3.getSignedUrl("putObject", s3Params, (error, data) => {
        // Return the error
        if (error) response.status(400).json({ error });

        // Return the user in the response
        response.json({
            signedRequest: data,
            url: `https://${S3_BUCKET}.s3.amazonaws.com/${fileName}`,
        });
    });
});

module.exports = router;
