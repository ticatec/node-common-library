import {v4 as uuidv4} from 'uuid';

/**
 *
 * @param s
 * @returns {boolean}
 */
const isEmpty = (s) => {
    return s == null || (isString(s) && s.trim().length == 0);
}

/**
 * 生成uuid吗，去除所有的分隔符'-'
 * @returns {string}
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
 *
 */
const uuid = () => {
    return uuidv4();
}

/**
 *
 * @param s
 */
const isString = (s: any):boolean => {
    return typeof s == 'string'
}

/**
 *
 * @param s
 */
const isNumber = (s: any): boolean => {
    return isString(s) && !isNaN(s)
}

/**
 *
 * @param s
 * @param defValue
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
