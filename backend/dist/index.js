"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = __importDefault(require("./config/db"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const examRoutes_1 = __importDefault(require("./routes/examRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes")); // <-- 1. ADD THIS IMPORT
dotenv_1.default.config();
(0, db_1.default)();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
app.use(express_1.default.json());
// Routes
app.use('/api/auth', authRoutes_1.default);
app.use('/api/exams', examRoutes_1.default);
app.use('/api/users', userRoutes_1.default); // <-- 2. ADD THIS ROUTE
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'MyPath Backend is running successfully!' });
});
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
