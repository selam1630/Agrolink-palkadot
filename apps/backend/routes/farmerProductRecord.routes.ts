import { Router } from "express";
import { recordFarmerProduct, postRecordedProduct } from "../controllers/farmerProductRecord.controller";
import { authenticateToken, protect } from "../middlewares/auth.middleware";

const router = Router();

router.post("/record", authenticateToken, protect(["admin"]), recordFarmerProduct);
router.post("/post", authenticateToken, protect(["admin"]), postRecordedProduct);

export default router;
