import mongoose , { Schema } from "mongoose";

const videoSchema = new Schema ({
    title : {
        type : String ,
        required : true ,
        trim : true
    } ,

    description : {
        type : String , 
        required : true ,
        trim : true
    } ,

    videoFile : {
        type : String ,
        required : true ,
        trim : true
    } ,

    thumbnail : {
        type : String ,
        required : true
    } , 

    views : {
        type : Number ,
        default : 0
    } ,

    isPublished : {
        type : Boolean ,
        default : true
    } ,

    duration : {
        type : Number ,
        required : true ,
        trim : true
    } ,

    owner : {
        type : Schema.Types.ObjectId ,
        ref : "User"
    }
} , {
    timestamps : true
})

export const Video = mongoose.model( "Video" , videoSchema )