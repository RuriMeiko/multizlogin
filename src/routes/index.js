// routes/index.js - Main route aggregator
import express from 'express';
const router = express.Router();

import routesUI from './ui.js';
import authRoutes from './auth.routes.js';
import accountRoutes from './account.routes.js';
import zaloRoutes from './zalo.routes.js';

// UI Routes
router.use('/', routesUI);

// API Routes
router.use('/api', authRoutes);           // Auth: /api/login, /api/logout, etc.
router.use('/api/accounts', accountRoutes); // Account management
router.use('/api', zaloRoutes);           // Legacy Zalo APIs

export default router;
