import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import FullCalendar from '@fullcalendar/react';
import CalendarApi from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useMemo, useRef, useState } from 'react';
import { TimeGroupType } from 'src/store/apps/crud/timeGroup';

interface Props {
  open: boolean;
  onClose: () => void;
  startDate: string;
  endDate: string;
  timeGroups: TimeGroupType[];
}

const WEEKDAY_MAP: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

type NormalizedBlock = {
  dayOfWeek: string;
  startTime: string; // HH:mm:ss
  endTime: string; // HH:mm:ss
  title: string;
  description: string;
};

function normalizeTimeBlocks(timeGroups: TimeGroupType[]): NormalizedBlock[] {
  const map = new Map<string, NormalizedBlock>();

  for (const group of timeGroups) {
    for (const block of group.timeBlocks ?? []) {
      const key = `${block.dayOfWeek}|${block.startTime}|${block.endTime}`;

      if (!map.has(key)) {
        map.set(key, {
          dayOfWeek: block.dayOfWeek,
          startTime: block.startTime,
          endTime: block.endTime,
          title: group.name, 
          description: group.description,
        });
      }
    }
  }

  return Array.from(map.values());
}

function buildCalendarEvents(timeGroups: TimeGroupType[], startDate: string, endDate: string) {
  const blocks = normalizeTimeBlocks(timeGroups);

  return blocks.map((block) => ({
    id: `${block.dayOfWeek}-${block.startTime}-${block.endTime}`,
    title: block.title,
    description: block.description,
    daysOfWeek: [WEEKDAY_MAP[block.dayOfWeek]],
    startTime: block.startTime, // "HH:mm:ss"
    endTime: block.endTime,
    startRecur: startDate,
    endRecur: endDate,
    display: 'block',
    backgroundColor: '#e53935',
    borderColor: '#e53935',
  }));
}

const PatrolScheduleCalendarDialog = ({ open, onClose, startDate, endDate, timeGroups }: Props) => {
  const calendarRef = useRef<FullCalendar | null>(null);

  const [view, setView] = useState<'dayGridMonth' | 'timeGridWeek' | 'timeGridDay'>('dayGridMonth');

  const events = useMemo(
    () => buildCalendarEvents(timeGroups, startDate, endDate),
    [timeGroups, startDate, endDate],
  );

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle>
        Schedule
        <Box mt={1}>
          <ToggleButtonGroup
            size="small"
            value={view}
            exclusive
            onChange={(_, nextView) => {
              if (!nextView) return;

              setView(nextView);

              const api = calendarRef.current?.getApi();
              api?.changeView(nextView);
            }}
          >
            <ToggleButton value="dayGridMonth">Month</ToggleButton>
            <ToggleButton value="timeGridWeek">Week</ToggleButton>
            <ToggleButton value="timeGridDay">Day</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </DialogTitle>

      <DialogContent>
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView={view}
          headerToolbar={false}
          height="70vh"
          events={events}
          validRange={{
            start: startDate,
            end: endDate,
          }}
          nowIndicator
          editable={false}
          selectable={false}
          eventStartEditable={false}
          eventDurationEditable={false}
          dayMaxEvents
          allDaySlot={false}
          slotMinTime="00:00:00"
          slotMaxTime="24:00:00"
        />
      </DialogContent>
    </Dialog>
  );
};

export default PatrolScheduleCalendarDialog;
