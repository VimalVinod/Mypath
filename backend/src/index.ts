import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db';
import authRoutes from './routes/authRoutes';
import examRoutes from './routes/examRoutes';
import userRoutes from './routes/userRoutes'; // <-- 1. ADD THIS IMPORT

dotenv.config();
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/users', userRoutes); // <-- 2. ADD THIS ROUTE

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'MyPath Backend is running successfully!' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});