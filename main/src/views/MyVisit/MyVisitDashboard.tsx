import { Box, Grid2 as Grid, Typography } from "@mui/material"
import PageContainer from "src/components/container/PageContainer"


const MyVisitDashboard = () => {
    
    return (
        <PageContainer title="Dashboard" description="this is dashboard page">
            <Box>
                <Grid container spacing={3} mb={3}>
                    <Grid
                    size={{
                        xs: 12,
                        lg:12,
                    }}
                    >
                        <Typography variant="h4">My Visit</Typography>
                    </Grid>
                    
                </Grid>
            </Box>
        </PageContainer>
    )
}

export default MyVisitDashboard