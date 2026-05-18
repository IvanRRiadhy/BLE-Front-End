import { Card } from '@mui/material';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import { useTheme } from '@mui/material/styles';
import { RootState, useSelector } from 'src/store/Store';

type Props = {
  className?: string;
  children: any | any[];
  sx?: any;
};

const BlankCard = ({ children, className, sx }: Props) => {
  const customizer = useSelector((state: RootState) => state.customizer);
  const settings = useSelector((state: RootState) => state.settings);

  const theme = useTheme();
  const borderColor = theme.palette.divider;

  return (
    <Card
      sx={{
        p: 0,
        border: !settings.isCardShadow ? `1px solid ${borderColor}` : 'none',
        position: 'relative',
        ...sx,
      }}
      className={className}
      elevation={settings.isCardShadow ? 9 : 0}
      variant={!settings.isCardShadow ? 'outlined' : undefined}
    >
      {children}
    </Card>
  );
};

export default BlankCard;
