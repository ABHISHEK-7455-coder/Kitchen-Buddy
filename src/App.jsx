import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";

import Navbar from "./components/Navbar";
import HomePage from "./pages/HomePage";
import PantryInventory from "./pages/PantryInventory";
import CalendarView from "./pages/CalendarView";
import MealLog from "./components/MealLog";
import Onboarding from "./pages/Onboarding";
import AIFoodFeed from "./pages/AIFoodFeed";

function App() {
  // ── Onboarding ────────────────────────────────────────────────────────────
  const [onboardingDone, setOnboardingDone] = useState(() =>
    !!localStorage.getItem("kitchenBuddyPrefs")
  );

  // ── Shared meal plans — single source of truth ────────────────────────────
  // Shape: { "2024-03-14": { Breakfast: {name, time, ...}, Lunch: {...}, Dinner: {...} } }
  const [mealPlans, setMealPlans] = useState(() => {
    try {
      const saved = localStorage.getItem("mealPlans");
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  // Persist every change to localStorage
  useEffect(() => {
    localStorage.setItem("mealPlans", JSON.stringify(mealPlans));
  }, [mealPlans]);

  // Add / update a single meal slot
  // dateKey: "2024-03-14"   mealType: "Breakfast" | "Lunch" | "Dinner"
  // meal: { name, time, calories, cuisine, description, ingredients, steps, isVeg, ... }
  const addMeal = (dateKey, mealType, meal) => {
    setMealPlans((prev) => ({
      ...prev,
      [dateKey]: {
        ...(prev[dateKey] || {}),
        [mealType]: meal,
      },
    }));
  };

  if (!onboardingDone) {
    return <Onboarding onComplete={() => setOnboardingDone(true)} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />

        {/* AI Feed — passes addMeal so it can sync to planner */}
        <Route
          path="/ai"
          element={
            <>
              <Navbar />
              <AIFoodFeed addMeal={addMeal} mealPlans={mealPlans} />
            </>
          }
        />

        {/* Planner — receives the same mealPlans + addMeal */}
        <Route
          path="/planner"
          element={
            <>
              <Navbar />
              <CalendarView mealPlans={mealPlans} addMeal={addMeal} />
            </>
          }
        />

        <Route path="/pantry" element={<><Navbar /><PantryInventory /></>} />
        <Route path="/meal-log" element={<><Navbar /><MealLog /></>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;