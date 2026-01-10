import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { uploadCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const generateAccessAndRefreshToken = async(userId) => {
     try {
          const user = await User.findById(userId);
          const accessToken = await user.generateAccessToken();
          const refreshToken = await user.generateRefreshToken();

          user.refreshToken = refreshToken;

          await user.save({ validateBeforeSave : false});

          return { accessToken , refreshToken }
     } catch (error) {
          throw new ApiError( 500 , "Something went wrong while generating access and refresh token.")
     }
}

const registerUser = asyncHandler( async ( req , res ) => {

   const { username , email , fullName , password } = req.body;

   if ([ username , email ,fullName , password ].some((field) => !field || field?.trim() === "") ) {
        throw new ApiError( 404 , "Required fields are missing.")
   }

   const existingUser = await User.findOne({
        $or : [ {
            username : username ,
            email : email
        }]
   })

   if (existingUser) {
    throw new ApiError( 404 , "Username or email already exists.")
   }

   const avatarLocalPath = req.files?.avatar[0].path;

   const coverImageLocalPath = req.files?.coverImage?.[0].path;

   if (!avatarLocalPath) {
    throw new ApiError( 400 , "Avatar file is required.")
   }

   const avatar = await uploadCloudinary(avatarLocalPath);
   const coverImage = await uploadCloudinary(coverImageLocalPath);

   if (!avatar) {
    throw new ApiError( 400 , "Avatar file is required.")
   }

   const user = await User.create({
        username : username.toLowerCase() ,
        email , 
        password ,
        fullName ,
        avatar : avatar.url ,
        coverImage : coverImage?.url || ""
   })

   const createdUser = await User.findById(user._id).select(
    " -password -refreshToken"
   )

   if (!createdUser) {
    throw new ApiError( 500 , "Something went wrong while registering the user.")
   }

   return res.status(201).json(
    new ApiResponse(200 , createdUser , "User registered successfully.")
   )
}) 

const loginUser = asyncHandler ( async ( req , res ) => {
     const { email , username , password } = req.body;

     if ( [ email , username , password ].some((field) =>        !field || field?.trim() === "") ) {
          throw new ApiError( 404 , "Required fields are missing." )
     }

     const user = await User.findOne({
          $or : [ {username} , {email}]
     })

     if (!user) {
          throw new ApiError(400 , "User does not exist.")
     }

     const isPasswordValid = await user.isPasswordCorrect(password);

     if (!isPasswordValid) {
          throw new ApiError( 401 , "Invalid user credentials.")
     }

     const { accessToken , refreshToken } = await generateAccessAndRefreshToken(user._id);

     const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

     const options = {
          httpOnly : true ,
          secure : true
     }

     return res
     .status(200)
     .cookie( "accessToken" , accessToken , options)
     .cookie( "refreshToken" , refreshToken , options)
     .json(
          new ApiResponse(
               200 ,
               {
                    user : loggedInUser , accessToken , refreshToken
               } , 
               "User logged in successfully."
          )
     )
})

const logoutUser = asyncHandler( async ( req , res) => {
     await User.findByIdAndUpdate(
          req.user._id ,
          {
                $unset : {
                    refreshToken : 1
                }
          } , 
          {
               new : true
          }
     )

     const options = {
          httpOnly : true ,
          secure : true
     }

     return res
     .status(200)
     .clearCookie("accessToken" , options)
     .clearCookie("refreshToken" , options)
     .json(new ApiResponse(200 , { } , "User logged out."))
})

const refreshAccessToken = asyncHandler( async ( req , res ) => {
     const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken ;

     if ( !incomingRefreshToken ) {
          throw new ApiError( 401 , "Unauthorized request." )
     }

     try {
          const decodedToken = await jwt.verify(
               incomingRefreshToken ,
               process.env.REFRESH_TOKEN_SECRET
          )

          const user = await User.findById(decodedToken?._id)

          if (!user) {
               throw new ApiError( 401 , "Refresh token is expired or used." )
          }

          if (user?.refreshToken !== incomingRefreshToken) {
               throw new ApiError( 401 , "Refresh token is expired or used.")
          }

          const { accessToken , refreshToken : newRefreshToken } = await generateAccessAndRefreshToken(user._id);
          
          const options = {
               httpOnly : true ,
               secure : true
          }

          return res
                 .status(200)
                 .cookie( "accessToken" , accessToken , options)
                 .cookie( "refreshToken" , refreshToken , options )
                 .json( 
                    new ApiResponse(
                         200 ,
                         {accessToken , refreshToken : newRefreshToken } ,
                         "Access token refreshed."
                    )) 
     } catch (error) {
          throw new ApiError(401 , error?.message || "Invalid refresh token")
     }
});

const changeCurrentPassword = asyncHandler( async( req , res ) => {
     const { currentPassword , newPassword } = req.body;

     if ([ currentPassword , newPassword ].some((field) =>  
          !field || field.trim() === ""
     )) {
          throw new ApiError( 400 , "Required fields are missing.")
     }

     const userId = req.user._id ;

     const user = await User.findById(userId)

     if ( !user ) {
          throw new ApiError( 404 , "User does not exists.")
     }

     const isPasswordValid = await user.isPasswordCorrect(currentPassword);

     if ( !isPasswordValid ) {
          throw new ApiError( 401 , "Invalid current password.")
     }

      user.password = newPassword ;

      await user.save({ validateBeforeSave : false });

      return res
      .status(200)
      .json( new ApiResponse(200 , { } , "Password changed successfully.") )


})

const getCurrentUser = asyncHandler( async( req , res) => {
     const userId = req.user._id;

     const user = await User.findById(userId).select("-password -refreshToken")

     if (!user) {
          throw new ApiError( 404 , "User does not exist.")
     }

     return res
     .status(200)
     .json( new ApiResponse( 200 , {
          user : user
     } , "User fetched successfully."))
})

const updateAccountDetails = asyncHandler( async( req , res ) => {
     const { email , fullName } = req.body;

     if ( !email ) {
          throw new ApiError( 400 , "Email is required.")
     };

     if ( !fullName ) {
          throw new ApiError( 400 , "Fullname is required.")
     };

     const userId = req.user?._id;

     const updatedUser = await User.findByIdAndUpdate(
          userId , 
          {
             $set : {
               email : email ,
               fullName : fullName
             }   
          } ,
          {
               new : true
          }
     ).select("-password -refreshToken")

     if ( !updatedUser ) {
          throw new ApiError( 404 , "User does not exist." )
     }

     return res
     .status(200)
     .json(new ApiResponse(200 , updatedUser , "User updated successfully." ))
})

const updateUserAvatar = asyncHandler( async( req , res ) => {
     const updatedAvatarPath = req.file?.path;

     if ( !updatedAvatarPath ) {
          throw new ApiError( 400 , "New avatar is required.")
     }

     const userId = req.user?._id;

     const user = await User.findById(userId).select("-password -refreshToken")

     if ( !user ) {
          throw new ApiError( 404 , "User does not exist.")
     }

     const updatedAvatar = await uploadCloudinary(updatedAvatarPath);

     if ( !updatedAvatar ) {
          throw new ApiError( 500 , "Something went wrong while uploading avatar.")
     }

     user.avatar = updatedAvatar.url;

     await user.save({ validateBeforeSave : false });

     return res
     .status(200)
     .json( new ApiResponse(200 , updatedAvatar.url , "Avatar updated successfully."))

})

const updateUserCoverImage = asyncHandler( async ( req , res ) => {
     const updatedCoverImagePath = req.file?.path;

     if ( !updatedCoverImagePath ) {
          throw new ApiError( 400 , "New cover image is required.")
     }

     const userId = req.user?._id;

     const user = await User.findById(userId);

     if ( !user ) {
          throw new ApiError( 404 , "User does not exist.")
     }

     const updatedCoverImage = await uploadCloudinary(updatedCoverImagePath);

     if ( !updatedCoverImage ) {
          throw new ApiError( 500 , "Something went wrong while uploading cover image.")
     }

     user.coverImage = updatedCoverImage.url;

     await user.save({ validateBeforeSave : true});

     return new ApiResponse(200 , updatedCoverImage.url , "Cover image updated successfully.")
})

const getUserChannelProfile = asyncHandler( async ( req , res ) => {
     const {username} = req.params;

     if (!username) {
          throw new ApiError( 400 , "Username is missing.")
     }

     const channel = await User.aggregate([
          {
               $match : {
                    username : username.toLowerCase()
               }
          } , 
          {
               $lookup : {
                    from : "subscriptions" ,
                    localField : "_id" ,
                    foreignField : "channel" ,
                    as : "subscribers"
               }
          } , 
          {
               $lookup : {
                    from : "subscriptions" ,
                    localField : "_id" ,
                    foreignField : "subscriber" ,
                    as : "subscribedTo"
               }
          } , 
          {
               $addFields : {
                    subscribersCount : {
                         $size : "$subscribers"
                    } ,

                    channelsSubscribedToCount : {
                         $size : "$subscribedTo"
                    }
               }
          } , 
          {
               $project : {
                    "username" : 1 ,
                    "email" : 1 ,
                    "fullName" : 1 ,
                    "avatar" : 1 ,
                    "coverImage" : 1 ,
                    "subscribersCount" : 1 ,
                    "channelsSubscribedToCount" : 1
               }
          }
     ])

     if ( !channel?.length ) {
          throw new ApiError( 404 , "Channel does not exist.")
     }

     return res
     .status(200)
     .json(
          new ApiResponse(200 , channel[0] , "User channel fetched successfully.")
     )
})

const getWatchHistory = asyncHandler( async ( req , res ) => {

})


export { registerUser , loginUser , refreshAccessToken , logoutUser , changeCurrentPassword , getCurrentUser , updateAccountDetails , updateUserAvatar , updateUserCoverImage , getUserChannelProfile , getWatchHistory }