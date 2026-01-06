// controllers/actionController.js - Generic action handler
import { ThreadType } from 'zca-js';
import { getAccountFromSelection } from './accountController.js';

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
                const { message, threadId, type, quote } = data;
                if (!message || !threadId) throw new Error('Missing message or threadId');
                
                const msgType = type === 'group' ? ThreadType.Group : ThreadType.User;
                const msgContent = typeof message === 'string' ? { msg: message, quote } : message;
                
                result = await api.sendMessage(msgContent, threadId, msgType);
                break;
            }

            case 'sendTyping': {
                const { threadId, type } = data;
                if (!threadId) throw new Error('Missing threadId');
                
                const msgType = type === 'group' ? ThreadType.Group : ThreadType.User;
                result = await api.sendTypingEvent(threadId, msgType);
                break;
            }
            
            case 'sendSticker': {
                const { sticker, threadId, type } = data;
                if (!sticker || !threadId) throw new Error('Missing sticker or threadId');

                const msgType = type === 'group' ? ThreadType.Group : ThreadType.User;
                result = await api.sendSticker(sticker, threadId, msgType);
                break;
            }

            case 'findUser': {
                const { phoneNumber } = data;
                if (!phoneNumber) throw new Error('Missing phoneNumber');
                result = await api.findUser(phoneNumber);
                break;
            }

            case 'getUserInfo': {
                const { userId } = data;
                if (!userId) throw new Error('Missing userId');
                result = await api.getUserInfo(userId);
                break;
            }

            case 'getGroupInfo': {
                const { groupId } = data;
                if (!groupId) throw new Error('Missing groupId');
                result = await api.getGroupInfo(groupId);
                break;
            }

            case 'addReaction': {
                const { icon, dest } = data;
                if (!icon || !dest) throw new Error('Missing icon or dest');
                
                if (typeof dest.type === 'string') {
                    dest.type = dest.type === 'group' ? ThreadType.Group : ThreadType.User;
                }

                result = await api.addReaction(icon, dest);
                break;
            }

            case 'undo': {
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
