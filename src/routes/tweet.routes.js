import { Router } from "express";
import {
    createTweet ,
    getUserTweets , 
    updateTweet ,
    deleteTweet
} from "../controllers/tweet.controllers.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";

const router = Router();

router.use(verifyJWT)

router.route("/").post(createTweet);
router.route("/user").get(getUserTweets);
router.route("/:tweetId").patch(updateTweet);
router.route("/:tweetId").delete(deleteTweet);

export default router;