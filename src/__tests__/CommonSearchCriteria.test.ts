import pino from 'pino';
import { initialize, resetForTest } from '@ticatec/logger-wrapper';
import CommonSearchCriteria from '../db/CommonSearchCriteria.js';
import DBConnection from '../db/DBConnection.js';

class MockDBConnectionForCriteria extends DBConnection {
    async beginTransaction(): Promise<void> {}
    async commit(): Promise<void> {}
    async rollback(): Promise<void> {}
    async close(): Promise<void> {}
    protected async executeSQL(sql: string): Promise<any> { return []; }
    async executeUpdate(sql: string, params: Array<any>): Promise<number> { return 1; }
    async insertRecord(sql: string, params: Array<any>): Promise<any> { return {}; }
    async updateRecord(sql: string, params: Array<any>): Promise<any> { return {}; }
    async deleteRecord(sql: string, params: Array<any>): Promise<number> { return 1; }
    protected async fetchData(sql: string, params?: Array<any>): Promise<any> {
        if (sql.includes('count(*)')) {
            return { rows: [{ cc: '35' }], fields: ['cc'] };
        }
        return {
            rows: [
                { id: 1, name: 'Alice' },
                { id: 2, name: 'Bob' }
            ],
            fields: ['id', 'name']
        };
    }
    getFields(result: any): any[] { return []; }
    protected getRowSet(result: any): any[] { return []; }
    protected getAffectRows(result: any): number { return 1; }
    protected getFirstRow(result: any): any {
        return result?.rows?.[0] ?? null;
    }
}

class SampleSearchCriteria extends CommonSearchCriteria {
    public constructor(criteria?: any) {
        super(criteria);
        this.sql = 'select * from users where 1=1';
    }

    public testBuildRange(from: any, to: any, field: string) {
        return this.addRangeCriteria(from, to, field);
    }

    public testBuildStar(text: string, field: string) {
        return this.buildStarCriteria(text, field);
    }

    public getSql() { return this.sql; }
    public getParams() { return this.params; }

    protected override getPostConstructor() {
        return (obj: any) => {
            obj.processed = true;
        };
    }
}

describe('CommonSearchCriteria', () => {
    beforeAll(() => {
        resetForTest();
        initialize(pino({ level: 'silent' }));
    });

    test('should build star and range criteria correctly', () => {
        const criteria = new SampleSearchCriteria();
        criteria.testBuildStar('Al*', 'name');
        expect(criteria.getSql()).toContain('name like $1');
        expect(criteria.getParams()).toEqual(['Al%']);

        const startDate = new Date('2024-01-01T00:00:00Z');
        const endDate = new Date('2024-01-31T00:00:00Z');
        criteria.testBuildRange(startDate, endDate, 'created_at');
        expect(criteria.getSql()).toContain('created_at >= $2 and created_at < $3');
    });

    test('should calculate pages correctly using Math.ceil', async () => {
        const conn = new MockDBConnectionForCriteria();
        const criteria = new SampleSearchCriteria({ page: 1, pageSize: 10 });
        const res = await criteria.paginationQuery(conn);

        expect(res.count).toBe(35);
        expect(res.pages).toBe(4); // Math.ceil(35 / 10) = 4
        expect(res.hasMore).toBe(true);
        expect(res.list[0].processed).toBe(true);
    });

    test('should apply postConstructor in unpaginated query() method', async () => {
        const conn = new MockDBConnectionForCriteria();
        const criteria = new SampleSearchCriteria();
        const list = await criteria.query(conn);

        expect(list.length).toBe(2);
        expect(list[0].processed).toBe(true);
        expect(list[1].processed).toBe(true);
    });
});
