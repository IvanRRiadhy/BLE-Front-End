import { Button, CircularProgress, Tooltip } from "@mui/material";
import { IconPlus } from "@tabler/icons-react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router";
import { CreateNewBoundaryAlarm } from "src/store/apps/alarmsetting/boundary";
import { AppDispatch,  useDispatch } from "src/store/Store";


export const AddBoundary = () => {
    const dispatch: AppDispatch = useDispatch();
    const navigate = useNavigate();
    const isLoading = useSelector((state: any) => state.BoundaryReducer.isLoading);
      const handleAddBoundary = () => {
    dispatch(CreateNewBoundaryAlarm());
    navigate('/alarmsetting/boundary/edit');
  }

  return (
    <Tooltip title="Add Boundary Alarm">
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
              onClick={handleAddBoundary}
            >
              <IconPlus size={20} />
            </Button>
          )}
        </Tooltip>
  );
};