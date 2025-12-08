import { Box, Typography, Grid2 as Grid, Avatar } from "@mui/material";
import { useSelector } from "react-redux";
import { RootState } from "src/store/Store";

const NewestTrack = () => {
  const beaconsByTopic = useSelector(
    (state: RootState) => state.BeaconReducer.beaconsByTopic
  );

  // Ambil semua topic tracking/*
  const trackingTopics = Object.keys(beaconsByTopic).filter((x) =>
    x.startsWith("tracking/")
  );

  // Gabungkan semua beacon
  let allBeacons: any[] = [];
  trackingTopics.forEach((topic) => {
    allBeacons = [...allBeacons, ...beaconsByTopic[topic]];
  });

  // Urutkan berdasarkan waktu (newest first)
  allBeacons.sort(
    (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
  );

  return (
    <Box sx={{ width: "100%", height: "100%", overflowY: "auto", p: 2 }}>
      {allBeacons.map((beacon, idx) => {
        const isVisitor = !!beacon.visitorCardId;
        const isMember = !!beacon.memberCardId;

        const cardName =
          beacon.visitorCardName ||
          beacon.memberCardName ||
          beacon.cardName ||
          "Unknown";

        return (
          <Box
            key={idx}
            sx={{
              p: 2,
              mb: 2,
              borderRadius: "8px",
              border: "1px solid #ddd",
              background: "#f9f9f9",
            }}
          >
            <Grid container spacing={2}>
              {/* FOTO */}
              <Grid size={2}>
                <Avatar
                  src="/dummy-avatar.jpg"
                  sx={{ width: 70, height: 70 }}
                />
              </Grid>

              {/* INFO */}
              <Grid size={10}>
                <Typography fontWeight={600}>
                  Card Number: {beacon.cardNumber || "-"}
                </Typography>
                <Typography>Name: {cardName}</Typography>

                <Typography>
                  Area: {beacon.maskedAreaName ?? "Unknown Area"}
                </Typography>

                <Typography>
                  Type: {isVisitor ? "Visitor" : isMember ? "Member" : "Unknown"}
                </Typography>

                <Typography>
                  Time: {new Date(beacon.time).toLocaleString()}
                </Typography>
              </Grid>
            </Grid>
          </Box>
        );
      })}
    </Box>
  );
};

export default NewestTrack;
