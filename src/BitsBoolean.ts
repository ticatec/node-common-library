export default abstract class BitsBoolean {

    protected value: number;
    protected constructor(value: number = 0) {
        this.value = Math.floor(value);
    }


    /**
     * 将指定位置的位设置为true或false
     * @param pos - 位位置（0-31）
     * @param value - 要设置的布尔值
     * @protected
     */
    protected setBitValue(pos: number, value: boolean): void {
        if (pos < 0 || pos > 31) {
            throw new Error("invalid bit pos.");
        }
        if (value) {
            this.value |= (1 << pos);
        } else {
            this.value &= ~(1 << pos);
        }
    }

    /**
     * 读取指定位置的位值
     * @param pos - 位位置（0-31）
     * @protected
     * @returns 指定位置的布尔值
     */
    protected getBitValue(pos: number): boolean {
        if (pos < 0 || pos > 31) {
            throw new Error("invalid bit pos.");
        }
        return (this.value & (1 << pos)) !== 0;
    }

    /**
     * 从布尔数组创建位值
     * @param boolArray - 布尔值数组
     * @static
     * @returns 位操作后的数值
     */
    static fromBooleanArray(boolArray: boolean[]): number {
        let result = 0;

        for (let i = 0; i < boolArray.length; i++) {
            if (boolArray[i]) {
                result |= (1 << i);
            }
        }

        return result;
    }

    /**
     * 将位值转换为布尔数组
     * @param length - 输出数组的长度
     * @returns 布尔值数组
     */
    toBooleanArray(length: number): boolean[] {
        const result: boolean[] = [];

        for (let i = 0; i < length; i++) {
            result.push(this.getBitValue(i));
        }

        return result;
    }
}