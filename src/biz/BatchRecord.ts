/**
 * 批量处理记录接口
 * @template T - 数据类型
 */
export default interface BatchRecord<T> {

    /**
     * 记录号，通常是行号
     */
    recNo: number;

    /**
     * 实际数据对象
     */
    data: T;

    /**
     * 处理过程中的错误信息
     */
    error: any;

}

/**
 * 批量处理记录数组类型定义
 * @template T - 数据类型
 */
export type BatchRecords<T> = Array<BatchRecord<T>>;