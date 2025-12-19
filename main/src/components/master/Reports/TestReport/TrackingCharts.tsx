import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Label,
  Legend,
} from 'recharts';

export const TrackingCharts = ({ trackingLogs }: { trackingLogs: any[] }) => {
  // 🧩 1. Logs per Visitor
  const visitorCount = useMemo(() => {
    const map: Record<string, number> = {};
    trackingLogs.forEach((t) => {
      map[t.VisitorName] = (map[t.VisitorName] || 0) + 1;
    });
    return Object.entries(map).map(([name, count]) => ({ name, count }));
  }, [trackingLogs]);

  // 🧩 2. Logs per Area
  const areaCount = useMemo(() => {
    const map: Record<string, number> = {};
    trackingLogs.forEach((t) => {
      map[t.AreaName] = (map[t.AreaName] || 0) + 1;
    });
    return Object.entries(map).map(([name, count]) => ({ name, count }));
  }, [trackingLogs]);

  // 🧩 3. Average visit time per Area (minutes)
  const avgVisit = useMemo(() => {
    const map: Record<string, number[]> = {};
    trackingLogs.forEach((t) => {
      const start = new Date(t.EnterTime).getTime();
      const end = new Date(t.ExitTime).getTime();
      const minutes = t.DurationInMinutes;
      if (!map[t.AreaName]) map[t.AreaName] = [];
      map[t.AreaName].push(minutes);
    });
    return Object.entries(map).map(([name, arr]) => ({
      name,
      avg: arr.reduce((a, b) => a + b, 0) / arr.length,
    }));
  }, [trackingLogs]);

  // 🧩 6. Block count per Visitor
  const blockCount = useMemo(() => {
    const map: Record<string, number> = {};
    trackingLogs
      .filter((t) => t.VisitorStatus === 'Block')
      .forEach((t) => {
        map[t.VisitorName] = (map[t.VisitorName] || 0) + 1;
      });
    return Object.entries(map).map(([name, count]) => ({ name, count }));
  }, [trackingLogs]);

  return (
    <>
      <ChartContainer id="chart-tracking-1" title='Tracking Logs by Visitor'>
        <ResponsiveContainer>
          <BarChart data={visitorCount}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name">
              <Label value="Visitor" offset={-5} position="insideBottom" />
            </XAxis>
            <YAxis>
              <Label value="Total Logs" angle={-90} position="insideLeft" />
            </YAxis>
            <Tooltip />
            <Legend verticalAlign="bottom" height={20} />
            <Bar dataKey="count" fill="#82ca9d" name="Log Count" radius={[5, 5, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>

      <ChartContainer id="chart-tracking-2" title='Tracking Logs by Area'>
        <ResponsiveContainer>
          <BarChart data={areaCount}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name">
              <Label value="Area" offset={-5} position="insideBottom" />
            </XAxis>
            <YAxis>
              <Label value="Total Logs" angle={-90} position="insideLeft" />
            </YAxis>
            <Tooltip />
            <Legend verticalAlign="bottom" height={20} />
            <Bar dataKey="count" fill="#4ac4e9ff" name="Log Count" radius={[5, 5, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>

      <ChartContainer id="chart-tracking-3" title ="Average Visit Time by Area">
        <ResponsiveContainer>
          <BarChart data={avgVisit}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name">
              <Label value="Area" offset={-5} position="insideBottom" />
            </XAxis>
            <YAxis>
              <Label value="Avg. Time (min)" angle={-90} position="insideLeft" />
            </YAxis>
            <Tooltip />
            <Legend verticalAlign="bottom" height={20} />
            <Bar dataKey="avg" fill="#ffc658" name="Log Avg. Time" radius={[5, 5, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>

      <ChartContainer id="chart-tracking-6" title="Tracking Logs by Blocked Visitor">
        <ResponsiveContainer>
          <BarChart data={blockCount}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name">
              <Label value="Visitor" offset={-5} position="insideBottom" />
            </XAxis>
            <YAxis>
              <Label value="Total Logs" angle={-90} position="insideLeft" />
            </YAxis>
            <Tooltip />
            <Legend verticalAlign="bottom" height={20} />
            <Bar dataKey="count" fill="#d32f2f" name="Log Count" radius={[5, 5, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </>
  );
};


export const ChartContainer: React.FC<{ id: string; title: string; children: React.ReactNode }> = ({
  id,
  title,
  children,
}) => (
  <div
    id={id}
    style={{
      width: 600,
      height: 340,
      marginBottom: 30,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}
  >
    <div
      style={{
        fontWeight: 700,
        fontSize: 16,
        marginBottom: 6,
        color: '#222',
        textAlign: 'center',
      }}
    >
      {title}
    </div>
    {children}
  </div>
);
