const User = require('../models/User');
const jwt = require("jsonwebtoken");
const ErrorResponse = require("./errorResponse");

module.exports.getUserFromResponse = async (req) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer ")
    ) {
        token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies.token) {
        token = req.cookies.token;
    }
    if (!token) return undefined;

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return await User.findById(decoded.id);
    } catch (err) {
       return undefined;
    }
}