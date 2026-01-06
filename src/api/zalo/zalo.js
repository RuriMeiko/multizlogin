// api/zalo/zalo.js
import { Zalo, ThreadType } from 'zca-js';
import { getPROXIES, getAvailableProxyIndex } from '../../services/proxyService.js';
import { setupEventListeners } from '../../eventListeners.js';
import { HttpsProxyAgent } from "https-proxy-agent";
import nodefetch from "node-fetch";
import fs from 'fs';
import { saveImage, removeImage } from '../../utils/helpers.js';

export const zaloAccounts = [];

// API để lấy danh sách tài khoản đã đăng nhập
export async function getLoggedAccounts(req, res) {
    try {
        const accounts = zaloAccounts.map(acc => ({
            ownId: acc.ownId,
            phoneNumber: acc.phoneNumber,
            proxy: acc.proxy || 'Không có proxy',
            displayName: `${acc.phoneNumber} (${acc.ownId})`,
            isOnline: acc.api ? true : false
        }));

        res.json({
            success: true,
            data: accounts,
            total: accounts.length
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

// API để lấy thông tin chi tiết một tài khoản
export async function getAccountDetails(req, res) {
    try {
        const { ownId } = req.params;
        const account = zaloAccounts.find(acc => acc.ownId === ownId);

        if (!account) {
            return res.status(404).json({ error: 'Không tìm thấy tài khoản' });
        }

        // Lấy thông tin profile từ API
        const accountInfo = await account.api.fetchAccountInfo();

        res.json({
            success: true,
            data: {
                ownId: account.ownId,
                phoneNumber: account.phoneNumber,
                proxy: account.proxy || 'Không có proxy',
                profile: accountInfo?.profile || {},
                isOnline: account.api ? true : false
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

// API xóa tài khoản đã đăng nhập
export async function deleteAccount(req, res) {
    try {
        const { ownId } = req.params;
        const accountIndex = zaloAccounts.findIndex(acc => acc.ownId === ownId);

        if (accountIndex === -1) {
            return res.status(404).json({ error: 'Không tìm thấy tài khoản' });
        }

        // Xóa file cookie
        const cookiesDir = './data/cookies';
        const cookieFile = `${cookiesDir}/cred_${ownId}.json`;
        if (fs.existsSync(cookieFile)) {
            try {
                fs.unlinkSync(cookieFile);
                console.log(`Đã xóa file cookie: ${cookieFile}`);
            } catch (err) {
                console.error(`Lỗi khi xóa file cookie ${cookieFile}:`, err);
                // Vẫn tiếp tục xóa khỏi bộ nhớ ngay cả khi lỗi xóa file
            }
        }

        // Xóa khỏi danh sách zaloAccounts
        zaloAccounts.splice(accountIndex, 1);
        console.log(`Đã xóa tài khoản ${ownId} khỏi danh sách`);

        res.json({
            success: true,
            message: `Đã xóa tài khoản ${ownId} thành công`
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

// ===== N8N-FRIENDLY WRAPPER APIs =====
// Các API này sử dụng account selection thay vì ownId

// Middleware để xử lý account selection
function getAccountFromSelection(accountSelection) {
    if (!accountSelection) {
        throw new Error('Vui lòng chọn tài khoản');
    }

    // Hỗ trợ cả ownId và phoneNumber
    let account = zaloAccounts.find(acc => acc.ownId === accountSelection);
    if (!account) {
        account = zaloAccounts.find(acc => acc.phoneNumber === accountSelection);
    }

    if (!account) {
        throw new Error(`Không tìm thấy tài khoản: ${accountSelection}`);
    }

    return account;
}

// API tìm user với account selection
export async function findUserByAccount(req, res) {
    try {
        const { phone, accountSelection } = req.body;

        if (!phone) {
            return res.status(400).json({ error: 'Số điện thoại là bắt buộc' });
        }

        const account = getAccountFromSelection(accountSelection);
        const userData = await account.api.findUser(phone);

        res.json({
            success: true,
            data: userData,
            usedAccount: {
                ownId: account.ownId,
                phoneNumber: account.phoneNumber
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

// API gửi tin nhắn với account selection
export async function sendMessageByAccount(req, res) {
    try {
        const { message, threadId, type, accountSelection } = req.body;

        if (!message || !threadId) {
            return res.status(400).json({ error: 'Tin nhắn và threadId là bắt buộc' });
        }

        const account = getAccountFromSelection(accountSelection);
        const msgType = type || ThreadType.User;
        const result = await account.api.sendMessage(message, threadId, msgType);

        res.json({
            success: true,
            data: result,
            usedAccount: {
                ownId: account.ownId,
                phoneNumber: account.phoneNumber
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

// API gửi hình ảnh với account selection
export async function sendImageByAccount(req, res) {
    let imagePath = null;
    try {
        const { imagePath: imageUrl, threadId, type, accountSelection } = req.body;

        if (!imageUrl || !threadId) {
            return res.status(400).json({ error: 'Đường dẫn hình ảnh và threadId là bắt buộc' });
        }

        const account = getAccountFromSelection(accountSelection);
        imagePath = await saveImage(imageUrl);

        if (!imagePath) {
            return res.status(500).json({ success: false, error: 'Không thể lưu hình ảnh' });
        }

        const threadType = type === 'group' ? ThreadType.Group : ThreadType.User;
        const result = await account.api.sendMessage(
            {
                msg: "",
                attachments: [imagePath]
            },
            threadId,
            threadType
        );

        res.json({
            success: true,
            data: result,
            usedAccount: {
                ownId: account.ownId,
                phoneNumber: account.phoneNumber
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    } finally {
        // Đảm bảo cleanup temp file trong mọi trường hợp
        if (imagePath) {
            removeImage(imagePath);
        }
    }
}

// API lấy thông tin user với account selection
export async function getUserInfoByAccount(req, res) {
    try {
        const { userId, accountSelection } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'UserId là bắt buộc' });
        }

        const account = getAccountFromSelection(accountSelection);
        const info = await account.api.getUserInfo(userId);

        res.json({
            success: true,
            data: info,
            usedAccount: {
                ownId: account.ownId,
                phoneNumber: account.phoneNumber
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

// API gửi lời mời kết bạn với account selection
export async function sendFriendRequestByAccount(req, res) {
    try {
        const { userId, message, accountSelection } = req.body;

        if (!userId) {
            return res.status(400).json({ error: 'UserId là bắt buộc' });
        }

        const account = getAccountFromSelection(accountSelection);
        const friendMessage = message || 'Xin chào, hãy kết bạn với tôi!';
        const result = await account.api.sendFriendRequest(friendMessage, userId);

        res.json({
            success: true,
            data: result,
            usedAccount: {
                ownId: account.ownId,
                phoneNumber: account.phoneNumber
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

// API tạo nhóm với account selection
export async function createGroupByAccount(req, res) {
    try {
        const { members, name, avatarPath, accountSelection } = req.body;

        if (!members || !Array.isArray(members) || members.length === 0) {
            return res.status(400).json({ error: 'Danh sách thành viên là bắt buộc' });
        }

        const account = getAccountFromSelection(accountSelection);
        const result = await account.api.createGroup({ members, name, avatarPath });

        res.json({
            success: true,
            data: result,
            usedAccount: {
                ownId: account.ownId,
                phoneNumber: account.phoneNumber
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

// API lấy thông tin nhóm với account selection
export async function getGroupInfoByAccount(req, res) {
    try {
        const { groupId, accountSelection } = req.body;

        if (!groupId || (Array.isArray(groupId) && groupId.length === 0)) {
            return res.status(400).json({ error: 'GroupId là bắt buộc' });
        }

        const account = getAccountFromSelection(accountSelection);
        const result = await account.api.getGroupInfo(groupId);

        res.json({
            success: true,
            data: result,
            usedAccount: {
                ownId: account.ownId,
                phoneNumber: account.phoneNumber
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

// API thêm thành viên vào nhóm với account selection
export async function addUserToGroupByAccount(req, res) {
    try {
        const { groupId, memberId, accountSelection } = req.body;

        if (!groupId || !memberId || (Array.isArray(memberId) && memberId.length === 0)) {
            return res.status(400).json({ error: 'GroupId và memberId là bắt buộc' });
        }

        const account = getAccountFromSelection(accountSelection);
        const result = await account.api.addUserToGroup(memberId, groupId);

        res.json({
            success: true,
            data: result,
            usedAccount: {
                ownId: account.ownId,
                phoneNumber: account.phoneNumber
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

// API xóa thành viên khỏi nhóm với account selection
export async function removeUserFromGroupByAccount(req, res) {
    try {
        const { memberId, groupId, accountSelection } = req.body;

        if (!groupId || !memberId || (Array.isArray(memberId) && memberId.length === 0)) {
            return res.status(400).json({ error: 'GroupId và memberId là bắt buộc' });
        }

        const account = getAccountFromSelection(accountSelection);
        const result = await account.api.removeUserFromGroup(memberId, groupId);

        res.json({
            success: true,
            data: result,
            usedAccount: {
                ownId: account.ownId,
                phoneNumber: account.phoneNumber
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

// API gửi hình ảnh đến user với account selection
export async function sendImageToUserByAccount(req, res) {
    try {
        const { imagePath: imageUrl, threadId, accountSelection } = req.body;

        if (!imageUrl || !threadId) {
            return res.status(400).json({ error: 'Đường dẫn hình ảnh và threadId là bắt buộc' });
        }

        const account = getAccountFromSelection(accountSelection);
        const imagePath = await saveImage(imageUrl);

        if (!imagePath) {
            return res.status(500).json({ success: false, error: 'Không thể lưu hình ảnh' });
        }

        const result = await account.api.sendMessage(
            {
                msg: "",
                attachments: [imagePath]
            },
            threadId,
            ThreadType.User
        );

        removeImage(imagePath);

        res.json({
            success: true,
            data: result,
            usedAccount: {
                ownId: account.ownId,
                phoneNumber: account.phoneNumber
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

// API gửi nhiều hình ảnh đến user với account selection
export async function sendImagesToUserByAccount(req, res) {
    try {
        const { imagePaths: imageUrls, threadId, accountSelection } = req.body;

        if (!imageUrls || !threadId || !Array.isArray(imageUrls) || imageUrls.length === 0) {
            return res.status(400).json({ error: 'Danh sách hình ảnh và threadId là bắt buộc' });
        }

        const account = getAccountFromSelection(accountSelection);
        const imagePaths = [];

        for (const imageUrl of imageUrls) {
            const imagePath = await saveImage(imageUrl);
            if (!imagePath) {
                // Clean up any saved images
                for (const path of imagePaths) {
                    removeImage(path);
                }
                return res.status(500).json({ success: false, error: 'Không thể lưu một hoặc nhiều hình ảnh' });
            }
            imagePaths.push(imagePath);
        }

        const result = await account.api.sendMessage(
            {
                msg: "",
                attachments: imagePaths
            },
            threadId,
            ThreadType.User
        );

        for (const imagePath of imagePaths) {
            removeImage(imagePath);
        }

        res.json({
            success: true,
            data: result,
            usedAccount: {
                ownId: account.ownId,
                phoneNumber: account.phoneNumber
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

// API gửi hình ảnh đến nhóm với account selection
export async function sendImageToGroupByAccount(req, res) {
    try {
        const { imagePath: imageUrl, threadId, accountSelection } = req.body;

        if (!imageUrl || !threadId) {
            return res.status(400).json({ error: 'Đường dẫn hình ảnh và threadId là bắt buộc' });
        }

        const account = getAccountFromSelection(accountSelection);
        const imagePath = await saveImage(imageUrl);

        if (!imagePath) {
            return res.status(500).json({ success: false, error: 'Không thể lưu hình ảnh' });
        }

        const result = await account.api.sendMessage(
            {
                msg: "",
                attachments: [imagePath]
            },
            threadId,
            ThreadType.Group
        );

        removeImage(imagePath);

        res.json({
            success: true,
            data: result,
            usedAccount: {
                ownId: account.ownId,
                phoneNumber: account.phoneNumber
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

// API gửi nhiều hình ảnh đến nhóm với account selection
export async function sendImagesToGroupByAccount(req, res) {
    try {
        const { imagePaths: imageUrls, threadId, accountSelection } = req.body;

        if (!imageUrls || !threadId || !Array.isArray(imageUrls) || imageUrls.length === 0) {
            return res.status(400).json({ error: 'Danh sách hình ảnh và threadId là bắt buộc' });
        }

        const account = getAccountFromSelection(accountSelection);
        const imagePaths = [];

        for (const imageUrl of imageUrls) {
            const imagePath = await saveImage(imageUrl);
            if (!imagePath) {
                // Clean up any saved images
                for (const path of imagePaths) {
                    removeImage(path);
                }
                return res.status(500).json({ success: false, error: 'Không thể lưu một hoặc nhiều hình ảnh' });
            }
            imagePaths.push(imagePath);
        }

        const result = await account.api.sendMessage(
            {
                msg: "",
                attachments: imagePaths
            },
            threadId,
            ThreadType.Group
        );

        for (const imagePath of imagePaths) {
            removeImage(imagePath);
        }

        res.json({
            success: true,
            data: result,
            usedAccount: {
                ownId: account.ownId,
                phoneNumber: account.phoneNumber
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

export async function findUser(req, res) {
    try {
        const { phone, ownId } = req.body;
        if (!phone || !ownId) {
            return res.status(400).json({ error: 'Dữ liệu không hợp lệ' });
        }
        const account = zaloAccounts.find(acc => acc.ownId === ownId);
        if (!account) {
            return res.status(400).json({ error: 'Không tìm thấy tài khoản Zalo với OwnId này' });
        }
        const userData = await account.api.findUser(phone);
        res.json({ success: true, data: userData });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

export async function getUserInfo(req, res) {
    try {
        const { userId, ownId } = req.body;
        if (!userId || !ownId) {
            return res.status(400).json({ error: 'Dữ liệu không hợp lệ' });
        }
        const account = zaloAccounts.find(acc => acc.ownId === ownId);
        if (!account) {
            return res.status(400).json({ error: 'Không tìm thấy tài khoản Zalo với OwnId này' });
        }
        const info = await account.api.getUserInfo(userId);
        res.json({ success: true, data: info });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

export async function sendFriendRequest(req, res) {
    try {
        const { userId, ownId } = req.body;
        if (!userId || !ownId) {
            return res.status(400).json({ error: 'Dữ liệu không hợp lệ' });
        }
        const account = zaloAccounts.find(acc => acc.ownId === ownId);
        if (!account) {
            return res.status(400).json({ error: 'Không tìm thấy tài khoản Zalo với OwnId này' });
        }
        const result = await account.api.sendFriendRequest('Xin chào, hãy kết bạn với tôi!', userId);
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

export async function sendMessage(req, res) {
    try {
        const { message, threadId, type, ownId } = req.body;
        if (!message || !threadId || !ownId) {
            return res.status(400).json({ error: 'Dữ liệu không hợp lệ' });
        }
        const account = zaloAccounts.find(acc => acc.ownId === ownId);
        if (!account) {
            return res.status(400).json({ error: 'Không tìm thấy tài khoản Zalo với OwnId này' });
        }
        const msgType = type || ThreadType.User;
        const result = await account.api.sendMessage(message, threadId, msgType);
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

export async function createGroup(req, res) {
    try {
        const { members, name, avatarPath, ownId } = req.body;
        // Kiểm tra dữ liệu hợp lệ
        if (!members || !Array.isArray(members) || members.length === 0 || !ownId) {
            return res.status(400).json({ error: 'Dữ liệu không hợp lệ' });
        }
        const account = zaloAccounts.find(acc => acc.ownId === ownId);
        if (!account) {
            return res.status(400).json({ error: 'Không tìm thấy tài khoản Zalo với OwnId này' });
        }
        // Gọi API createGroup từ zaloAccounts
        const result = await account.api.createGroup({ members, name, avatarPath });
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

export async function getGroupInfo(req, res) {
    try {
        const { groupId, ownId } = req.body;
        // Kiểm tra dữ liệu: groupId phải tồn tại và nếu là mảng thì không rỗng
        if (!groupId || (Array.isArray(groupId) && groupId.length === 0)) {
            return res.status(400).json({ error: 'Dữ liệu không hợp lệ' });
        }
        const account = zaloAccounts.find(acc => acc.ownId === ownId);
        if (!account) {
            return res.status(400).json({ error: 'Không tìm thấy tài khoản Zalo với OwnId này' });
        }
        // Gọi API getGroupInfo từ zaloAccounts
        const result = await account.api.getGroupInfo(groupId);
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

export async function addUserToGroup(req, res) {
    try {
        const { groupId, memberId, ownId } = req.body;
        // Kiểm tra dữ liệu hợp lệ: groupId và memberId không được bỏ trống
        if (!groupId || !memberId || (Array.isArray(memberId) && memberId.length === 0)) {
            return res.status(400).json({ error: 'Dữ liệu không hợp lệ' });
        }
        const account = zaloAccounts.find(acc => acc.ownId === ownId);
        if (!account) {
            return res.status(400).json({ error: 'Không tìm thấy tài khoản Zalo với OwnId này' });
        }
        // Gọi API addUserToGroup từ zaloAccounts
        const result = await account.api.addUserToGroup(memberId, groupId);
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

export async function removeUserFromGroup(req, res) {
    try {
        const { memberId, groupId, ownId } = req.body;
        // Kiểm tra dữ liệu: groupId và memberId phải được cung cấp, nếu memberId là mảng thì không được rỗng
        if (!groupId || !memberId || (Array.isArray(memberId) && memberId.length === 0)) {
            return res.status(400).json({ error: 'Dữ liệu không hợp lệ' });
        }
        const account = zaloAccounts.find(acc => acc.ownId === ownId);
        if (!account) {
            return res.status(400).json({ error: 'Không tìm thấy tài khoản Zalo với OwnId này' });
        }
        // Gọi API removeUserFromGroup từ zaloAccounts
        const result = await account.api.removeUserFromGroup(memberId, groupId);
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

// Hàm gửi một hình ảnh đến người dùng
export async function sendImageToUser(req, res) {
    try {
        const { imagePath: imageUrl, threadId, ownId } = req.body;
        if (!imageUrl || !threadId || !ownId) {
            return res.status(400).json({ error: 'Dữ liệu không hợp lệ: imagePath và threadId là bắt buộc' });
        }


        const imagePath = await saveImage(imageUrl);
        if (!imagePath) return res.status(500).json({ success: false, error: 'Failed to save image' });

        const account = zaloAccounts.find(acc => acc.ownId === ownId);
        if (!account) {
            return res.status(400).json({ error: 'Không tìm thấy tài khoản Zalo với OwnId này' });
        }

        const result = await account.api.sendMessage(
            {
                msg: "",
                attachments: [imagePath]
            },
            threadId,
            ThreadType.User
        ).catch(console.error);

        removeImage(imagePath);
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

// Hàm gửi nhiều hình ảnh đến người dùng
export async function sendImagesToUser(req, res) {
    try {
        const { imagePaths: imageUrls, threadId, ownId } = req.body;
        if (!imageUrls || !threadId || !ownId || !Array.isArray(imageUrls) || imageUrls.length === 0) {
            return res.status(400).json({ error: 'Dữ liệu không hợp lệ: imagePaths phải là mảng không rỗng và threadId là bắt buộc' });
        }


        const imagePaths = [];
        for (const imageUrl of imageUrls) {
            const imagePath = await saveImage(imageUrl);
            if (!imagePath) {
                // Clean up any saved images
                for (const path of imagePaths) {
                    removeImage(path);
                }
                return res.status(500).json({ success: false, error: 'Failed to save one or more images' });
            }
            imagePaths.push(imagePath);
        }

        const account = zaloAccounts.find(acc => acc.ownId === ownId);
        if (!account) {
            return res.status(400).json({ error: 'Không tìm thấy tài khoản Zalo với OwnId này' });
        }

        const result = await account.api.sendMessage(
            {
                msg: "",
                attachments: imagePaths
            },
            threadId,
            ThreadType.User
        ).catch(console.error);

        for (const imagePath of imagePaths) {
            removeImage(imagePath);
        }
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

// Hàm gửi một hình ảnh đến nhóm
export async function sendImageToGroup(req, res) {
    try {
        const { imagePath: imageUrl, threadId, ownId } = req.body;
        if (!imageUrl || !threadId || !ownId) {
            return res.status(400).json({ error: 'Dữ liệu không hợp lệ: imagePath và threadId là bắt buộc' });
        }


        const imagePath = await saveImage(imageUrl);
        if (!imagePath) return res.status(500).json({ success: false, error: 'Failed to save image' });

        const account = zaloAccounts.find(acc => acc.ownId === ownId);
        if (!account) {
            return res.status(400).json({ error: 'Không tìm thấy tài khoản Zalo với OwnId này' });
        }

        const result = await account.api.sendMessage(
            {
                msg: "",
                attachments: [imagePath]
            },
            threadId,
            ThreadType.Group
        ).catch(console.error);

        removeImage(imagePath);
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

// Hàm gửi nhiều hình ảnh đến nhóm
export async function sendImagesToGroup(req, res) {
    try {
        const { imagePaths: imageUrls, threadId, ownId } = req.body;
        if (!imageUrls || !threadId || !ownId || !Array.isArray(imageUrls) || imageUrls.length === 0) {
            return res.status(400).json({ error: 'Dữ liệu không hợp lệ: imagePaths phải là mảng không rỗng và threadId là bắt buộc' });
        }


        const imagePaths = [];
        for (const imageUrl of imageUrls) {
            const imagePath = await saveImage(imageUrl);
            if (!imagePath) {
                // Clean up any saved images
                for (const path of imagePaths) {
                    removeImage(path);
                }
                return res.status(500).json({ success: false, error: 'Failed to save one or more images' });
            }
            imagePaths.push(imagePath);
        }

        const account = zaloAccounts.find(acc => acc.ownId === ownId);
        if (!account) {
            return res.status(400).json({ error: 'Không tìm thấy tài khoản Zalo với OwnId này' });
        }

        const result = await account.api.sendMessage(
            {
                msg: "",
                attachments: imagePaths
            },
            threadId,
            ThreadType.Group
        ).catch(console.error);

        for (const imagePath of imagePaths) {
            removeImage(imagePath);
        }
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

// API webhook để tương tác với tài khoản
export async function handleAccountAction(req, res) {
    try {
        const { accountSelection, action, data } = req.body;

        if (!action) {
            return res.status(400).json({ error: 'Action is required' });
        }

        const account = getAccountFromSelection(accountSelection);
        const api = account.api;
        let result;

        switch (action) {
            case 'sendMessage': {
                // data: { message, threadId, type (optional), quote (optional) }
                const { message, threadId, type, quote } = data;
                if (!message || !threadId) throw new Error('Missing message or threadId');
                
                const msgType = type === 'group' ? ThreadType.Group : ThreadType.User;
                const msgContent = typeof message === 'string' ? { msg: message, quote } : message;
                
                result = await api.sendMessage(msgContent, threadId, msgType);
                break;
            }

            case 'sendTyping': {
                // data: { threadId, type (optional) }
                const { threadId, type } = data;
                if (!threadId) throw new Error('Missing threadId');
                
                const msgType = type === 'group' ? ThreadType.Group : ThreadType.User;
                result = await api.sendTypingEvent(threadId, msgType);
                break;
            }
            
            case 'sendSticker': {
                 // data: { sticker, threadId, type (optional) }
                 // sticker can be object { id, cateId, type }
                 const { sticker, threadId, type } = data;
                 if (!sticker || !threadId) throw new Error('Missing sticker or threadId');

                 const msgType = type === 'group' ? ThreadType.Group : ThreadType.User;
                 result = await api.sendSticker(sticker, threadId, msgType);
                 break;
            }

            case 'findUser': {
                // data: { phoneNumber }
                const { phoneNumber } = data;
                if (!phoneNumber) throw new Error('Missing phoneNumber');
                result = await api.findUser(phoneNumber);
                break;
            }

            case 'getUserInfo': {
                // data: { userId }
                const { userId } = data;
                if (!userId) throw new Error('Missing userId');
                result = await api.getUserInfo(userId);
                break;
            }

            case 'getGroupInfo': {
                // data: { groupId }
                const { groupId } = data;
                if (!groupId) throw new Error('Missing groupId');
                result = await api.getGroupInfo(groupId);
                break;
            }

            case 'addReaction': {
                // data: { icon, dest: { data: { msgId, cliMsgId, ... }, threadId, type } }
                const { icon, dest } = data;
                // Basic validation, dest usually comes from a previous message event
                if (!icon || !dest) throw new Error('Missing icon or dest');
                
                // Map type string to enum if needed
                if (typeof dest.type === 'string') {
                    dest.type = dest.type === 'group' ? ThreadType.Group : ThreadType.User;
                }

                result = await api.addReaction(icon, dest);
                break;
            }

            case 'undo': {
                // data: { msgId, cliMsgId, threadId, type }
                const { msgId, cliMsgId, threadId, type } = data;
                if (!msgId || !cliMsgId || !threadId) throw new Error('Missing msgId, cliMsgId, or threadId');
                
                const msgType = type === 'group' ? ThreadType.Group : ThreadType.User;
                result = await api.undo({ msgId, cliMsgId }, threadId, msgType);
                break;
            }

            default:
                return res.status(400).json({ error: `Action '${action}' not supported` });
        }

        res.json({
            success: true,
            data: result,
            usedAccount: {
                ownId: account.ownId,
                phoneNumber: account.phoneNumber
            }
        });

    } catch (error) {
        console.error('Error in handleAccountAction:', error);
        res.status(500).json({ success: false, error: error.message, stack: error.stack });
    }
}

// Hàm gửi webhook khi đăng nhập thành công
async function sendLoginSuccessWebhook(profile, trackingId, customProxy, proxyUsed, useCustomProxy) {
    if (!process.env.WEBHOOK_LOGIN_SUCCESS) {
        console.warn('[Webhook] WEBHOOK_LOGIN_SUCCESS environment variable is not set. Skipping login webhook.');
        return;
    }

    try {
        if (!profile) {
            console.error('[Webhook] Không có thông tin profile để gửi webhook');
            return;
        }

        const phoneNumber = profile.phoneNumber;
        const ownId = profile.userId;
        const displayName = profile.displayName;

        const webhookPayload = {
            event: 'login_success',
            id: trackingId || null,
            data: {
                ownId,
                displayName,
                phoneNumber,
                proxy: useCustomProxy ? customProxy : (proxyUsed && proxyUsed.url)
            },
            timestamp: Date.now()
        };

        console.log(`[Webhook] Đang gửi thông báo đăng nhập thành công cho ${displayName} (${ownId}) tới ${process.env.WEBHOOK_LOGIN_SUCCESS}...`);
        const response = await nodefetch(process.env.WEBHOOK_LOGIN_SUCCESS, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(webhookPayload)
        });

        if (response.ok) {
            console.log(`[Webhook] Gửi thành công! Status: ${response.status}`);
        } else {
            console.error(`[Webhook] Gửi thất bại! Status: ${response.status}`);
        }
    } catch (error) {
        console.error('[Webhook] Lỗi khi gửi webhook đăng nhập:', error.message);
    }
}

export async function loginZaloAccount(customProxy, cred, trackingId) {
    let loginResolve;
    return new Promise(async (resolve, reject) => {
        console.log('Bắt đầu quá trình đăng nhập Zalo...');
        console.log('Custom proxy:', customProxy || 'không có');
        console.log('Đang nhập với cookie:', cred ? 'có' : 'không');

        loginResolve = resolve;
        let agent;
        let proxyUsed = null;
        let useCustomProxy = false;
        let proxies = [];
        try {
            const proxiesJson = fs.readFileSync('./data/proxies.json', 'utf8');
            proxies = JSON.parse(proxiesJson);
            console.log(`Đã đọc ${proxies.length} proxy từ file proxies.json`);
        } catch (error) {
            console.error("Không thể đọc hoặc phân tích cú pháp proxies.json:", error);
            console.log('Đang tạo file proxies.json trống...');
            if (!fs.existsSync('./data')) {
                fs.mkdirSync('./data', { recursive: true });
            }
            fs.writeFileSync('./data/proxies.json', '[]', 'utf8');
            proxies = [];
        }

        // Kiểm tra nếu người dùng nhập proxy
        if (customProxy && customProxy.trim() !== "") {
            try {
                // Sử dụng constructor URL để kiểm tra tính hợp lệ
                new URL(customProxy);
                useCustomProxy = true;
                console.log('Proxy nhập vào hợp lệ:', customProxy);

                // Kiểm tra xem proxy đã tồn tại trong mảng proxies chưa
                if (!proxies.includes(customProxy)) {
                    proxies.push(customProxy);
                    // Lưu mảng proxies đã cập nhật vào proxies.json
                    fs.writeFileSync('./data/proxies.json', JSON.stringify(proxies, null, 4), 'utf8');
                    console.log(`Đã thêm proxy mới vào proxies.json: ${customProxy}`);
                } else {
                    console.log(`Proxy đã tồn tại trong proxies.json: ${customProxy}`);
                }

            } catch (err) {
                console.log(`Proxy nhập vào không hợp lệ: ${customProxy}. Sẽ sử dụng proxy mặc định.`);
            }
        }

        if (useCustomProxy) {
            console.log('Sử dụng proxy tùy chỉnh:', customProxy);
            agent = new HttpsProxyAgent(customProxy);
        } else {
            // Chọn proxy tự động từ danh sách nếu không có proxy do người dùng nhập hợp lệ
            if (proxies.length > 0) {
                const proxyIndex = getAvailableProxyIndex();
                if (proxyIndex === -1) {
                    console.log('Tất cả proxy đều đã đủ tài khoản. Không thể đăng nhập thêm!');
                } else {
                    proxyUsed = getPROXIES()[proxyIndex];
                    console.log('Sử dụng proxy tự động:', proxyUsed.url);
                    agent = new HttpsProxyAgent(proxyUsed.url);
                }
            } else {
                console.log('Không có proxy nào có sẵn, sẽ đăng nhập không qua proxy');
                agent = null; // Không sử dụng proxy
            }
        }
        let zalo;
        if (useCustomProxy || agent) {
            console.log('Khởi tạo Zalo SDK với proxy agent');
            zalo = new Zalo({
                agent: agent,
                // @ts-ignore
                polyfill: nodefetch,
                selfListen: true, // Enable self-listening for messages
            });
        } else {
            console.log('Khởi tạo Zalo SDK không có proxy');
            zalo = new Zalo({
                selfListen: true, // Enable self-listening for messages
            });
        }

        let api;
        try {
            if (cred) {
                console.log('Đang thử đăng nhập bằng cookie...');
                try {
                    api = await zalo.login(cred);
                    console.log('Đăng nhập bằng cookie thành công');
                } catch (error) {
                    console.error("Lỗi khi đăng nhập bằng cookie:", error);
                    console.log('Chuyển sang đăng nhập bằng mã QR...');
                    // If cookie login fails, attempt QR code login
                    api = await zalo.loginQR(null, (qrData) => {
                        console.log('Đã nhận dữ liệu QR:', qrData ? 'có dữ liệu' : 'không có dữ liệu');
                        if (qrData?.data?.image) {
                            const qrCodeImage = `data:image/png;base64,${qrData.data.image}`;
                            console.log('Đã tạo mã QR, độ dài:', qrCodeImage.length);
                            resolve(qrCodeImage);
                        }
                    });
                }
            } else {
                console.log('Đang tạo mã QR để đăng nhập...');
                api = await zalo.loginQR(null, (qrData) => {
                    console.log('Đã nhận dữ liệu QR:', qrData ? 'có dữ liệu' : 'không có dữ liệu');
                    if (qrData?.data?.image) {
                        const qrCodeImage = `data:image/png;base64,${qrData.data.image}`;
                        console.log('Đã tạo mã QR, độ dài:', qrCodeImage.length);
                        resolve(qrCodeImage);
                    }
                });
            }

            console.log('Thiết lập event listeners');
            setupEventListeners(api, loginResolve);
            
            // Thêm listener start với retryOnClose=true để tự động reconnect
            api.listener.start({ retryOnClose: true });
            
            // Thêm flag để track trạng thái listener
            api.listener.isStarted = true;

            // Nếu sử dụng proxy mặc định từ danh sách thì cập nhật usedCount
            if (!useCustomProxy && proxyUsed) {
                proxyUsed.usedCount++;
                proxyUsed.accounts.push(api);
                console.log(`Đã cập nhật proxy ${proxyUsed.url} với usedCount = ${proxyUsed.usedCount}`);
            }

            console.log('Đang lấy thông tin tài khoản...');
            const accountInfo = await api.fetchAccountInfo();
            if (!accountInfo?.profile) {
                console.error('Không tìm thấy thông tin profile trong phản hồi');
                throw new Error("Không tìm thấy thông tin profile");
            }
            const { profile } = accountInfo;
            const phoneNumber = profile.phoneNumber;
            const ownId = profile.userId;
            const displayName = profile.displayName;
            console.log(`Thông tin tài khoản: ID=${ownId}, Tên=${displayName}, SĐT=${phoneNumber}`);

            // Call Webhook
            await sendLoginSuccessWebhook(profile, trackingId, customProxy, proxyUsed, useCustomProxy);

            const existingAccountIndex = zaloAccounts.findIndex(acc => acc.ownId === ownId);
            if (existingAccountIndex !== -1) {
                // Thay thế tài khoản cũ bằng tài khoản mới
                zaloAccounts[existingAccountIndex] = { api: api, ownId: ownId, proxy: useCustomProxy ? customProxy : (proxyUsed && proxyUsed.url), phoneNumber: phoneNumber };
                console.log('Đã cập nhật tài khoản hiện có trong danh sách zaloAccounts');
            } else {
                // Thêm tài khoản mới nếu không tìm thấy tài khoản cũ
                zaloAccounts.push({ api: api, ownId: ownId, proxy: useCustomProxy ? customProxy : (proxyUsed && proxyUsed.url), phoneNumber: phoneNumber });
                console.log('Đã thêm tài khoản mới vào danh sách zaloAccounts');
            }

            console.log('Đang lưu cookie...');
            const context = await api.getContext();
            const {imei, cookie, userAgent} = context;
            const data = {
                imei: imei,
                cookie: cookie,
                userAgent: userAgent,
            }
            const cookiesDir = './data/cookies';
            if (!fs.existsSync(cookiesDir)) {
                fs.mkdirSync(cookiesDir, { recursive: true });
                console.log('Đã tạo thư mục cookies');
            }
            fs.access(`${cookiesDir}/cred_${ownId}.json`, fs.constants.F_OK, (err) => {
                if (err) {
                    fs.writeFile(`${cookiesDir}/cred_${ownId}.json`, JSON.stringify(data, null, 4), (err) => {
                        if (err) {
                            console.error('Lỗi khi ghi file cookie:', err);
                        } else {
                            console.log(`Đã lưu cookie vào file cred_${ownId}.json`);
                        }
                    });
                } else {
                    console.log(`File cred_${ownId}.json đã tồn tại, không ghi đè`);
                }
            });

            console.log(`Đã hoàn tất quá trình đăng nhập vào tài khoản ${ownId} qua proxy ${useCustomProxy ? customProxy : (proxyUsed?.url || 'không có proxy')}`);
        } catch (error) {
            console.error('Lỗi trong quá trình đăng nhập Zalo:', error);
            reject(error);
        }
    });
}