export default abstract class BitsBoolean {

    protected value: number;
    protected constructor(value: number = 0) {
        this.value = Math.floor(value);
    }


    /**
     * 将制定位置的bit位设置true/false
     * @param pos
     * @param value
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
     * 读取指定位的值
     * @param pos
     * @protected
     */
    protected getBitValue(pos: number): boolean {
        if (pos < 0 || pos > 31) {
            throw new Error("invalid bit pos.");
        }
        return (this.value & (1 << pos)) !== 0;
    }

    /**
     * 从布尔数组创建位值
     * @param boolArray
     * @protected
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
     */
    toBooleanArray(length: number): boolean[] {
        const result: boolean[] = [];

        for (let i = 0; i < length; i++) {
            result.push(this.getBitValue(i));
        }

        return result;
    }
}