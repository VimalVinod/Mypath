import { Request, Response } from 'express';
import User from '../models/User';

// @desc    Update user profile
// @route   PUT /api/users/:id/profile
export const updateUserProfile = async (req: Request, res: Response) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { name: req.body.name, profile: req.body } },
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error updating profile', error });
  }
};

// @desc    Delete user account
// @route   DELETE /api/users/:id
export const deleteUserAccount = async (req: Request, res: Response) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting account', error });
  }
};