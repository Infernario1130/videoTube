import dotenv from "dotenv";
dotenv.config();

import connectToDb from "./db/index.js";
import app from "./app.js";

 connectToDb()
.then(() => {
    app.listen(process.env.PORT || 8000 , () => {
        console.log(`Server is running at port : ${process.env.PORT}`)
    })
})
.catch((error) => {
    console.log(`MongoDb connection error : ${error}`)
})