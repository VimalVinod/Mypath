"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUserAccount = exports.updateUserProfile = void 0;
const User_1 = __importDefault(require("../models/User"));
// @desc    Update user profile
// @route   PUT /api/users/:id/profile
const updateUserProfile = async (req, res) => {
    try {
        const user = await User_1.default.findByIdAndUpdate(req.params.id, { $set: { name: req.body.name, profile: req.body } }, { new: true, runValidators: true }).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    }
    catch (error) {
        res.status(500).json({ message: 'Error updating profile', error });
    }
};
exports.updateUserProfile = updateUserProfile;
// @desc    Delete user account
// @route   DELETE /api/users/:id
const deleteUserAccount = async (req, res) => {
    try {
        await User_1.default.findByIdAndDelete(req.params.id);
        res.json({ message: 'Account deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Error deleting account', error });
    }
};
exports.deleteUserAccount = deleteUserAccount;
