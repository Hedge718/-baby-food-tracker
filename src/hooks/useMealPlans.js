import { useState, useEffect } from 'react';
import { getMealPlans } from '../firebase';
import { mockPlans } from '../mockData';

export function useMealPlans() {
  const [plans, setPlans] = useState([]);
  useEffect(() => {
    if (import.meta.env.DEV) setPlans(mockPlans);
    else getMealPlans().then(setPlans);
  }, []);
  return { plans, setPlans };
}