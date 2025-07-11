import React from 'react';

export default function FoodInventoryItem({ item }) {
  const percentage = item.totalCubes > 0 ? (item.cubesLeft / item.totalCubes) * 100 : 0;

  let bgColor = 'bg-green-500';
  if (percentage < 50) bgColor = 'bg-yellow-500';
  if (percentage < 25) bgColor = 'bg-red-500';

  return (
    <div className="card flex flex-col justify-between">
      <div>
        <h3 className="font-bold text-lg">{item.name}</h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          {item.cubesLeft} of {item.totalCubes} cubes remaining
        </p>
      </div>
      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 mt-3">
        <div
          className={`${bgColor} h-2.5 rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
}