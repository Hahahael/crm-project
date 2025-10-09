import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the User model methods
const mockFindAll = vi.fn();
const mockFindById = vi.fn();
const mockCreate = vi.fn();
const mockUpdateById = vi.fn();
const mockDeleteById = vi.fn();

vi.mock('../models/User.js', () => ({
  findAll: (...args) => mockFindAll(...args),
  findById: (...args) => mockFindById(...args),
  create: (...args) => mockCreate(...args),
  updateById: (...args) => mockUpdateById(...args),
  deleteById: (...args) => mockDeleteById(...args),
}));

import * as userService from '../services/userService.js';

describe('userService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('listUsers delegates to model.findAll', async () => {
    mockFindAll.mockResolvedValue([{ id: 1, username: 'alice' }]);
    const res = await userService.listUsers();
    expect(mockFindAll).toHaveBeenCalled();
    expect(res).toEqual([{ id: 1, username: 'alice' }]);
  });

  it('getUserById delegates to model.findById and returns null when not found', async () => {
    mockFindById.mockResolvedValue(null);
    const res = await userService.getUserById(123);
    expect(mockFindById).toHaveBeenCalledWith(123);
    expect(res).toBeNull();
  });

  it('createUser delegates to model.create and returns created user', async () => {
    const payload = { username: 'bob' };
    mockCreate.mockResolvedValue({ id: 2, username: 'bob' });
    const res = await userService.createUser(payload);
    expect(mockCreate).toHaveBeenCalledWith(payload);
    expect(res).toEqual({ id: 2, username: 'bob' });
  });

  it('updateUserById delegates to model.updateById', async () => {
    mockUpdateById.mockResolvedValue({ id: 5, username: 'updated' });
    const res = await userService.updateUserById(5, { username: 'updated' });
    expect(mockUpdateById).toHaveBeenCalledWith(5, { username: 'updated' });
    expect(res).toEqual({ id: 5, username: 'updated' });
  });

  it('deleteUserById delegates to model.deleteById', async () => {
    mockDeleteById.mockResolvedValue({ id: 7, username: 'gone' });
    const res = await userService.deleteUserById(7);
    expect(mockDeleteById).toHaveBeenCalledWith(7);
    expect(res).toEqual({ id: 7, username: 'gone' });
  });
});
