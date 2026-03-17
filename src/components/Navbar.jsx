import '../pages/styles/Navbar.css';
// import '../src/pages/styles/Navbar.css'
import { NavLink } from "react-router-dom";

const SearchIcon = () => (
    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
    </svg>
);

const BellIcon = () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
);

const SettingsIcon = () => (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="3" />
    </svg>
);

const LogoIcon = () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M3 11l19-9-9 19-2-8-8-2z" />
    </svg>
);

export default function Navbar() {
    return (
        <nav className="navbar">

            <div className="navbar_logo">
                <NavLink to="/" className="navbar__logo-link">
                    <span className="navbar__logo-icon"><LogoIcon />Kitchen Buddy</span>
                    
                </NavLink>
            </div>

            {/* <div className="navbar__search">
                <SearchIcon />
                <input
                    type="text"
                    placeholder="Search recipes, ingredients..."
                    className="navbar__search-input"
                />
            </div> */}

            <div className="navbar__links">

                <NavLink to="/" className="navbar__link">
                    Home
                </NavLink>

                <NavLink to="/ai" className="navbar__link">
                    AI
                </NavLink>
                {/* <NavLink to="/meal-log" className="navbar__link">
                    Meal Log
                </NavLink> */}

                <NavLink to="/planner" className="navbar__link">
                    Planner
                </NavLink>

                <NavLink to="/pantry" className="navbar__link">
                    Pantry
                </NavLink>
            </div>

            <div className="navbar__icons">
                {/* <div className="navbar__icon-btn"><BellIcon /></div>
                <div className="navbar__icon-btn"><SettingsIcon /></div> */}
                <div className="navbar__avatar">👨‍🍳</div>
            </div>

        </nav>
    );
}