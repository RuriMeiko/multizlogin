import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MultiZlogin API',
      version: '2.0.0',
      description: `
# MultiZlogin - Zalo Multi-Account Management API

API để quản lý nhiều tài khoản Zalo, gửi tin nhắn, quản lý nhóm và nhiều hơn nữa.

## Xác thực
Tất cả API yêu cầu API Key trong header \`X-API-Key\`.

## Workflow cơ bản
1. Đăng nhập tài khoản Zalo qua QR: \`POST /api/zalo/login\`
2. Lấy danh sách tài khoản: \`GET /api/zalo/accounts\`
3. Sử dụng \`ownId\` để gọi các API khác
      `,
      contact: {
        name: 'MultiZlogin Support',
      },
    },
    tags: [
      { name: 'Zalo Login', description: 'Đăng nhập và quản lý tài khoản Zalo' },
      { name: 'Zalo', description: 'Các thao tác với Zalo (tin nhắn, nhóm, ...)' },
      { name: 'Account', description: 'API N8N-friendly với accountSelection' },
      { name: 'Auth', description: 'Xác thực người dùng hệ thống' }
    ],
    servers: [
      {
        url: '/',
        description: 'Current Server',
      },
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API Key từ biến môi trường API_KEY'
        }
      }
    },
    security: [
      {
        "ApiKeyAuth": []
      }
    ]
  },
  apis: ['./src/routes/*.js'],
};

export const specs = swaggerJsdoc(options);
