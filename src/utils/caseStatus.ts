import { ChipProps } from '@mui/material';

export const caseStatusColorMap: Record<
  string,
  ChipProps['color']
> = {
  Open: 'warning',
  Close: 'success',
  Submitted: 'info',
  Approved: 'success',
  Rejected: 'error',
};
export const getCaseStatusColor = (status?: string): ChipProps['color'] => {
  if (!status) return 'default';
  return caseStatusColorMap[status] ?? 'default';
};
