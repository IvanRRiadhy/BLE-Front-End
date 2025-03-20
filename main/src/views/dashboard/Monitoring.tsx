// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React from 'react';
import { Box, Grid2 as Grid } from '@mui/material';
import PageContainer from 'src/components/container/PageContainer';

import WeeklyStats from 'src/components/dashboards/mainmenu/WeeklyStats';
import YearlySales from 'src/components/dashboards/monitoring/YearlySales';
import PaymentGateways from 'src/components/dashboards/monitoring/PaymentGateways';
import WelcomeCard from 'src/components/dashboards/monitoring/WelcomeCard';
import Expence from 'src/components/dashboards/monitoring/Expence';
import Growth from 'src/components/dashboards/monitoring/Growth';
import RevenueUpdates from 'src/components/dashboards/monitoring/RevenueUpdates';
import SalesOverview from 'src/components/dashboards/monitoring/SalesOverview';
import SalesTwo from 'src/components/dashboards/monitoring/SalesTwo';
import Sales from 'src/components/dashboards/monitoring/Sales';
import MonthlyEarnings from 'src/components/dashboards/monitoring/MonthlyEarnings';
import ProductPerformances from 'src/components/dashboards/monitoring/ProductPerformances';
import RecentTransactions from 'src/components/dashboards/monitoring/RecentTransactions';

const Ecommerce = () => {
  return (
    <PageContainer title="Monitoring Dashboard" description="this is Monitoring Dashboard page">
      <Box mt={3}>
        <Grid container spacing={3}>
          {/* column */}
          <Grid
            size={{
              xs: 12,
              lg: 8,
            }}
          >
            <WelcomeCard />
          </Grid>

          {/* column */}
          <Grid
            size={{
              xs: 12,
              lg: 4,
            }}
          >
            <Grid container spacing={3}>
              <Grid
                size={{
                  xs: 12,
                  sm: 6,
                }}
              >
                <Expence />
              </Grid>
              <Grid
                size={{
                  xs: 12,
                  sm: 6,
                }}
              >
                <Sales />
              </Grid>
            </Grid>
          </Grid>
          <Grid
            size={{
              xs: 12,
              sm: 6,
              lg: 4,
            }}
          >
            <RevenueUpdates />
          </Grid>
          <Grid
            size={{
              xs: 12,
              sm: 6,
              lg: 4,
            }}
          >
            <SalesOverview />
          </Grid>
          <Grid
            size={{
              xs: 12,
              sm: 6,
              lg: 4,
            }}
          >
            <Grid container spacing={3}>
              <Grid
                size={{
                  xs: 12,
                  sm: 6,
                }}
              >
                <SalesTwo />
              </Grid>
              <Grid
                size={{
                  xs: 12,
                  sm: 6,
                }}
              >
                <Growth />
              </Grid>
              <Grid size={12}>
                <MonthlyEarnings />
              </Grid>
            </Grid>
          </Grid>
          {/* column */}
          <Grid
            size={{
              xs: 12,
              sm: 6,
              lg: 4,
            }}
          >
            <WeeklyStats />
          </Grid>
          {/* column */}
          <Grid
            size={{
              xs: 12,
              lg: 4,
            }}
          >
            <YearlySales />
          </Grid>
          {/* column */}
          <Grid
            size={{
              xs: 12,
              lg: 4,
            }}
          >
            <PaymentGateways />
          </Grid>
          {/* column */}

          <Grid
            size={{
              xs: 12,
              lg: 4,
            }}
          >
            <RecentTransactions />
          </Grid>
          {/* column */}

          <Grid
            size={{
              xs: 12,
              lg: 8,
            }}
          >
            <ProductPerformances />
          </Grid>
        </Grid>
      </Box>
    </PageContainer>
  );
};

export default Ecommerce;
