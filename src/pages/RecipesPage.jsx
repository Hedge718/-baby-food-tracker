import React from 'react';
import { useData } from '../context/DataContext';
import RecipeForm from '../components/RecipeForm';
import RecipeList from '../components/RecipeList';
import { Inbox } from 'lucide-react';

const EmptyState = ({ message, details }) => (
    <div className="text-center p-8 col-span-full">
        <Inbox size={40} className="mx-auto text-slate-400" />
        <h3 className="mt-4 text-lg font-semibold">{message}</h3>
        <p className="mt-1 text-sm text-[var(--text-secondary-light)] dark:text-[var(--text-secondary-dark)]">{details}</p>
    </div>
);

export default function RecipesPage() {
    const { recipes, loading, handleAddRecipe, handleDeleteRecipe, handleCookRecipe, inventory, fullInventory } = useData();
    
    return (
        <div className="space-y-10">
            <section>
                <h2 className="text-4xl">Recipes</h2>
                <p className="text-[var(--text-secondary-light)] dark:text-[var(--text-secondary-dark)] mt-1">
                    Create recipes from your inventory and see what you can cook.
                </p>
            </section>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-1">
                    <RecipeForm onAddRecipe={handleAddRecipe} />
                </div>
                <div className="lg:col-span-2">
                    {loading ? (
                        <div className="card text-center">Loading recipes...</div>
                    ) : recipes.length > 0 ? (
                        <RecipeList 
                            recipes={recipes} 
                            inventory={inventory}
                            fullInventory={fullInventory}
                            onDeleteRecipe={handleDeleteRecipe}
                            onCookRecipe={handleCookRecipe}
                        />
                    ) : (
                        <div className="card">
                            <EmptyState
                                message="No recipes yet!"
                                details="Create your first recipe to see it here."
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}