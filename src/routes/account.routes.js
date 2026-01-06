// routes/account.routes.js - Zalo account management routes
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
 *     summary: Get a list of logged-in Zalo accounts
 *     tags: [Account]
 *     responses:
 *       200:
 *         description: List of accounts
 */
router.get('/', apiAccessMiddleware, getLoggedAccounts);

/**
 * @swagger
 * /api/accounts/{ownId}:
 *   get:
 *     summary: Get details of a specific Zalo account
 *     tags: [Account]
 *     parameters:
 *       - in: path
 *         name: ownId
 *         required: true
 *         schema:
 *           type: string
 */
router.get('/:ownId', apiAccessMiddleware, getAccountDetails);

/**
 * @swagger
 * /api/accounts/{ownId}:
 *   delete:
 *     summary: Delete a logged-in Zalo account
 *     tags: [Account]
 */
router.delete('/:ownId', apiAccessMiddleware, deleteAccount);

// N8N-friendly wrapper APIs
router.post('/findUser', apiAccessMiddleware, findUserByAccount);
router.post('/sendMessage', apiAccessMiddleware, sendMessageByAccount);
router.post('/sendImage', apiAccessMiddleware, sendImageByAccount);
router.post('/getUserInfo', apiAccessMiddleware, getUserInfoByAccount);
router.post('/sendFriendRequest', apiAccessMiddleware, sendFriendRequestByAccount);
router.post('/createGroup', apiAccessMiddleware, createGroupByAccount);
router.post('/getGroupInfo', apiAccessMiddleware, getGroupInfoByAccount);
router.post('/addUserToGroup', apiAccessMiddleware, addUserToGroupByAccount);
router.post('/removeUserFromGroup', apiAccessMiddleware, removeUserFromGroupByAccount);
router.post('/sendImageToUser', apiAccessMiddleware, sendImageToUserByAccount);
router.post('/sendImagesToUser', apiAccessMiddleware, sendImagesToUserByAccount);
router.post('/sendImageToGroup', apiAccessMiddleware, sendImageToGroupByAccount);
router.post('/sendImagesToGroup', apiAccessMiddleware, sendImagesToGroupByAccount);

/**
 * @swagger
 * /api/accounts/action:
 *   post:
 *     summary: Execute an action on a specific Zalo account
 *     tags: [Account]
 */
router.post('/action', apiAccessMiddleware, handleAccountAction);

export default router;
