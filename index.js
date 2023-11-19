const express = require('express');
const app = express();
const { MongoClient, ServerApiVersion } = require('mongodb');
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 5000;

//middlewares 
app.use(cors());
app.use(express.json());





const uri = `mongodb+srv://${process.env.USER}:${process.env.PASS}@cluster0.rrl4awm.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const menuCollection = client.db("BistroDB").collection("menu");
    const reviewsCollection = client.db("BistroDB").collection("reviews");
    const cartsCollection = client.db("BistroDB").collection("carts");

     app.get('/menu', async (req,res) =>{
      let result = await menuCollection.find().toArray();
      res.send(result);
     })
     app.get('/reviews', async (req,res) =>{
      let result = await reviewsCollection.find().toArray();
      res.send(result);
     })
    // carts collection 

    app.get('/carts', async(req,res)=>{
      const result = await cartsCollection.find().toArray()
      res.send(result)
    })
    app.post('/carts', async(req,res)=>{
      const body = req.body;
      const result = await cartsCollection.insertOne(body);

      res.send(result);
    })
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res) => [
  res.send("Bistro Bosss Server is running")
]);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`)
});
