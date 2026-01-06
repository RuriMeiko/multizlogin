// routes/account.routes.js - Zalo Account Management API
import express from 'express';
import { apiAccessMiddleware } from '../middlewares/authMiddleware.js';
import {
    getLoggedAccounts,
    getAccountDetails,
    deleteAccount,
    findUserByAccount,
    sendMessageByAccount,
    sendImageByAccount,
    getUserInfoByAccount,
    sendFriendRequestByAccount
} from '../controllers/accountController.js';
import {
    sendImageToUserByAccount,
    sendImagesToUserByAccount,
    sendImageToGroupByAccount,
    sendImagesToGroupByAccount
} from '../controllers/messageController.js';
import {
    createGroupByAccount,
    getGroupInfoByAccount,
    addUserToGroupByAccount,
    removeUserFromGroupByAccount
} from '../controllers/groupController.js';
import { handleAccountAction } from '../controllers/actionController.js';

const router = express.Router();

/**
 * @swagger
 * /api/accounts:
 *   get:
 *     summary: Lấy danh sách tài khoản Zalo đã đăng nhập
 *     description: Trả về danh sách tất cả tài khoản Zalo đang hoạt động. Yêu cầu API Key.
 *     tags: [Account]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Danh sách tài khoản
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 accounts:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       ownId:
 *                         type: string
 *                       phoneNumber:
 *                         type: string
 *                       proxy:
 *                         type: string
 *       401:
 *         description: Unauthorized - API Key không hợp lệ
 */
router.get('/', apiAccessMiddleware, getLoggedAccounts);

/**
 * @swagger
 * /api/accounts/{ownId}:
 *   get:
 *     summary: Lấy chi tiết tài khoản Zalo
 *     description: Lấy thông tin chi tiết của một tài khoản Zalo cụ thể. Yêu cầu API Key.
 *     tags: [Account]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: ownId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID tài khoản Zalo
 *     responses:
 *       200:
 *         description: Thông tin tài khoản
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Không tìm thấy tài khoản
 */
router.get('/:ownId', apiAccessMiddleware, getAccountDetails);

/**
 * @swagger
 * /api/accounts/{ownId}:
 *   delete:
 *     summary: Xóa tài khoản Zalo đã đăng nhập
 *     description: Đăng xuất và xóa tài khoản Zalo khỏi hệ thống. Yêu cầu API Key.
 *     tags: [Account]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: ownId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Đã xóa tài khoản
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Không tìm thấy tài khoản
 */
router.delete('/:ownId', apiAccessMiddleware, deleteAccount);

/**
 * @swagger
 * /api/accounts/findUser:
 *   post:
 *     summary: Tìm người dùng (N8N-friendly)
 *     description: Tìm người dùng Zalo với accountSelection để chọn tài khoản. Yêu cầu API Key.
 *     tags: [Account]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phoneNumber
 *             properties:
 *               accountSelection:
 *                 type: string
 *                 enum: [first, last, random, specific]
 *                 default: first
 *                 description: Cách chọn tài khoản (first, last, random, specific)
 *               accountId:
 *                 type: string
 *                 description: ID tài khoản cụ thể (khi accountSelection = specific)
 *               phoneNumber:
 *                 type: string
 *                 description: Số điện thoại cần tìm
 *                 example: "0901234567"
 *     responses:
 *       200:
 *         description: Kết quả tìm kiếm
 *       401:
 *         description: Unauthorized
 */
router.post('/findUser', apiAccessMiddleware, findUserByAccount);

/**
 * @swagger
 * /api/accounts/sendMessage:
 *   post:
 *     summary: Gửi tin nhắn (N8N-friendly)
 *     description: Gửi tin nhắn với accountSelection để chọn tài khoản. Yêu cầu API Key.
 *     tags: [Account]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - threadId
 *               - message
 *             properties:
 *               accountSelection:
 *                 type: string
 *                 enum: [first, last, random, specific]
 *                 default: first
 *               accountId:
 *                 type: string
 *               threadId:
 *                 type: string
 *                 description: ID người nhận hoặc nhóm
 *               message:
 *                 type: string
 *                 description: Nội dung tin nhắn
 *               type:
 *                 type: string
 *                 enum: [user, group]
 *                 default: user
 *     responses:
 *       200:
 *         description: Tin nhắn đã gửi
 *       401:
 *         description: Unauthorized
 */
router.post('/sendMessage', apiAccessMiddleware, sendMessageByAccount);

/**
 * @swagger
 * /api/accounts/sendImage:
 *   post:
 *     summary: Gửi hình ảnh (N8N-friendly)
 *     description: Gửi hình ảnh với accountSelection để chọn tài khoản. Yêu cầu API Key.
 *     tags: [Account]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - threadId
 *               - imageUrl
 *             properties:
 *               accountSelection:
 *                 type: string
 *                 enum: [first, last, random, specific]
 *                 default: first
 *               accountId:
 *                 type: string
 *               threadId:
 *                 type: string
 *               imageUrl:
 *                 type: string
 *                 description: URL hình ảnh
 *               message:
 *                 type: string
 *                 description: Caption
 *               type:
 *                 type: string
 *                 enum: [user, group]
 *                 default: user
 *     responses:
 *       200:
 *         description: Hình ảnh đã gửi
 *       401:
 *         description: Unauthorized
 */
router.post('/sendImage', apiAccessMiddleware, sendImageByAccount);

/**
 * @swagger
 * /api/accounts/getUserInfo:
 *   post:
 *     summary: Lấy thông tin người dùng (N8N-friendly)
 *     description: Lấy thông tin người dùng với accountSelection. Yêu cầu API Key.
 *     tags: [Account]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               accountSelection:
 *                 type: string
 *                 enum: [first, last, random, specific]
 *                 default: first
 *               accountId:
 *                 type: string
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Thông tin người dùng
 *       401:
 *         description: Unauthorized
 */
router.post('/getUserInfo', apiAccessMiddleware, getUserInfoByAccount);

/**
 * @swagger
 * /api/accounts/sendFriendRequest:
 *   post:
 *     summary: Gửi lời mời kết bạn (N8N-friendly)
 *     description: Gửi lời mời kết bạn với accountSelection. Yêu cầu API Key.
 *     tags: [Account]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               accountSelection:
 *                 type: string
 *                 enum: [first, last, random, specific]
 *                 default: first
 *               accountId:
 *                 type: string
 *               userId:
 *                 type: string
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: Đã gửi lời mời
 *       401:
 *         description: Unauthorized
 */
router.post('/sendFriendRequest', apiAccessMiddleware, sendFriendRequestByAccount);

/**
 * @swagger
 * /api/accounts/createGroup:
 *   post:
 *     summary: Tạo nhóm (N8N-friendly)
 *     description: Tạo nhóm Zalo với accountSelection. Yêu cầu API Key.
 *     tags: [Account]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - members
 *             properties:
 *               accountSelection:
 *                 type: string
 *                 enum: [first, last, random, specific]
 *                 default: first
 *               accountId:
 *                 type: string
 *               name:
 *                 type: string
 *               members:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Nhóm đã được tạo
 *       401:
 *         description: Unauthorized
 */
router.post('/createGroup', apiAccessMiddleware, createGroupByAccount);

/**
 * @swagger
 * /api/accounts/getGroupInfo:
 *   post:
 *     summary: Lấy thông tin nhóm (N8N-friendly)
 *     description: Lấy thông tin nhóm với accountSelection. Yêu cầu API Key.
 *     tags: [Account]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - groupId
 *             properties:
 *               accountSelection:
 *                 type: string
 *                 enum: [first, last, random, specific]
 *                 default: first
 *               accountId:
 *                 type: string
 *               groupId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Thông tin nhóm
 *       401:
 *         description: Unauthorized
 */
router.post('/getGroupInfo', apiAccessMiddleware, getGroupInfoByAccount);

/**
 * @swagger
 * /api/accounts/addUserToGroup:
 *   post:
 *     summary: Thêm thành viên vào nhóm (N8N-friendly)
 *     description: Thêm thành viên vào nhóm với accountSelection. Yêu cầu API Key.
 *     tags: [Account]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - groupId
 *               - userId
 *             properties:
 *               accountSelection:
 *                 type: string
 *                 enum: [first, last, random, specific]
 *                 default: first
 *               accountId:
 *                 type: string
 *               groupId:
 *                 type: string
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Đã thêm thành viên
 *       401:
 *         description: Unauthorized
 */
router.post('/addUserToGroup', apiAccessMiddleware, addUserToGroupByAccount);

/**
 * @swagger
 * /api/accounts/removeUserFromGroup:
 *   post:
 *     summary: Xóa thành viên khỏi nhóm (N8N-friendly)
 *     description: Xóa thành viên khỏi nhóm với accountSelection. Yêu cầu API Key.
 *     tags: [Account]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - groupId
 *               - userId
 *             properties:
 *               accountSelection:
 *                 type: string
 *                 enum: [first, last, random, specific]
 *                 default: first
 *               accountId:
 *                 type: string
 *               groupId:
 *                 type: string
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Đã xóa thành viên
 *       401:
 *         description: Unauthorized
 */
router.post('/removeUserFromGroup', apiAccessMiddleware, removeUserFromGroupByAccount);

/**
 * @swagger
 * /api/accounts/sendImageToUser:
 *   post:
 *     summary: Gửi hình ảnh đến người dùng (N8N-friendly)
 *     tags: [Account]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - imageUrl
 *             properties:
 *               accountSelection:
 *                 type: string
 *                 enum: [first, last, random, specific]
 *                 default: first
 *               accountId:
 *                 type: string
 *               userId:
 *                 type: string
 *               imageUrl:
 *                 type: string
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: Hình ảnh đã gửi
 *       401:
 *         description: Unauthorized
 */
router.post('/sendImageToUser', apiAccessMiddleware, sendImageToUserByAccount);

/**
 * @swagger
 * /api/accounts/sendImagesToUser:
 *   post:
 *     summary: Gửi nhiều hình ảnh đến người dùng (N8N-friendly)
 *     tags: [Account]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - imageUrls
 *             properties:
 *               accountSelection:
 *                 type: string
 *                 enum: [first, last, random, specific]
 *                 default: first
 *               accountId:
 *                 type: string
 *               userId:
 *                 type: string
 *               imageUrls:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Hình ảnh đã gửi
 *       401:
 *         description: Unauthorized
 */
router.post('/sendImagesToUser', apiAccessMiddleware, sendImagesToUserByAccount);

/**
 * @swagger
 * /api/accounts/sendImageToGroup:
 *   post:
 *     summary: Gửi hình ảnh đến nhóm (N8N-friendly)
 *     tags: [Account]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - groupId
 *               - imageUrl
 *             properties:
 *               accountSelection:
 *                 type: string
 *                 enum: [first, last, random, specific]
 *                 default: first
 *               accountId:
 *                 type: string
 *               groupId:
 *                 type: string
 *               imageUrl:
 *                 type: string
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: Hình ảnh đã gửi
 *       401:
 *         description: Unauthorized
 */
router.post('/sendImageToGroup', apiAccessMiddleware, sendImageToGroupByAccount);

/**
 * @swagger
 * /api/accounts/sendImagesToGroup:
 *   post:
 *     summary: Gửi nhiều hình ảnh đến nhóm (N8N-friendly)
 *     tags: [Account]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - groupId
 *               - imageUrls
 *             properties:
 *               accountSelection:
 *                 type: string
 *                 enum: [first, last, random, specific]
 *                 default: first
 *               accountId:
 *                 type: string
 *               groupId:
 *                 type: string
 *               imageUrls:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Hình ảnh đã gửi
 *       401:
 *         description: Unauthorized
 */
router.post('/sendImagesToGroup', apiAccessMiddleware, sendImagesToGroupByAccount);

/**
 * @swagger
 * /api/accounts/action:
 *   post:
 *     summary: Thực hiện action tổng quát
 *     description: Thực hiện nhiều loại action khác nhau trên tài khoản Zalo. Yêu cầu API Key.
 *     tags: [Account]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *             properties:
 *               accountSelection:
 *                 type: string
 *                 enum: [first, last, random, specific]
 *                 default: first
 *               accountId:
 *                 type: string
 *               action:
 *                 type: string
 *                 enum: [sendMessage, sendTyping, sendSticker, findUser, getUserInfo, getGroupInfo, addReaction, undo]
 *                 description: Loại action cần thực hiện
 *               threadId:
 *                 type: string
 *               message:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *               userId:
 *                 type: string
 *               groupId:
 *                 type: string
 *               stickerId:
 *                 type: string
 *               reaction:
 *                 type: string
 *               msgId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Action đã thực hiện
 *       400:
 *         description: Action không hợp lệ
 *       401:
 *         description: Unauthorized
 */
router.post('/action', apiAccessMiddleware, handleAccountAction);

export default router;
