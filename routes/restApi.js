// Get express Router
const router = require("express").Router();

// Token verification
const verify = require("./verifyToken");

router.get("/testToken", verify, (request, response) => {
    response.json({ data: "Random Private Data" });
});

module.exports = router;
