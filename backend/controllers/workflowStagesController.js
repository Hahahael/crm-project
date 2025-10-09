import * as workflowService from '../services/workflowStagesService.js';

export async function latestSubmitted(req, res, next) {
  try {
    const data = await workflowService.latestSubmitted();
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function listAll(req, res, next) {
  try {
    const data = await workflowService.listAll();
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function listByWorkorder(req, res, next) {
  try {
    const { woId } = req.params;
    const data = await workflowService.listByWorkorder(woId);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function getById(req, res, next) {
  try {
    const { id } = req.params;
    const data = await workflowService.getById(id);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function createStage(req, res, next) {
  try {
    const data = await workflowService.createStage(req.body);
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
}

export async function updateStage(req, res, next) {
  try {
    const { id } = req.params;
    const data = await workflowService.updateStage(id, req.body);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function deleteStage(req, res, next) {
  try {
    const { id } = req.params;
    const data = await workflowService.deleteStage(id);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function latestAssigned(req, res, next) {
  try {
    const { id } = req.params;
    const stageName = req.query.stageName || req.params.stageName;
    const data = await workflowService.latestAssigned(id, stageName);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export default {
  latestSubmitted,
  listAll,
  listByWorkorder,
  getById,
  createStage,
  updateStage,
  deleteStage,
  latestAssigned,
};
