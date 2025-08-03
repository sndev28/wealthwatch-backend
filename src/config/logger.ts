import winston from 'winston';
import { config } from './index.js';

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.simple()
);

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: consoleFormat,
    level: config.logLevel,
  }),
];

if (config.logFile) {
  transports.push(
    new winston.transports.File({
      filename: config.logFile,
      format: logFormat,
      level: config.logLevel,
    })
  );
}

export const logger = winston.createLogger({
  level: config.logLevel,
  format: logFormat,
  transports,
});