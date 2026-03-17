// import CookingBar from "../components/CookingBar";
import HeroCard from "../components/HeroCard";
import MealPlan from "../components/MealPlan";
import Navbar from "../components/Navbar";
// import Sidebar from "../components/Sidebar";

export default function HomePage() {
    return (
        <>
            <Navbar />
            <main style={{ width: '90%', margin: 'auto', padding: '32px 24px 0' }}>
                <HeroCard />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '28px' }}>
                    <MealPlan />
                    {/* <Sidebar /> */}
                </div>
            </main>
            {/* <CookingBar /> */}
        </>
    )
}