// components/shared/ConfirmDialog.tsx
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from "@mui/material";

type ConfirmDialogProps = {
  open: boolean;
  title?: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
};

const ConfirmDialog = ({ open, title = "Confirm", message, onConfirm, onCancel }: ConfirmDialogProps) => {
  return (
    <Dialog open={open} onClose={onCancel}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Typography>{message}</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} color="secondary">No</Button>
        <Button onClick={onConfirm} color="primary" variant="contained">Yes</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDialog;
