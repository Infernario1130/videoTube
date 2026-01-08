import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { uploadCloudinary } from "../utils/cloudinary.js";
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
     .cookie( "accessToken" , accessToken )
     .cookie( "refreshToken" , refreshToken )
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

export { registerUser , loginUser }