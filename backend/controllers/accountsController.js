import * as accountService from '../services/accountService.js';

export async function listAll(req, res) {
  try {
    const rows = await accountService.getAll();
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch accounts' });
  }
}

export async function listNAEF(req, res) {
  try {
    const rows = await accountService.getNAEF();
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch NAEF accounts' });
  }
}

export async function getById(req, res) {
  try {
    const { id } = req.params;
    const row = await accountService.getById(id);
    if (!row) return res.status(404).json({ error: 'Account not found' });
    return res.json(row);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch account' });
  }
}

export async function create(req, res) {
  try {
    const created = await accountService.createAccount(req.body);
    return res.status(201).json(created);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to create account' });
  }
}

export async function update(req, res) {
  try {
    const { id } = req.params;
    const updated = await accountService.updateAccount(id, req.body);
    if (!updated) return res.status(404).json({ error: 'Account not found' });
    return res.json(updated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to update account' });
  }
}

export default { listAll, listNAEF, getById, create, update };
