import express  from "express";
import { protect } from "../Middleware/authMiddleware";
import { GetUserProfileData, UpdateUserDetail ,GetUserProfileDetail,UpdateProfileImg, updatePlayerId} from "../Controllers/userController";
import upload from "../Middleware/upload";

const router = express.Router()


router.get("/userprofiledata",protect,GetUserProfileData)
router.get("/userprofiledetail",protect,GetUserProfileDetail)
router.post("/updateuserdetail",protect,UpdateUserDetail)
router.post("/updateprofileimg",protect,upload.single("profileImg"),UpdateProfileImg)
router.put("/playerid",protect,updatePlayerId)


export default router