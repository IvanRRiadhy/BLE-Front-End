'use client';

import { styled } from '@mui/material/styles';
import { Typography } from '@mui/material';

interface CustomFormLabelProps {
  htmlFor?: string;
  error?: boolean;
  children?: React.ReactNode;
}

const CustomFormLabel = styled(
  ({ error, htmlFor, children, ...rest }: CustomFormLabelProps) => (
    <Typography
      variant="subtitle1"
      fontWeight={600}
      component="label"
      htmlFor={htmlFor}
      color={error ? 'error.main' : 'text.primary'}
      {...rest}
    >
      {children}
    </Typography>
  )
)(() => ({
  marginBottom: '5px',
  marginTop: '25px',
  display: 'block',
}));

export default CustomFormLabel;
