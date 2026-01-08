import { Router } from "express";
import { upload } from "../middlewares/multer.middlewares.js"
import { registerUser,
         loginUser
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

router.route("/login").post(loginUser)

export default router;