import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  List,
  Typography,
} from '@mui/material';
import { useSelector, useDispatch, RootState } from 'src/store/Store';
import {
  deleteMember,
  fetchMemberDT,
  fetchMembers,
  memberType,
  SelectMember,
  UpdateFilter,
} from 'src/store/apps/crud/member';
import Scrollbar from 'src/components/custom-scroll/Scrollbar';
import TagListItem from './tagListItem';
import { defaultMemberFilter } from 'src/store/apps/defaultForm';

const TagList = () => {
  const [isManySelect, setIsManySelect] = useState(false);
  const [manySelectMembers, setManySelectMembers] = useState<memberType[]>([]);
  const memberFilter = useSelector((state: RootState) => state.memberReducer.memberFilter);
  const [loading, setLoading] = useState(false);

  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(UpdateFilter({...defaultMemberFilter, Length: 999}));
    setLoading(true);
    try {
      console.log('Fetching on Start');
      dispatch(fetchMemberDT({...defaultMemberFilter, Length: 999}));
    } catch (error) {
      console.error('Error fetching Member data:', error);
    }
    setTimeout(() => {
      setLoading(false);
    }, 500);
  }, [dispatch]);
  useEffect(() => {
    console.log('Fetching on Filter');
    dispatch(fetchMemberDT({...memberFilter, Length: 999}));
  }, [memberFilter, dispatch]);



  const members = useSelector((state: RootState) => state.memberReducer.members);

  const active = useSelector((state: RootState) => state.memberReducer.selectedMember);
  const [isChecked, setIsChecked] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const handleOpenDeleteDialog = () => {
    setDeleteDialogOpen(true);
  };

  // Close delete confirmation dialog
  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    handleCancelClick();
  };

  // Confirm delete action
  const handleConfirmDelete = () => {
    if (manySelectMembers.length > 0) {
      manySelectMembers.forEach((member) => {
        dispatch(deleteMember(member.id));
      });
    }
    handleCloseDeleteDialog();
    handleCancelClick();
  };

  const handleCancelClick = () => {
    setIsManySelect(false);
    setManySelectMembers([]);
  };
  const handleSelectAll = () => {
    setIsChecked(!isChecked);
    if (isChecked) {
      setManySelectMembers([]);
    } else {
      setManySelectMembers(members);
    }
  };

  return (
    <>
      <Box
        display="flex"
        flexDirection="row"
        justifyContent="content-between"
        alignItems="center"
        gap={1}
        sx={{ ml: 2 }}
      >
        {isManySelect ? (
          <>
            <Button
              variant="contained"
              color="primary"
              size="small"
              sx={{ minWidth: '80px', py: 0.5 }}
              onClick={() => handleCancelClick()}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              color="error"
              size="small"
              sx={{ minWidth: '80px', py: 0.5 }}
              onClick={() => handleOpenDeleteDialog()}
            >
              Delete
            </Button>
          </>
        ) : (
          <Button
            variant="contained"
            color="primary"
            size="small"
            sx={{ minWidth: '80px', py: 0.5 }}
            onClick={() => setIsManySelect(true)}
          >
            Select
          </Button>
        )}
      </Box>

      <List>
        <Box
          sx={{
            height: { lg: 'calc(100vh - 260px)', md: '100vh' },
            maxHeight: '800px',
            overflow: 'auto',
          }}
        >
          {isManySelect && (
            <>
              <Box
                mr="auto"
                display="flex"
                flexDirection="row"
                justifyContent="flex-end"
                alignItems="center"
                sx={{ mr: 2 }}
              >
                <Typography variant="body2" fontWeight={100}>
                  Select All
                </Typography>
                <Checkbox edge="end" checked={isChecked} onChange={handleSelectAll} />
              </Box>
            </>
          )}
          {members.map((member) => (
            <TagListItem
              key={member.id}
              active={member === active}
              member={member}
              manySelect={isManySelect}
              setManySelectMembers={setManySelectMembers}
              manySelectMembers={manySelectMembers}
              onTagClick={() => {
                dispatch(SelectMember(member.id));
              }}
            />
          ))}
        </Box>
      </List>
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>Are you sure you want to delete these members?</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} color="primary">
            Cancel
          </Button>
          <Button onClick={handleConfirmDelete} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default TagList;
