import React from 'react';
import { useData } from '../context/DataContext';
import InventoryForm from '../components/InventoryForm';
import FeedingHistory from '../components/FeedingHistory';
import InventoryQuickList from "../components/InventoryQuickList.jsx";
import PageHeader from "../components/PageHeader";


export default function DashboardPage() {
  const {
    loading,
    handleAddFood,
    history,
    handleDeleteHistoryItem,
  } = useData();

  return (
    <div className="space-y-10">
      
      <PageHeader
  title="Dashboard"
  subtitle="Quick actions and a snapshot of recent feedings."
/>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left column: Add Food */}
        <div className="lg:col-span-1 space-y-8">
          <InventoryForm onAddFood={handleAddFood} />
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 space-y-8">
          {/* Quick Use only (fast consumption) */}
          <section>
            <h3 className="text-2xl mb-4">Quick Use</h3>
            <InventoryQuickList />
          </section>

          {/* Feeding History */}
          <section>
            <h3 className="text-2xl mb-4">Feeding History</h3>
            <FeedingHistory
              history={history}
              loading={loading}
              onDelete={handleDeleteHistoryItem}
            />
          </section>
        </div>
      </div>
    </div>
  );
}
