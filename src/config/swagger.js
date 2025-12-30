import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MultiZlogin API',
      version: '1.0.0',
      description: 'API documentation for MultiZlogin Zalo Management System',
      contact: {
        name: 'MultiZlogin Support',
      },
    },
    tags: [
      { name: 'Auth', description: 'Authentication and User Management' },
      { name: 'Account', description: 'Zalo Account session management' },
      { name: 'Zalo', description: 'Zalo Bot interactions (Messages, Groups, etc.)' }
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
          description: 'API Key for authentication'
        }
      }
    },
    security: [
        {
            "ApiKeyAuth": []
        }
    ]
  },
  // Path to the API docs
  apis: ['./src/routes/*.js', './src/api/zalo/*.js'],
};

export const specs = swaggerJsdoc(options);
