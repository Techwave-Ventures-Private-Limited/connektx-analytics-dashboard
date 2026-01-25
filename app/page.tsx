"use client";

import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart 
} from 'recharts';
import { Calendar, Users, Briefcase, FileText, ArrowUpRight, LucideIcon } from 'lucide-react';

// --- CONFIGURATION ---
const API_BASE = `${process.env.NEXT_PUBLIC_API_BASE}/analytics`;

// --- TYPES ---
interface ChartSeriesItem {
  label: string;
  count: number;
}

interface ChartSeries {
  name: string;
  data: ChartSeriesItem[];
}

interface ApiSummary {
  [key: string]: number;
}

interface ApiCharts {
  series?: ChartSeries[]; // For users/jobs
  content_creation?: ChartSeries[]; // For posts (creation)
  reactions?: ChartSeries[]; // For posts (engagement)
}

interface ApiResponse {
  meta: {
    start_date: string;
    end_date: string;
    interval: string;
  };
  summary: ApiSummary;
  charts: ApiCharts;
}

interface DashboardData {
  users: ApiResponse | null;
  jobs: ApiResponse | null;
  posts: ApiResponse | null;
}

// --- HELPER: Transform Backend Data for Recharts ---
const processChartData = (seriesList: ChartSeries[] | undefined) => {
  if (!seriesList || seriesList.length === 0) return [];
  
  // We use 'any' here for the accumulator because the keys are dynamic (dates)
  // and values are dynamic (metric names)
  const dataMap: Record<string, any> = {};

  seriesList.forEach((series) => {
    series.data.forEach((point) => {
      const dateLabel = point.label;
      if (!dataMap[dateLabel]) {
        dataMap[dateLabel] = { name: dateLabel };
      }
      dataMap[dateLabel][series.name] = point.count;
    });
  });

  return Object.values(dataMap).sort((a: any, b: any) => 
    new Date(a.name).getTime() - new Date(b.name).getTime()
  );
};

// --- COMPONENTS ---

interface KPICardProps {
  title: string;
  value: number | undefined;
  icon: LucideIcon;
  color: string;
}

const KPICard = ({ title, value, icon: Icon, color }: KPICardProps) => (
  <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 shadow-sm flex items-center justify-between">
    <div>
      <p className="text-slate-400 text-sm font-medium mb-1">{title}</p>
      <h3 className="text-2xl font-bold text-slate-100">{value ?? "-"}</h3>
    </div>
    <div className={`p-3 rounded-full bg-opacity-10 ${color}`}>
      <Icon size={24} className={color.replace('bg-', 'text-')} />
    </div>
  </div>
);

const ChartContainer = ({ title, children }: { title: string, children: React.ReactNode }) => (
  <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-md flex flex-col h-[400px]">
    <h3 className="text-lg font-semibold text-slate-100 mb-4">{title}</h3>
    <div className="flex-1 w-full min-h-0 text-xs">
      {children}
    </div>
  </div>
);

// --- MAIN PAGE ---
export default function Home() {
  const [interval, setIntervalState] = useState('daily');
  const [dates, setDates] = useState({
    start: "",
    end: ""
  });

  // Hydration fix: Set dates only after mount
  useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);
    setDates({
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    });
  }, []);

  const [data, setData] = useState<DashboardData>({ users: null, jobs: null, posts: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!dates.start) return; 

    const fetchData = async () => {
      setLoading(true);
      const query = `?start_date=${dates.start}&end_date=${dates.end}&interval=${interval}`;

      try {
        const [usersRes, jobsRes, postsRes] = await Promise.all([
          fetch(`${API_BASE}/users${query}`),
          fetch(`${API_BASE}/jobs${query}`),
          fetch(`${API_BASE}/posts${query}`)
        ]);

        const usersData = await usersRes.json();
        const jobsData = await jobsRes.json();
        const postsData = await postsRes.json();

        setData({ users: usersData, jobs: jobsData, posts: postsData });
      } catch (err) {
        console.error("Failed to fetch analytics:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [interval, dates]);

  const userChartData = processChartData(data.users?.charts?.series);
  const jobChartData = processChartData(data.jobs?.charts?.series);
  const postChartData = processChartData(data.posts?.charts?.content_creation);
  const reactionChartData = processChartData(data.posts?.charts?.reactions);

  if (loading && !data.users) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400">Loading Dashboard...</div>;
  }

  return (
    <main className="min-h-screen bg-slate-900 text-slate-200 p-6 font-sans">
      {/* HEADER & FILTERS */}
      <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Connektx Analytics</h1>
          <p className="text-slate-400">Real-time platform insights</p>
        </div>

        <div className="flex flex-wrap gap-3 bg-slate-800 p-2 rounded-lg border border-slate-700">
          <div className="flex items-center px-3 gap-2 border-r border-slate-600">
            <Calendar size={18} className="text-slate-400" />
            <input 
              type="date" 
              value={dates.start}
              onChange={(e) => setDates({...dates, start: e.target.value})}
              className="bg-transparent text-sm focus:outline-none text-white w-32 appearance-none"
            />
            <span className="text-slate-500">to</span>
            <input 
              type="date" 
              value={dates.end}
              onChange={(e) => setDates({...dates, end: e.target.value})}
              className="bg-transparent text-sm focus:outline-none text-white w-32 appearance-none"
            />
          </div>

          <select 
            value={interval}
            onChange={(e) => setIntervalState(e.target.value)}
            className="bg-slate-700 text-white text-sm rounded px-3 py-1 focus:outline-none border border-slate-600"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
      </header>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KPICard 
          title="Total Users" 
          value={data.users?.summary?.total_accounts} 
          icon={Users} color="text-blue-400 bg-blue-400" 
        />
        <KPICard 
          title="Active Jobs" 
          value={data.jobs?.summary?.active_jobs} 
          icon={Briefcase} color="text-emerald-400 bg-emerald-400" 
        />
        <KPICard 
          title="Total Posts" 
          value={data.posts?.summary?.total_active_posts} 
          icon={FileText} color="text-violet-400 bg-violet-400" 
        />
        <KPICard 
          title="Applications" 
          value={data.jobs?.summary?.total_applications} 
          icon={ArrowUpRight} color="text-orange-400 bg-orange-400" 
        />
      </div>

      {/* CHARTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-10">
        
        {/* GRAPH 1: USERS */}
        <ChartContainer title="User Growth Trends">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={userChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155' }} />
              <Legend />
              <Line type="monotone" dataKey="Total New Users" stroke="#3b82f6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Personal" stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" dot={false} />
              <Line type="monotone" dataKey="Company" stroke="#f59e0b" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* GRAPH 2: JOBS */}
        <ChartContainer title="Recruitment Activity">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={jobChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155' }} />
              <Legend />
              <Area type="monotone" dataKey="Jobs Posted" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.1} />
              <Area type="monotone" dataKey="Applications Received" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.1} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* GRAPH 3: CONTENT */}
        <ChartContainer title="Content Volume">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={postChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155' }} />
              <Bar dataKey="New Posts" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* GRAPH 4: ENGAGEMENT */}
        <ChartContainer title="Engagement & Reactions">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={reactionChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155' }} />
              <Legend />
              <Bar dataKey="Likes Generated" stackId="a" fill="#ef4444" radius={[0, 0, 4, 4]} />
              <Bar dataKey="Comments Generated" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartContainer>

      </div>
    </main>
  );
}