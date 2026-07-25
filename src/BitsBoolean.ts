export default abstract class BitsBoolean {

    protected value: number;
    protected constructor(value: number = 0) {
        this.value = Math.floor(value);
    }

    /**
     * Sets the bit at the specified position to true or false.
     * @param pos - Bit position (0-31).
     * @param value - Boolean value to set.
     * @protected
     */
    protected setBitValue(pos: number, value: boolean): void {
        if (pos < 0 || pos > 31) {
            throw new Error("Invalid bit position.");
        }
        if (value) {
            this.value |= (1 << pos);
        } else {
            this.value &= ~(1 << pos);
        }
    }

    /**
     * Reads the bit value at the specified position.
     * @param pos - Bit position (0-31).
     * @protected
     * @returns Boolean value at the specified bit position.
     */
    protected getBitValue(pos: number): boolean {
        if (pos < 0 || pos > 31) {
            throw new Error("Invalid bit position.");
        }
        return (this.value & (1 << pos)) !== 0;
    }

    /**
     * Creates a bitfield number from a boolean array.
     * @param boolArray - Array of boolean values.
     * @static
     * @returns Number resulting from bitwise operations.
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
     * Converts the current bitfield value into a boolean array.
     * @param length - Length of the output boolean array.
     * @returns Array of boolean values.
     */
    toBooleanArray(length: number): boolean[] {
        const result: boolean[] = [];

        for (let i = 0; i < length; i++) {
            result.push(this.getBitValue(i));
        }

        return result;
    }
}