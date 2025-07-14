import React, { useState } from 'react';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';
import { useData } from '../context/DataContext'; // Use the central data hook
import InventoryForm from '../components/InventoryForm';
import FoodInventoryItem from '../components/FoodInventoryItem';
import FeedingHistory from '../components/FeedingHistory';
import AISuggestions from '../components/AISuggestions';

export default function DashboardPage() {
  // Get all data and functions directly from the context
  const { 
    inventory, 
    loading, 
    handleAddFood, 
    handleLogUsage, 
    history, 
    setHistory, 
    handleDeleteHistoryItem, 
    handleAddToShoppingList, 
    plans 
  } = useData();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isInventoryOpen, setIsInventoryOpen] = useState(true);

  const onLogUsage = (item, amountUsed, isTrash) => {
    handleLogUsage(item, amountUsed, isTrash, setHistory, handleAddToShoppingList);
  };

  const inventoryToDisplay = (inventory || [])
    .filter(item => item.cubesLeft > 0 && item.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => a.cubesLeft - b.cubesLeft);

  return (
    <div className="space-y-10">
      <section>
          <h2 className="text-4xl">Dashboard</h2>
          <p className="text-[var(--text-secondary-light)] dark:text-[var(--text-secondary-dark)] mt-1">Manage your baby's pantry and feeding schedule.</p>
      </section>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-1 space-y-8">
          <InventoryForm onAddFood={handleAddFood} onAddToShoppingList={handleAddToShoppingList} />
          <AISuggestions />
        </div>
        <div className="lg:col-span-2 space-y-8">
          <section>
              <div className="flex justify-between items-center mb-4">
                  <h3 className="text-2xl">Inventory</h3>
                  <div className="flex items-center gap-2">
                      <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={20} /><input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="input-field pl-10 w-40 sm:w-48" /></div>
                      <button onClick={() => setIsInventoryOpen(!isInventoryOpen)} className="p-2 rounded-lg hover:bg-slate-200/60 dark:hover:bg-[#4A5568]/60">{isInventoryOpen ? <ChevronUp /> : <ChevronDown />}</button>
                  </div>
              </div>
              {isInventoryOpen && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      {loading ? <p className="col-span-full">Loading...</p> : inventoryToDisplay.length > 0 ? (
                          inventoryToDisplay.map(item => <FoodInventoryItem key={item.id} item={item} onLogUsage={onLogUsage} plans={plans} />)
                      ) : (
                          <p className="col-span-full">No items to display.</p>
                      )}
                  </div>
              )}
          </section>
          <section>
              <h3 className="text-2xl mb-4">Feeding History</h3>
              <FeedingHistory history={history} loading={loading} onDelete={handleDeleteHistoryItem} />
          </section>
        </div>
      </div>
    </div>
  );
}