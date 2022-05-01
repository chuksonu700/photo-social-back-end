import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Cors from 'cors';
import Posts from './models/postsModel.js';
import Pusher  from "pusher";
dotenv.config();

//initial setup
const app = express();
const PORT = process.env.PORT || 9000;


//Middleware
app.use(express.json());
app.use(Cors());
//DB Config
const connection_url = process.env.MONGO_URL;
mongoose.connect(connection_url, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

//pUsher
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_APP_KEY,
  secret: process.env.PUSHER_APP_SECRET,
  cluster: process.env.PUSHER_APP_CLUSTER,
  useTLS: true
});

//API Endpoints
const db = mongoose.connection;
db.once("open",()=>{
    console.log("DB Connected")
    const msgCollection = db.collection("posts"); 
    const changeStream = msgCollection.watch();
    changeStream.on("change", change =>{
        // console.log(change)
        if (change.operationType==="insert") {
            // console.log("Trigger pusher")
            pusher.trigger("posts","inserted",{
                change:change
            })
        } else {
            console.log('Error trigerring Pusher')
        }
    })
})
app.get('/', (req, res) => {
    res.status(200).send("Welcome to the ")
})

//saving a 
app.post('/upload',(req,res)=>{
    const newMessage = req.body;
    Posts.create(newMessage,(err,data)=>{
        if (err){
            res.status(501).send(err)
        } else{
            res.status(201).send(data)
        }
    })
})
// getting
app.get('/sync',(req,res)=>{
    
    Posts.find((err,data)=>{
        if (err){
            res.status(501).send(err)
        } else{
            res.status(201).send(data)
        }
    })
})

//LIstener
app.listen(PORT, () => {
    console.log(process.env.NODE_ENV)
    console.log(`server up and running on port${PORT}`)
})