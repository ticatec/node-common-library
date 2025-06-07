export default interface BatchRecord<T> {

    /**
     * 记录号，通常是行号
     */
    recNo: number;

    /**
     * 数据
     */
    data: T;

    /**
     * 处理异常
     */
    error: any;

}

export type BatchRecords<T> = Array<BatchRecord<T>>;