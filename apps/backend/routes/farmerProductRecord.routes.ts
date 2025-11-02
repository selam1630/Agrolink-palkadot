// routes/farmerProductRecord.routes.ts
import { Router } from "express";
import {
  recordFarmerProduct,
  postRecordedProduct,
  getRecordedProducts,
} from "../controllers/farmerProductRecord.controller";
import { authenticateToken, protect } from "../middlewares/auth.middleware";

const router = Router();

router.post("/record", authenticateToken, protect(["admin"]), recordFarmerProduct);
router.post("/post", authenticateToken, protect(["admin"]), postRecordedProduct);
router.get("/", authenticateToken, protect(["admin"]), getRecordedProducts);

export default router;
