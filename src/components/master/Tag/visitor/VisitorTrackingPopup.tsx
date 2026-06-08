import React, { useState } from 'react';
import TrackingDetailPopup from 'src/components/dashboards/monitoring/Popup/TrackingDetailPopup'; // adjust path if needed
import { VisitorType } from 'src/store/apps/crud/visitor';

type VisitorTrackingPopupProps = {
  open: boolean;
  onClose: () => void;
  visitor: VisitorType;
};

const VisitorTrackingPopup: React.FC<VisitorTrackingPopupProps> = ({ open, onClose, visitor }) => {
  if (!visitor) return null;

  return (
    <TrackingDetailPopup
      bleNumber={visitor.bleCardNumber || ''}
      person={visitor}
      personId={visitor.id}
      openTrackDetail={open}
      setOpenTrackDetail={onClose}
      isVisitor={true}
    />
  );
};

export default VisitorTrackingPopup;
