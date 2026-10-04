import { Router } from 'express';
import { updateUserProfile, deleteUserAccount } from '../controllers/userController';

const router = Router();

router.put('/:id/profile', updateUserProfile);
router.delete('/:id', deleteUserAccount);

export default router;