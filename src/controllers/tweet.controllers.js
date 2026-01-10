import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Tweet } from "../models/tweet.models.js";

const createTweet = asyncHandler ( async ( req , res ) => {
    const { content } = req.body;

    if ( !content || content.trim() === "" ) {
        throw new ApiError(400 , "Content field is required.")
    }

    const userId = req.user?._id;

    if (!userId) {
        throw new ApiError(401, "Unauthorized request.");
    }
    

    const tweet = await Tweet.create({
        content : content ,
        owner : userId
    })

    if ( !tweet ) {
        throw new ApiError( 500 , "Something went wrong while creating tweet.")
    }

    return res
    .status(201)
    .json(
        new ApiResponse(201 , {
            tweet : tweet
        } , "Tweet created successfully.")
    )
    
})

const getUserTweets = asyncHandler ( async ( req , res ) => {
    const userId = req.user?._id;

    if ( !userId ) {
        throw new ApiError( 401 , "Unauthorized request")
    }

    const tweets = await Tweet.aggregate([
        {
            $match : {
                owner : userId
            }
        } ,
        {
            $project : {
                _id : 1 ,
                content : 1 ,
                owner : 1
            }
        }
    ])

    return res
    .status(200)
    .json( new ApiResponse(200 , {
        tweets
    } , "All the tweets of the user."
 ))
})

const updateTweet = asyncHandler ( async ( req , res ) => {

})

const deleteTweet = asyncHandler ( async ( req , res ) => {

})

export {
    createTweet , 
    getUserTweets ,
    updateTweet ,
    deleteTweet
}

