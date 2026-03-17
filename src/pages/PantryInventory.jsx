import { useState, useEffect } from "react";
import "./styles/PantryInventory.css";

const inventoryItems = [
    {
        id: 1,
        name: "Bell Peppers",
        category: "Vegetables",
        location: "Fridge",
        badge: "FRESH",
        badgeType: "fresh",
        qty: "3 units",
        pct: 75,
        fillColor: "fill-green",
        expiry: "Expires in 4 days",
        expiryWarning: false,
        image: "https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=400&q=80",
    },
    {
        id: 2,
        name: "Basmati Rice",
        category: "Grains & Pasta",
        location: "Pantry Shelf A",
        badge: "PANTRY",
        badgeType: "pantry",
        qty: "5kg",
        pct: 90,
        fillColor: "fill-green",
        expiry: "Best before Dec 2024",
        expiryWarning: false,
        image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&q=80",
    },
    {
        id: 3,
        name: "Whole Milk",
        category: "Dairy & Eggs",
        location: "Fridge Door",
        badge: "LOW STOCK",
        badgeType: "low",
        qty: "200ml",
        pct: 15,
        fillColor: "fill-red",
        expiry: "Expires in 1 day!",
        expiryWarning: true,
        image: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&q=80",
    },
    {
        id: 4,
        name: "Curry Powder",
        category: "Spices & Condiments",
        location: "Spice Rack",
        badge: "PANTRY",
        badgeType: "pantry",
        qty: "150g",
        pct: 45,
        fillColor: "fill-orange",
        expiry: "Long shelf life",
        expiryWarning: false,
        image: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&q=80",
    },
    {
        id: 5,
        name: "Organic Eggs",
        category: "Dairy & Eggs",
        location: "Fridge",
        badge: "LOW STOCK",
        badgeType: "low",
        qty: "2 eggs",
        pct: 10,
        fillColor: "fill-red",
        expiry: "Expires in 6 days",
        expiryWarning: false,
        image: "https://images.unsplash.com/photo-1609501676725-7186f017a4b7?w=400&q=80",
    },
    {
        id: 6,
        name: "Cherry Tomatoes",
        category: "Vegetables",
        location: "Countertop",
        badge: "FRESH",
        badgeType: "fresh",
        qty: "500g",
        pct: 60,
        fillColor: "fill-yellow",
        expiry: "Expires in 3 days",
        expiryWarning: false,
        image: "https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=400&q=80",
    },
];

const categories = ["All Items", "Vegetables", "Spices & Condiments", "Grains & Pasta", "Dairy & Eggs", "Proteins"];

const readyToCook = [
    {
        id: 1,
        name: "Roasted Vegetable Medley",
        uses: "Uses: Bell Peppers, Tomatoes, Onions",
        tags: ["Easy", "20 min"],
        tagTypes: ["easy", "time"],
        image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=200&q=80",
    },
    {
        id: 2,
        name: "Classic Egg Fried Rice",
        uses: "Uses: Basmati Rice, Eggs, Curry Powder",
        tags: ["Quick", "15 min"],
        tagTypes: ["quick", "time"],
        image: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=200&q=80",
    },
];

export default function PantryInventory() {
    const savedItems = JSON.parse(localStorage.getItem("pantryItems")) || inventoryItems;
    const [items, setItems] = useState(savedItems);
    const [activeTab, setActiveTab] = useState("All Items");

    const [showModal, setShowModal] = useState(false);

    const [newItem, setNewItem] = useState({
        name: "",
        category: "Vegetables",
        location: "",
        qty: "",
        pct: 100,
        expiry: "",
        image: ""
    });

    useEffect(() => {
        localStorage.setItem("pantryItems", JSON.stringify(items));
    }, [items]);

    const filteredItems =
        activeTab === "All Items"
            ? items
            : items.filter((item) => item.category === activeTab);

    const changeQty = (id, delta) => {
        setItems((prev) =>
            prev.map((item) => {
                if (item.id === id) {
                    // 1️⃣ % update
                    let newPct = Math.max(0, Math.min(100, item.pct + delta * 5));

                    // 2️⃣ badge update
                    let badge = "";
                    let badgeType = "";
                    if (newPct > 50) {
                        badge = "FRESH";
                        badgeType = "fresh";
                    } else if (newPct > 25) {
                        badge = "MEDIUM";
                        badgeType = "medium";
                    } else {
                        badge = "LOW STOCK";
                        badgeType = "low";
                    }

                    // 3️⃣ qty update (optional: parse units)
                    // Agar original qty me number+unit hai, hum number adjust karenge
                    let qtyMatch = item.qty.match(/^(\d+)/);
                    let unit = item.qty.replace(/^\d+\s*/, "");
                    let newQtyNum = qtyMatch ? Math.max(0, parseInt(qtyMatch[1]) + delta) : delta;
                    let newQty = newQtyNum + " " + unit;

                    return { ...item, pct: newPct, badge, badgeType, qty: newQty };
                }
                return item;
            })
        );
    };

    const saveItem = () => {
        let badge = "";
        let badgeType = "";

        if (newItem.pct > 50) {
            badge = "FRESH";
            badgeType = "fresh";
        } else if (newItem.pct > 25) {
            badge = "MEDIUM";
            badgeType = "medium";
        } else {
            badge = "LOW STOCK";
            badgeType = "low";
        }

        const item = {
            id: Date.now(),
            ...newItem,
            badge,
            badgeType,
            fillColor: "fill-green",
            expiryWarning: false
        };

        setItems((prev) => [...prev, item]);
        setShowModal(false);

        setNewItem({
            name: "",
            category: "Vegetables",
            location: "",
            qty: "",
            pct: 100,
            expiry: "",
            image: ""
        });
    };

    const getTagClass = (type) => {
        if (type === "easy") return "recipe-tag tag-easy";
        if (type === "quick") return "recipe-tag tag-quick";
        return "recipe-tag tag-time";
    };

    const lowStockItems = items.filter((item) => item.pct <= 25);

    const readyRecipes = readyToCook.filter((recipe) => {

        const ingredients = recipe.uses
            .replace("Uses:", "")
            .split(",")
            .map((i) => i.trim());

        return ingredients.every((ing) =>
            items.some((item) =>
                item.name.toLowerCase().includes(ing.toLowerCase())
            )
        );
    });

    const pct = 80;
    const r = 54;
    const circumference = 2 * Math.PI * r;
    const dashoffset = circumference * (1 - pct / 100);

    return (
        <div>

            <div className="main-layout">

                <div className="left-panel">

                    <div className="header-actions">

                        <div className="page-header">
                            <h1 className="page-header-h1">Pantry Inventory</h1>
                            <p>You have {items.length} items in your kitchen.</p>
                        </div>

                        <div className="btn-group">

                            <button className="btn-scan">
                                <span>📊</span> Scan Receipt
                            </button>

                            <button className="btn-add" onClick={() => setShowModal(true)}>
                                <span>+</span> Add Item
                            </button>

                        </div>
                    </div>

                    <div className="category-tabs">
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                className={`tab-btn ${activeTab === cat ? "active" : ""}`}
                                onClick={() => setActiveTab(cat)}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    <div className="items-grid">

                        {filteredItems.map((item) => (

                            <div className="item-card" key={item.id}>

                                <div className="item-image-wrap">
                                    <img src={item.image} alt={item.name} />
                                    <span className={`item-badge badge-${item.badgeType}`}>
                                        {item.badge}
                                    </span>
                                </div>

                                <div className="item-info">

                                    <div className="item-name">{item.name}</div>

                                    <div className="item-location">
                                        {item.category} • {item.location}
                                    </div>

                                    <div className="item-quantity-row">
                                        <span className={`item-qty-label ${item.badgeType === "low" ? "low" : ""}`}>
                                            Quantity: {item.qty}
                                        </span>

                                        <span className={`item-qty-pct ${item.badgeType === "low" ? "low" : ""}`}>
                                            {item.pct}%
                                        </span>
                                    </div>

                                    <div className="progress-bar">
                                        <div
                                            className={`progress-fill ${item.fillColor}`}
                                            style={{ width: `${item.pct}%` }}
                                        />
                                    </div>

                                    <div className="item-footer">

                                        <span className={`item-expiry ${item.expiryWarning ? "warning" : ""}`}>
                                            {item.expiry}
                                        </span>

                                        <div className="qty-controls">
                                            <button className="qty-btn" onClick={() => changeQty(item.id, -1)}>−</button>
                                            <button className="qty-btn" onClick={() => changeQty(item.id, +1)}>+</button>
                                        </div>

                                    </div>

                                </div>
                            </div>

                        ))}

                    </div>

                </div>

                <div className="right-panel">

                    <div className="panel-card">

                        <div className="panel-header">

                            <div className="panel-title">
                                <span className="alert-icon">⚠️</span>
                                Low Stock Alerts
                            </div>

                            <span className="badge-count">{lowStockItems.length} items</span>

                        </div>

                        {lowStockItems.map((alert) => (

                            <div className="alert-item" key={alert.id}>

                                <img src={alert.image} alt={alert.name} className="alert-img" />

                                <div className="alert-info">

                                    <div className="alert-name">{alert.name}</div>

                                    <div className="alert-sub">
                                        {alert.qty} remaining • Restock soon
                                    </div>

                                </div>

                                <button className="cart-btn">🛒</button>

                            </div>

                        ))}

                        <button className="view-shopping-btn">
                            View Shopping List →
                        </button>

                    </div>

                    <div className="panel-card">

                        <div className="panel-header">

                            <div className="panel-title">
                                <span className="sparkle">✦</span>
                                Ready to Cook
                            </div>

                        </div>

                        <p className="cook-subtitle">
                            Based on your current stock, you can make these now:
                        </p>

                        {readyRecipes.map((recipe) => (

                            <div className="recipe-item" key={recipe.id}>

                                <img src={recipe.image} alt={recipe.name} className="recipe-img" />

                                <div className="recipe-info">

                                    <div className="recipe-name">{recipe.name}</div>

                                    <div className="recipe-uses">{recipe.uses}</div>

                                    <div className="recipe-tags">

                                        {recipe.tags.map((tag, i) => (

                                            <span key={i} className={getTagClass(recipe.tagTypes[i])}>
                                                {tag}
                                            </span>

                                        ))}

                                    </div>

                                </div>

                            </div>

                        ))}

                        <button className="btn-find-recipes">
                            Find More Recipes
                        </button>

                    </div>

                    <div className="panel-card">

                        <div className="panel-header">
                            <div className="panel-title">
                                Inventory Health
                            </div>
                        </div>

                        <div className="health-content">

                            <div className="donut-wrap">

                                <svg width="130" height="130" viewBox="0 0 130 130">

                                    <circle
                                        cx="65"
                                        cy="65"
                                        r={r}
                                        fill="none"
                                        stroke="#f3f4f6"
                                        strokeWidth="12"
                                    />

                                    <circle
                                        cx="65"
                                        cy="65"
                                        r={r}
                                        fill="none"
                                        stroke="#f97316"
                                        strokeWidth="12"
                                        strokeDasharray={circumference}
                                        strokeDashoffset={dashoffset}
                                        strokeLinecap="round"
                                    />

                                </svg>

                                <div className="donut-center">

                                    <div className="donut-pct">
                                        80%
                                    </div>

                                    <div className="donut-label">
                                        STOCKED
                                    </div>

                                </div>

                            </div>

                            <div className="health-stats">

                                <div className="health-stat">
                                    <div className="stat-label">Value</div>
                                    <div className="stat-value">$245.00</div>
                                </div>

                                <div className="health-stat">
                                    <div className="stat-label">Waste Avoided</div>
                                    <div className="stat-value green">1.2kg</div>
                                </div>

                            </div>

                        </div>

                    </div>

                </div>

            </div>

            {showModal && (

                <div className="modal-overlay">

                    <div className="modal-card">

                        <h2>Add Inventory Item</h2>

                        <input
                            placeholder="Item name"
                            value={newItem.name}
                            onChange={(e) =>
                                setNewItem({ ...newItem, name: e.target.value })
                            }
                        />

                        <select
                            value={newItem.category}
                            onChange={(e) =>
                                setNewItem({ ...newItem, category: e.target.value })
                            }
                        >
                            {categories.map((cat) => (
                                <option key={cat}>{cat}</option>
                            ))}
                        </select>

                        <input
                            placeholder="Location"
                            value={newItem.location}
                            onChange={(e) =>
                                setNewItem({ ...newItem, location: e.target.value })
                            }
                        />

                        <input
                            placeholder="Quantity"
                            value={newItem.qty}
                            onChange={(e) =>
                                setNewItem({ ...newItem, qty: e.target.value })
                            }
                        />

                        <input
                            type="number"
                            placeholder="% left"
                            value={newItem.pct}
                            onChange={(e) =>
                                setNewItem({ ...newItem, pct: Number(e.target.value) })
                            }
                        />

                        <input
                            placeholder="Expiry"
                            value={newItem.expiry}
                            onChange={(e) =>
                                setNewItem({ ...newItem, expiry: e.target.value })
                            }
                        />

                        <input
                            placeholder="Image URL"
                            value={newItem.image}
                            onChange={(e) =>
                                setNewItem({ ...newItem, image: e.target.value })
                            }
                        />

                        <div className="modal-actions">
                            <button onClick={() => setShowModal(false)}>Cancel</button>
                            <button onClick={saveItem}>Save Item</button>
                        </div>

                    </div>

                </div>

            )}

        </div>
    );
}