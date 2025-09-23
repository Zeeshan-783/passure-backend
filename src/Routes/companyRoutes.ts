import express from "express";
const router = express.Router();
import {
  getCompany,
  registerCompany,
  uploadCompanyLogo,
  SendInvitation,
  AcceptInvitation,
  companyUsersFetch,
  DeleteUserFromCompany,
  getInvitations,
  RejectInvitation,
getCompanyUsersDetails
} from "../Controllers/companyController";
import { protect } from "../Middleware/authMiddleware"; // ✅ Check case sensitivity
import upload from "../Middleware/upload";

router.post(
  "/uploadlogo",
  protect,
  upload.single("companyLogo"),
  uploadCompanyLogo
);
router.post("/register", protect, registerCompany);
router.get("/getcompanydetail", protect, getCompany);
router.post("/sendinvitation", protect, SendInvitation);
router.post("/acceptinvitation", protect, AcceptInvitation);
router.get("/companyusersfetch/:id", protect, companyUsersFetch);
router.post("/deleteuserfromcompany", protect, DeleteUserFromCompany);
router.get("/invitations",protect , getInvitations);
router.post("/reject-invite",protect , RejectInvitation);
router.get("/getcompanyuserdetails",protect , getCompanyUsersDetails);

export default router;
