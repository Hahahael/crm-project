import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockGetById = vi.fn();
vi.mock('../services/technicalRecommendationsService.js', () => ({ getById: (...args) => mockGetById(...args) }));

import * as trController from '../controllers/technicalRecommendationsController.js';

function makeRes() {
  const res = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
}

describe('technicalRecommendationsController', () => {
  beforeEach(() => vi.resetAllMocks());

  it('getById returns 404 when not found', async () => {
    mockGetById.mockResolvedValueOnce(null);
    const req = { params: { id: '999' } };
    const res = makeRes();
    await trController.getById(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('getById returns 200 with tr when found', async () => {
    const tr = { id: 12, trNumber: 'TR-2025-0012' };
    mockGetById.mockResolvedValueOnce(tr);
    const req = { params: { id: '12' } };
    const res = makeRes();
    await trController.getById(req, res);
    expect(res.json).toHaveBeenCalledWith(tr);
  });
});
