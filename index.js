// Import necessary dependencies
const express = require('express');
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config();  // Load environment variables from a .env file
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)
const formData = require('form-data');
const Mailgun = require('mailgun.js');
const mailgun = new Mailgun(formData);
const mg = mailgun.client({
  username: 'api',
  key: process.env.MAIL_GUN_API_KEY,
});
const port = process.env.PORT || 5000;

// Middlewares: Enable CORS and parse JSON in the request body
app.use(cors());

app.use(express.json()); // Make sure you have this middleware to parse JSON

app.use((req, res, next) => {
  console.log(req.body); // Log the request body
  next();
});
// MongoDB connection URI with credentials from environment variables
const uri = `mongodb+srv://${process.env.USER}:${process.env.PASS}@cluster0.rrl4awm.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with specific API version and connection options
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// Async function to set up the server and connect to MongoDB
async function run() {
  try {
    // Connect the MongoDB client to the server
    // await client.connect();



    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Close the MongoDB client when done (commented out for now)
    // await client.close();
  }
}

// Call the run function and handle errors
run().catch(console.dir);



// Get collections from the BistroDB database
const menuCollection = client.db("BistroDB").collection("menu");
const reviewsCollection = client.db("BistroDB").collection("reviews");
const cartsCollection = client.db("BistroDB").collection("carts");
const userCollection = client.db("BistroDB").collection("users");
const paymentCollection = client.db("BistroDB").collection("payments");

// JWT related API endpoint to generate a token
app.post('/jwt', async (req, res) => {
  const user = req.body;
  const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1hr' });
  res.send({ token });
});

// Middleware to verify the JWT token in the request headers
const verifyToken = (req, res, next) => {
  // console.log(req.headers.authorization);
  if (!req.headers.authorization) {
    return res.status(401).send({ error: "Unauthorized access!!!" });
  }
  const token = req.headers.authorization.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: "Unauthorized access!!!" });
    }
    req.decoded = decoded;
    next();
  });
};

// Middleware to verify if the user is an admin

const verifyAdmin = async (req, res, next) => {
  const email = req.decoded.email;
  const query = { email: email };
  const user = await userCollection.findOne(query);
  const isAdmin = user?.role === "admin";
  if (!isAdmin) {
    return res.status(403).send({ message: 'forbidden access' });
  }
  next();
}
// Users related API endpoints
app.post("/users", async (req, res) => {
  const user = req.body;
  const query = { email: user.email }
  const existingUser = await userCollection.findOne(query);
  if (existingUser) {
    return res.send({ message: 'User already exists', insertedId: null })
  }
  const result = await userCollection.insertOne(user);
  res.send(result);
});

app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
  // console.log(req.headers);
  const result = await userCollection.find().toArray();
  res.send(result)
});

app.get('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await userCollection.findOne(query);
  res.send(result);
});

app.patch('/users/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
  const id = req.params.id;
  const filter = { _id: new ObjectId(id) };
  const updatedDoc = {
    $set: {
      role: "admin"
    }
  }
  const result = await userCollection.updateOne(filter, updatedDoc);
  res.send(result)
});

app.get('/users/admin/:email', verifyToken, async (req, res) => {
  const email = req.params.email;
  if (email !== req.decoded.email) {
    return res.status(403).send({ message: 'Forbidden access' })
  }
  const query = { email: email }
  const user = await userCollection.findOne(query);
  let admin = false;
  if (user) {
    admin = user?.role === "admin";
  }
  res.send({ admin })
});

app.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await userCollection.deleteOne(query);
  res.send(result);
});

// Menu related API endpoints
app.get('/menu', async (req, res) => {
  let result = await menuCollection.find().toArray();
  res.send(result);
});

app.delete('/menu/:id', verifyToken, verifyAdmin, async (req, res) => {
  const id = req.params.id;

  const query = { _id: new ObjectId(id) };

  const result = await menuCollection.deleteOne(query);
  res.send(result);
});
app.get('/menu/:id', async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await menuCollection.findOne(query);
  res.send(result);
})
app.post('/menu', verifyToken, verifyAdmin, async (req, res) => {
  const menu = req.body;
  const result = await menuCollection.insertOne(menu);
  res.send(result)
});
app.patch('/menu/:id', verifyToken, verifyAdmin, async (req, res) => {
  const item = req.body;
  const id = req.params.id;
  const filter = { _id: new ObjectId(id) }
  const updatedDoc = {
    $set: {
      name: item.name,
      category: item.category,
      price: item.price,
      recipe: item.recipe,
      image: item.image
    }
  }
  const result = await menuCollection.updateOne(filter, updatedDoc)
  res.send(result)


})

app.get('/reviews', async (req, res) => {
  let result = await reviewsCollection.find().toArray();
  res.send(result);
});

// Carts collection API endpoints
app.get('/carts', async (req, res) => {
  const email = req.query.email;
  const query = { userEmail: email }
  const result = await cartsCollection.find(query).toArray()
  res.send(result)
});

app.post('/carts', async (req, res) => {
  const body = req.body;
  const result = await cartsCollection.insertOne(body);
  res.send(result);
});

app.delete("/carts/:id", async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await cartsCollection.deleteOne(query);
  res.send(result);
});
//payment intent
app.post('/create-payment-intent', async (req, res) => {
  const { price } = req.body;
  const amount = parseInt(price * 100);
  console.log('amount', amount);
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount,
    currency: "usd",
    payment_method_types: ['card']
  })
  res.send({
    clientSecret: paymentIntent.client_secret
  })

});

//payment related api
app.get('/payments/:email', verifyToken, async (req, res) => {
  const query = { email: req.params.email }
  if (req.params.email !== req.decoded.email) {
    return res.status(403).send({ message: 'forbidden access' });
  }
  const result = await paymentCollection.find(query).toArray();
  res.send(result);
})

app.post('/payments', async (req, res) => {
  const payment = req.body;
  const paymentResult = await paymentCollection.insertOne(payment);
  //carefully delete each item from the  cart 

  const query = {
    _id: {
      $in: payment.cartIds.map(id => new ObjectId(id))
    }
  }
  const deleteResult = await cartsCollection.deleteMany(query)

  //send user email about payment confirmation  
  mg.messages
    .create(process.env.MAIL_SENDING_DOMAIN, {
      from: "Mailgun Sandbox <postmaster@sandbox5a14e96793014656aaacf38379daab0d.mailgun.org>",
      to: ["muddasirfaiyaj66@gmail.com"],
      subject: "Bistro Boss Order Confirmation",
      text: "Testing some Mailgun awesomness!",
      html: `
      <div>
      <h2>Thank You for your order</h2>
      <h4>Your Transaction Id :<strong>${payment.transactionId}</strong> </h4>
      <p> We would like to get your feedback about the food </p>
      
      </div>
      `
    })
    .then(msg => console.log(msg)) // logs response data
    .catch(err => console.log(err)); // logs any error`;
  res.send({ paymentResult, deleteResult })
});

//stats or analytics
app.get('/admin-stats', verifyToken, verifyAdmin, async (req, res) => {
  const users = await userCollection.estimatedDocumentCount();
  const menuItems = await menuCollection.estimatedDocumentCount();
  const orders = await paymentCollection.estimatedDocumentCount();

  //this is not the best way 
  // const payments = await paymentCollection.find().toArray();
  // const revenue = payments.reduce((total, payment)=> total + payment.price,0);
  const result = await paymentCollection.aggregate([
    {
      $group: {
        _id: null,
        totalRevenue: {
          $sum: '$price'
        }
      }

    }
  ]).toArray();
  const revenue = result.length > 0 ? result[0].totalRevenue : 0;
  res.send({
    users,
    menuItems,
    orders,
    revenue

  })
})

//Order Status 

/**
 * -----------------------
 * NON-Efficient Way
 * -----------------------
 * 1. Load all the payments
 * 2. for every menuItems is  (which is an array), go find the item from menu collection 
 * 3. for every item in  the menu collection that  you found from a payment entry (document)
 */

//using aggregate pipeline
app.get('/order-stats', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const beforeLookup = await paymentCollection.countDocuments();
    console.log('Before $lookup:', beforeLookup);

    const result = await paymentCollection.aggregate([
      {
        $lookup: {
          from: 'menu',
          localField: 'menuItemIds',
          foreignField: '_id',
          as: 'menuItems'
        }
      },
      {
        $unwind: '$menuItems'
      },
      {
        $match: {
          'menuItems.category': { $exists: true }
        }
      },
      {
        $group: {
          _id: '$menuItems.category',
          quantity: {
            $sum: 1
          },
          revenue: {
            $sum: '$menuItems.price'
          }
        }
      },
      {
        $project: {
          _id: 0,
          category: '$_id',
          quantity: '$quantity',
          revenue: '$revenue'
        }
      }
    ]).toArray();

    console.log(result);

    const afterLookup = await paymentCollection.countDocuments();
    console.log('After $lookup:', afterLookup);

    res.send(result);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

// Default route to confirm the server is running
app.get('/', (req, res) => [
  res.send("Bistro Boss Server is running")
]);

// Start the server and listen on the specified port
app.listen(port, () => {
  console.log(`Server is running on port ${port}`)
});