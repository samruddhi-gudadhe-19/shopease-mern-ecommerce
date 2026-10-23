# ShopEase – MERN Stack E-Commerce Website

ShopEase is a full-stack e-commerce web application built using the MERN stack. It provides a shopping interface where users can browse products, manage their cart, and place orders. Order information is stored in MongoDB.

## Features

- Browse and view products
- Add products to the shopping cart
- Place orders through the checkout flow
- Store order details in MongoDB
- REST API built with Node.js and Express.js
- MongoDB integration using Mongoose
- React-based user interface

## Tech Stack

**Frontend**
- React.js
- Vite
- JavaScript
- CSS

**Backend**
- Node.js
- Express.js
- MongoDB
- Mongoose

## Project Structure

```text
MERN-Ecommerce/
├── client/       # React frontend
├── server/       # Express backend and database models
├── .gitignore
└── README.md
```

## Getting Started

### Prerequisites

- Node.js and npm
- MongoDB database
- Git

### 1. Clone the repository

```bash
git clone https://github.com/samruddhi-gudadhe-19/shopease-mern-ecommerce.git
cd shopease-mern-ecommerce
```

### 2. Configure the backend

Open the `server` folder and install dependencies:

```bash
cd server
npm install
```

Create a `.env` file inside the `server` folder and add your own MongoDB connection string and the environment variables required by `server.js`.

**Important:** Never commit your `.env` file or expose database credentials publicly.

Start the backend:

```bash
node server.js
```

The backend runs on `http://localhost:5000` when configured with the default port.

### 3. Configure the frontend

Open a second terminal from the project root and run:

```bash
cd client
npm install
npm run dev
```

Open the local URL shown in the terminal to access the application.

## Database

MongoDB is used to persist application data, including orders. A valid MongoDB connection and the required environment variables must be configured before starting the backend.

## Future Enhancements

- Responsive UI improvements
- Product search and category filtering
- User authentication interface
- Online payment integration
- Admin dashboard and order management

## Author

**Samruddhi Gudadhe**

GitHub: [samruddhi-gudadhe-19](https://github.com/samruddhi-gudadhe-19)

## Repository

[ShopEase – MERN E-Commerce](https://github.com/samruddhi-gudadhe-19/shopease-mern-ecommerce)
