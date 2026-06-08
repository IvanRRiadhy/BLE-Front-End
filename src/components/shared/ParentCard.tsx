// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import { useTheme } from '@mui/material/styles';
import { Card, CardHeader, CardContent, Divider, Box } from '@mui/material';
import { useSelector } from 'src/store/Store';
import { RootState } from 'src/store/Store';

type Props = {
  title: string;
  footer?: string | React.ReactNode;
  codeModel?: React.ReactNode | React.ReactNode[];
  children: React.ReactNode;
};

const ParentCard = ({ title, children, footer, codeModel }: Props) => {
  const customizer = useSelector((state: RootState) => state.customizer);
  const theme = useTheme();
  const borderColor = theme.palette.divider;

  return (
    <Card
      sx={{ padding: 0, border: !customizer.isCardShadow ? `1px solid ${borderColor}` : 'none' }}
      elevation={customizer.isCardShadow ? 9 : 0}
      variant={!customizer.isCardShadow ? 'outlined' : undefined}
    >
      <CardHeader
        title={title}
        // ✅ Wrap actions in a right-aligned inline-flex box
        action={
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 1.5,
              flexWrap: 'wrap', // allows wrapping on smaller screens
            }}
          >
            {Array.isArray(codeModel)
              ? codeModel.map((item, idx) => (
                  <Box key={idx} sx={{ display: 'inline-flex', alignItems: 'center' }}>
                    {item}
                  </Box>
                ))
              : codeModel}
          </Box>
        }
        sx={{
          px: 3,
          py: 2,
          '& .MuiCardHeader-action': {
            alignSelf: 'center',
            marginTop: 0,
          },
        }}
      />

      <Divider />

      <CardContent>{children}</CardContent>

      {footer && (
        <>
          <Divider />
          <Box p={3}>{footer}</Box>
        </>
      )}
    </Card>
  );
};

export default ParentCard;
