import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockDbQuery = vi.fn();
vi.mock('../db.js', () => ({ default: { query: (...args) => mockDbQuery(...args) } }));

import * as rfqsService from '../services/rfqsService.js';

describe('rfqsService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('getById returns RFQ with items, vendors and quotations (maps selected quote)', async () => {
    const rfqRow = { id: 11, rfq_number: 'RFQ-2025-0001', assignee: 2, account_id: 7 };
    const itemRow = { id: 101, rfq_id: 11, item_id: 501, description: 'Item A' , itemId: 501 };
    const vendorRow = { id: 201, rfq_id: 11, vendor_id: 301, name: 'Vendor X', vendorId: 301 };
    const quotationRow = { id: 301, rfq_id: 11, item_id: 501, vendor_id: 301, unit_price: 123.45, lead_time: '2w', is_selected: true, itemId: 501, vendorId: 301, unitPrice: 123.45, leadTime: '2w', isSelected: true };

    // sequence: rfq select, items select, vendors select, quotations select
    mockDbQuery
      .mockResolvedValueOnce({ rows: [rfqRow] })
      .mockResolvedValueOnce({ rows: [itemRow] })
      .mockResolvedValueOnce({ rows: [vendorRow] })
      .mockResolvedValueOnce({ rows: [quotationRow] });

    const res = await rfqsService.getById(11);

    expect(mockDbQuery).toHaveBeenCalledTimes(4);
    expect(res).toBeTruthy();
    expect(res.id).toBe(11);
    // items should be present and have unitPrice/leadTime from selected quote
    expect(res.items).toBeInstanceOf(Array);
    expect(res.items[0].unitPrice).toBe(123.45);
    expect(res.items[0].leadTime).toBe('2w');
    // vendors should be present and include quotes
    expect(res.vendors).toBeInstanceOf(Array);
    expect(res.vendors[0].quotes).toBeInstanceOf(Array);
    expect(res.quotations).toBeInstanceOf(Array);
  });

  it('createRfq inserts RFQ and returns created row', async () => {
    const payload = {
      woId: 5,
      assignee: 2,
      dueDate: '2025-11-01',
      accountId: 7,
      stageStatus: 'Draft',
      items: [{ itemId: 501, quantity: 2 }]
    };

    // sequence of db calls inside createRfq:
    // 1) select last rfq number -> none
    // 2) select sl id by wo_id -> none
    // 3) insert into rfqs -> returns id
    // 4) insert into rfq_items -> returns id
    // 5) insert into workflow_stages -> return
    // 6) final select r.* -> returns created row

    mockDbQuery
      .mockResolvedValueOnce({ rows: [] }) // last rfq number
      .mockResolvedValueOnce({ rows: [] }) // sl lookup
      .mockResolvedValueOnce({ rows: [{ id: 99 }] }) // insert rfq
      .mockResolvedValueOnce({ rows: [{ id: 201 }] }) // insert rfq_item
      .mockResolvedValueOnce({ rows: [] }) // insert workflow stage
      .mockResolvedValueOnce({ rows: [{ id: 99, rfq_number: 'RFQ-2025-0001', assignee: 2, account_name: 'Acct' }] });

    const created = await rfqsService.createRfq(payload);
    expect(mockDbQuery).toHaveBeenCalled();
    expect(created).toBeTruthy();
    expect(created.id).toBe(99);
    expect(created.rfqNumber).toBe('RFQ-2025-0001');
  });
});
