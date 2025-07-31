import { Card, CardContent, Typography, Stack, TextField, Button } from "@mui/material";
import { useState } from "react";
import dayjs, { Dayjs } from "dayjs";

type Props = {
  invitations: {
    time: string;
  }[];
  title?: string;
};

const VisitCounterCard = ({ invitations, title = "Remaining Invitations" }: Props) => {
  const [startDate, setStartDate] = useState<Dayjs | null>(null);
  const [endDate, setEndDate] = useState<Dayjs | null>(null);

  const filteredInvites = invitations.filter((inv) => {
    const inviteTime = dayjs(inv.time);
    if (startDate && inviteTime.isBefore(startDate, 'minute')) return false;
    if (endDate && inviteTime.isAfter(endDate, 'minute')) return false;
    return true;
  });

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>{title}</Typography>
        <Stack spacing={2}>
          <Typography variant="h3">{filteredInvites.length}</Typography>
          <Stack direction="row" spacing={2}>
            <TextField
              type="datetime-local"
              label="Start"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={startDate ? startDate.format("YYYY-MM-DDTHH:mm") : ""}
              onChange={(e) => setStartDate(dayjs(e.target.value))}
            />
            <TextField
              type="datetime-local"
              label="End"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={endDate ? endDate.format("YYYY-MM-DDTHH:mm") : ""}
              onChange={(e) => setEndDate(dayjs(e.target.value))}
            />
          </Stack>
          <Button
            variant="outlined"
            onClick={() => {
              setStartDate(null);
              setEndDate(null);
            }}
          >
            Clear Filter
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default VisitCounterCard;
