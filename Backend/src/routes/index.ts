// Express routes, mounted under /api (plan Phase 13). Pull-request and
// retest endpoints come with PR persistence.

import express, { Router } from "express";
import * as c from "../controllers/index.js";

export const router = Router();

// Reports from `wm-sentinel push` can be several MB; everything else stays at the 100kb default.
router.post("/projects/:id/assessments/import", express.json({ limit: "25mb" }), c.importAssessment);
router.use(express.json());

router.get("/projects", c.listProjects);
router.post("/projects", c.createProject);
router.get("/projects/:id", c.getProject);
router.patch("/projects/:id", c.updateProject);

router.get("/projects/:id/assessments", c.listAssessments);
router.post("/projects/:id/assessments", c.enqueueAssessment);

router.get("/assessments/:id", c.getAssessment);
router.get("/assessments/:id/findings", c.listAssessmentFindings);
router.get("/assessments/:id/report", c.exportAssessmentReport);

router.get("/findings/:id", c.getFinding);
router.patch("/findings/:id", c.updateFinding);
