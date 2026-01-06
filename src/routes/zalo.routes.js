// routes/zalo.routes.js - Legacy Zalo API routes (ownId-based)
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
 *     summary: Find a Zalo user by phone number
 *     tags: [Zalo]
 */
router.post('/findUser', apiAccessMiddleware, findUser);

/**
 * @swagger
 * /api/getUserInfo:
 *   post:
 *     summary: Get information about a Zalo user
 *     tags: [Zalo]
 */
router.post('/getUserInfo', apiAccessMiddleware, getUserInfo);

/**
 * @swagger
 * /api/sendFriendRequest:
 *   post:
 *     summary: Send a friend request
 *     tags: [Zalo]
 */
router.post('/sendFriendRequest', apiAccessMiddleware, sendFriendRequest);

/**
 * @swagger
 * /api/sendmessage:
 *   post:
 *     summary: Send a message
 *     tags: [Zalo]
 */
router.post('/sendmessage', apiAccessMiddleware, sendMessage);

/**
 * @swagger
 * /api/createGroup:
 *   post:
 *     summary: Create a new group
 *     tags: [Zalo]
 */
router.post('/createGroup', apiAccessMiddleware, createGroup);

/**
 * @swagger
 * /api/getGroupInfo:
 *   post:
 *     summary: Get group information
 *     tags: [Zalo]
 */
router.post('/getGroupInfo', apiAccessMiddleware, getGroupInfo);

/**
 * @swagger
 * /api/addUserToGroup:
 *   post:
 *     summary: Add a user to a group
 *     tags: [Zalo]
 */
router.post('/addUserToGroup', apiAccessMiddleware, addUserToGroup);

/**
 * @swagger
 * /api/removeUserFromGroup:
 *   post:
 *     summary: Remove a user from a group
 *     tags: [Zalo]
 */
router.post('/removeUserFromGroup', apiAccessMiddleware, removeUserFromGroup);

/**
 * @swagger
 * /api/sendImageToUser:
 *   post:
 *     summary: Send an image to a user
 *     tags: [Zalo]
 */
router.post('/sendImageToUser', apiAccessMiddleware, sendImageToUser);

/**
 * @swagger
 * /api/sendImagesToUser:
 *   post:
 *     summary: Send multiple images to a user
 *     tags: [Zalo]
 */
router.post('/sendImagesToUser', apiAccessMiddleware, sendImagesToUser);

/**
 * @swagger
 * /api/sendImageToGroup:
 *   post:
 *     summary: Send an image to a group
 *     tags: [Zalo]
 */
router.post('/sendImageToGroup', apiAccessMiddleware, sendImageToGroup);

/**
 * @swagger
 * /api/sendImagesToGroup:
 *   post:
 *     summary: Send multiple images to a group
 *     tags: [Zalo]
 */
router.post('/sendImagesToGroup', apiAccessMiddleware, sendImagesToGroup);

// Legacy N8N-friendly wrappers (kept for backward compatibility)
import {
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

router.post('/findUserByAccount', apiAccessMiddleware, findUserByAccount);
router.post('/sendMessageByAccount', apiAccessMiddleware, sendMessageByAccount);
router.post('/sendImageByAccount', apiAccessMiddleware, sendImageByAccount);
router.post('/getUserInfoByAccount', apiAccessMiddleware, getUserInfoByAccount);
router.post('/sendFriendRequestByAccount', apiAccessMiddleware, sendFriendRequestByAccount);
router.post('/createGroupByAccount', apiAccessMiddleware, createGroupByAccount);
router.post('/getGroupInfoByAccount', apiAccessMiddleware, getGroupInfoByAccount);
router.post('/addUserToGroupByAccount', apiAccessMiddleware, addUserToGroupByAccount);
router.post('/removeUserFromGroupByAccount', apiAccessMiddleware, removeUserFromGroupByAccount);
router.post('/sendImageToUserByAccount', apiAccessMiddleware, sendImageToUserByAccount);
router.post('/sendImagesToUserByAccount', apiAccessMiddleware, sendImagesToUserByAccount);
router.post('/sendImageToGroupByAccount', apiAccessMiddleware, sendImageToGroupByAccount);
router.post('/sendImagesToGroupByAccount', apiAccessMiddleware, sendImagesToGroupByAccount);
router.post('/account/action', apiAccessMiddleware, handleAccountAction);

export default router;
