"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const userController_1 = require("../controllers/userController");
const router = (0, express_1.Router)();
router.put('/:id/profile', userController_1.updateUserProfile);
router.delete('/:id', userController_1.deleteUserAccount);
exports.default = router;
