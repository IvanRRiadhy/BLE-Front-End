import React from 'react';
import { Box, Typography, Button, TextField, CircularProgress } from '@mui/material';
import { memberType } from 'src/store/apps/crud/member';
import { actionStatus } from 'src/types/crud/input';
import CustomAutocomplete from 'src/components/shared/CustomAutocomplete';

interface AlarmActionFormProps {
  alarmTrigger: {
    id?: string;
    isActive?: boolean;
  };

  selectedAction: string;
  setSelectedAction: (v: string) => void;

  investigateResult: string;
  setInvestigateResult: (v: string) => void;

  selectedSecurity: memberType | null;
  setSelectedSecurity: (v: memberType | null) => void;

  securityData: memberType[];
  isLoadingSecurity: boolean;

  compact?: boolean; // mini vs full
}

const AlarmActionForm: React.FC<AlarmActionFormProps> = ({
  alarmTrigger,
  selectedAction,
  setSelectedAction,
  investigateResult,
  setInvestigateResult,
  selectedSecurity,
  setSelectedSecurity,
  securityData,
  isLoadingSecurity,
  compact = false,
}) => {
  const isActive = alarmTrigger?.isActive !== false;

  if (!isActive) {
    return (
      <Box
        sx={{
          border: '1px dashed',
          borderColor: 'error.main',
          borderRadius: 2,
          p: 2,
          backgroundColor: 'rgba(255,0,0,0.05)',
        }}
      >
        <Typography fontWeight={600} color="error">
          Alarm is no longer active
        </Typography>
        <Typography variant="body2" color="text.secondary">
          You cannot apply any new actions to an inactive alarm.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* ================= ACTION STATUS ================= */}
      <Typography variant={compact ? 'subtitle2' : 'subtitle1'} color="text.secondary" mb={1}>
        Select Action Status
      </Typography>

      <Box display="flex" flexWrap="wrap" gap={1}>
        {actionStatus
          .filter((item) => !item.disabled)
          .map((item) => {
            const isSelected = selectedAction.toLowerCase() === item.value.toLowerCase();

            return (
              <Button
                key={item.value}
                size={compact ? 'small' : 'medium'}
                variant={isSelected ? 'contained' : 'outlined'}
                onClick={() => setSelectedAction(item.value)}
                sx={{
                  borderRadius: 20,
                  textTransform: 'none',
                  transition: 'all 0.15s ease-in-out',
                }}
              >
                {item.label}
              </Button>
            );
          })}
      </Box>

      {/* ================= DONE → INVESTIGATE RESULT ================= */}
      {selectedAction.toLowerCase() === 'done' && (
        <Box mt={2}>
          <Typography variant={compact ? 'subtitle2' : 'subtitle1'} color="text.secondary" mb={1}>
            Investigation Result
          </Typography>

          <TextField
            fullWidth
            multiline
            rows={compact ? 2 : 4}
            placeholder="Describe the investigation result..."
            value={investigateResult}
            onChange={(e) => setInvestigateResult(e.target.value)}
          />
        </Box>
      )}

      {/* ================= INVESTIGATED → SECURITY GUARD ================= */}
      {selectedAction.toLowerCase() === 'dispatch' && (
        <Box mt={2}>
          <Typography variant={compact ? 'subtitle2' : 'subtitle1'} color="text.secondary" mb={1}>
            Assign Security Guard
          </Typography>

          <CustomAutocomplete
            label="Security Guard"
            options={securityData}
            value={selectedSecurity}
            loading={isLoadingSecurity}
            onChange={(newValue) => setSelectedSecurity(newValue)}
            getOptionLabel={(option) => option?.name ?? ''}
            isOptionEqualToValue={(o, v) => o.id === v.id}
            required
            sx={{
              '& .MuiInputBase-root': {
                minHeight: compact ? 36 : 56,
                fontSize: compact ? '0.85rem' : '1rem',
              },
            }}
          />
        </Box>
      )}
    </Box>
  );
};

export default AlarmActionForm;
