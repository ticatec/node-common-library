import pino from 'pino';
import { initialize, resetForTest } from '@ticatec/logger-wrapper';
import { getLogger } from '../Logger';

describe('node-common-library Logger with @ticatec/logger-wrapper', () => {
    beforeEach(() => {
        resetForTest();
    });

    test('should throw error when getLogger is called before initialize', () => {
        expect(() => {
            getLogger('TestModule');
        }).toThrow();
    });

    test('should return child logger when initialized', () => {
        const mockPino = pino({ level: 'silent' });
        initialize(mockPino);

        const logger = getLogger('TestModule');
        expect(logger).toBeDefined();
        expect(typeof logger.info).toBe('function');
    });
});
