import React, { useState } from 'react';
import { Sparkles, Lightbulb } from 'lucide-react';
import { useInventory } from '../hooks/useInventory';

export default function AISuggestions() {
  const { inventory } = useInventory();
  const [isLoading, setIsLoading] = useState(false);
  const [recommendation, setRecommendation] = useState('');

  const getRecipe = () => {
    const available = inventory.filter(i => i.cubesLeft > 0).map(i => i.name);
    if (available.length < 2) {
        setRecommendation('You need at least two different foods in your inventory to get a recipe idea!');
        return;
    }
    const prompt = `Based ONLY on these available baby foods (${available.join(', ')}), suggest a simple recipe.`;
    const response = `How about a classic **${available[0]} & ${available[1]} Mash**? Simply steam and blend equal parts. It's a nutritious and naturally sweet combination!`;
    makeFakeRequest(prompt, response);
  };

  const getNewIngredient = () => {
    const potentialSuggestions = ['Avocado', 'Pear', 'Chicken', 'Blueberry', 'Quinoa', 'Mango', 'Zucchini'];
    const currentInventoryNames = inventory.map(i => i.name.toLowerCase());
    
    // Find the first potential suggestion that isn't already in the inventory
    const newSuggestion = potentialSuggestions.find(food => !currentInventoryNames.includes(food.toLowerCase()));

    if (!newSuggestion) {
        setRecommendation("You already have a great variety! I can't think of anything new right now.");
        return;
    }

    const prompt = `I already have these baby foods: ${currentInventoryNames.join(', ')}. Suggest ONE new, complementary food I should buy next and briefly explain why.`;
    const response = `You should try **${newSuggestion}**! It's great for healthy fats (good for brain development) and has a creamy texture that babies love.`;
    makeFakeRequest(prompt, response);
  };

  const makeFakeRequest = (prompt, mockResponse) => {
    setIsLoading(true);
    setRecommendation('');
    console.log("Simulating API call to Gemini with prompt:", prompt);
    setTimeout(() => {
        setRecommendation(mockResponse);
        setIsLoading(false);
    }, 1500);
  };

  return (
    <div className="card">
      <h3 className="text-xl mb-4 flex items-center gap-2">
        <Sparkles size={22} className="text-[var(--accent-light)] dark:text-[var(--accent-dark)]"/>
        AI Helper
      </h3>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
            <button onClick={getRecipe} disabled={isLoading} className="btn-primary text-sm p-2">
                <Sparkles size={16} /> Recipe Idea
            </button>
            <button onClick={getNewIngredient} disabled={isLoading} className="btn-primary text-sm p-2">
                <Lightbulb size={16} /> Suggest Food
            </button>
        </div>
        {isLoading && <p className="text-sm text-center text-[var(--text-secondary-light)] dark:text-[var(--text-secondary-dark)]">Gemini is thinking...</p>}
        {recommendation && (
          <div className="p-4 bg-slate-50 dark:bg-slate-900/70 rounded-xl border border-[var(--border-light)] dark:border-[var(--border-dark)]">
            <p className="text-sm" dangerouslySetInnerHTML={{ __html: recommendation.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}></p>
          </div>
        )}
      </div>
    </div>
  );
}