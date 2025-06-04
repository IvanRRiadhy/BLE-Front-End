import { useEffect, useState } from 'react';
import { useSelector, useDispatch, AppDispatch, AppState } from 'src/store/Store';
import Scrollbar from 'src/components/custom-scroll/Scrollbar';
import AddIcon from '@mui/icons-material/Add';
import { Box } from '@mui/system';
import {
  Alert,
  Divider,
  TextField,
  Typography,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  DialogContentText,
  IconButton,
} from '@mui/material';
import { useNavigate } from 'react-router';
import { nodeType, AddNode } from 'src/store/apps/rules/RulesNodes';

const blocks = [
  {
    name: 'Member',
    type: 'object',
  },
  {
    name: 'Visitor',
    type: 'object',
  },
  {
    name: 'Area',
    type: 'object',
  },
  {
    name: 'Time',
    type: 'object',
  },
  {
    name: 'and',
    type: 'Logic',
  },
  {
    name: 'or',
    type: 'Logic',
  },
  {
    name: 'if',
    type: 'Logic',
  },
  {
    name: 'Email Notification',
    type: 'Action',
  },
  {
    name: 'Push Notification',
    type: 'Action',
  },
  {
    name: 'SMS Notification',
    type: 'Action',
  },
  {
    name: 'Alarm',
    type: 'Action',
  },
  {
    name: 'Watchlist',
    type: 'Action',
  },
];

const RulesList = () => {
  const dispatch: AppDispatch = useDispatch();
  const handleOnClick = (name: string, type: string) => {
    dispatch(AddNode({ name, type }));
  };

  return (
    <>
      <Box p={3} px={2} display="flex" justifyContent="flex-start" alignItems="center">
        <Typography variant="h5" mb={2} fontWeight={700} textAlign="left">
          Rules
        </Typography>
      </Box>
      <Box>
        <Divider />
        <Scrollbar sx={{ height: '65vh', maxHeight: 'fit-content' }}>
          <Box sx={{ width: 260, background: '#f7f7f7', p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Object
            </Typography>
            {blocks
              .filter((block) => block.type === 'object') // Filter blocks with type "object"
              .map((block, index) => (
                <Button
                  key={index}
                  variant="contained"
                  fullWidth
                  onClick={() => handleOnClick(block.name, block.type)}
                  sx={{ mb: 1 }}
                >
                  {block.name}
                </Button>
              ))}
          </Box>
          <Box sx={{ width: 260, background: '#f7f7f7', p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Logical
            </Typography>
            {blocks
              .filter((block) => block.type === 'Logic') // Filter blocks with type "Action"
              .map((block, index) => (
                <Button
                  key={index}
                  variant="contained"
                  fullWidth
                  onClick={() => handleOnClick(block.name, block.type)}
                  sx={{ mb: 1 }}
                >
                  {block.name}
                </Button>
              ))}
          </Box>
          <Box sx={{ width: 260, background: '#f7f7f7', p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Action
            </Typography>
            {blocks
              .filter((block) => block.type === 'Action') // Filter blocks with type "Action"
              .map((block, index) => (
                <Button
                  key={index}
                  variant="contained"
                  fullWidth
                  onClick={() => handleOnClick(block.name, block.type)}
                  sx={{ mb: 1 }}
                >
                  {block.name}
                </Button>
              ))}
          </Box>
        </Scrollbar>
      </Box>
    </>
  );
};

export default RulesList;
