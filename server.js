require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "https://task-manager-13e7e.web.app"],
    credentials: true,
  },
});

const port = process.env.PORT || 5000;

app.use(
  cors({
    origin: ["http://localhost:5173", "https://task-manager-13e7e.web.app"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_KEY}@cluster0.pb8np.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let tasksCollection;
let activityCollection;

async function connectDB() {
  try {
    // await client.connect();
    console.log("Connected to MongoDB successfully!");
    const db = client.db("TaskManager");
    tasksCollection = db.collection("tasks");
    activityCollection = db.collection("activity");
  } catch (error) {
    console.error("MongoDB connection error:", error);
  }
}
connectDB();

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

app.post("/tasks", async (req, res) => {
  try {
    const task = req.body;
    const result = await tasksCollection.insertOne(task);
    io.emit("taskUpdated");
    res.status(201).send({ message: "Task added successfully", result });
  } catch (error) {
    console.error("Error adding task:", error);
    res.status(500).send({ message: "Internal server error", error });
  }
});

app.get("/tasks", async (req, res) => {
  try {
    const tasks = await tasksCollection.find().toArray();
    res.send(tasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).send({ message: "Internal server error", error });
  }
});

app.get("/tasks/:email", async (req, res) => {
  const { email } = req.params;

  try {
    const tasks = await tasksCollection.find({ email }).toArray();
    res.send(tasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).send({ message: "Internal server error", error });
  }
});

app.get("/tasks/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const task = await tasksCollection.findOne({ _id: new ObjectId(id) });
    if (!task) {
      return res.status(404).send({ message: "Task not found" });
    }
    res.send(task);
  } catch (error) {
    console.error("Error fetching task:", error);
    res.status(500).send({ message: "Internal server error", error });
  }
});

app.put("/tasks/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const updatedTask = req.body;
    const filter = { _id: new ObjectId(id) };
    const updateDoc = { $set: updatedTask };
    const result = await tasksCollection.updateOne(filter, updateDoc);

    if (result.matchedCount === 0) {
      return res.status(404).send({ message: "Task not found" });
    }

    io.emit("taskUpdated");
    res.send({ message: "Task updated successfully", result });
  } catch (error) {
    console.error("Error updating task:", error);
    res.status(500).send({ message: "Internal server error", error });
  }
});

app.delete("/tasks/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const result = await tasksCollection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).send({ message: "Task not found" });
    }

    io.emit("taskUpdated");
    res.send({ message: "Task deleted successfully", result });
  } catch (error) {
    console.error("Error deleting task:", error);
    res.status(500).send({ message: "Internal server error", error });
  }
});

app.get("/activity/:email", async (req, res) => {
  const { email } = req.params;

  try {
    const tasks = await activityCollection.find({ email }).toArray();
    res.send(tasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).send({ message: "Internal server error", error });
  }
});

app.post("/activity", async (req, res) => {
  try {
    const task = req.body;
    const result = await activityCollection.insertOne(task);
    io.emit("taskUpdated");
    res.status(201).send({ message: "Task added successfully", result });
  } catch (error) {
    console.error("Error adding task:", error);
    res.status(500).send({ message: "Internal server error", error });
  }
});

app.get("/", (req, res) => {
  res.send("Task Manager server is running");
});

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
