import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import multer from 'multer'
//fix GridfsStorage not a constructor  we use {GridFsStorage} or if using require 'multer-gridfs-storage'.GridFsStorage
import {
    GridFsStorage
} from 'multer-gridfs-storage'
import Grid from 'gridfs-stream'
import bodyParser from 'body-parser'
import path from 'path'
import Pusher from 'pusher';
import Cors from "cors";
import dotenv from "dotenv";
import Posts from './models/postsModel.js';

dotenv.config();

//initial setup
Grid.mongo = mongoose.mongo;
const app = express();
const PORT = process.env.PORT || 9000;


//Middleware
app.use(bodyParser.json());
app.use(Cors());
//DB Config
const connection_url = process.env.MONGO_URL;

const connection = mongoose.createConnection(connection_url, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});
mongoose.connect(connection_url, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// for image on database
let gfs, gridfsBucket;
connection.once('open', () => {
    console.log("DB Connected");
    gridfsBucket = new mongoose.mongo.GridFSBucket(connection.db, {
        bucketName: 'images'
    });
    gfs = Grid(connection.db, mongoose.mongo);
    gfs.collection('images');
})


const storage = new GridFsStorage({
    url: connection_url,
    file: (req, file) => {
        return new Promise((resolve, reject) => {
            const filename = `image-${Date.now()}${path.extname(file.originalname)}`
            const fileInfo = {
                filename: filename,
                bucketName: 'images'
            }
            resolve(fileInfo)
        })
    }
})

const upload = multer({
    storage
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
mongoose.connection.once('open', () => {
    console.log('DB Connected for pusher')
    const changeStream = mongoose.connection.collection('posts').watch()
    changeStream.on('change', change => {
        console.log(change)
        if (change.operationType === "insert") {
            console.log('Trigerring Pusher')
            pusher.trigger('posts', 'inserted', {
                change: change
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
app.post('/upload/image', upload.single('file'), (req, res) => {
    res.status(201).send(req.file)
})

app.post('/upload/post', (req, res) => {
    const dbPost = req.body
    Posts.create(dbPost, (err, data) => {
        if (err) res.status(500).send(err)
        else res.status(201).send(data)
    })
})

app.get('/posts', (req, res) => {
    Posts.find((err, data) => {
        if (err) {
            res.status(500).send(err)
        } else {
            data.sort((b, a) => a.timestamp - b.timestamp)
            res.status(200).send(data)
        }
    })
})

// getting
app.get('/images/single', (req, res) => {
    gfs.files.findOne({
        filename: req.query.name
    }, (err, file) => {
        if (err) {
            res.status(500).send(err)
        } else {
            if (!file || file.length === 0) {
                res.status(404).json({
                    err: 'file not found'
                })
            } else {
                if (file.contentType === 'image/jpeg' || file.contentType === 'image/png') {
                    const readStream = gridfsBucket.openDownloadStream(file._id);
                    readStream.pipe(res);
                }
                // const readstream = gfs.createReadStream(file.filename)
                // readstream.pipe(res)
            }
        }
    })
})

//LIstener
app.listen(PORT, () => {
    console.log(`server up and running on port${PORT}`)
})