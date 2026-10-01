// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';

import { Card, CardHeader, CardContent, Divider } from '@mui/material';
import { useSelector } from 'src/store/Store';
import { RootState } from 'src/store/Store';

type Props = {
  title: string;
  children: any | any[];
};

const BaseCard = ({ title, children }: Props) => {
  const settings = useSelector((state: RootState) => state.settings);

  return (
    <Card
      sx={{ padding: 0 }}
      elevation={settings.isCardShadow ? 9 : 0}
      variant={!settings.isCardShadow ? 'outlined' : undefined}
    >
      <CardHeader title={title} />
      <Divider />
      <CardContent>{children}</CardContent>
    </Card>
  );
};

export default BaseCard;
