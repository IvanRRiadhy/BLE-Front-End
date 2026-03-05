import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  IconButton,
  GlobalStyles,
} from '@mui/material';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { EventClickArg } from '@fullcalendar/core';
import { useEffect, useMemo, useRef, useState } from 'react';
import { TimeGroupType } from 'src/store/apps/crud/timeGroup';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';

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
  const today = new Date();

  const [view, setView] = useState<'dayGridMonth' | 'timeGridWeek' | 'timeGridDay'>('dayGridMonth');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const isMonthView = view === 'dayGridMonth';

  const events = useMemo(
    () => buildCalendarEvents(timeGroups, startDate, endDate),
    [timeGroups, startDate, endDate],
  );
  const [selectedEvent, setSelectedEvent] = useState<{
    title: string;
    description?: string;
    time?: string;
    endTime?: string;
  } | null>(null);
  const handleEventClick = (arg: EventClickArg) => {
    setSelectedEvent({
      title: arg.event.title,
      description: arg.event.extendedProps.description,
      time: arg.event.start
        ? arg.event.start.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          })
        : undefined,
      endTime: arg.event.end
        ? arg.event.end.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          })
        : undefined,
    });
  };

  useEffect(() => {
    if (open) {
      calendarRef.current?.getApi().gotoDate(startDate);
    }
  }, [open, startDate]);

  function startOfMonth(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  function endOfMonth(date: Date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
  }
  function startOfWeek(date: Date) {
    const d = new Date(date);
    const day = d.getDay(); // Sunday = 0
    d.setDate(d.getDate() - day);
    return d;
  }

  function endOfWeek(date: Date) {
    const d = startOfWeek(date);
    d.setDate(d.getDate() + 6);
    return d;
  }

  const rangeStart = new Date(startDate);
  const rangeEnd = new Date(endDate);

  let canGoPrev = false;
  let canGoNext = false;

  if (view === 'dayGridMonth') {
    canGoPrev = startOfMonth(currentDate) > startOfMonth(rangeStart);
    canGoNext = endOfMonth(currentDate) < endOfMonth(rangeEnd);
  }

  if (view === 'timeGridWeek') {
    canGoPrev = startOfWeek(currentDate) > startOfWeek(rangeStart);
    canGoNext = endOfWeek(currentDate) < endOfWeek(rangeEnd);
  }

  if (view === 'timeGridDay') {
    const prevDay = new Date(currentDate);
    prevDay.setDate(prevDay.getDate() - 1);

    const nextDay = new Date(currentDate);
    nextDay.setDate(nextDay.getDate() + 1);

    canGoPrev = prevDay >= rangeStart;
    canGoNext = nextDay <= rangeEnd;
  }

  return (
    <>
      <GlobalStyles
        styles={{
          /* Remove horizontal scrollbar from timegrid header */
          '.fc .fc-timegrid-header': {
            overflow: 'hidden !important',
          },

          '.fc .fc-timegrid-header .fc-scroller-harness': {
            overflow: 'hidden !important',
          },

          '.fc .fc-timegrid-header .fc-scroller': {
            overflow: 'hidden !important',
            scroll: false,
          },
          '.element.style': {
            overflow: 'hidden !important',
            scroll: false,
          },
        }}
      />
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
        <DialogTitle>
          Schedule
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            flexWrap="wrap"
            mt={2}
            gap={1}
          >
            {/* LEFT: View selector */}
            <ToggleButtonGroup
              size="small"
              value={view}
              exclusive
              onChange={(_, nextView) => {
                if (!nextView) return;

                setView(nextView);

                const api = calendarRef.current?.getApi();
                if (!api) return;

                // Always reset anchor to TODAY when switching view
                api.gotoDate(today);
                api.changeView(nextView);
              }}
            >
              <ToggleButton value="dayGridMonth">Month</ToggleButton>
              <ToggleButton value="timeGridWeek">Week</ToggleButton>
              <ToggleButton value="timeGridDay">Day</ToggleButton>
            </ToggleButtonGroup>

            {/* RIGHT: Navigation chevrons */}
            <Box display="flex" alignItems="center" gap={0.5}>
              <IconButton
                size="small"
                disabled={!canGoPrev}
                onClick={() => calendarRef.current?.getApi().prev()}
              >
                <IconChevronLeft size={20} />
              </IconButton>

              <IconButton
                size="small"
                disabled={!canGoNext}
                onClick={() => calendarRef.current?.getApi().next()}
              >
                <IconChevronRight size={20} />
              </IconButton>
            </Box>
          </Box>
        </DialogTitle>

        <DialogContent>
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={false}
            // height="70vh"
            height="auto"
            contentHeight={600} // tweak for mobile
            expandRows
            events={events}
            eventClick={handleEventClick}
            dayHeaderContent={(arg) => (
              <Box
                sx={{
                  height: 30, // 👈 KEY: taller than default
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 600,
                }}
              >
                {arg.text}
              </Box>
            )}
            validRange={{
              start: startDate,
              end: endDate,
            }}
            nowIndicator
            slotLabelFormat={{
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            }}
            eventTimeFormat={{
              hour: '2-digit',
              minute: '2-digit',
              hour12: false,
            }}
            // dayGridEventMinHeight={24}
            eventContent={(arg) => (
              <div style={{ whiteSpace: 'normal', lineHeight: '1.2em' }}>
                <strong>{arg.timeText}</strong> {arg.event.title}
              </div>
            )}
            datesSet={(arg) => {
              setCurrentDate((prev) => {
                const prevTime = prev.getTime();
                const nextTime = arg.start.getTime();

                return prevTime === nextTime ? prev : arg.start;
              });
            }}
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
      <Dialog open={!!selectedEvent} onClose={() => setSelectedEvent(null)} fullWidth maxWidth="xs">
        <DialogTitle>{selectedEvent?.title}</DialogTitle>

        <DialogContent>
          {selectedEvent?.time && (
            <Box mb={1}>
              <Typography variant="body2" color="text.secondary">
                Time
              </Typography>
              <Typography fontWeight={600}>
                {selectedEvent.time} - {selectedEvent.endTime}
              </Typography>
            </Box>
          )}

          <Typography variant="body2" color="text.secondary">
            Description
          </Typography>

          <Typography>{selectedEvent?.description || 'No description'}</Typography>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PatrolScheduleCalendarDialog;
