
/**
 * 分页查询结果接口
 */
export default interface PaginationList {
    /**
     * 总记录数
     */
    count: number;
    /**
     * 是否还有更多数据
     */
    hasMore: boolean;
    /**
     * 当前页的数据列表
     */
    list: Array<any>;
    /**
     * 总页数
     */
    pages: number;

}
