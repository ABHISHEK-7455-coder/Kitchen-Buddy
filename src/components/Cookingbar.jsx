import '../styles/Cookingbar.css';

export default function CookingBar() {
    return (
        <div className="cooking-bar">
            <div className="cooking-bar__thumb">🍳</div>

            <div className="cooking-bar__info">
                <div className="cooking-bar__tag">Cooking Now</div>
                <div className="cooking-bar__title">Avocado Toast with Poached Egg</div>
                <div className="cooking-bar__step">Step 2 of 5 — Poaching the egg</div>
            </div>

            <div className="cooking-bar__controls">
                <button className="ctrl-btn">⏮</button>
                <button className="ctrl-btn ctrl-btn--main">⏸</button>
                <button className="ctrl-btn">⏭</button>
            </div>
        </div>
    );
}