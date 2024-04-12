const express = require('express');
const { MongoClient } = require('mongodb');
const TelegramBot = require('node-telegram-bot-api');

const token = '6591146680:AAGsH4I160aYsBrAQg0qqM2la2Vb2DkdElw';
const mongoURI =
  "mongodb+srv://Haileopia:0939100302@cluster0.zanpy7q.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"; // MongoDB URI
const PORT = 3000; // Port for Express server

const app = express();

const bot = new TelegramBot(token, { polling: false });

// Connect to MongoDB
MongoClient.connect(
  mongoURI,
  { useNewUrlParser: true, useUnifiedTopology: true },
  (err, client) => {
    if (err) {
      console.error("Error connecting to MongoDB:", err);
      return;
    }
    console.log("Connected to MongoDB");

    const db = client.db("foodiebot"); // Database name

    // Sample menu items
    const menu = [
      { name: "Pizza", price: 10 },
      { name: "Burger", price: 8 },
      { name: "Salad", price: 6 },
    ];

    // Endpoint for receiving Telegram updates (webhook)
    app.post(`/bot${token}`, express.json(), (req, res) => {
      bot.processUpdate(req.body);
      res.sendStatus(200);
    });

    // Express route for handling /start command
    app.get("/start", (req, res) => {
      res.send(
        "Welcome to FoodieBot, your personal food ordering assistant! What would you like to order today?"
      );
    });

    // Express route for handling /menu command
    app.get("/menu", (req, res) => {
      let menuMessage = "Our Menu:\n";
      menu.forEach((item, index) => {
        menuMessage += `${index + 1}. ${item.name} - $${item.price}\n`;
      });
      res.send(menuMessage);
    });

    // Express route for handling /order command
    app.post("/order", express.json(), (req, res) => {
      const { chatId, itemName } = req.body;
      const menuItem = menu.find(
        (item) => item.name.toLowerCase() === itemName.toLowerCase()
      );

      if (!menuItem) {
        res.status(400).send(`Sorry, we don't have ${itemName} in our menu.`);
        return;
      }

      db.collection("orders").insertOne(
        { chatId, item: menuItem.name, price: menuItem.price },
        (err, result) => {
          if (err) {
            console.error("Error inserting order into MongoDB:", err);
            res
              .status(500)
              .send(
                "Sorry, there was an error processing your order. Please try again later."
              );
            return;
          }
          res.send(
            `You've ordered ${menuItem.name} for $${menuItem.price}. Please confirm your order by typing /confirm.`
          );
        }
      );
    });

    // Express route for handling /confirm command
    app.post("/confirm", express.json(), (req, res) => {
      const { chatId } = req.body;

      db.collection("orders").findOne({ chatId }, (err, order) => {
        if (err) {
          console.error("Error finding order in MongoDB:", err);
          res
            .status(500)
            .send(
              "Sorry, there was an error processing your order. Please try again later."
            );
          return;
        }
        if (!order) {
          res.send("You have no pending orders to confirm.");
          return;
        }

        res.send(
          `Your order for ${order.item} has been confirmed! It will be prepared and delivered shortly.`
        );

        db.collection("orders").deleteOne({ _id: order._id }, (err) => {
          if (err) {
            console.error("Error deleting order from MongoDB:", err);
          }
        });
      });
    });

    // Start Express server
    app.listen(PORT, () => {
      console.log(`Express server running on port ${PORT}`);
    });
  }
);
