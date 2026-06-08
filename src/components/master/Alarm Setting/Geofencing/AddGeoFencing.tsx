import { Button, CircularProgress, Tooltip } from "@mui/material";
import { IconPlus } from "@tabler/icons-react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router";
import { CreateNewGeoFencingAlarm } from "src/store/apps/alarmsetting/geofencing";
import { AppDispatch,  useDispatch } from "src/store/Store";


export const AddGeoFencing = () => {
    const dispatch: AppDispatch = useDispatch();
    const navigate = useNavigate();
    const isLoading = useSelector((state: any) => state.GeoFencingReducer.isLoading);
      const handleAddGeoFence = () => {
    dispatch(CreateNewGeoFencingAlarm());
    navigate('/alarmsetting/geofencing/edit');
  }

  return (
    <Tooltip title="Add GeoFence Alarm">
          {isLoading ? (
            <Button
              variant="contained"
              color="primary"
              sx={{ p: 0.5, minWidth: 40, minHeight: 40 }}
            >
              <CircularProgress color='inherit' size={20} />
            </Button>
          ) : (
            <Button
              variant="contained"
              color="primary"
              sx={{ p: 0.5, minWidth: 40, minHeight: 40 }}
              onClick={handleAddGeoFence}
            >
              <IconPlus size={20} />
            </Button>
          )}
        </Tooltip>
  );
};