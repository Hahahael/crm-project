import * as workorderService from '../services/workordersService.js';

export async function listAll(req, res, next) {
  try {
    const data = await workorderService.listAll();
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function listAssigned(req, res, next) {
  try {
    const username = req.user?.username;
    const data = await workorderService.listAssigned(username);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function listAssignedNew(req, res, next) {
  try {
    const username = req.user?.username;
    const data = await workorderService.listAssignedNew(username);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function getById(req, res, next) {
  try {
    const { id } = req.params;
    const data = await workorderService.getById(id);
    if (!data) return res.status(404).json({ error: 'Not found' });
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const data = await workorderService.createWorkorder(req.body);
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const { id } = req.params;
    const data = await workorderService.updateWorkorder(id, req.body);
    if (!data) return res.status(404).json({ error: 'Not found' });
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function statusSummary(req, res, next) {
  try {
    const data = await workorderService.getStatusSummary();
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export default {
  listAll,
  listAssigned,
  listAssignedNew,
  getById,
  create,
  update,
  statusSummary,
};
