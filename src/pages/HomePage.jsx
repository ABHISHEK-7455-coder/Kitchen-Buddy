import HeroCard from "../components/HeroCard";
import MealPlan from "../components/MealPlan";
import Navbar from "../components/Navbar";

export default function HomePage() {
    return (
        <>
            <Navbar />
            <main style={{
                width: '90%',
                margin: 'auto',
                padding: '32px 24px 0',
                // Extra bottom padding on mobile for bottom nav
                paddingBottom: 'max(32px, env(safe-area-inset-bottom, 80px))',
            }}>
                <HeroCard />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '28px' }}>
                    <MealPlan />
                </div>
            </main>

            {/* Mobile responsive override */}
            <style>{`
                @media (max-width: 768px) {
                    main {
                        width: 100% !important;
                        padding: 16px 16px 80px !important;
                    }
                }
            `}</style>
        </>
    );
}