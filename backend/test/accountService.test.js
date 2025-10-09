import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockFindAll = vi.fn();
const mockFindNAEF = vi.fn();
const mockFindById = vi.fn();
const mockCreate = vi.fn();
const mockUpdateById = vi.fn();

vi.mock('../models/Account.js', () => ({
  findAll: (...args) => mockFindAll(...args),
  findNAEF: (...args) => mockFindNAEF(...args),
  findById: (...args) => mockFindById(...args),
  create: (...args) => mockCreate(...args),
  updateById: (...args) => mockUpdateById(...args),
}));

// Mock db for queries used in service (provide default export { query })
const mockDbQuery = vi.fn();
vi.mock('../mocks/dbMock.js', () => ({ default: { query: (...args) => mockDbQuery(...args) } }));

const mockGetRequestor = vi.fn();
const mockFindAssignee = vi.fn();
const mockStageExists = vi.fn();
const mockInsertStage = vi.fn();

vi.mock('../models/Workflow.js', () => ({
  findWorkOrderIdByAccountId: (...args) => mockDbQuery(...args),
  findAssigneeByWoId: (...args) => mockFindAssignee(...args),
  stageExists: (...args) => mockStageExists(...args),
  insertStage: (...args) => mockInsertStage(...args),
  getRequestorByAccountId: (...args) => mockGetRequestor(...args),
}));

import * as accountService from '../services/accountService.js';

describe('accountService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('getAll delegates to model.findAll', async () => {
    mockFindAll.mockResolvedValue([{ id: 1, accountName: 'A' }]);
    const res = await accountService.getAll();
    expect(mockFindAll).toHaveBeenCalled();
    expect(res).toEqual([{ id: 1, accountName: 'A' }]);
  });

  it('getNAEF delegates to model.findNAEF', async () => {
    mockFindNAEF.mockResolvedValue([{ id: 2, accountName: 'B' }]);
    const res = await accountService.getNAEF();
    expect(mockFindNAEF).toHaveBeenCalled();
    expect(res).toEqual([{ id: 2, accountName: 'B' }]);
  });

  it('getById delegates to model.findById', async () => {
    mockFindById.mockResolvedValue({ id: 3, accountName: 'C' });
    const res = await accountService.getById(3);
    expect(mockFindById).toHaveBeenCalledWith(3);
    expect(res).toEqual({ id: 3, accountName: 'C' });
  });

  it('createAccount delegates to model.create', async () => {
    const payload = { accountName: 'New' };
    mockCreate.mockResolvedValue({ id: 10, accountName: 'New' });
    const res = await accountService.createAccount(payload);
    expect(mockCreate).toHaveBeenCalledWith(payload);
    expect(res).toEqual({ id: 10, accountName: 'New' });
  });

  it('updateAccount updates and inserts workflow stage', async () => {
    // simulate generateRefNumberIfNeeded path and subsequent DB calls
    mockUpdateById.mockResolvedValue({ id: 5, accountName: 'Updated' });
    // model/db mocks for workflow functions
    mockGetRequestor.mockResolvedValue(null);
    mockDbQuery.mockResolvedValue({ rows: [] });
    mockFindAssignee.mockResolvedValue(null);
    mockStageExists.mockResolvedValue(false);
    mockInsertStage.mockResolvedValue({ rows: [] });

    const res = await accountService.updateAccount(5, { accountName: 'Updated' });
    expect(mockUpdateById).toHaveBeenCalled();
    expect(mockDbQuery).toHaveBeenCalled();
    expect(res).toEqual({ id: 5, accountName: 'Updated', assignee: null });
  });
});
