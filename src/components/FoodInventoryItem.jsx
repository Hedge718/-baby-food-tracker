import React from 'react';
export default function FoodInventoryItem({ item }) {
  return (
    <div className="p-4 bg-white dark:bg-gray-700 rounded shadow">
      <h3 className="font-semibold">{item.name}</h3>
      <p>{item.cubesLeft} of {item.totalCubes} cubes</p>
    </div>
  );
}