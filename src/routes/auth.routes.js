// routes/auth.routes.js - Authentication API
import express from 'express';
import { apiAccessMiddleware, sessionAuthMiddleware } from '../middlewares/authMiddleware.js';
import {
    login,
    simpleLogin,
    logout,
    getUser,
    checkAuth,
    changePassword,
    getAllUsers,
    createUser,
    getUserApiKey,
    generateApiKey
} from '../controllers/authController.js';

const router = express.Router();

/**
 * @swagger
 * /api/login:
 *   post:
 *     summary: Đăng nhập admin
 *     description: Đăng nhập bằng username/password để truy cập giao diện web. Không cần API Key.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 description: Tên đăng nhập
 *                 example: admin
 *               password:
 *                 type: string
 *                 description: Mật khẩu
 *                 example: admin123
 *     responses:
 *       200:
 *         description: Đăng nhập thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     username:
 *                       type: string
 *                     role:
 *                       type: string
 *       401:
 *         description: Sai thông tin đăng nhập
 */
router.post('/login', login);

/**
 * @swagger
 * /api/simple-login:
 *   post:
 *     summary: Đăng nhập đơn giản (API Key)
 *     description: Đăng nhập để lấy session bằng API Key. Dùng khi cần truy cập web UI thông qua API.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - apiKey
 *             properties:
 *               apiKey:
 *                 type: string
 *                 description: API Key từ environment hoặc user
 *     responses:
 *       200:
 *         description: Đăng nhập thành công
 *       401:
 *         description: API Key không hợp lệ
 */
router.post('/simple-login', simpleLogin);

/**
 * @swagger
 * /api/logout:
 *   post:
 *     summary: Đăng xuất
 *     description: Hủy session đăng nhập hiện tại.
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Đăng xuất thành công
 */
router.post('/logout', logout);

/**
 * @swagger
 * /api/user:
 *   get:
 *     summary: Lấy thông tin user hiện tại
 *     description: Lấy thông tin của user đang đăng nhập qua session.
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Thông tin user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 user:
 *                   type: object
 *                   properties:
 *                     username:
 *                       type: string
 *                     role:
 *                       type: string
 *       401:
 *         description: Chưa đăng nhập
 */
router.get('/user', getUser);

/**
 * @swagger
 * /api/check-auth:
 *   get:
 *     summary: Kiểm tra trạng thái đăng nhập
 *     description: Kiểm tra xem user đã đăng nhập chưa qua session.
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Trạng thái xác thực
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 authenticated:
 *                   type: boolean
 *                 user:
 *                   type: object
 *                   nullable: true
 */
router.get('/check-auth', checkAuth);

/**
 * @swagger
 * /api/change-password:
 *   post:
 *     summary: Đổi mật khẩu
 *     description: Đổi mật khẩu cho user đang đăng nhập. Yêu cầu session.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 description: Mật khẩu hiện tại
 *               newPassword:
 *                 type: string
 *                 description: Mật khẩu mới
 *     responses:
 *       200:
 *         description: Đổi mật khẩu thành công
 *       400:
 *         description: Mật khẩu hiện tại không đúng
 *       401:
 *         description: Chưa đăng nhập
 */
router.post('/change-password', sessionAuthMiddleware, changePassword);

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Lấy danh sách users (Admin only)
 *     description: Lấy danh sách tất cả users. Chỉ admin mới có quyền. Yêu cầu session admin hoặc API Key.
 *     tags: [Auth]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Danh sách users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 users:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       username:
 *                         type: string
 *                       role:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Không có quyền admin
 */
router.get('/users', apiAccessMiddleware, getAllUsers);

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Tạo user mới (Admin only)
 *     description: Tạo user mới. Chỉ admin mới có quyền. Yêu cầu API Key.
 *     tags: [Auth]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 description: Tên đăng nhập
 *               password:
 *                 type: string
 *                 description: Mật khẩu
 *               role:
 *                 type: string
 *                 enum: [admin, user]
 *                 default: user
 *     responses:
 *       201:
 *         description: User đã được tạo
 *       400:
 *         description: Username đã tồn tại
 *       401:
 *         description: Unauthorized
 */
router.post('/users', apiAccessMiddleware, createUser);

/**
 * @swagger
 * /api/user/api-key:
 *   get:
 *     summary: Lấy API Key của user hiện tại
 *     description: Lấy API Key của user đang đăng nhập. Yêu cầu session.
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: API Key của user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 apiKey:
 *                   type: string
 *                   nullable: true
 *       401:
 *         description: Chưa đăng nhập
 */
router.get('/user/api-key', sessionAuthMiddleware, getUserApiKey);

/**
 * @swagger
 * /api/user/generate-key:
 *   post:
 *     summary: Tạo API Key mới
 *     description: Tạo API Key mới cho user đang đăng nhập. API Key cũ sẽ bị vô hiệu. Yêu cầu session.
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: API Key mới đã được tạo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 apiKey:
 *                   type: string
 *                   description: API Key mới
 *       401:
 *         description: Chưa đăng nhập
 */
router.post('/user/generate-key', sessionAuthMiddleware, generateApiKey);

export default router;
