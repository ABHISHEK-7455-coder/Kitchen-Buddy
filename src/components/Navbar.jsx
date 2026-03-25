import '../pages/styles/Navbar.css';
import { NavLink, useLocation, useNavigate } from "react-router-dom";

const LogoIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M3 11l19-9-9 19-2-8-8-2z" />
    </svg>
);

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
            {items.map((item) => (
                <NavLink
                    key={item.to}
                    to={item.to}
                    className={"mobile-nav-item" + (location.pathname === item.to ? " active" : "")}
                >
                    <i className={"fa-solid " + item.icon} aria-hidden="true" />
                    <span>{item.label}</span>
                </NavLink>
            ))}
        </nav>
    );
}

// onOpenProfile: () => void — passed from App via SharedNavbar
export default function Navbar({ onOpenProfile }) {
    const navigate = useNavigate();

    const savedName = (() => {
        try {
            return JSON.parse(localStorage.getItem("kitchenBuddyPrefs") || "{}").name || null;
        } catch { return null; }
    })();

    return (
        <>
            <nav className="navbar">
                <div className="navbar__logo" onClick={() => navigate("/")}>
                    <span className="navbar__logo-icon"><LogoIcon /></span>
                    Kitchen Buddy
                </div>

                <div className="navbar__links">
                    <NavLink to="/" className={({ isActive }) => "navbar__link" + (isActive ? " navbar__link--active" : "")}>Home</NavLink>
                    <NavLink to="/ai" className={({ isActive }) => "navbar__link" + (isActive ? " navbar__link--active" : "")}>AI</NavLink>
                    <NavLink to="/ingredients" className={({ isActive }) => "navbar__link" + (isActive ? " navbar__link--active" : "")}>Ingredients</NavLink>
                    <NavLink to="/meal-log" className={({ isActive }) => "navbar__link" + (isActive ? " navbar__link--active" : "")}>Meal Log</NavLink>
                    <NavLink to="/planner" className={({ isActive }) => "navbar__link" + (isActive ? " navbar__link--active" : "")}>Planner</NavLink>
                    <NavLink to="/pantry" className={({ isActive }) => "navbar__link" + (isActive ? " navbar__link--active" : "")}>Pantry</NavLink>
                </div>

                <div className="navbar__icons">
                    {/*
            onOpenProfile comes from App.jsx via SharedNavbar.
            Clicking this button opens the profile/onboarding modal.
          */}
                    <button
                        className="navbar__avatar-btn"
                        onClick={onOpenProfile}
                        title={savedName ? `Edit profile · ${savedName}` : "Set up your profile"}
                        aria-label="Open taste profile"
                        type="button"
                    >
                        <span className="navbar__avatar">👨‍🍳</span>
                        {savedName && <span className="navbar__avatar-name">{savedName.split(" ")[0]}</span>}
                    </button>
                </div>
            </nav>

            <MobileBottomNav />
        </>
    );
}