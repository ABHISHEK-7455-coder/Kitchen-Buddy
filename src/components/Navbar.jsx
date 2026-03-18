import '../pages/styles/Navbar.css';
import { NavLink, useLocation } from "react-router-dom";

const LogoIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M3 11l19-9-9 19-2-8-8-2z" />
    </svg>
);

// ── Mobile Bottom Navigation ──────────────────────────────────────────────────
function MobileBottomNav() {
    const location = useLocation();

    const items = [
        { to: "/", icon: "fa-house", label: "Home" },
        { to: "/ai", icon: "fa-wand-magic-sparkles", label: "AI Feed" },
        { to: "/ingredients", icon: "fa-seedling", label: "Ingredients" },
        { to: "/planner", icon: "fa-calendar-days", label: "Planner" },
        { to: "/pantry", icon: "fa-box", label: "Pantry" },
    ];

    return (
        <nav className="mobile-bottom-nav">
            {items.map((item) => {
                const isActive = location.pathname === item.to;
                return (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        className={"mobile-nav-item" + (isActive ? " active" : "")}
                    >
                        <i className={"fa-solid " + item.icon} aria-hidden="true" />
                        <span>{item.label}</span>
                    </NavLink>
                );
            })}
        </nav>
    );
}

// ── Desktop Navbar ────────────────────────────────────────────────────────────
export default function Navbar() {
    return (
        <>
            <nav className="navbar">
                <div className="navbar__logo">
                    <span className="navbar__logo-icon"><LogoIcon /></span>
                    Kitchen Buddy
                </div>

                {/* Desktop links — hidden on mobile via CSS */}
                <div className="navbar__links">
                    <NavLink to="/" className={({ isActive }) => "navbar__link" + (isActive ? " navbar__link--active" : "")}>Home</NavLink>
                    <NavLink to="/ai" className={({ isActive }) => "navbar__link" + (isActive ? " navbar__link--active" : "")}>AI</NavLink>
                    <NavLink to="/ingredients" className={({ isActive }) => "navbar__link" + (isActive ? " navbar__link--active" : "")}>Ingredients</NavLink>
                    <NavLink to="/meal-log" className={({ isActive }) => "navbar__link" + (isActive ? " navbar__link--active" : "")}>Meal Log</NavLink>
                    <NavLink to="/planner" className={({ isActive }) => "navbar__link" + (isActive ? " navbar__link--active" : "")}>Planner</NavLink>
                    <NavLink to="/pantry" className={({ isActive }) => "navbar__link" + (isActive ? " navbar__link--active" : "")}>Pantry</NavLink>
                </div>

                <div className="navbar__icons">
                    <div className="navbar__avatar">👨‍🍳</div>
                </div>
            </nav>

            {/* Mobile bottom nav — shown only on mobile via CSS */}
            <MobileBottomNav />
        </>
    );
}