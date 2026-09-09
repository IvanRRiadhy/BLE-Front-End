import React from 'react';
import CompactTrackingDetailModal from './CompactTrackingDetailModal';
import { memberType } from 'src/store/apps/crud/member';
import { VisitorType } from 'src/store/apps/crud/visitor';

type TrackingDetailPopupProps = {
  bleNumber: string;
  person: memberType | VisitorType;
  personId: string;
  openTrackDetail: boolean;
  setOpenTrackDetail: React.Dispatch<React.SetStateAction<boolean>>;
  isSecurity?: boolean;
  isMember?: boolean;
  isVisitor?: boolean;
};

const TrackingDetailPopup = ({
  bleNumber,
  person,
  personId,
  openTrackDetail,
  setOpenTrackDetail,
  isSecurity = false,
  isVisitor = false,
}: TrackingDetailPopupProps) => {
  const computedPersonType = isSecurity ? 'Security' : isVisitor ? 'Visitor' : 'Member';

  return (
    <CompactTrackingDetailModal
      open={openTrackDetail}
      onClose={() => setOpenTrackDetail(false)}
      personId={personId}
      personName={person?.name}
      personType={computedPersonType}
      faceImage={person?.faceImage}
      bleNumber={bleNumber}
      cardNumber={person?.cardNumber}
    />
  );
};

export default TrackingDetailPopup;
