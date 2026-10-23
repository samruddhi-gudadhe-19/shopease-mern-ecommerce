
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("./User");
const Order = require("./Order");

const app = express();

app.use(cors());
app.use(express.json());

// ===============================
// Product Schema
// ===============================
const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    emoji: { type: String, default: "🛍️" },
    description: { type: String, default: "" },
  },
  { timestamps: true }
);

const Product =
  mongoose.models.Product || mongoose.model("Product", productSchema);

// ===============================
// Home API
// ===============================
app.get("/", (req, res) => {
  res.json({ message: "ShopEase API is running!" });
});

// ===============================
// Health Check
// ===============================
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "ShopEase API is working",
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

// ===============================
// Get All Products
// ===============================
app.get("/api/products", async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    console.error("Fetch products error:", error);
    res.status(500).json({ message: "Unable to fetch products" });
  }
});

// ===============================
// Add a Product
// ===============================
app.post("/api/products", async (req, res) => {
  try {
    const { name, category, price, emoji, description } = req.body;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof category !== "string" ||
      !category.trim() ||
      !Number.isFinite(Number(price)) ||
      Number(price) < 0
    ) {
      return res.status(400).json({
        message: "Valid product name, category and price are required",
      });
    }

    const product = await Product.create({
      name: name.trim(),
      category: category.trim(),
      price: Number(price),
      emoji,
      description,
    });

    res.status(201).json(product);
  } catch (error) {
    console.error("Add product error:", error);
    res.status(400).json({ message: "Unable to add product" });
  }
});

// ===============================
// Place Order
// ===============================
app.post("/api/orders", async (req, res) => {
  try {
    const { customer, items } = req.body || {};

    if (
      !customer ||
      typeof customer.fullName !== "string" ||
      typeof customer.phone !== "string" ||
      typeof customer.address !== "string" ||
      typeof customer.city !== "string" ||
      typeof customer.pincode !== "string" ||
      !customer.fullName.trim() ||
      !customer.address.trim() ||
      !customer.city.trim() ||
      !/^[6-9]\d{9}$/.test(customer.phone.trim()) ||
      !/^[1-9]\d{5}$/.test(customer.pincode.trim())
    ) {
      return res.status(400).json({
        message: "Please provide valid customer and delivery details",
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: "Your order must contain at least one product",
      });
    }

    let total = 0;
    const verifiedItems = [];

    for (const item of items) {
      if (
        !item ||
        !mongoose.isValidObjectId(item.productId) ||
        !Number.isInteger(item.quantity) ||
        item.quantity < 1 ||
        item.quantity > 100
      ) {
        return res.status(400).json({
          message: "Invalid product or quantity",
        });
      }

      const product = await Product.findById(item.productId);

      if (!product) {
        return res.status(400).json({
          message: "A product in your cart no longer exists",
        });
      }

      const price = Number(product.price);
      total += price * item.quantity;

      verifiedItems.push({
        product: product._id,
        name: product.name,
        price,
        quantity: item.quantity,
      });
    }

    const order = await Order.create({
      customer: {
        fullName: customer.fullName.trim(),
        phone: customer.phone.trim(),
        address: customer.address.trim(),
        city: customer.city.trim(),
        pincode: customer.pincode.trim(),
      },
      items: verifiedItems,
      total,
      status: "Order Placed",
    });

    console.log("Order saved successfully:", order._id.toString());

    return res.status(201).json({
      success: true,
      message: "Order placed successfully",
      orderId: order._id,
      order,
    });
  } catch (error) {
    console.error("Place order error:", error);

    return res.status(500).json({
      message: "Unable to place order",
      error: error.message,
    });
  }
});

// ===============================
// Get Orders (Development / Local Testing)
// ===============================
app.get("/api/orders", async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("items.product", "name category")
      .sort({ createdAt: -1 });

    return res.status(200).json(orders);
  } catch (error) {
    console.error("Fetch orders error:", error);

    return res.status(500).json({
      message: "Unable to fetch orders",
      error: error.message,
    });
  }
});

// ===============================
// Register
// ===============================
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body || {};

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      !name.trim() ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        message: "Name, email and password are required",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters long",
      });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        message: "JWT_SECRET is missing from server configuration",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({
        message: "Email is already registered",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
    });

    return res.status(201).json({
      message: "Registration successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "Email is already registered",
      });
    }

    return res.status(500).json({ message: "Registration failed" });
  }
});

// ===============================
// Login
// ===============================
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        message: "JWT_SECRET is missing from server configuration",
      });
    }

    const token = jwt.sign(
      { userId: user._id.toString() },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    return res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Login failed" });
  }
});

// ===============================
// Not Found Handler (JSON response)
// ===============================
app.use((req, res) => {
  res.status(404).json({
    message: "API route not found",
    path: req.originalUrl,
    method: req.method,
  });
});

// ===============================
// Start Server
// ===============================
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing from .env");
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected successfully");

    // Verify the important routes were registered.
    const registeredRoutes = app._router?.stack
      ?.filter((layer) => layer.route)
      .map((layer) => `${Object.keys(layer.route.methods).join(",").toUpperCase()} ${layer.route.path}`);

    console.log("Registered routes:", registeredRoutes || "Check Express version");

    app.listen(PORT, () => {
      console.log(`ShopEase API running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
}

startServer();
