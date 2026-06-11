"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
async function bootstrap() {
    const logger = new common_1.Logger('Bootstrap');
    try {
        const app = await core_1.NestFactory.create(app_module_1.AppModule);
        app.enableCors();
        app.useGlobalPipes(new common_1.ValidationPipe({
            whitelist: true,
            transform: true,
            forbidNonWhitelisted: true,
            transformOptions: {
                enableImplicitConversion: true,
            },
        }));
        const port = process.env.PORT || 3000;
        await app.listen(port);
        const dataSource = app.get(typeorm_1.DataSource);
        if (dataSource.isInitialized) {
            logger.log('📦 Database connection established');
        }
        logger.log(`⚡ Application is running on: http://localhost:${port}`);
    }
    catch (error) {
        logger.error('Error starting application:', error);
        process.exit(1);
    }
}
void bootstrap();
//# sourceMappingURL=main.js.map