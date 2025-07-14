import React, { useMemo } from 'react';
import { useData } from '../context/DataContext';
import { TrendingUp, PieChart, Utensils, Award, Inbox, Download } from 'lucide-react';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Pie, Cell } from 'recharts';
import Papa from 'papaparse';

const ReportCard = ({ title, icon, children }) => (
    <div className="card h-full">
        <h3 className="text-xl mb-4 flex items-center gap-2">
            {icon} {title}
        </h3>
        {children}
    </div>
);

const EmptyReportState = () => (
    <div className="text-center py-4">
        <Inbox size={32} className="mx-auto text-slate-400" />
        <p className="mt-2 text-sm text-[var(--text-secondary-light)] dark:text-[var(--text-secondary-dark)]">
            Log some feedings to see a report.
        </p>
    </div>
);

export default function ReportsPage() {
    const { history } = useData();

    const reports = useMemo(() => {
        if (!history || history.length === 0) {
            return {
                topEaten: [],
                topRecipes: [],
                firstIntroductions: [],
                wastageData: [{ name: 'No Data', value: 1 }],
                totalEaten: 0,
                totalWasted: 0,
            };
        }

        const eatenCounts = {};
        const recipeCounts = {};
        let totalWasted = 0;
        let totalEaten = 0;
        const firstEatenMap = {};

        history.forEach(item => {
            if (item.type === 'eaten') {
                eatenCounts[item.name] = (eatenCounts[item.name] || 0) + item.amount;
                totalEaten += item.amount;
                if (!firstEatenMap[item.name] || new Date(item.timestamp) < new Date(firstEatenMap[item.name].timestamp)) {
                    firstEatenMap[item.name] = item;
                }
            } else if (item.type === 'wasted') {
                totalWasted += item.amount;
            } else if (item.type === 'recipe') {
                recipeCounts[item.name] = (recipeCounts[item.name] || 0) + 1;
            }
        });

        const topEaten = Object.entries(eatenCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => ({ name, count }));

        const topRecipes = Object.entries(recipeCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => ({ name, count }));
            
        const firstIntroductions = Object.values(firstEatenMap)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 5);

        const wastageData = [
            { name: 'Eaten', value: totalEaten },
            { name: 'Wasted', value: totalWasted },
        ];

        return { topEaten, topRecipes, firstIntroductions, wastageData, totalEaten, totalWasted };
    }, [history]);

    const handleExport = () => {
        const dataToExport = history.map(item => ({
            Date: format(new Date(item.timestamp), 'yyyy-MM-dd HH:mm:ss'),
            Food: item.name,
            Amount: item.amount,
            Type: item.type,
        }));
        const csv = Papa.unparse(dataToExport);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "feeding_history.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const COLORS = ['#8884d8', '#ff8042'];

    return (
        <div className="space-y-10">
            <section className="flex justify-between items-center">
                <div>
                    <h2 className="text-4xl">Reports & Insights</h2>
                    <p className="text-[var(--text-secondary-light)] dark:text-[var(--text-secondary-dark)] mt-1">
                        Discover patterns in your baby's eating habits.
                    </p>
                </div>
                <button onClick={handleExport} className="btn-primary !py-2 !px-3 text-sm">
                    <Download size={16} />
                    Export History
                </button>
            </section>

            {history.length === 0 ? (
                <div className="card">
                     <EmptyReportState />
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    <ReportCard title="Top 5 Most Eaten Foods" icon={<TrendingUp size={22} className="text-blue-500" />}>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={reports.topEaten} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                <XAxis type="number" hide />
                                <YAxis type="category" dataKey="name" width={80} stroke="var(--text-secondary-light)" />
                                <Tooltip cursor={{ fill: 'rgba(200, 200, 200, 0.1)' }}/>
                                <Bar dataKey="count" fill="#8884d8" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ReportCard>

                    <ReportCard title="Wastage Rate" icon={<PieChart size={22} className="text-red-500" />}>
                        <ResponsiveContainer width="100%" height={300}>
                            <Pie data={reports.wastageData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}>
                                {reports.wastageData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                        </ResponsiveContainer>
                    </ReportCard>
                    
                    <ReportCard title="Top 5 Favorite Recipes" icon={<Utensils size={22} className="text-purple-500" />}>
                        {reports.topRecipes.length > 0 ? (
                            <ul className="space-y-2">
                                {reports.topRecipes.map((item, index) => (
                                    <li key={item.name} className="p-3 bg-slate-50 dark:bg-slate-900/70 rounded-xl flex items-center gap-3">
                                        <span className="text-lg font-bold text-purple-400">{index + 1}</span>
                                        <span className="font-semibold">{item.name}</span>
                                        <span className="ml-auto text-sm font-bold">{item.count} times</span>
                                    </li>
                                ))}
                            </ul>
                        ) : <EmptyReportState /> }
                    </ReportCard>
                    
                    <ReportCard title="Recent First Tastes" icon={<Award size={22} className="text-green-500" />}>
                         <ul className="space-y-2">
                            {reports.firstIntroductions.map((item) => (
                                <li key={item.id} className="p-3 bg-slate-50 dark:bg-slate-900/70 rounded-xl flex justify-between items-center">
                                    <span className="font-semibold">{item.name}</span>
                                    <span className="text-sm text-[var(--text-secondary-light)] dark:text-[var(--text-secondary-dark)]">{format(new Date(item.timestamp), 'MMM d, yyyy')}</span>
                                </li>
                            ))}
                        </ul>
                    </ReportCard>
                </div>
            )}
        </div>
    );
}