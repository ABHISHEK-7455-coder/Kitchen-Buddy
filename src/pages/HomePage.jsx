import HeroCard from "../components/HeroCard";
import MealPlan from "../components/MealPlan";
import AIBot from "../components/AIBot";
import Navbar from "../components/Navbar";

export default function HomePage({ mealPlans, addMeal, onOpenProfile }) {
    return (
        <>
            <Navbar onOpenProfile={onOpenProfile} />
            <main style={{
                width: '90%',
                margin: 'auto',
                padding: '32px 24px 0',
                paddingBottom: 'max(32px, env(safe-area-inset-bottom, 80px))',
            }}>
                <HeroCard />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '28px' }}>
                    <MealPlan mealPlans={mealPlans} addMeal={addMeal} />
                </div>
            </main>

            <AIBot addMeal={addMeal} />

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