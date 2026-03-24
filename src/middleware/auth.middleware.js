const { verifyAccessToken } = require('../utils/jwt.utils');

const protect = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }

    try {
        const token = authHeader.split(' ')[1];
        const decoded = verifyAccessToken(token);
        req.user = decoded; // { id, role }
        next();
    } catch {
        return res.status(401).json({ message: 'Token expired or invalid' });
    }
};

const adminOnly = (req, res, next) => {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
    }
    next();
};

module.exports = { protect, adminOnly };