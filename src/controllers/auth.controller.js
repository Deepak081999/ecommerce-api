const crypto = require('crypto');
const User = require('../models/user.model');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt.utils');
const { registerSchema, loginSchema, resetRequestSchema, resetPasswordSchema } = require('../validators/auth.validator');

// @POST /api/auth/register
const register = async (req, res, next) => {
    try {
        const parsed = registerSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
        }

        const { name, email, password, role } = parsed.data;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ message: 'Email already in use' });
        }

        const user = await User.create({ name, email, password, role });

        const accessToken = generateAccessToken(user._id, user.role);
        const refreshToken = generateRefreshToken(user._id);

        // Save refresh token in DB
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        // Send refresh token as httpOnly cookie
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        res.status(201).json({
            message: 'User registered successfully',
            accessToken,
            user: { id: user._id, name: user.name, email: user.email, role: user.role },
        });
    } catch (error) {
        next(error);
    }
};

// @POST /api/auth/login
const login = async (req, res, next) => {
    try {
        const parsed = loginSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
        }

        const { email, password } = parsed.data;

        const user = await User.findOne({ email }).select('+password +refreshToken');
        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const accessToken = generateAccessToken(user._id, user.role);
        const refreshToken = generateRefreshToken(user._id);

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        res.status(200).json({
            message: 'Login successful',
            accessToken,
            user: { id: user._id, name: user.name, email: user.email, role: user.role },
        });
    } catch (error) {
        next(error);
    }
};

// @POST /api/auth/refresh
const refreshToken = async (req, res, next) => {
    try {
        const token = req.cookies.refreshToken;
        if (!token) return res.status(401).json({ message: 'No refresh token' });

        const decoded = verifyRefreshToken(token);
        const user = await User.findById(decoded.id).select('+refreshToken');

        if (!user || user.refreshToken !== token) {
            return res.status(403).json({ message: 'Invalid refresh token' });
        }

        const newAccessToken = generateAccessToken(user._id, user.role);
        const newRefreshToken = generateRefreshToken(user._id);

        user.refreshToken = newRefreshToken;
        await user.save({ validateBeforeSave: false });

        res.cookie('refreshToken', newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        res.status(200).json({ accessToken: newAccessToken });
    } catch (error) {
        next(error);
    }
};

// @POST /api/auth/logout
const logout = async (req, res, next) => {
    try {
        const token = req.cookies.refreshToken;
        if (token) {
            const user = await User.findOne({ refreshToken: token }).select('+refreshToken');
            if (user) {
                user.refreshToken = null;
                await user.save({ validateBeforeSave: false });
            }
        }
        res.clearCookie('refreshToken');
        res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
        next(error);
    }
};

// @POST /api/auth/forgot-password
const forgotPassword = async (req, res, next) => {
    try {
        const parsed = resetRequestSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
        }

        const user = await User.findOne({ email: parsed.data.email });
        if (!user) return res.status(404).json({ message: 'No user with that email' });

        const resetToken = crypto.randomBytes(32).toString('hex');
        user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 mins
        await user.save({ validateBeforeSave: false });

        // Simulate email (log to console)
        console.log(`Password reset token (simulated email): ${resetToken}`);

        res.status(200).json({
            message: 'Reset token sent (check console for simulation)',
            resetToken, // Remove this in production!
        });
    } catch (error) {
        next(error);
    }
};

// @POST /api/auth/reset-password/:token
const resetPassword = async (req, res, next) => {
    try {
        const parsed = resetPasswordSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
        }

        const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

        const user = await User.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: { $gt: Date.now() },
        }).select('+passwordResetToken +passwordResetExpires');

        if (!user) return res.status(400).json({ message: 'Token is invalid or has expired' });

        user.password = parsed.data.password;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();

        res.status(200).json({ message: 'Password reset successful' });
    } catch (error) {
        next(error);
    }
};

module.exports = { register, login, refreshToken, logout, forgotPassword, resetPassword };