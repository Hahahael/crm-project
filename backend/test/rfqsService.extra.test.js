import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockDbQuery = vi.fn();
vi.mock('../db.js', () => ({ default: { query: (...args) => mockDbQuery(...args) } }));

import * as rfqsService from '../services/rfqsService.js';

describe('rfqsService - extra tests', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('getById returns null when not found', async () => {
    mockDbQuery.mockResolvedValueOnce({ rows: [] });
    const res = await rfqsService.getById(9999);
    expect(mockDbQuery).toHaveBeenCalled();
    expect(res).toBeNull();
  });

  it('updateRfq updates and returns updated object', async () => {
    const updatedRow = { id: 55, rfq_number: 'RFQ-2025-0055', assignee: null };
    // updateResult then final select
    mockDbQuery
      .mockResolvedValueOnce({ rows: [{ id: 55 }] }) // update query
      .mockResolvedValueOnce({ rows: [{ id: 55, rfq_number: 'RFQ-2025-0055', assignee: null }] }); // final select

    const payload = { rfqNumber: 'RFQ-2025-0055' };
    const res = await rfqsService.updateRfq(55, payload);
    expect(mockDbQuery).toHaveBeenCalled();
    expect(res).toBeTruthy();
    expect(res.id).toBe(55);
    expect(res.rfqNumber).toBe('RFQ-2025-0055');
  });

  it('upsertItems inserts new items and returns them', async () => {
    const rfqId = 77;
    const payload = [{ description: 'New item', brand: 'B', partNumber: 'P1', quantity: 3, unit: 'pcs', leadTime: '1w', unitPrice: 9.99, amount: 29.97 }];
    // existingRes -> empty
    mockDbQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 1001, rfq_id: rfqId, description: 'New item', unit_price: 9.99 }] });

    const upserted = await rfqsService.upsertItems(rfqId, payload);
    expect(mockDbQuery).toHaveBeenCalled();
    expect(upserted).toBeInstanceOf(Array);
    expect(upserted[0].id).toBe(1001);
    expect(upserted[0].unitPrice).toBe(9.99);
  });
});
