import { Router } from "express";
import { upload } from "../middlewares/multer.middlewares.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js"
import { registerUser,
         loginUser ,
         logoutUser ,
         changeCurrentPassword
 } from "../controllers/user.controllers.js"

const router = Router();

router.route("/register").post(
    upload.fields([
        {
            name : "avatar" ,
            maxCount : 1
        } ,
        {
            name : "coverImage" ,
            maxCount : 1
        }
    ]) ,
    registerUser
);

router.route("/login").post(loginUser);

router.route("/logout").get(verifyJWT , logoutUser);

router.route("/change-password").post(verifyJWT , changeCurrentPassword)

export default router;