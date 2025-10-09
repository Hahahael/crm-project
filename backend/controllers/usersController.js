import * as userService from '../services/userService.js';
import { toSnake } from '../helper/utils.js';

// List all users
export async function listUsers(req, res) {
  try {
    const rows = await userService.listUsers();
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
}

// Get single user
export async function getUser(req, res) {
  try {
    const { id } = req.params;
    const user = await userService.getUserById(id);
    if (!user) return res.status(404).json({ error: 'Not found' });
    return res.json(user);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch user' });
  }
}

// Create new user
export async function createUser(req, res) {
  try {
    const body = toSnake(req.body);
    const created = await userService.createUser(body);
    return res.status(201).json(created);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to create user' });
  }
}

// Update existing user
export async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const body = toSnake(req.body);
    const updated = await userService.updateUserById(id, body);
    if (!updated) return res.status(404).json({ error: 'Not found' });
    return res.json(updated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to update user' });
  }
}

// Delete user
export async function deleteUser(req, res) {
  try {
    const { id } = req.params;
    const deleted = await userService.deleteUserById(id);
    if (!deleted) return res.status(404).json({ error: 'User not found' });
    return res.json(deleted);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to delete user' });
  }
}

export default {
  listUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
};
