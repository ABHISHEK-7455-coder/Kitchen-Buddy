import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";

import Navbar from "./components/Navbar";
import HomePage from "./pages/HomePage";
import PantryInventory from "./pages/PantryInventory";
import CalendarView from "./pages/CalendarView";
import MealLog from "./components/MealLog";
import Onboarding from "./pages/Onboarding";
import AIFoodFeed from "./pages/AIFoodFeed";
import IngredientSuggest from "./pages/IngredientSuggest";

function App() {
  const [profileOpen, setProfileOpen] = useState(
    () => !localStorage.getItem("kitchenBuddyPrefs")
  );
  const openProfile = () => setProfileOpen(true);
  const closeProfile = () => setProfileOpen(false);

  const [mealPlans, setMealPlans] = useState(() => {
    try {
      const saved = localStorage.getItem("mealPlans");
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  useEffect(() => {
    localStorage.setItem("mealPlans", JSON.stringify(mealPlans));
  }, [mealPlans]);

  const addMeal = (dateKey, mealType, meal) =>
    setMealPlans((prev) => ({
      ...prev,
      [dateKey]: { ...(prev[dateKey] || {}), [mealType]: meal },
    }));

  // Single reusable Navbar with openProfile always wired
  const Nav = () => <Navbar onOpenProfile={openProfile} />;

  return (
    <BrowserRouter>
      {profileOpen && <Onboarding onComplete={closeProfile} isModal />}

      <Routes>
        {/* HomePage has its OWN Navbar inside — do NOT add <Nav /> here */}
        <Route path="/" element={<HomePage mealPlans={mealPlans} addMeal={addMeal} onOpenProfile={openProfile} />} />

        {/* These pages do NOT have an internal Navbar — <Nav /> is added here */}
        <Route path="/ai" element={<><Nav /><AIFoodFeed addMeal={addMeal} mealPlans={mealPlans} /></>} />
        <Route path="/planner" element={<><Nav /><CalendarView mealPlans={mealPlans} addMeal={addMeal} /></>} />
        <Route path="/ingredients" element={<><Nav /><IngredientSuggest addMeal={addMeal} mealPlans={mealPlans} /></>} />
        <Route path="/pantry" element={<><Nav /><PantryInventory /></>} />
        <Route path="/meal-log" element={<><Nav /><MealLog /></>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;