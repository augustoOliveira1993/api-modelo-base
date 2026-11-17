import winston from 'winston';
import { format } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import moment from 'moment-timezone';

const fileLogFormat = winston.format.printf(({ level, message, timestamp }) => {
  return `${timestamp} ${level}: ${message}`;
});

const baseJsonFormat = winston.format.combine(
  winston.format.errors({ stack: true }),
  winston.format.timestamp(),
  winston.format.json(),
);

let env = 'production';
if (process.env?.NODE_ENV) {
  env = process.env.NODE_ENV;
}

const level = env === 'production' ? 'info' : 'debug';
const isProduction = env === 'production';

const consoleFormat = isProduction
  ? baseJsonFormat
  : winston.format.combine(
      winston.format.errors({ stack: true }),
      winston.format.timestamp(),
      winston.format.colorize(),
      winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
        const metaKeys = Object.keys(meta);
        const metaText =
          metaKeys.length > 0 ? ` ${JSON.stringify(meta)}` : '';
        if (stack) {
          return `${level}: ${timestamp} ${message} - ${stack}${metaText}`;
        }
        return `${level}: ${timestamp} ${message}${metaText}`;
      }),
    );

// Create file loggers
const logger = winston.createLogger({
  level,
  format: baseJsonFormat,
  // expressFormat: true,

  transports: [
    new winston.transports.Console({
      format: consoleFormat,
    }),

    // new winston.transports.File({
    //   filename: path.resolve(
    //     'logs',
    //     'errors',
    //     `avb_errors_${moment(new Date()).format('DD_MM_YYYY')}.log`,
    //   ),
    //   level: 'error',
    //   handleExceptions: true,
    //   maxsize: 10485760,
    //   maxFiles: 10,
    // }),

    new winston.transports.File({
      filename: path.resolve(
        'logs',
        'infos',
        `${process.env.APP_NAME || 'app'}_infos_${moment(new Date()).format('DD_MM_YYYY')}.log`,
      ),
      level: 'info',
      handleExceptions: true,
      maxsize: 10485760,
      maxFiles: 10,
    }),
    // new winston.transports.File({
    //   filename: path.resolve(
    //     'logs',
    //     'debugs',
    //     `avb_debugs_${moment(new Date()).format('DD_MM_YYYY')}.log`,
    //   ),
    //   level: 'debug',
    //   handleExceptions: true,
    //   maxsize: 10485760,
    //   maxFiles: 10,
    // }),
  ],
});

function addLogRotate(workspace: string): void {
  const logRotate = new DailyRotateFile({
    format: format.combine(
      winston.format.splat(),
      winston.format.timestamp(),
      winston.format.padLevels(),
      fileLogFormat,
    ),
    level: 'debug',
    filename: path.resolve(workspace, 'logs', 'modelo-api-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '7d',
  });

  logger.add(logRotate);
}

export { addLogRotate, logger };
