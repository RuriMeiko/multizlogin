// routes/zalo.routes.js - Zalo API routes (ownId-based)
import express from 'express';
import { apiAccessMiddleware } from '../middlewares/authMiddleware.js';
import {
    findUser,
    getUserInfo,
    sendFriendRequest,
    createGroup,
    getGroupInfo,
    addUserToGroup,
    removeUserFromGroup
} from '../controllers/groupController.js';
import {
    sendMessage,
    sendImageToUser,
    sendImagesToUser,
    sendImageToGroup,
    sendImagesToGroup
} from '../controllers/messageController.js';

const router = express.Router();

/**
 * @swagger
 * /api/findUser:
 *   post:
 *     summary: Tìm người dùng Zalo theo số điện thoại
 *     description: Tìm kiếm người dùng Zalo bằng số điện thoại. Yêu cầu API Key.
 *     tags: [Zalo]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ownId
 *               - phoneNumber
 *             properties:
 *               ownId:
 *                 type: string
 *                 description: ID tài khoản Zalo đang đăng nhập
 *                 example: "1234567890"
 *               phoneNumber:
 *                 type: string
 *                 description: Số điện thoại cần tìm
 *                 example: "0901234567"
 *     responses:
 *       200:
 *         description: Tìm thấy người dùng
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *       401:
 *         description: Unauthorized - API Key không hợp lệ
 *       404:
 *         description: Không tìm thấy người dùng
 */
router.post('/findUser', apiAccessMiddleware, findUser);

/**
 * @swagger
 * /api/getUserInfo:
 *   post:
 *     summary: Lấy thông tin người dùng Zalo
 *     description: Lấy thông tin chi tiết của một người dùng Zalo theo userId. Yêu cầu API Key.
 *     tags: [Zalo]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ownId
 *               - userId
 *             properties:
 *               ownId:
 *                 type: string
 *                 description: ID tài khoản Zalo đang đăng nhập
 *                 example: "1234567890"
 *               userId:
 *                 type: string
 *                 description: ID người dùng cần lấy thông tin
 *                 example: "9876543210"
 *     responses:
 *       200:
 *         description: Thông tin người dùng
 *       401:
 *         description: Unauthorized
 */
router.post('/getUserInfo', apiAccessMiddleware, getUserInfo);

/**
 * @swagger
 * /api/sendFriendRequest:
 *   post:
 *     summary: Gửi lời mời kết bạn
 *     description: Gửi lời mời kết bạn đến một người dùng Zalo. Yêu cầu API Key.
 *     tags: [Zalo]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ownId
 *               - userId
 *             properties:
 *               ownId:
 *                 type: string
 *                 description: ID tài khoản Zalo đang đăng nhập
 *               userId:
 *                 type: string
 *                 description: ID người dùng muốn kết bạn
 *               message:
 *                 type: string
 *                 description: Lời nhắn kèm theo
 *                 example: "Xin chào, mình muốn kết bạn với bạn"
 *     responses:
 *       200:
 *         description: Đã gửi lời mời kết bạn
 *       401:
 *         description: Unauthorized
 */
router.post('/sendFriendRequest', apiAccessMiddleware, sendFriendRequest);

/**
 * @swagger
 * /api/sendmessage:
 *   post:
 *     summary: Gửi tin nhắn
 *     description: Gửi tin nhắn văn bản đến người dùng hoặc nhóm. Yêu cầu API Key.
 *     tags: [Zalo]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ownId
 *               - threadId
 *               - message
 *             properties:
 *               ownId:
 *                 type: string
 *                 description: ID tài khoản Zalo đang đăng nhập
 *                 example: "1234567890"
 *               threadId:
 *                 type: string
 *                 description: ID cuộc trò chuyện (userId hoặc groupId)
 *                 example: "9876543210"
 *               message:
 *                 type: string
 *                 description: Nội dung tin nhắn
 *                 example: "Xin chào!"
 *               type:
 *                 type: string
 *                 enum: [user, group]
 *                 default: user
 *                 description: Loại cuộc trò chuyện
 *     responses:
 *       200:
 *         description: Tin nhắn đã được gửi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 messageId:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Lỗi server
 */
router.post('/sendmessage', apiAccessMiddleware, sendMessage);

/**
 * @swagger
 * /api/createGroup:
 *   post:
 *     summary: Tạo nhóm mới
 *     description: Tạo một nhóm Zalo mới. Yêu cầu API Key.
 *     tags: [Zalo]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ownId
 *               - name
 *               - members
 *             properties:
 *               ownId:
 *                 type: string
 *                 description: ID tài khoản Zalo đang đăng nhập
 *               name:
 *                 type: string
 *                 description: Tên nhóm
 *                 example: "Nhóm test"
 *               members:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Danh sách userId thành viên
 *                 example: ["123", "456"]
 *     responses:
 *       200:
 *         description: Nhóm đã được tạo
 *       401:
 *         description: Unauthorized
 */
router.post('/createGroup', apiAccessMiddleware, createGroup);

/**
 * @swagger
 * /api/getGroupInfo:
 *   post:
 *     summary: Lấy thông tin nhóm
 *     description: Lấy thông tin chi tiết của một nhóm Zalo. Yêu cầu API Key.
 *     tags: [Zalo]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ownId
 *               - groupId
 *             properties:
 *               ownId:
 *                 type: string
 *                 description: ID tài khoản Zalo đang đăng nhập
 *               groupId:
 *                 type: string
 *                 description: ID nhóm cần lấy thông tin
 *     responses:
 *       200:
 *         description: Thông tin nhóm
 *       401:
 *         description: Unauthorized
 */
router.post('/getGroupInfo', apiAccessMiddleware, getGroupInfo);

/**
 * @swagger
 * /api/addUserToGroup:
 *   post:
 *     summary: Thêm thành viên vào nhóm
 *     description: Thêm một người dùng vào nhóm Zalo. Yêu cầu API Key.
 *     tags: [Zalo]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ownId
 *               - groupId
 *               - userId
 *             properties:
 *               ownId:
 *                 type: string
 *                 description: ID tài khoản Zalo đang đăng nhập
 *               groupId:
 *                 type: string
 *                 description: ID nhóm
 *               userId:
 *                 type: string
 *                 description: ID người dùng cần thêm
 *     responses:
 *       200:
 *         description: Đã thêm thành viên
 *       401:
 *         description: Unauthorized
 */
router.post('/addUserToGroup', apiAccessMiddleware, addUserToGroup);

/**
 * @swagger
 * /api/removeUserFromGroup:
 *   post:
 *     summary: Xóa thành viên khỏi nhóm
 *     description: Xóa một người dùng khỏi nhóm Zalo. Yêu cầu API Key.
 *     tags: [Zalo]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ownId
 *               - groupId
 *               - userId
 *             properties:
 *               ownId:
 *                 type: string
 *                 description: ID tài khoản Zalo đang đăng nhập
 *               groupId:
 *                 type: string
 *                 description: ID nhóm
 *               userId:
 *                 type: string
 *                 description: ID người dùng cần xóa
 *     responses:
 *       200:
 *         description: Đã xóa thành viên
 *       401:
 *         description: Unauthorized
 */
router.post('/removeUserFromGroup', apiAccessMiddleware, removeUserFromGroup);

/**
 * @swagger
 * /api/sendImageToUser:
 *   post:
 *     summary: Gửi hình ảnh đến người dùng
 *     description: Gửi một hình ảnh đến người dùng Zalo. Yêu cầu API Key.
 *     tags: [Zalo]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ownId
 *               - userId
 *               - imageUrl
 *             properties:
 *               ownId:
 *                 type: string
 *                 description: ID tài khoản Zalo đang đăng nhập
 *               userId:
 *                 type: string
 *                 description: ID người dùng nhận
 *               imageUrl:
 *                 type: string
 *                 description: URL hình ảnh
 *                 example: "https://example.com/image.jpg"
 *               message:
 *                 type: string
 *                 description: Caption cho hình ảnh
 *     responses:
 *       200:
 *         description: Hình ảnh đã được gửi
 *       401:
 *         description: Unauthorized
 */
router.post('/sendImageToUser', apiAccessMiddleware, sendImageToUser);

/**
 * @swagger
 * /api/sendImagesToUser:
 *   post:
 *     summary: Gửi nhiều hình ảnh đến người dùng
 *     description: Gửi nhiều hình ảnh đến người dùng Zalo. Yêu cầu API Key.
 *     tags: [Zalo]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ownId
 *               - userId
 *               - imageUrls
 *             properties:
 *               ownId:
 *                 type: string
 *               userId:
 *                 type: string
 *               imageUrls:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["https://example.com/img1.jpg", "https://example.com/img2.jpg"]
 *     responses:
 *       200:
 *         description: Hình ảnh đã được gửi
 *       401:
 *         description: Unauthorized
 */
router.post('/sendImagesToUser', apiAccessMiddleware, sendImagesToUser);

/**
 * @swagger
 * /api/sendImageToGroup:
 *   post:
 *     summary: Gửi hình ảnh đến nhóm
 *     description: Gửi một hình ảnh đến nhóm Zalo. Yêu cầu API Key.
 *     tags: [Zalo]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ownId
 *               - groupId
 *               - imageUrl
 *             properties:
 *               ownId:
 *                 type: string
 *               groupId:
 *                 type: string
 *               imageUrl:
 *                 type: string
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: Hình ảnh đã được gửi
 *       401:
 *         description: Unauthorized
 */
router.post('/sendImageToGroup', apiAccessMiddleware, sendImageToGroup);

/**
 * @swagger
 * /api/sendImagesToGroup:
 *   post:
 *     summary: Gửi nhiều hình ảnh đến nhóm
 *     description: Gửi nhiều hình ảnh đến nhóm Zalo. Yêu cầu API Key.
 *     tags: [Zalo]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ownId
 *               - groupId
 *               - imageUrls
 *             properties:
 *               ownId:
 *                 type: string
 *               groupId:
 *                 type: string
 *               imageUrls:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Hình ảnh đã được gửi
 *       401:
 *         description: Unauthorized
 */
router.post('/sendImagesToGroup', apiAccessMiddleware, sendImagesToGroup);

// ==================== ZALO LOGIN API ====================
import { loginZaloAccount, zaloAccounts, logoutZaloAccount } from '../services/zaloService.js';

/**
 * @swagger
 * /api/zalo/login:
 *   post:
 *     summary: Đăng nhập tài khoản Zalo (QR Code)
 *     description: |
 *       Bắt đầu quá trình đăng nhập Zalo bằng QR Code. 
 *       API sẽ trả về QR code base64, người dùng quét bằng app Zalo để đăng nhập.
 *       Sau khi quét thành công, tài khoản sẽ được thêm vào hệ thống.
 *     tags: [Zalo Login]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               proxy:
 *                 type: string
 *                 description: Proxy URL (tùy chọn)
 *                 example: "http://user:pass@proxy.example.com:8080"
 *               trackingId:
 *                 type: string
 *                 description: ID tracking để nhận callback
 *     responses:
 *       200:
 *         description: QR Code đã được tạo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 qrCodeImage:
 *                   type: string
 *                   description: QR code dạng base64 data URL
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Lỗi tạo QR code
 */
router.post('/zalo/login', apiAccessMiddleware, async (req, res) => {
    const { proxy, trackingId } = req.body;
    
    try {
        // Tạo QR và đợi kết quả đăng nhập
        let qrSent = false;
        
        const result = await loginZaloAccount(proxy, null, trackingId, (qrCodeImage) => {
            // Callback khi có QR code - gửi ngay về client
            if (!qrSent) {
                qrSent = true;
                res.json({
                    success: true,
                    qrCodeImage,
                    message: 'QR Code đã được tạo. Vui lòng quét bằng app Zalo để đăng nhập.'
                });
            }
        });
        
        // Nếu đăng nhập bằng cookie thành công (không cần QR)
        if (!qrSent && result) {
            return res.json({
                success: true,
                message: 'Đăng nhập thành công',
                account: {
                    ownId: result.ownId,
                    phoneNumber: result.phoneNumber
                }
            });
        }
        
    } catch (error) {
        console.error('Lỗi đăng nhập Zalo:', error);
        if (!res.headersSent) {
            return res.status(500).json({
                success: false,
                message: error.message || 'Lỗi đăng nhập Zalo'
            });
        }
    }
});

/**
 * @swagger
 * /api/zalo/accounts:
 *   get:
 *     summary: Lấy danh sách tài khoản Zalo đã đăng nhập
 *     description: Trả về danh sách tất cả tài khoản Zalo đang hoạt động trong hệ thống.
 *     tags: [Zalo Login]
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
 *                       isOnline:
 *                         type: boolean
 *       401:
 *         description: Unauthorized
 */
router.get('/zalo/accounts', apiAccessMiddleware, (req, res) => {
    const accounts = zaloAccounts.map(acc => ({
        ownId: acc.ownId,
        phoneNumber: acc.phoneNumber,
        proxy: acc.proxy || 'Không có',
        isOnline: !!(acc.api && acc.api.listener)
    }));
    
    res.json({
        success: true,
        accounts,
        total: accounts.length
    });
});

/**
 * @swagger
 * /api/zalo/accounts/{ownId}:
 *   delete:
 *     summary: Đăng xuất tài khoản Zalo
 *     description: Đăng xuất và xóa tài khoản Zalo khỏi hệ thống.
 *     tags: [Zalo Login]
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
 *         description: Đăng xuất thành công
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Không tìm thấy tài khoản
 */
router.delete('/zalo/accounts/:ownId', apiAccessMiddleware, async (req, res) => {
    const { ownId } = req.params;
    
    try {
        const result = await logoutZaloAccount(ownId);
        
        if (result.success) {
            return res.json({
                success: true,
                message: `Đã đăng xuất tài khoản ${ownId}`
            });
        } else {
            return res.status(404).json({
                success: false,
                message: result.message || 'Không tìm thấy tài khoản'
            });
        }
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || 'Lỗi đăng xuất'
        });
    }
});

export default router;
