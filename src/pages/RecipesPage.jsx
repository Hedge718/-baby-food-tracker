import React from 'react';
import { useData } from '../context/DataContext';
import RecipeForm from '../components/RecipeForm';
import RecipeList from '../components/RecipeList';

export default function RecipesPage() {
    const { recipes, loading, handleAddRecipe, handleDeleteRecipe, handleCookRecipe, inventory } = useData();
    
    return (
        <div className="space-y-10">
            <section>
                <h2 className="text-4xl">Recipes</h2>
                <p>Create new recipes and see what you can cook.</p>
            </section>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-1">
                    <RecipeForm onAddRecipe={handleAddRecipe} />
                </div>
                <div className="lg:col-span-2">
                    {loading ? (
                        <p>Loading recipes...</p>
                    ) : (
                        <RecipeList 
                            recipes={recipes} 
                            onDeleteRecipe={handleDeleteRecipe}
                            onCookRecipe={handleCookRecipe}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}