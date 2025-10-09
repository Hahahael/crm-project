import * as TrService from '../services/technicalRecommendationsService.js';

export async function listAll(req, res) {
  try {
    const data = await TrService.listAll();
    return res.json(data);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch technical recommendations' });
  }
}

export async function getById(req, res) {
  try {
    const { id } = req.params;
    const tr = await TrService.getById(id);
    if (!tr) return res.status(404).json({ error: 'Not found' });
    return res.json(tr);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch technical recommendation' });
  }
}

export async function createTr(req, res) {
  try {
    const created = await TrService.createTr(req.body);
    return res.status(201).json(created);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to create technical recommendation' });
  }
}

export async function updateTr(req, res) {
  try {
    const { id } = req.params;
    const updated = await TrService.updateTr(id, req.body);
    if (!updated) return res.status(404).json({ error: 'Not found' });
    return res.json(updated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to update technical recommendation' });
  }
}

export async function getItems(req, res) {
  try {
    const { id } = req.params;
    const items = await TrService.getItemsWithDetails(id);
    return res.json(items);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch TR items' });
  }
}

export default { listAll, getById, createTr, updateTr, getItems };
