import { useEffect, useState } from 'react';
import {
  Box,
  Button,
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
  IconButton,
  Tooltip,
  CircularProgress,
  ListItem,
} from '@mui/material';
import {
  IconTrash,
  IconX,
  IconCheck,
  IconCircleCheck,
  IconCircleX,
} from '@tabler/icons-react';
import { useSelector, useDispatch, RootState } from 'src/store/Store';
import { SelectMemberId, UpdateFilter, memberType } from 'src/store/apps/crud/member';
import TagListItem from './tagListItem';
import { defaultMemberFilter } from 'src/store/apps/defaultForm';
import { useInfiniteMemberList, useDeleteMember } from 'src/hooks/useMember';
import { useInView } from 'react-intersection-observer';
import toast from 'react-hot-toast';

const SKELETON_ROWS = 5;

const TagList = () => {
  const dispatch = useDispatch();

  // 🔹 Redux filter and selected state
  const memberFilter = useSelector((state: RootState) => state.memberReducer.memberFilter);
  const selectedMemberId = useSelector((state: RootState) => state.memberReducer.selectedMemberId);

  // 🔹 React Query fetching
  const {
    data,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteMemberList(memberFilter, 50);

  const { ref, inView } = useInView();

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const deleteMutation = useDeleteMember();

  // 🔹 State for bulk select & batch delete
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteItems, setDeleteItems] = useState<
    Array<{
      id: string;
      name: string;
      bleCardNumber?: string;
      personId?: string;
      selected: boolean;
      status: 'idle' | 'loading' | 'success' | 'error';
      errorMessage?: string;
    }>
  >([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDone, setIsDeleteDone] = useState(false);

  // 🔹 Derived members list
  const members = data?.pages.flatMap((page) => page.data) ?? [];
  const active = members?.find((member: memberType) => member.id === selectedMemberId);

  useEffect(() => {
    dispatch(UpdateFilter({ ...defaultMemberFilter }));
  }, [dispatch]);

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // 🔹 Delete Handlers
  const handleOpenDeleteDialog = (ids: string[] | string) => {
    const idList = Array.isArray(ids) ? ids : [ids];
    const items = idList.map((id) => {
      const m = members.find((mem) => mem.id === id);
      return {
        id,
        name: m?.name || `Member (${id})`,
        bleCardNumber: m?.bleCardNumber,
        personId: m?.personId,
        selected: true,
        status: 'idle' as const,
      };
    });
    setDeleteItems(items);
    setIsDeleting(false);
    setIsDeleteDone(false);
    setDeleteDialogOpen(true);
  };

  const handleToggleItemSelect = (id: string) => {
    if (isDeleting || isDeleteDone) return;
    setDeleteItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, selected: !item.selected } : item,
      ),
    );
  };

  const handleCloseDeleteDialog = () => {
    if (isDeleting) return;
    setDeleteDialogOpen(false);
    setDeleteItems([]);
    setIsDeleteDone(false);
  };

  const handleConfirmDelete = async () => {
    const activeItems = deleteItems.filter((item) => item.selected);
    if (activeItems.length === 0) {
      toast.error('No items selected for deletion');
      return;
    }

    setIsDeleting(true);
    let successCount = 0;
    let failed = false;
    const successfullyDeletedIds: string[] = [];

    for (const item of deleteItems) {
      if (!item.selected) continue;

      setDeleteItems((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, status: 'loading' } : it)),
      );

      try {
        await deleteMutation.mutateAsync(item.id);
        successfullyDeletedIds.push(item.id);
        successCount++;

        if (selectedMemberId === item.id) {
          dispatch(SelectMemberId(''));
        }

        setDeleteItems((prev) =>
          prev.map((it) => (it.id === item.id ? { ...it, status: 'success' } : it)),
        );
      } catch (error: any) {
        failed = true;
        setDeleteItems((prev) =>
          prev.map((it) =>
            it.id === item.id
              ? { ...it, status: 'error', errorMessage: error?.message || 'Failed to delete' }
              : it,
          ),
        );
        toast.error(`Failed to delete "${item.name}". Stopped remaining deletions.`);
        break;
      }
    }

    if (successfullyDeletedIds.length > 0) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        successfullyDeletedIds.forEach((id) => next.delete(id));
        return next;
      });
      await refetch();
    }

    setIsDeleting(false);
    setIsDeleteDone(true);

    if (!failed && successCount > 0) {
      toast.success(`Successfully deleted ${successCount} member(s)`);
    }
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

  return (
    <Box display="flex" flexDirection="column" height="82vh">
      {/* --- Bulk Action Bar --- */}
      {selectedIds.size > 0 && (
        <Box
          sx={{
            backgroundColor: 'primary.main',
            color: 'white',
            px: 2,
            py: 1,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderRadius: 1,
            mx: 2,
            mb: 1,
          }}
        >
          <Typography variant="subtitle2" color="white" fontWeight={600}>
            {selectedIds.size} selected
          </Typography>
          <Box display="flex" gap={0.5}>
            <Tooltip title="Multi-Delete">
              <IconButton
                size="small"
                onClick={() => handleOpenDeleteDialog(Array.from(selectedIds))}
                sx={{ color: 'white' }}
              >
                <IconTrash size={18} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Cancel">
              <IconButton
                size="small"
                onClick={() => setSelectedIds(new Set())}
                sx={{ color: 'white' }}
              >
                <IconX size={18} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      )}

      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        <List sx={{ px: 0 }}>
          {isLoading
            ? renderSkeletonItems(SKELETON_ROWS)
            : members.map((member) => (
                <TagListItem
                  key={member.id}
                  active={member === active}
                  member={member}
                  isSelected={selectedIds.has(member.id)}
                  onToggleSelect={handleToggleSelect}
                  onTagClick={() => {
                    dispatch(SelectMemberId(member.id));
                  }}
                />
              ))}

          {isFetchingNextPage && renderSkeletonItems(3)}

          {hasNextPage && <div ref={ref} style={{ height: '20px' }} />}
        </List>
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={!isDeleting ? handleCloseDeleteDialog : undefined}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: '16px' },
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'error.main' }}>
          <IconTrash size={22} color="#fa896b" />
          <Typography variant="h5" fontWeight="bold">
            Confirm Deletion
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          <DialogContentText sx={{ mb: 2, color: 'text.primary' }}>
            Are you sure you want to delete the following item(s)?
          </DialogContentText>
          <List sx={{ maxHeight: 320, overflow: 'auto', p: 0 }}>
            {deleteItems.map((item, index) => (
              <ListItem
                key={item.id}
                divider={index < deleteItems.length - 1}
                sx={{
                  py: 1,
                  px: 1.5,
                  borderRadius: 1,
                  mb: 0.5,
                  bgcolor: !item.selected ? 'action.hover' : 'background.paper',
                  opacity: !item.selected ? 0.6 : 1,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Box display="flex" alignItems="center" gap={1.5} sx={{ overflow: 'hidden' }}>
                  <Typography
                    variant="subtitle1"
                    sx={{
                      fontWeight: 600,
                      textDecoration: !item.selected ? 'line-through' : 'none',
                      color:
                        item.status === 'error'
                          ? 'error.main'
                          : item.status === 'success'
                          ? 'success.main'
                          : 'text.primary',
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                      overflow: 'hidden',
                    }}
                  >
                    {item.name}
                  </Typography>
                  {item.bleCardNumber && (
                    <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                      ({item.bleCardNumber})
                    </Typography>
                  )}
                  {!item.bleCardNumber && item.personId && (
                    <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                      ({item.personId})
                    </Typography>
                  )}
                </Box>

                <Box display="flex" alignItems="center" sx={{ minWidth: 36, justifyContent: 'flex-end' }}>
                  {item.status === 'loading' ? (
                    <CircularProgress size={20} color="primary" />
                  ) : item.status === 'success' ? (
                    <Tooltip title="Successfully deleted">
                      <Box display="flex" alignItems="center" color="success.main">
                        <IconCircleCheck size={24} color="#13deb9" />
                      </Box>
                    </Tooltip>
                  ) : item.status === 'error' ? (
                    <Tooltip title={item.errorMessage || 'Failed to delete'}>
                      <IconButton size="small" color="error">
                        <IconCircleX size={24} color="#fa896b" />
                      </IconButton>
                    </Tooltip>
                  ) : (
                    <Tooltip
                      title={
                        item.selected
                          ? 'Click to exclude from deletion'
                          : 'Click to include in deletion'
                      }
                    >
                      <IconButton
                        size="small"
                        disabled={isDeleting || isDeleteDone}
                        onClick={() => handleToggleItemSelect(item.id)}
                        color={item.selected ? 'primary' : 'default'}
                      >
                        {item.selected ? (
                          <IconCheck size={20} color="#5d87ff" />
                        ) : (
                          <IconX size={20} color="#9e9e9e" />
                        )}
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              </ListItem>
            ))}
          </List>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleCloseDeleteDialog} disabled={isDeleting}>
            {isDeleteDone ? 'Close' : 'Cancel'}
          </Button>
          {!isDeleteDone && (
            <Button
              onClick={handleConfirmDelete}
              color="error"
              variant="contained"
              disabled={isDeleting || deleteItems.filter((i) => i.selected).length === 0}
              startIcon={isDeleting ? <CircularProgress size={18} color="inherit" /> : undefined}
            >
              {isDeleting
                ? 'Deleting...'
                : `Delete (${deleteItems.filter((i) => i.selected).length})`}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TagList;

