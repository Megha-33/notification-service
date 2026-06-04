import { utilities as nestWinstonModuleUtilities, WinstonModule } from 'nest-winston';
import { format, transports } from 'winston';

const isProduction = process.env.NODE_ENV === 'production';

export const loggerModuleConfig = WinstonModule.forRoot({
  level: process.env.LOG_LEVEL ?? 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.ms(),
    nestWinstonModuleUtilities.format.nestLike('NotificationService', {
      colors: !isProduction,
      prettyPrint: !isProduction,
    }),
  ),
  transports: [new transports.Console()],
});
