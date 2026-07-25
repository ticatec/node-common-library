import {v7 as uuidv7} from 'uuid';

/**
 * Checks if a string is empty (null, undefined, or whitespace only).
 * @param s - Value to check.
 * @returns True if empty.
 */
const isEmpty = (s: unknown): boolean => {
    return s == null || (typeof s == 'string' && s.trim().length === 0);
};

/**
 * Generates a 32-character UUID with hyphens removed.
 * @returns 32-character unhyphenated UUID string.
 */
const genID = (): string => {
    return uuidv7().replace(/-/g, '');
};

/**
 * Pads a string on the left with a prefix character up to the specified target length.
 * @param s - Target string.
 * @param prefix - Padding prefix character.
 * @param len - Desired length.
 * @returns Left-padded string.
 */
const leftPad = (s: string, prefix: string, len: number): string => {
    if (len <= 0 || s.length >= len) {
        return s;
    }
    const diffLen = len - s.length;
    return prefix.repeat(diffLen) + s;
};

/**
 * Generates a standard UUID string (including hyphens).
 * @returns Standard UUID string.
 */
const uuid = (): string => {
    return uuidv7();
};

/**
 * Checks if a value is a string.
 * @param s - Value to check.
 * @returns True if value is a string.
 */
const isString = (s: unknown): boolean => {
    return typeof s === 'string';
};

/**
 * Checks if a string formatted value represents a valid number.
 * @param s - Value to check.
 * @returns True if formatted as a number.
 */
const isNumber = (s: unknown): boolean => {
    return isString(s) && !isNaN(Number(s));
};

/**
 * Parses a string into an integer number, returning a default fallback value if parsing fails.
 * @param s - Value to parse.
 * @param defValue - Default fallback value if parsing fails (defaults to 0).
 * @returns Parsed integer value.
 */
const parseNumber = (s: unknown, defValue: number = 0): number => {
    if (typeof s === 'number') {
        return s;
    }
    if (isNumber(s)) {
        return parseInt(s as string, 10);
    }
    return defValue;
};

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
