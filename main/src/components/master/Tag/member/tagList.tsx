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
  Skeleton,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Stack,
} from '@mui/material';
import { useSelector, useDispatch, RootState } from 'src/store/Store';
import { SelectMember, UpdateFilter } from 'src/store/apps/crud/member';
import Scrollbar from 'src/components/custom-scroll/Scrollbar';
import TagListItem from './tagListItem';
import { defaultMemberFilter } from 'src/store/apps/defaultForm';
import { memberType } from 'src/store/apps/crud/member';
import { useMemberList, useDeleteMember } from 'src/hooks/useMember';

const SKELETON_ROWS = 5;

const TagList = () => {
  const dispatch = useDispatch();

  // 🔹 Redux filter and selected state
  const memberFilter = useSelector((state: RootState) => state.memberReducer.memberFilter);
  const selectedMemberId = useSelector((state: RootState) => state.memberReducer.selectedMemberId);


  // 🔹 React Query fetching
  const { data, isLoading, isFetching, isFetched } = useMemberList({
    ...memberFilter,
    Length: 0, // show all for side list
  });
  
  const deleteMutation = useDeleteMember();

  // 🔹 State for bulk select
  const [isManySelect, setIsManySelect] = useState(false);
  const [manySelectMembers, setManySelectMembers] = useState<memberType[]>([]);
  const [isChecked, setIsChecked] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // 🔹 Derived members list
  const members = data?.data ?? [];
const active = members?.find((member: memberType) => member.id === selectedMemberId);
  // ---------------------------------------------------------------------------
  // ✅ Initialization on mount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    // Reset filter on mount (only once)
    dispatch(UpdateFilter({ ...defaultMemberFilter, Length: 0 }));
  }, [dispatch]);

  // ---------------------------------------------------------------------------
  // ✅ Delete Handlers
  // ---------------------------------------------------------------------------
  const handleOpenDeleteDialog = () => setDeleteDialogOpen(true);
  const handleCloseDeleteDialog = () => setDeleteDialogOpen(false);

  const handleConfirmDelete = async () => {
    try {
      for (const member of manySelectMembers) {
        await deleteMutation.mutateAsync(member.id);
      }
      setManySelectMembers([]);
      setIsManySelect(false);
    } catch (err) {
      console.error('Error deleting members:', err);
    }
    handleCloseDeleteDialog();
  };

  // ---------------------------------------------------------------------------
  // ✅ Bulk selection
  // ---------------------------------------------------------------------------
  const handleSelectAll = () => {
    setIsChecked(!isChecked);
    setManySelectMembers(!isChecked ? members : []);
  };

  const handleCancelClick = () => {
    setIsManySelect(false);
    setManySelectMembers([]);
  };

  // ---------------------------------------------------------------------------
  // ✅ Render Skeleton Items
  // ---------------------------------------------------------------------------
  const renderSkeletonItems = (count: number) => (
    <>
      {Array.from({ length: count }).map((_, idx) => (
        <ListItemButton key={`skeleton-${idx}`} sx={{ mb: 1 }}>
          <ListItemAvatar>
            <Skeleton variant="circular" width={40} height={40} />
          </ListItemAvatar>
          <ListItemText>
            <Stack direction="row" gap="10px" alignItems="center">
              <Box mr="auto">
                <Skeleton variant="text" width={160} height={22} />
                <Skeleton variant="text" width={120} height={18} />
                <Skeleton variant="text" width={100} height={18} />
              </Box>
            </Stack>
          </ListItemText>
        </ListItemButton>
      ))}
    </>
  );

  // ---------------------------------------------------------------------------
  // ✅ UI Rendering
  // ---------------------------------------------------------------------------
  return (
    <>
      <Box
        display="flex"
        flexDirection="row"
        justifyContent="space-between"
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
              onClick={handleCancelClick}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              color="error"
              size="small"
              sx={{ minWidth: '80px', py: 0.5 }}
              onClick={handleOpenDeleteDialog}
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
        <Scrollbar sx={{}}>
          {isManySelect && (
            <Box
              display="flex"
              justifyContent="flex-end"
              alignItems="center"
              sx={{ mr: 2 }}
            >
              <Typography variant="body2" fontWeight={100}>
                Select All
              </Typography>
              <Checkbox edge="end" checked={isChecked} onChange={handleSelectAll} />
            </Box>
          )}

          {isLoading || isFetching
            ? renderSkeletonItems(SKELETON_ROWS)
            : members.map((member) => (
                <TagListItem
                  key={member.id}
                  active={member === active}
                  member={member}
                  manySelect={isManySelect}
                  setManySelectMembers={setManySelectMembers}
                  manySelectMembers={manySelectMembers}
                  onTagClick={() => {dispatch(SelectMember(member.id))}}
                />
              ))}
        </Scrollbar>
      </List>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete these members?
          </DialogContentText>
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
