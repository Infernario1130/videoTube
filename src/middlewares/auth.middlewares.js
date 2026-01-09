import  jwt  from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const verifyJWT = asyncHandler( async ( req , res , next) => {
    try {
        const token = req.cookies?.accessToken || req.headers.authorization.split(" ")[1];

        if ( !token ) {
            throw new ApiError(401 , " Unauthorized request.")
        };

        const decodedToken = jwt.verify( token , process.env.ACCESS_TOKEN_SECRET );

        const user  = await User.findById( decodedToken._id ).select("-password -refreshToken")

        if ( !user ) {
            throw new ApiError( 401 , "Invalid access token.")
        }

        req.user = user;
        next()
    } catch (error) {
        throw new ApiError( 401 , error?.message || "Invalid access token")
    }
});

//eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2OTVmNDljMjFmYzIxZjYxMzY0OTdjNzgiLCJpYXQiOjE3Njc5NDcxNjIsImV4cCI6MTc2ODAzMzU2Mn0.QGX8E61DwHRMGBE5PkSpzUOvQ8p3Qwd32bFUsRvXrNA