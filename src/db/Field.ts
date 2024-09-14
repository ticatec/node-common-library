/**
 * 字段的类型
 */
export enum FieldType {
    Text = 'Text',
    Number = 'Number',
    Date = 'Date'
}

export default interface Field {
    /**
     * 字段名
     */
    name: string;
    /**
     * 类型
     */
    type: FieldType;
    /**
     * 长度
     */
    length?: number;
}