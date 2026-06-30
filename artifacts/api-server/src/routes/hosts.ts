import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.post("/hosts/request-otp", (_req, res) => {
  res.status(410).json({
    error: "This endpoint is deprecated. Use POST /api/auth/signup/request-otp instead.",
  });
});

router.post("/hosts/verify-otp", (_req, res) => {
  res.status(410).json({
    error: "This endpoint is deprecated. Use POST /api/auth/signup/verify-otp instead.",
  });
});

router.get("/hosts/session", (_req, res) => {
  res.status(410).json({
    error: "This endpoint is deprecated. Use GET /api/auth/me instead.",
  });
});

export default router;
