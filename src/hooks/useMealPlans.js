import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { getMealPlans, addMealPlan, deleteMealPlan } from '../firebase';

export function useMealPlans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
        try {
            const data = await getMealPlans();
            setPlans(data);
        } catch (err) {
            console.error("Failed to fetch meal plans:", err);
        } finally {
            setLoading(false);
        }
    }
    fetchData();
  }, []);

  const handleAddPlan = async (planData) => {
    const toastId = toast.loading('Saving plan...');
    try {
      const newPlan = await addMealPlan(planData);
      setPlans(prev => [...prev, newPlan]);
      toast.success('Meal plan saved!', { id: toastId });
    } catch (err) {
      toast.error('Failed to save plan.', { id: toastId });
    }
  };

  const handleDeletePlan = async (planId) => {
    const originalPlans = [...plans];
    setPlans(prev => prev.filter(p => p.id !== planId));
    try {
        await deleteMealPlan(planId);
        toast.success('Plan removed.');
    } catch (err) {
        toast.error('Failed to remove plan.');
        setPlans(originalPlans);
    }
  };

  return { plans, loading, handleAddPlan, handleDeletePlan };
}