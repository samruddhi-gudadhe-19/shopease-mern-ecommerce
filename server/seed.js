
require("dotenv").config();
const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: String,
  category: String,
  price: Number,
  emoji: String,
  description: String
});

const Product = mongoose.model("Product", productSchema);

const products = [
  {
    name: "Classic White Sneakers",
    category: "Fashion",
    price: 1499,
    emoji: "👟",
    description: "Comfortable everyday sneakers"
  },
  {
    name: "Wireless Headphones",
    category: "Electronics",
    price: 1999,
    emoji: "🎧",
    description: "Enjoy your favourite music"
  },
  {
    name: "Smart Watch",
    category: "Electronics",
    price: 2499,
    emoji: "⌚",
    description: "A smart companion for every day"
  },
  {
    name: "Casual Backpack",
    category: "Fashion",
    price: 999,
    emoji: "🎒",
    description: "A practical bag for daily use"
  },
  {
    name: "Sunglasses",
    category: "Accessories",
    price: 699,
    emoji: "🕶️",
    description: "Stylish everyday sunglasses"
  },
  {
    name: "Travel Coffee Mug",
    category: "Accessories",
    price: 499,
    emoji: "☕",
    description: "Your coffee on the go"
  }
];

async function seedDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    await Product.deleteMany({});
    await Product.insertMany(products);
    console.log("Products added to MongoDB successfully!");
  } catch (error) {
    console.error("Seeding failed:", error.message);
  } finally {
    await mongoose.disconnect();
  }
}

seedDatabase();
