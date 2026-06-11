import { winstonConfig } from './logging.config';
import { WinstonModule } from 'nest-winston';

export { winstonConfig } from './logging.config';
export const AppLoggerModule = WinstonModule.forRoot(winstonConfig);
