import React from 'react';
import { useTheme } from '@mui/material/styles';
import { Card, CardContent, Typography, Stack, Box } from '@mui/material';
import { useSelector } from 'src/store/Store';
import { RootState } from 'src/store/Store';

interface DashboardCardProps {
  /** Main title or header — supports string or JSX */
  title?: React.ReactNode;
  /** Optional subtitle below title — supports string or JSX */
  subtitle?: React.ReactNode;
  /** Right-aligned action element (e.g. switch, tabs, buttons) */
  action?: React.ReactNode;
  /** Optional footer content (below the card body) */
  footer?: React.ReactNode;
  /** Whether to show alternate heading layout */
  cardheading?: boolean;
  /** Title used in alternate heading layout */
  headtitle?: React.ReactNode;
  /** Subtitle used in alternate heading layout */
  headsubtitle?: React.ReactNode;
  /** Card body content */
  children?: React.ReactNode;
  /** Optional content between main body and footer */
  middlecontent?: React.ReactNode;
}

/**
 * 🧭 DashboardCard — Flexible base card for dashboard widgets.
 * Supports titles, subtitles, actions (switch/tabs/buttons), and optional footer.
 */
const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  subtitle,
  action,
  footer,
  cardheading = false,
  headtitle,
  headsubtitle,
  children,
  middlecontent,
}) => {
  const customizer = useSelector((state: RootState) => state.customizer);
  const theme = useTheme();
  const borderColor = theme.palette.divider;

  const hasHeader = Boolean(title || subtitle || action);

  return (
    <Card
      sx={{
        p: 0,
        border: !customizer.isCardShadow ? `1px solid ${borderColor}` : 'none',
      }}
      elevation={customizer.isCardShadow ? 9 : 0}
      variant={!customizer.isCardShadow ? 'outlined' : undefined}
    >
      {/* ===== Alternate Heading Layout ===== */}
      {cardheading ? (
        <CardContent>
          {headtitle && (
            <Typography variant="h5" fontWeight={600}>
              {headtitle}
            </Typography>
          )}
          {headsubtitle && (
            <Typography variant="subtitle2" color="textSecondary">
              {headsubtitle}
            </Typography>
          )}
        </CardContent>
      ) : (
        /* ===== Standard Layout ===== */
        <CardContent sx={{ p: 2.5 }}>
          {hasHeader && (
            <Stack
              direction="row"
              spacing={1}
              justifyContent="space-between"
              alignItems="center"
              mb={2}
            >
              <Box>
                {title && (
                  <Typography
                    variant={typeof title === 'string' ? 'h5' : undefined}
                    fontWeight={600}
                  >
                    {title}
                  </Typography>
                )}
                {subtitle && (
                  <Typography variant="subtitle2" color="textSecondary">
                    {subtitle}
                  </Typography>
                )}
              </Box>
              {action && <Box>{action}</Box>}
            </Stack>
          )}

          {/* ===== Card Body ===== */}
          {children}
        </CardContent>
      )}

      {/* ===== Middle Section ===== */}
      {middlecontent && <Box px={2.5}>{middlecontent}</Box>}

      {/* ===== Footer Section ===== */}
      {footer && <Box px={2.5} pb={2.5}>{footer}</Box>}
    </Card>
  );
};

export default DashboardCard;
