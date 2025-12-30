// services/webhookService.js

/**
 * Lấy URL của webhook trực tiếp từ biến môi trường.
 * @param {'messageWebhookUrl' | 'groupEventWebhookUrl' | 'reactionWebhookUrl'} key - Tên của key webhook cần lấy.
 * @returns {string} URL của webhook hoặc chuỗi rỗng nếu không được thiết lập.
 */
export function getWebhookUrl(key) {
  const keyMap = {
    messageWebhookUrl: 'MESSAGE_WEBHOOK_URL',
    groupEventWebhookUrl: 'GROUP_EVENT_WEBHOOK_URL',
    reactionWebhookUrl: 'REACTION_WEBHOOK_URL',
    webhookLoginSuccess: 'WEBHOOK_LOGIN_SUCCESS' // Thêm cả webhook login cho đầy đủ
  };

  const envVarName = keyMap[key];
  if (!envVarName) {
    console.warn(`[Webhook] Yêu cầu key webhook không hợp lệ: ${key}`);
    return "";
  }

  const url = process.env[envVarName];
  if (url) {
    // Không log ở đây vì nó sẽ spam console, để ở eventListeners.js
    return url;
  }
  
  // Log này chỉ xuất hiện nếu biến môi trường không được set
  // console.warn(`[Webhook] Biến môi trường ${envVarName} chưa được thiết lập.`);
  return "";
}

export default {
    getWebhookUrl,
};
 