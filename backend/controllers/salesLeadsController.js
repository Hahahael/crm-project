import * as salesService from '../services/salesLeadsService.js';

export async function listAll(req, res, next) {
  try {
    const data = await salesService.listAll();
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function getById(req, res, next) {
  try {
    const { id } = req.params;
    const data = await salesService.getById(id);
    if (!data) return res.status(404).json({ error: 'Not found' });
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function existsForWorkorder(req, res, next) {
  try {
    const { woId } = req.params;
    const exists = await salesService.existsForWorkorder(woId);
    res.json({ exists });
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const data = await salesService.createSalesLead(req.body);
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const { id } = req.params;
    const data = await salesService.updateSalesLead(id, req.body);
    if (!data) return res.status(404).json({ error: 'Not found' });
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export default {
  listAll,
  getById,
  existsForWorkorder,
  create,
  update,
};
