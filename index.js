const express = require("express");
const app = express();
const cors = require("cors");
const ObjectId = require("mongodb").ObjectId;
const admin = require("firebase-admin");
require("dotenv").config();
const { MongoClient } = require("mongodb");

const port = process.env.PORT || 5000;

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

app.use(cors());
app.use(express.json());

//uri of database
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.4s98b.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// verify token function
async function verifyToken(req, res, next) {
  if (req.headers?.authorization?.startsWith("Bearer ")) {
    const token = req.headers.authorization.split(" ")[1];

    try {
      const decodedUser = await admin.auth().verifyIdToken(token);
      req.decodedEmail = decodedUser.email;
    } catch {}
  }
  next();
}

// run function
async function run() {
  try {
    await client.connect();
    const database = client.db("onsTech");
    const usersCollection = database.collection("users");
    const productsCollection = database.collection("products");
    const bookingCollection = database.collection("bookingData");
    const reviewsCollection = database.collection("reviews");

    // users information by email
    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      let isAdmin = false;
      if (user?.role === "admin") {
        isAdmin = true;
      }
      res.json({ admin: isAdmin });
    });

    // post user in db
    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      console.log(result);
      res.json(result);
    });

    // put user for google login
    app.put("/users", async (req, res) => {
      const user = req.body;
      const filter = { email: user.email };
      const options = { upsert: true };
      const updateDoc = { $set: user };
      const result = await usersCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.json(result);
    });

    //make admin
    app.put("/users/admin", verifyToken, async (req, res) => {
      const user = req.body;
      const requester = req.decodedEmail;
      if (requester) {
        const requesterAccount = await usersCollection.findOne({
          email: requester,
        });
        if (requesterAccount.role === "admin") {
          const filter = { email: user.email };
          const updateDoc = { $set: { role: "admin" } };
          const result = await usersCollection.updateOne(filter, updateDoc);
          res.json(result);
        }
      } else {
        res
          .status(403)
          .json({ message: "you do not have access to make admin" });
      }
    });

    // for all products
    app.get("/products", async (req, res) => {
      const cursor = productsCollection.find({});
      const services = await cursor.toArray();
      res.json(services);
    });

    // for single product
    app.get("/products/:id", async (req, res) => {
      const id = req.params.id;
      console.log("getting specific service", id);
      const query = { _id: ObjectId(id) };
      const service = await productsCollection.findOne(query);
      res.json(service);
    });

    // for posting product
    app.post("/products", async (req, res) => {
      const product = req.body;
      const result = await productsCollection.insertOne(product);
      console.log(result);
      res.json(result);
    });

    // for delete product
    app.delete("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await productsCollection.deleteOne(query);
      console.log("deleting user with id ", result);
      res.json(result);
    });

    // for getting all booking
    app.get("/allBooking", async (req, res) => {
      const cursor = bookingCollection.find({});
      const services = await cursor.toArray();
      res.json(services);
    });

    // for getting booking for specified email
    app.get("/booking", verifyToken, async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const cursor = bookingCollection.find(query);
      const services = await cursor.toArray();
      res.json(services);
    });

    app.get("/booking/:id", async (req, res) => {
      const id = req.params.id;
      console.log("getting specific service", id);
      const query = { _id: ObjectId(id) };
      const service = await bookingCollection.findOne(query);
      res.json(service);
    });

    // for delete any booking
    app.delete("/booking/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await bookingCollection.deleteOne(query);
      console.log("deleting user with id ", result);
      res.json(result);
    });

    // for posting new booking
    app.post("/booking", async (req, res) => {
      const bookingData = req.body;
      const result = await bookingCollection.insertOne(bookingData);
      console.log(result);
      res.json(result);
    });

    // for update condition pending to shipped
    app.put("/booking/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          condition: "shipped",
        },
      };
      const result = await bookingCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      console.log("updating", id);
      res.json(result);
    });

    // for posting review
    app.post("/reviews", async (req, res) => {
      const review = req.body;
      const result = await reviewsCollection.insertOne(review);
      console.log(result);
      res.json(result);
    });

    // for getting reviews
    app.get("/reviews", async (req, res) => {
      const cursor = reviewsCollection.find({});
      const services = await cursor.toArray();
      res.json(services);
    });
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.listen(port, () => {
  console.log(`Listening port: ${port}`);
});
