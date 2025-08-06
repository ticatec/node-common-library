/**
 * 字段的类型
 */
export enum FieldType {
    Text = 'Text',
    Number = 'Number',
    Date = 'Date'
}

/**
 * 数据库字段接口定义
 */
export default interface Field {
    /**
     * 字段名称
     */
    name: string;
    /**
     * 字段数据类型
     */
    type: FieldType;
    /**
     * 字段最大长度（可选）
     */
    length?: number;
}