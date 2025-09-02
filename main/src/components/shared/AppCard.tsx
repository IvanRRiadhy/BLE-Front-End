// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';

import { Card } from '@mui/material';
import { useSelector } from 'src/store/Store';
import { RootState } from 'src/store/Store';

type Props = {
  children: any | any[];
};

const AppCard = ({ children }: Props) => {
  const customizer = useSelector((state: RootState) => state.customizer);

  return (
    <Card
      sx={{ display: 'flex', p: 0 }}
      elevation={customizer.isCardShadow ? 9 : 0}
      variant={!customizer.isCardShadow ? 'outlined' : undefined}
    >
      {children}
    </Card>
  );
};

export default AppCard;
