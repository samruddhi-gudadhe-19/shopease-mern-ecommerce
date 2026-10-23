
import { useState, useEffect } from "react";
import "./App.css";

export default function App() {
  const [products, setProducts] = useState([]);

  const [cart, setCart] = useState(() => {
    try {
      const savedCart = localStorage.getItem("shopease-cart");
      return savedCart ? JSON.parse(savedCart) : [];
    } catch {
      return [];
    }
  });

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCart, setShowCart] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState("cart");
  const [lastOrder, setLastOrder] = useState(null);
  const [placingOrder, setPlacingOrder] = useState(false);

  useEffect(() => {
    fetch("http://localhost:5000/api/products")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to load products");
        }
        return response.json();
      })
      .then((data) => setProducts(data))
      .catch(() => setError("Products load nahi hue. Backend check karo."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("shopease-cart", JSON.stringify(cart));
    } catch (err) {
      console.error("Cart save nahi ho paya:", err);
    }
  }, [cart]);

  const cartItems = cart.reduce((items, product) => {
    const existing = items.find((item) => item._id === product._id);

    if (existing) {
      existing.quantity += 1;
    } else {
      items.push({ ...product, quantity: 1 });
    }

    return items;
  }, []);

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(search.toLowerCase()) &&
      (category === "All" || product.category === category)
  );

  const totalItems = cart.length;

  const total = cart.reduce(
    (sum, product) => sum + Number(product.price || 0),
    0
  );

  const addToCart = (product) => {
    setCart((previousCart) => [...previousCart, product]);
  };

  const increaseQuantity = (product) => {
    setCart((previousCart) => [...previousCart, product]);
  };

  const decreaseQuantity = (productId) => {
    setCart((previousCart) => {
      const index = previousCart.findIndex(
        (product) => product._id === productId
      );

      if (index === -1) return previousCart;

      return [
        ...previousCart.slice(0, index),
        ...previousCart.slice(index + 1),
      ];
    });
  };

  const removeProduct = (productId) => {
    setCart((previousCart) =>
      previousCart.filter((product) => product._id !== productId)
    );
  };

  const clearCart = () => setCart([]);

  // Save the order in MongoDB through the backend API.
  const handlePlaceOrder = async (event) => {
    event.preventDefault();

    if (placingOrder) return;

    if (cartItems.length === 0) {
      alert("Your cart is empty!");
      setCheckoutStep("cart");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const customer = Object.fromEntries(formData.entries());

    setPlacingOrder(true);

    try {
      const response = await fetch("http://localhost:5000/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customer,
          items: cartItems.map((product) => ({
            productId: product._id,
            quantity: product.quantity,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Order place nahi ho paya.");
      }

      // Supports either { order: {...} } or a direct order response.
      const savedOrder = data.order || data;

      const savedItems = (savedOrder.items || []).map((item) => {
        const productId =
          item.product?._id ||
          item.product ||
          item.productId ||
          item._id;

        const matchingProduct = cartItems.find(
          (product) => product._id === String(productId)
        );

        return {
          _id: String(productId || item._id || Math.random()),
          name: item.name || matchingProduct?.name || "Product",
          price: Number(item.price ?? matchingProduct?.price ?? 0),
          quantity: Number(item.quantity || 1),
        };
      });

      const newOrder = {
        ...savedOrder,
        orderId:
          savedOrder.orderId ||
          savedOrder._id ||
          `SE${Date.now()}`,
        customer: savedOrder.customer || customer,
        items: savedItems,
        total: Number(savedOrder.total ?? total),
        date: savedOrder.createdAt
          ? new Date(savedOrder.createdAt).toLocaleString("en-IN")
          : new Date().toLocaleString("en-IN"),
        status: savedOrder.status || "Order Placed",
      };

      setLastOrder(newOrder);
      setCart([]);
      setCheckoutStep("success");
    } catch (err) {
      console.error("Order error:", err);
      alert(
        err.message ||
          "Order place nahi ho paya. Backend aur MongoDB connection check karo."
      );
    } finally {
      setPlacingOrder(false);
    }
  };

  const continueShopping = () => {
    setShowCart(false);
    setCheckoutStep("cart");
  };

  return (
    <div className="app">
      <header className="navbar">
        <a
          className="logo"
          href="#"
          onClick={(event) => {
            event.preventDefault();
            continueShopping();
          }}
        >
          Shop<span>Ease.</span>
        </a>

        <div className="search-box">
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setShowCart(false);
              setCheckoutStep("cart");
            }}
          />
          <span>🔍</span>
        </div>

        <button
          className="cart-button"
          onClick={() => {
            setShowCart((previous) => !previous);
            setCheckoutStep("cart");
          }}
        >
          🛒 Cart ({totalItems})
        </button>
      </header>

      {showCart ? (
        <section className="cart-section">
          {checkoutStep === "checkout" ? (
            <>
              <div className="cart-heading">
                <div>
                  <p className="eyebrow">ALMOST THERE</p>
                  <h1>Checkout</h1>
                  <p className="cart-subtitle">
                    Enter your delivery details to place your order.
                  </p>
                </div>

                <button
                  className="continue-button"
                  onClick={() => setCheckoutStep("cart")}
                >
                  ← Back to Cart
                </button>
              </div>

              <div className="checkout-layout">
                <form className="checkout-form" onSubmit={handlePlaceOrder}>
                  <h2>Delivery Information</h2>

                  <label htmlFor="fullName">Full Name</label>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    placeholder="Enter your full name"
                    minLength={2}
                    maxLength={80}
                    autoComplete="name"
                    required
                  />

                  <label htmlFor="phone">Mobile Number</label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="10-digit mobile number"
                    pattern="[6-9][0-9]{9}"
                    title="Enter a valid 10-digit Indian mobile number"
                    autoComplete="tel"
                    required
                  />

                  <label htmlFor="address">Full Address</label>
                  <textarea
                    id="address"
                    name="address"
                    placeholder="House number, street, area..."
                    rows="3"
                    maxLength={300}
                    autoComplete="street-address"
                    required
                  />

                  <div className="checkout-fields-row">
                    <div>
                      <label htmlFor="city">City</label>
                      <input
                        id="city"
                        name="city"
                        type="text"
                        placeholder="Your city"
                        maxLength={80}
                        autoComplete="address-level2"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="pincode">PIN Code</label>
                      <input
                        id="pincode"
                        name="pincode"
                        type="text"
                        inputMode="numeric"
                        pattern="[1-9][0-9]{5}"
                        title="Enter a valid 6-digit PIN code"
                        placeholder="6-digit PIN"
                        autoComplete="postal-code"
                        required
                      />
                    </div>
                  </div>

                  <div className="payment-notice">
                    <span>💵</span>
                    <div>
                      <strong>Demo Payment</strong>
                      <p>
                        This demo does not collect payment. No real payment
                        will be processed.
                      </p>
                    </div>
                  </div>

                  <button
                    className="checkout-button place-order-button"
                    type="submit"
                    disabled={placingOrder}
                  >
                    {placingOrder
                      ? "Placing Order..."
                      : `Place Order · ₹${total.toLocaleString("en-IN")}`}
                  </button>
                </form>

                <aside className="order-summary">
                  <h2>Your Order</h2>

                  {cartItems.map((product) => (
                    <div className="checkout-product" key={product._id}>
                      <span>
                        {product.emoji || "🛍️"} {product.name} ×{" "}
                        {product.quantity}
                      </span>
                      <strong>
                        ₹{(
                          Number(product.price) * product.quantity
                        ).toLocaleString("en-IN")}
                      </strong>
                    </div>
                  ))}

                  <div className="summary-row">
                    <span>Shipping</span>
                    <span className="free-shipping">FREE</span>
                  </div>

                  <div className="summary-total">
                    <span>Total</span>
                    <strong>₹{total.toLocaleString("en-IN")}</strong>
                  </div>
                </aside>
              </div>
            </>
          ) : checkoutStep === "success" && lastOrder ? (
            <div className="order-success">
              <div className="success-icon">✓</div>
              <p className="eyebrow">THANK YOU FOR SHOPPING</p>
              <h1>Order Placed Successfully!</h1>
              <p>Your order has been saved in the database.</p>

              <div className="success-order-details">
                <p>
                  <strong>Order ID:</strong> {lastOrder.orderId}
                </p>
                <p>
                  <strong>Order Date:</strong> {lastOrder.date}
                </p>
                <p>
                  <strong>Customer:</strong>{" "}
                  {lastOrder.customer.fullName}
                </p>
                <p>
                  <strong>Mobile:</strong> {lastOrder.customer.phone}
                </p>
                <p>
                  <strong>Delivery Address:</strong>{" "}
                  {lastOrder.customer.address}, {lastOrder.customer.city},{" "}
                  {lastOrder.customer.pincode}
                </p>

                <div className="success-items">
                  {lastOrder.items.map((item, index) => (
                    <div key={`${item._id}-${index}`}>
                      <span>
                        {item.name} × {item.quantity}
                      </span>
                      <strong>
                        ₹{(
                          item.price * item.quantity
                        ).toLocaleString("en-IN")}
                      </strong>
                    </div>
                  ))}
                </div>

                <div className="summary-total">
                  <span>Order Total</span>
                  <strong>
                    ₹{lastOrder.total.toLocaleString("en-IN")}
                  </strong>
                </div>

                <p className="demo-disclaimer">
                  Demo only: order details are stored in MongoDB. No payment
                  was taken or processed.
                </p>
              </div>

              <button
                className="checkout-button"
                onClick={continueShopping}
              >
                Continue Shopping →
              </button>
            </div>
          ) : (
            <>
              <div className="cart-heading">
                <div>
                  <p className="eyebrow">YOUR SHOPPING BAG</p>
                  <h1>My Shopping Cart</h1>
                  <p className="cart-subtitle">
                    {totalItems} item{totalItems !== 1 ? "s" : ""} in your cart
                  </p>
                </div>

                <button
                  className="continue-button"
                  onClick={continueShopping}
                >
                  ← Continue Shopping
                </button>
              </div>

              {cartItems.length === 0 ? (
                <div className="cart-empty">
                  <div className="empty-cart-icon">🛒</div>
                  <h2>Your cart is empty</h2>
                  <p>Looks like you haven't added anything yet.</p>

                  <button
                    className="checkout-button"
                    onClick={continueShopping}
                  >
                    Explore Products
                  </button>
                </div>
              ) : (
                <div className="cart-layout">
                  <div className="cart-items">
                    {cartItems.map((product) => (
                      <article className="cart-item" key={product._id}>
                        <div className="cart-product-image">
                          <span>{product.emoji || "🛍️"}</span>
                        </div>

                        <div className="cart-product-details">
                          <p className="product-category">
                            {product.category}
                          </p>
                          <h3>{product.name}</h3>
                          <p className="cart-unit-price">
                            ₹{Number(product.price).toLocaleString("en-IN")} each
                          </p>

                          <div className="quantity-control">
                            <button
                              aria-label={`Decrease ${product.name} quantity`}
                              disabled={product.quantity <= 1}
                              onClick={() => decreaseQuantity(product._id)}
                            >
                              −
                            </button>

                            <span>{product.quantity}</span>

                            <button
                              aria-label={`Increase ${product.name} quantity`}
                              onClick={() => increaseQuantity(product)}
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <div className="cart-item-actions">
                          <strong>
                            ₹{(
                              Number(product.price) * product.quantity
                            ).toLocaleString("en-IN")}
                          </strong>

                          <button
                            className="remove-button"
                            onClick={() => removeProduct(product._id)}
                          >
                            Remove
                          </button>
                        </div>
                      </article>
                    ))}

                    <button
                      className="clear-cart-button"
                      onClick={clearCart}
                    >
                      Clear entire cart
                    </button>
                  </div>

                  <aside className="order-summary">
                    <h2>Order Summary</h2>

                    <div className="summary-row">
                      <span>Items ({totalItems})</span>
                      <span>₹{total.toLocaleString("en-IN")}</span>
                    </div>

                    <div className="summary-row">
                      <span>Shipping</span>
                      <span className="free-shipping">FREE</span>
                    </div>

                    <div className="summary-row">
                      <span>Discount</span>
                      <span>₹0</span>
                    </div>

                    <div className="summary-total">
                      <span>Total</span>
                      <strong>₹{total.toLocaleString("en-IN")}</strong>
                    </div>

                    <button
                      className="checkout-button"
                      onClick={() => setCheckoutStep("checkout")}
                    >
                      Proceed to Checkout →
                    </button>

                    <p className="secure-note">🔒 Demo checkout</p>
                  </aside>
                </div>
              )}
            </>
          )}
        </section>
      ) : (
        <main>
          <section className="hero">
            <div className="hero-content">
              <p className="eyebrow">YOUR EVERYDAY SHOPPING DESTINATION</p>
              <h1>
                Find Your Style.
                <br />
                Love Your Choice.
              </h1>
              <p>
                Discover quality products at amazing prices. Your next
                favourite thing is waiting for you.
              </p>
              <a href="#products" className="shop-button">
                Explore Products →
              </a>
            </div>

            <div className="hero-art">
              <span className="hero-emoji">🛍️</span>
              <div className="discount-badge">
                SPECIAL
                <br />
                OFFERS
              </div>
            </div>
          </section>

          <section className="products-section" id="products">
            <div className="section-heading">
              <div>
                <p className="eyebrow">HANDPICKED FOR YOU</p>
                <h2>Featured Products</h2>
              </div>
              <span className="product-count">
                {filteredProducts.length} products
              </span>
            </div>

            <div className="search-box product-search">
              <input
                type="text"
                placeholder="Find your favourite product..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <div className="categories">
              {["All", "Fashion", "Electronics", "Accessories"].map((item) => (
                <button
                  key={item}
                  className={category === item ? "category active" : "category"}
                  onClick={() => setCategory(item)}
                >
                  {item}
                </button>
              ))}
            </div>

            {loading ? (
              <p>Loading products...</p>
            ) : error ? (
              <p className="empty-message">{error}</p>
            ) : (
              <>
                <div className="product-grid">
                  {filteredProducts.map((product) => (
                    <article className="product-card" key={product._id}>
                      <div className="product-image">
                        <span className="product-emoji">
                          {product.emoji || "🛍️"}
                        </span>
                        <span className="product-tag">Popular</span>
                      </div>

                      <div className="product-info">
                        <p className="product-category">
                          {product.category}
                        </p>
                        <h3>{product.name}</h3>
                        <p>{product.description}</p>

                        <div className="product-bottom">
                          <span className="price">
                            ₹{Number(product.price).toLocaleString("en-IN")}
                          </span>
                          <button
                            className="add-button"
                            onClick={() => addToCart(product)}
                          >
                            + Add
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>

                {filteredProducts.length === 0 && (
                  <p className="empty-message">
                    No products found. Try another search.
                  </p>
                )}
              </>
            )}
          </section>
        </main>
      )}

      <footer className="footer">
        <a
          className="logo"
          href="#"
          onClick={(event) => {
            event.preventDefault();
            continueShopping();
          }}
        >
          Shop<span>Ease.</span>
        </a>
        <p>Making online shopping simple and enjoyable.</p>
        <p>© 2026 ShopEase. All rights reserved.</p>
      </footer>
    </div>
  );
}
