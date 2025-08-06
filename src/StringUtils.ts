import {v4 as uuidv4} from 'uuid';

/**
 * 判断字符串是否为空（null、undefined或空白字符串）
 * @param s - 要检查的字符串
 * @returns 如果为空则返回true
 */
const isEmpty = (s) => {
    return s == null || (isString(s) && s.trim().length == 0);
}

/**
 * 生成32位UUID，去除所有的分隔符'-'
 * @returns 生成的32位无分隔符的UUID字符串
 */
const genID = () => {
    return uuidv4().replace(/-/g, '');
}

/**
 * 给一个字符串添加到指定的长度，比如输入的（'45'， '0'， 4），返回0045
 * @param s 待处理的字符串
 * @param prefix 要添加的字符
 * @param len 期望长度
 */
const leftPad = (s, prefix, len) => {
    if (s.length < len) {
        let prefixStr = '';
        let diffLen = len - s.length;
        for (let i:number = 0;  i < diffLen; i++) {
            prefixStr += '0';
        }
        return prefixStr + s;
    }
    return s;
}

/**
 * 生成标准格式的UUID（包含分隔符'-'）
 * @returns 标准格式的UUID字符串
 */
const uuid = () => {
    return uuidv4();
}

/**
 * 判断值是否为字符串类型
 * @param s - 要检查的值
 * @returns 如果是字符串类型则返回true
 */
const isString = (s: any):boolean => {
    return typeof s == 'string'
}

/**
 * 判断字符串是否为数字格式
 * @param s - 要检查的字符串
 * @returns 如果是数字格式则返回true
 */
const isNumber = (s: any): boolean => {
    return isString(s) && !isNaN(s)
}

/**
 * 解析字符串为整数，如果解析失败则返回默认值
 * @param s - 要解析的字符串或数字
 * @param defValue - 解析失败时的默认值，默认为0
 * @returns 解析后的整数值
 */
const parseNumber = (s: any, defValue: number = 0): number => {
    return typeof s == 'number' ? s : isNumber(s) ? parseInt(s) : defValue;
}

let StringUtils = {
    isEmpty,
    genID,
    uuid,
    leftPad,
    isString,
    isNumber,
    parseNumber
}

export default StringUtils;
