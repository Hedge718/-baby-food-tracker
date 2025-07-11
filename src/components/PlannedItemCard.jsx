import React from 'react';
export default function PlannedItemCard({ plan }) {
  return (
    <div className="absolute top-1 left-1 bg-green-200 dark:bg-green-800 text-xs px-1 rounded">
      {plan.mealType.charAt(0).toUpperCase()}* {plan.isRecipe ? 'R' : 'F'}
    </div>
  );
}