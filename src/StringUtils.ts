import {v7 as uuidv7} from 'uuid';

/**
 * 判断字符串是否为空（null、undefined或空白字符串）
 * @param s - 要检查的值
 * @returns 如果为空则返回true
 */
const isEmpty = (s: unknown): boolean => {
    return s == null || (typeof s == 'string' && s.trim().length === 0);
}

/**
 * 生成32位UUID，去除所有的分隔符'-'
 * @returns 生成的32位无分隔符的UUID字符串
 */
const genID = (): string => {
    return uuidv7().replace(/-/g, '');
}

/**
 * 给一个字符串左侧填充字符到指定长度，比如输入的（'45'， '0'， 4），返回0045
 * @param s 待处理的字符串
 * @param prefix 要添加的字符
 * @param len 期望长度
 * @returns 填充后的字符串
 */
const leftPad = (s: string, prefix: string, len: number): string => {
    if (len <= 0 || s.length >= len) {
        return s;
    }
    const diffLen = len - s.length;
    return prefix.repeat(diffLen) + s;
}

/**
 * 生成标准格式的UUID（包含分隔符'-'）
 * @returns 标准格式的UUID字符串
 */
const uuid = (): string => {
    return uuidv7();
}

/**
 * 判断值是否为字符串类型
 * @param s - 要检查的值
 * @returns 如果是字符串类型则返回true
 */
const isString = (s: unknown): boolean => {
    return typeof s === 'string';
}

/**
 * 判断字符串是否为数字格式
 * @param s - 要检查的值
 * @returns 如果是数字格式则返回true
 */
const isNumber = (s: unknown): boolean => {
    return isString(s) && !isNaN(Number(s));
}

/**
 * 解析字符串为整数，如果解析失败则返回默认值
 * @param s - 要解析的字符串或数字
 * @param defValue - 解析失败时的默认值，默认为0
 * @returns 解析后的整数值
 */
const parseNumber = (s: unknown, defValue: number = 0): number => {
    if (typeof s === 'number') {
        return s;
    }
    if (isNumber(s)) {
        return parseInt(s as string, 10);
    }
    return defValue;
}

interface StringUtilsUtils {
    isEmpty(s: unknown): boolean;
    genID(): string;
    uuid(): string;
    leftPad(s: string, prefix: string, len: number): string;
    isString(s: unknown): boolean;
    isNumber(s: unknown): boolean;
    parseNumber(s: unknown, defValue?: number): number;
}

const StringUtils: StringUtilsUtils = {
    isEmpty,
    genID,
    uuid,
    leftPad,
    isString,
    isNumber,
    parseNumber
};

export default StringUtils;
