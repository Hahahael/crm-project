import express from "express";
import {} from "../mocks/dbMock.js";
import * as AccountsController from "../controllers/accountsController.js";

const router = express.Router();

// GET all accounts
router.get("/all", AccountsController.listAll);

// GET all accounts
router.get("/", AccountsController.listNAEF);

// GET all account industries
router.get("/industries", AccountsController.listIndustries);

// GET all accounts product brands
router.get("/product-brands", AccountsController.listProductBrands);

// GET all accounts departments
router.get("/departments", AccountsController.listDepartments);

// GET single account by id
router.get("/:id", AccountsController.getById);

// ADD new account
router.post("/", AccountsController.create);

// UPDATE account
router.put("/:id", AccountsController.update);

export default router;
