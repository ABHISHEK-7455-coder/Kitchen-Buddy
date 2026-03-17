import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../pages/styles/MealPlan.css";

const initialMeals = [
    { label: "Breakfast", emoji: "🥑", name: "Avocado Toast", time: "8:30 AM", calories: 350, instructions: "", notes: "" },
    { label: "Lunch", emoji: "🥗", name: "Quinoa Power Bowl", time: "1:00 PM", calories: 520, instructions: "", notes: "" },
    { label: "Dinner", emoji: "🍣", name: "Honey Glazed Salmon", time: "7:30 PM", calories: 680, instructions: "", notes: "" }
];

export default function MealPlan({ mealPlans, addMeal }) {


    const [meals, setMeals] = useState(() => {
        const savedMeals = localStorage.getItem("meals");
        return savedMeals ? JSON.parse(savedMeals) : initialMeals;
    });
    const [selectedMeal, setSelectedMeal] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        localStorage.setItem("meals", JSON.stringify(meals));
    }, [meals]);

    const openModal = (meal) => {
        setSelectedMeal(meal);
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setSelectedMeal({ ...selectedMeal, [name]: value });
    };

    const saveMeal = () => {
        const updatedMeals = meals.map((meal) =>
            meal.label === selectedMeal.label ? selectedMeal : meal
        );

        setMeals(updatedMeals);
        setModalOpen(false);
    };

    return (
        <div>

            {/* Header */}
            <div className="section-header">
                <h2 className="section-title">Today's Meal Plan</h2>
                <button
                    className="view-week-btn"
                    onClick={() => navigate("/planner")}
                >
                    View Week
                </button>
            </div>

            {/* Meal Cards */}
            <div className="meal-cards">
                {meals.map((meal) => (
                    <div
                        className="meal-card"
                        key={meal.label}
                        onClick={() => openModal(meal)}
                    >
                        <div className="meal-card__label">{meal.label}</div>
                        <div className="meal-card__thumb">{meal.emoji}</div>
                        <div className="meal-card__name">{meal.name}</div>
                        <div className="meal-card__info">
                            {meal.time} • {meal.calories} kcal
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {modalOpen && (
                <div className="modal-overlay">
                    <div className="modal">

                        <h3>Edit {selectedMeal.label}</h3>

                        <input
                            type="text"
                            name="name"
                            value={selectedMeal.name}
                            onChange={handleChange}
                            placeholder="Dish Name"
                        />

                        <input
                            type="text"
                            name="time"
                            value={selectedMeal.time}
                            onChange={handleChange}
                            placeholder="Meal Time"
                        />

                        <textarea
                            name="instructions"
                            value={selectedMeal.instructions}
                            onChange={handleChange}
                            placeholder="Preparation Instructions (maid ke liye)"
                        />

                        <textarea
                            name="notes"
                            value={selectedMeal.notes}
                            onChange={handleChange}
                            placeholder="Additional Notes (spices kam/jyada, nutrients etc.)"
                        />

                        <div className="modal-buttons">
                            <button onClick={saveMeal}>Save</button>
                            <button onClick={closeModal}>Cancel</button>
                        </div>

                    </div>
                </div>
            )}

            {/* Nutrition Card */}
            {/* <div className="nutrition-card">
                <div>
                    <h3 className="nutrition-card__title">Daily Nutrition Goals</h3>
                    <p className="nutrition-card__sub">
                        You've reached 65% of your protein goal today!
                    </p>
                </div>

                <div className="circle-progress">
                    <div className="circle-progress__inner">65%</div>
                </div>
            </div> */}

        </div>
    );
}