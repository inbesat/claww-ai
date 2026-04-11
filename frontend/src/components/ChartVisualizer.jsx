import React from 'react';
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

const ChartVisualizer = ({ data, type }) => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return null;
  }

  const keys = Object.keys(data[0] || {});
  const xKey = keys[0];
  const yKey = keys[1];

  const containerClass = 'bg-white/5 backdrop-blur-xl border border-white/10 p-4 rounded-2xl my-4';

  if (type === 'bar') {
    return (
      <div className={`${containerClass} w-full overflow-hidden`}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey={xKey} stroke="#a1a1aa" />
            <YAxis stroke="#a1a1aa" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#18181b', 
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: '#fff'
              }}
            />
            <Bar dataKey={yKey} fill="#d946ef" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (type === 'line') {
    return (
      <div className={`${containerClass} w-full overflow-hidden`}>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey={xKey} stroke="#a1a1aa" />
            <YAxis stroke="#a1a1aa" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#18181b', 
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: '#fff'
              }}
            />
            <Line type="monotone" dataKey={yKey} stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return null;
};

export default ChartVisualizer;