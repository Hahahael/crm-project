import * as UserModel from '../models/User.js';

export async function listUsers() {
  return UserModel.findAll();
}

export async function getUserById(id) {
  return UserModel.findById(id);
}

export async function createUser(body) {
  return UserModel.create(body);
}

export async function updateUserById(id, body) {
  return UserModel.updateById(id, body);
}

export async function deleteUserById(id) {
  return UserModel.deleteById(id);
}

export default {
  listUsers,
  getUserById,
  createUser,
  updateUserById,
  deleteUserById,
};
