import { Router } from "express";
import authRouter from "./auth.routes.js";
import profileRouter from "./profile.routes.js";

const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/profiles", profileRouter);

export default apiRouter;