import pino, { Logger as PinoLogger } from 'pino';

export type Logger = PinoLogger;

// 应用层注入的 Logger 实例与工厂函数
let userLogger: PinoLogger | null = null;
let customLoggerFactory: ((name: string) => PinoLogger) | null = null;

// 默认兜底 Logger（若应用层尚未调用 setLogger，确保单测与极简环境不会抛空指针）
const fallbackLogger: PinoLogger = pino({
    level: process.env.LOG_LEVEL ?? 'info',
    name: 'app'
});

const cache: Map<string, PinoLogger> = new Map();

/**
 * 【应用层调用】注入应用层初始化好的 Pino Logger
 * 
 * @param logger - 应用层创建的 Pino 实例
 */
export function setLogger(logger: PinoLogger): void {
    userLogger = logger;
    cache.clear();
}

/**
 * 【应用层调用】注入自定义的 Child Logger 生成工厂函数
 * 
 * @param factory - 自定义 Child Logger 创建逻辑
 */
export function setLoggerFactory(factory: (name: string) => PinoLogger): void {
    customLoggerFactory = factory;
    cache.clear();
}

/**
 * 【公共库内部使用】获取带 module 模块名的 child logger
 * 
 * @param name - 模块/类名
 */
export function getLogger(name: string): PinoLogger {
    let logger = cache.get(name);
    if (!logger) {
        if (customLoggerFactory) {
            logger = customLoggerFactory(name);
        } else if (userLogger) {
            logger = userLogger.child({ module: name });
        } else {
            logger = fallbackLogger.child({ module: name });
        }
        cache.set(name, logger);
    }
    return logger;
}

export { fallbackLogger as rootLogger };