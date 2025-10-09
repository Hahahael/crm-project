import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockDbQuery = vi.fn();
vi.mock('../db.js', () => ({ default: { query: (...args) => mockDbQuery(...args) } }));

import * as trService from '../services/technicalRecommendationsService.js';

describe('technicalRecommendationsService', () => {
  beforeEach(() => vi.resetAllMocks());

  it('getById returns TR with items', async () => {
    const trRow = { id: 10, tr_number: 'TR-2025-0001', assignee: 3 };
    const itemRow = { id: 501, tr_id: 10, item_id: 601, quantity: 2, name: 'ItemZ' };
    mockDbQuery
      .mockResolvedValueOnce({ rows: [trRow] })
      .mockResolvedValueOnce({ rows: [itemRow] });

    const res = await trService.getById(10);
    expect(mockDbQuery).toHaveBeenCalledTimes(2);
    expect(res).toBeTruthy();
    expect(res.id).toBe(10);
    expect(res.items[0].name).toBe('ItemZ');
  });

  it('createTr inserts and returns created TR', async () => {
    const payload = { woId: 4, assignee: 3, accountId: 2 };
    mockDbQuery
      .mockResolvedValueOnce({ rows: [] }) // last tr number
      .mockResolvedValueOnce({ rows: [] }) // sl lookup
      .mockResolvedValueOnce({ rows: [{ id: 77 }] }) // insert tr
      .mockResolvedValueOnce({ rows: [] }) // workflow_stages insert
      .mockResolvedValueOnce({ rows: [{ id: 77, tr_number: 'TR-2025-0077' }] }); // final select

    const created = await trService.createTr(payload);
    expect(created).toBeTruthy();
    expect(created.id).toBe(77);
  });

  it('updateTr updates and returns updated TR with items', async () => {
    mockDbQuery
      .mockResolvedValueOnce({ rows: [{ id: 88 }] }) // update
      .mockResolvedValueOnce({ rows: [] }) // existing items
      .mockResolvedValueOnce({ rows: [{ id: 88, tr_number: 'TR-2025-0088' }] }) // select after update
      .mockResolvedValueOnce({ rows: [] }); // items select

    const res = await trService.updateTr(88, { title: 'Updated' });
    expect(res).toBeTruthy();
    expect(res.id).toBe(88);
  });
});
