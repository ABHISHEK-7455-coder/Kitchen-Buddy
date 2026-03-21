import HeroCard from "../components/HeroCard";
import MealPlan from "../components/MealPlan";
import AIMealSuggestions from "../components/AIMealSuggestions.jsx";
import Navbar from "../components/Navbar";

export default function HomePage({ mealPlans, addMeal }) {
    return (
        <>
            <Navbar />
            <main style={{
                width: '90%',
                margin: 'auto',
                padding: '32px 24px 0',
                paddingBottom: 'max(32px, env(safe-area-inset-bottom, 80px))',
            }}>
                <HeroCard />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '28px' }}>
                    <AIMealSuggestions mealPlans={mealPlans} addMeal={addMeal} />
                    <MealPlan mealPlans={mealPlans} addMeal={addMeal} />
                </div>
            </main>

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