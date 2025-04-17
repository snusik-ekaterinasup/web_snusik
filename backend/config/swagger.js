const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "API Documentation",
      version: "1.0.0",
      description: "Документация для веб-лабораторных работ с JWT аутентификацией",
    },
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Используйте JWT токен в формате: Bearer <token>"
        }
      },
      schemas: {
        User: {
          $ref: '#/components/schemas/User'
        },
        Event: {
          $ref: '#/components/schemas/Event'
        },
        AuthResponse: {
          type: "object",
          properties: {
            accessToken: {
              type: "string",
              description: "JWT токен для доступа"
            },
            refreshToken: {
              type: "string",
              description: "Токен для обновления access token"
            }
          }
        }
      }
    },
    security: [{
      BearerAuth: []
    }]
  },
  apis: ["./routes/*.js", "./models/*.js"],
};

const specs = swaggerJsdoc(options);

module.exports = (app) => {
  app.use("/api-docs", 
    swaggerUi.serve, 
    swaggerUi.setup(specs, {
      swaggerOptions: {
        persistAuthorization: true
      }
    })
  );
};