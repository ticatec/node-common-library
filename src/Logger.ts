import pino, {Logger as PinoLogger} from 'pino';

const rootLogger: PinoLogger = pino({
    level: process.env.LOG_LEVEL ?? 'info',
    name: 'app'
});

const cache: Map<string, PinoLogger> = new Map();

/**
 * 获取一个带 module 上下文的 pino child logger。
 * 同一个 name 始终返回同一个 child 实例，背后共享同一个 root logger。
 *
 * @param name - 模块/类名，会作为日志中的 module 字段
 */
function getLogger(name: string): PinoLogger {
    let logger = cache.get(name);
    if (logger == null) {
        logger = rootLogger.child({module: name});
        cache.set(name, logger);
    }
    return logger;
}

export {getLogger, rootLogger};
export type Logger = PinoLogger;