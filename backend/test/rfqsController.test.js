import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockGetById = vi.fn();
vi.mock('../services/rfqsService.js', () => ({ getById: (...args) => mockGetById(...args) }));

import * as rfqsController from '../controllers/rfqsController.js';

function makeRes() {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
}

describe('rfqsController', () => {
  beforeEach(() => vi.resetAllMocks());

  it('getById returns 404 when not found', async () => {
    mockGetById.mockResolvedValueOnce(null);
    const req = { params: { id: '999' } };
    const res = makeRes();
    await rfqsController.getById(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Not found' });
  });

  it('getById returns 200 with rfq when found', async () => {
    const rfq = { id: 12, rfqNumber: 'RFQ-2025-0012' };
    mockGetById.mockResolvedValueOnce(rfq);
    const req = { params: { id: '12' } };
    const res = makeRes();
    await rfqsController.getById(req, res);
    expect(res.json).toHaveBeenCalledWith(rfq);
  });
});
