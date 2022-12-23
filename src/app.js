/* //docs imports
import router from './router/index.js';

//Libraries  imports
import cors from 'cors';
import express from 'express';

const app = express();
app.use(express.json());
app.use(cors);
app.use = (router);

app.listen(process.env.PORT,()=> {
    console.log("Server running on port " + process.env.PORT);
}) */