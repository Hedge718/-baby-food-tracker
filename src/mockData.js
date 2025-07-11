// src/mockData.js
// Pure data exports—no imports here!

export const mockInventory = [
  { id: '1', name: 'Sweet Potato', totalCubes: 12, cubesLeft: 12 },
  { id: '2', name: 'Carrot',       totalCubes: 12, cubesLeft: 8  },
  { id: '3', name: 'Peas',         totalCubes: 12, cubesLeft: 10 },
  { id: '4', name: 'Pumpkin',      totalCubes: 8,  cubesLeft: 8  },
  { id: '5', name: 'Apple',        totalCubes: 10, cubesLeft: 10 }
];

export const mockHistory = [
  { id: 'h1', name: 'Sweet Potato', amount: 2, timestamp: '2025-07-01T09:00:00Z' },
  { id: 'h2', name: 'Carrot',       amount: 3, timestamp: '2025-07-02T11:30:00Z' }
];

export const mockPlans = [
  { id: 'p1', date: { toDate: () => new Date('2025-07-01') }, mealType: 'breakfast', itemId: '1', isRecipe: false },
  { id: 'p2', date: { toDate: () => new Date('2025-07-02') }, mealType: 'lunch',     itemId: '2', isRecipe: false }
];

export const mockRecipes = [
  {
    id: 'r1',
    name: 'Sweet Potato + Apple',
    ingredients: [
      { itemId: '1', cubesRequired: 2 },
      { itemId: '5', cubesRequired: 2 }
    ]
  }
];

export const mockSuggestions = [
  { id: 's1', text: 'Add a pinch of cinnamon to Sweet Potato for flavor.' },
  { id: 's2', text: 'Carrot pairs well with a dash of ginger.' },
  { id: 's3', text: 'Try blending Peas with a little mint.' }
];
