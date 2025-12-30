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
    servers: [
      {
        url: '/',
        description: 'Current Server',
      },
    ],
    components: {
      securitySchemes: {
        // Define if you use JWT or other auth
        // bearerAuth: {
        //   type: 'http',
        //   scheme: 'bearer',
        //   bearerFormat: 'JWT',
        // },
      },
    },
  },
  // Path to the API docs
  apis: ['./src/routes/*.js', './src/api/zalo/*.js'],
};

export const specs = swaggerJsdoc(options);
