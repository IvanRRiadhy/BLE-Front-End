import { Button, CircularProgress, Tooltip } from "@mui/material";
import { IconPlus } from "@tabler/icons-react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router";
import { CreateNewStayOnAreaAlarm } from "src/store/apps/alarmsetting/stayonarea";
import { AppDispatch,  useDispatch } from "src/store/Store";


export const AddStayOnArea = () => {
    const dispatch: AppDispatch = useDispatch();
    const navigate = useNavigate();
    const isLoading = useSelector((state: any) => state.StayOnAreaReducer.isLoading);
      const handleAddStayOnArea = () => {
    dispatch(CreateNewStayOnAreaAlarm());
    navigate('/alarmsetting/stayonarea/edit');
  }

  return (
    <Tooltip title="Add Stay On Area Alarm">
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
              onClick={handleAddStayOnArea}
            >
              <IconPlus size={20} />
            </Button>
          )}
        </Tooltip>
  );
};