import * as RfqService from '../services/rfqsService.js';

export async function listAll(req, res) {
  try {
    const data = await RfqService.listAll();
    return res.json(data);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch RFQs' });
  }
}

export async function listVendors(req, res) {
  try {
    const data = await RfqService.listVendors();
    return res.json(data);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch vendors' });
  }
}

export async function getById(req, res) {
  try {
    const { id } = req.params;
    const rfq = await RfqService.getById(id);
    if (!rfq) return res.status(404).json({ error: 'Not found' });
    return res.json(rfq);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch RFQ' });
  }
}

export async function createRfq(req, res) {
  try {
    const created = await RfqService.createRfq(req.body);
    return res.status(201).json(created);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to create RFQ' });
  }
}

export async function updateRfq(req, res) {
  try {
    const { id } = req.params;
    const updated = await RfqService.updateRfq(id, req.body);
    if (!updated) return res.status(404).json({ error: 'Not found' });
    return res.json(updated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to update RFQ' });
  }
}

export async function getItems(req, res) {
  try {
    const { id } = req.params;
    const items = await RfqService.getItemsWithQuotes(id);
    return res.json(items);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch RFQ items' });
  }
}

export async function upsertItems(req, res) {
  try {
    const { id } = req.params;
    const upserted = await RfqService.upsertItems(id, req.body);
    return res.status(201).json(upserted);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to save RFQ items' });
  }
}

export async function upsertVendors(req, res) {
  try {
    const { id } = req.params;
    const upserted = await RfqService.upsertVendors(id, req.body);
    return res.status(201).json(upserted);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to save RFQ vendors' });
  }
}

export async function upsertItemQuotes(req, res) {
  try {
    const { id } = req.params;
    const upserted = await RfqService.upsertItemQuotes(id, req.body);
    return res.status(201).json(upserted);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to save RFQ item vendor quotes' });
  }
}

export async function listVendorsForRfq(req, res) {
  try {
    const { id } = req.params;
    const vendors = await RfqService.getVendorsForRfq(id);
    return res.json(vendors);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch RFQ vendors' });
  }
}

export default {
  listAll,
  listVendors,
  getById,
  createRfq,
  updateRfq,
  getItems,
  upsertItems,
  upsertVendors,
  upsertItemQuotes,
  listVendorsForRfq,
};
