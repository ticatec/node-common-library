import pino from 'pino';
import { initialize, resetForTest } from '@ticatec/logger-wrapper';
import TransactionManager from '../TransactionManager.js';
import CommonService from '../CommonService.js';
import DBManager from '../db/DBManager.js';
import DBConnection from '../db/DBConnection.js';
import { Transaction, Propagation } from '../db/Transaction.js';

class MockDBConnection extends DBConnection {
    public isTxActive = false;
    public isClosed = false;

    async beginTransaction(): Promise<void> { this.isTxActive = true; }
    async commit(): Promise<void> { this.isTxActive = false; }
    async rollback(): Promise<void> { this.isTxActive = false; }
    async close(): Promise<void> { this.isClosed = true; }
    protected async executeSQL(sql: string): Promise<any> { return []; }
    async executeUpdate(sql: string, params: Array<any>): Promise<number> { return 1; }
    async insertRecord(sql: string, params: Array<any>): Promise<any> { return {}; }
    async updateRecord(sql: string, params: Array<any>): Promise<any> { return {}; }
    async deleteRecord(sql: string, params: Array<any>): Promise<number> { return 1; }
    protected async fetchData(sql: string, params?: Array<any>): Promise<any> { return { rows: [], fields: [] }; }
    getFields(result: any): any[] { return []; }
    protected getRowSet(result: any): any[] { return []; }
    protected getAffectRows(result: any): number { return 1; }
    protected getFirstRow(result: any): any { return null; }
}

describe('TransactionManager & @Transaction Decorator', () => {
    let mockFactory: any;

    beforeAll(() => {
        resetForTest();
        initialize(pino({ level: 'silent' }));
    });

    beforeEach(() => {
        DBManager.resetInstance();
        mockFactory = {
            createDBConnection: jest.fn().mockImplementation(async () => new MockDBConnection())
        };
        DBManager.init(mockFactory);
    });

    abstract class BaseService extends CommonService {
        @Transaction(Propagation.REQUIRES_NEW)
        async parentRequiresNewMethod(): Promise<string> {
            const conn = await this.getDBConnection();
            return 'PARENT_REQUIRES_NEW';
        }
    }

    class TestService extends BaseService {
        @Transaction(Propagation.REQUIRED)
        async requiredMethod(): Promise<string> {
            const conn = await this.getDBConnection();
            return 'REQUIRED_RESULT';
        }

        @Transaction(Propagation.REQUIRES_NEW)
        async requiresNewMethod(): Promise<string> {
            const conn = await this.getDBConnection();
            return 'REQUIRES_NEW_RESULT';
        }

        @Transaction(Propagation.NONE)
        async noneMethod(): Promise<string> {
            const conn = await this.getDBConnection();
            return 'NONE_RESULT';
        }
    }

    test('should execute REQUIRED method successfully', async () => {
        const service = new TestService();
        const res = await service.requiredMethod();
        expect(res).toBe('REQUIRED_RESULT');
        expect(mockFactory.createDBConnection).toHaveBeenCalledTimes(1);
    });

    test('should execute REQUIRES_NEW method without throwing error', async () => {
        const service = new TestService();
        const res = await service.requiresNewMethod();
        expect(res).toBe('REQUIRES_NEW_RESULT');
        expect(mockFactory.createDBConnection).toHaveBeenCalledTimes(1);
    });

    test('should execute inherited parent REQUIRES_NEW method correctly via prototype hierarchy', async () => {
        const service = new TestService();
        const res = await service.parentRequiresNewMethod();
        expect(res).toBe('PARENT_REQUIRES_NEW');
    });

    class NestedTxService extends CommonService {
        @Transaction(Propagation.REQUIRED)
        async outerRequired(): Promise<string> {
            const innerRes = await this.requiresNew();
            return `OUTER_${innerRes}`;
        }

        @Transaction(Propagation.REQUIRES_NEW)
        async requiresNew(): Promise<string> {
            return 'INNER_NEW';
        }
    }

    test('should open 2 separate DB connections when REQUIRED calls nested REQUIRES_NEW', async () => {
        const service = new NestedTxService();
        const res = await service.outerRequired();
        expect(res).toBe('OUTER_INNER_NEW');
        expect(mockFactory.createDBConnection).toHaveBeenCalledTimes(2);
    });

    test('should throw error if DBManager is not initialized', () => {
        DBManager.resetInstance();
        expect(() => DBManager.getInstance()).toThrow(/DBManager is not initialized/);
    });
});
