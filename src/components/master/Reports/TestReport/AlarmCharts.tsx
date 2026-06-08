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
import { ChartContainer } from './TrackingCharts';

export const AlarmCharts = ({ alarmLogs }: { alarmLogs: any[] }) => {
  const countBy = (key: string) => {
    const map: Record<string, number> = {};
    alarmLogs.forEach((a) => {
      map[a[key]] = (map[a[key]] || 0) + 1;
    });
    return Object.entries(map).map(([name, count]) => ({ name, count }));
  };

  const visitorCount = useMemo(() => countBy('VisitorName'), [alarmLogs]);
  const areaCount = useMemo(() => countBy('AreaName'), [alarmLogs]);
  const categoryCount = useMemo(() => countBy('AlarmCategory'), [alarmLogs]);

  const avgDuration = useMemo(() => {
    const map: Record<string, number[]> = {};
    alarmLogs.forEach((a) => {
      const start = new Date(a.AlarmTriggered).getTime();
      const end = new Date(a.AlarmDone).getTime();
      const minutes = (end - start) / 60000;
      if (!map[a.AlarmCategory]) map[a.AlarmCategory] = [];
      map[a.AlarmCategory].push(minutes);
    });
    return Object.entries(map).map(([name, arr]) => ({
      name,
      avg: arr.reduce((a, b) => a + b, 0) / arr.length,
    }));
  }, [alarmLogs]);

  return (
    <>
      <ChartContainer id="chart-alarm-1" title="Alarm Logs by Visitor">
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
            <Bar dataKey="count" fill="#8884d8" name="Log Count" radius={[5, 5, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>

      <ChartContainer id="chart-alarm-2" title='Alarm Logs by Area'>
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
            <Bar dataKey="count" fill="#82ca9d" name="Log Count" radius={[5, 5, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>

      <ChartContainer id="chart-alarm-4" title="Average Duration by Alarm Category">
        <ResponsiveContainer>
          <BarChart data={avgDuration}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name">
              <Label value="Alarm Category" offset={-5} position="insideBottom" />
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

      <ChartContainer id="chart-alarm-5" title="Alarm Logs by Category">
        <ResponsiveContainer>
          <BarChart data={categoryCount}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name">
              <Label value="Category" offset={-5} position="insideBottom" />
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
export default AlarmCharts;
