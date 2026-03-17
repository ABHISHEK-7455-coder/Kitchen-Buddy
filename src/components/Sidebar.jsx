import '../styles/Sidebar.css';

const PantryIcon = () => (
    <svg width="16" height="16" fill="none" stroke="var(--orange)" strokeWidth="2.2" viewBox="0 0 24 24">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
);

const quickActions = [
    { emoji: '📷', label: 'Scan Grocery' },
    { emoji: '➕', label: 'Add Recipe' },
    { emoji: '⏱️', label: 'Smart Timer' },
    { emoji: '🛒', label: 'Cart List' },
];

const pantryItems = [
    { name: 'Fresh Produce', pct: 82, low: false },
    { name: 'Dairy & Eggs', pct: 12, low: true },
    { name: 'Grains & Pasta', pct: 55, low: false },
];

export default function Sidebar() {
    return (
        <div>
            {/* Quick Actions */}
            <h2 className="sidebar__title">Quick Actions</h2>
            <div className="qa-grid">
                {quickActions.map(action => (
                    <div className="qa-btn" key={action.label}>
                        <div className="qa-btn__icon">{action.emoji}</div>
                        <div className="qa-btn__label">{action.label}</div>
                    </div>
                ))}
            </div>

            {/* Pantry Overview */}
            <div className="pantry-card">
                <div className="pantry-card__header">
                    <PantryIcon />
                    Pantry Overview
                </div>

                {pantryItems.map(item => (
                    <div className="pantry-item" key={item.name}>
                        <div className="pantry-item__top">
                            <span className="pantry-item__name">{item.name}</span>
                            <span className={`pantry-item__pct ${item.low ? 'pantry-item__pct--low' : ''}`}>
                                {item.pct}%
                            </span>
                        </div>
                        <div className="progress-bar">
                            <div
                                className={`progress-bar__fill ${item.low ? 'progress-bar__fill--low' : ''}`}
                                style={{ width: `${item.pct}%` }}
                            />
                        </div>
                    </div>
                ))}

                <button className="pantry-card__manage">Manage Inventory →</button>
            </div>
        </div>
    );
}