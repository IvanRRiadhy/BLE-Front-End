import {
  Box,
  Button,
  Checkbox,
  Drawer,
  Grid2 as Grid,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Typography,
} from '@mui/material';
import { AppDispatch, RootState, useDispatch, useSelector } from 'src/store/Store';
import { IconAdjustmentsHorizontal } from '@tabler/icons-react';
import { isEqual } from 'lodash';
import { useEffect, useState } from 'react';
import CustomFormLabel from 'src/components/forms/theme-elements/CustomFormLabel';
import CustomSelect from 'src/components/forms/theme-elements/CustomSelect';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { UpdateFilter } from 'src/store/apps/crud/alarmTrigger';
import { defaultAlarmTriggerFilter } from 'src/store/apps/defaultForm';

const AlarmTriggerFilter = () => {
    const dispatch: AppDispatch = useDispatch();
    const [open, setOpen] = useState(false);
      const handleClickOpen = () => {
    setOpen(true);
  };
  const handleClose = () => {
    setOpen(false);
  };
  const alarmTriggerFilter = useSelector((state: RootState) => state.alarmTriggerReducer.alarmTriggerFilter);
  const [alarmTriggerFilterState, setAlarmTriggerFilterState] = useState(defaultAlarmTriggerFilter);

  const visitorData = useSelector((state: RootState) => state.visitorReducer.visitors);
  const visitorOptions = (visitorData ?? []).map((visitor) => ({
    id: visitor.id,
    name: visitor.name,
  }));

};

export default AlarmTriggerFilter;