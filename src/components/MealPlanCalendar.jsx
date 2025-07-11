import React, { useState } from 'react';
import { useMealPlans } from '../hooks/useMealPlans';
import { format, startOfMonth, endOfMonth, startOfWeek, addDays } from 'date-fns';
import PlanFormModal from './PlanFormModal';
import PlannedItemCard from './PlannedItemCard';

export default function MealPlanCalendar() {
  const { plans } = useMealPlans();
  const [current, setCurrent] = useState(new Date());
  const [modalDate, setModalDate] = useState(null);

  const monthStart = startOfMonth(current);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);

  const cells = [];
  let day = startDate;
  while (day <= monthEnd) {
    for (let i = 0; i < 7; i++) {
      const formatted = format(day, 'd');
      cells.push(
        <div key={day} className="border h-24 p-1 relative"
             onClick={() => setModalDate(day)}>
          <span className="text-xs">{formatted}</span>
          {plans.filter(p => format(p.date.toDate(), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd'))
                .map(p => <PlannedItemCard key={p.id} plan={p} />)}
        </div>
      );
      day = addDays(day, 1);
    }
    break; // simplified one-week view
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">Meal Planner</h2>
      <div className="grid grid-cols-7 gap-1 mb-4">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d =>
          <div key={d} className="text-center font-medium">{d}</div>
        )}
      </div>
      <div className="grid grid-cols-7 gap-1 mb-4">{cells}</div>
      {modalDate && <PlanFormModal date={modalDate} onClose={() => setModalDate(null)} />}
    </div>
  );
}