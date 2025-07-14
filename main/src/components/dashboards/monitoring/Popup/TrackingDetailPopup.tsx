import {
  Avatar,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid2 as Grid,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BuildingType, fetchBuildings } from 'src/store/apps/crud/building';
import { fetchFloors, floorType } from 'src/store/apps/crud/floor';
import { fetchMaskedAreas, MaskedAreaType } from 'src/store/apps/crud/maskedArea';
import { memberType } from 'src/store/apps/crud/member';
import { fetchTrackingTrans, trackingTransType } from 'src/store/apps/crud/trackingTrans';
import { visitorType } from 'src/store/apps/crud/visitor';
import { RootState, useDispatch, useSelector } from 'src/store/Store';

type TrackingDetailPopupProps = {
  bleNumber: string;
  person: memberType | visitorType,
  personId: string;
  openTrackDetail: boolean;
  setOpenTrackDetail: React.Dispatch<React.SetStateAction<boolean>>
}

const BASE_URL = 'http://192.168.1.116:5000';

const TrackingDetailPopup = (
  {
    bleNumber,
    person,
    personId,
    openTrackDetail,
    setOpenTrackDetail,
  }: TrackingDetailPopupProps
) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  useEffect(() => {
    dispatch(fetchTrackingTrans());
    dispatch(fetchFloors());
    dispatch(fetchMaskedAreas());
    dispatch(fetchBuildings());
  }, [dispatch]);

  const trackingData : trackingTransType[] = useSelector((state: RootState) => state.trackingTransReducer.trackingTrans);
  const maskedAreaData : MaskedAreaType[] = useSelector((state: RootState) => state.maskedAreaReducer.maskedAreas);
  const floorData : floorType[] = useSelector((state: RootState) => state.floorReducer.floors);
  const buildingData: BuildingType[] = useSelector((state: RootState) => state.buildingReducer.buildings);
  const trackingList : trackingTransType[] = trackingData.filter((track: trackingTransType) => track.cardId === bleNumber);
  const maskedAreaList : MaskedAreaType[] = trackingList.flatMap((track) => track.floorplanMaskedArea||[]);
  const floorList: floorType[] = maskedAreaList.flatMap((area) => area.floor||[]);
  const buildingList: BuildingType[] = buildingData.filter((building) => floorList.some((floor) => floor.buildingId === building.id));
  const activeTrack: trackingTransType | undefined | null = useSelector((state: RootState) => state.trackingTransReducer.selectedTrackingTrans);
  const [activeArea, setActiveArea] = useState<MaskedAreaType | null>(null);
  const [activeFloor, setActiveFloor] = useState<floorType | null>(null);
  const [activeBuilding, setActiveBuilding] = useState<BuildingType | null>(null);
  const [floorImage, setFloorImage] = useState<string>('');

  useEffect(() => {
    if (activeTrack) {
      const activeArea = activeTrack.floorplanMaskedArea;
      const floor = activeArea?.floor;
      const building = buildingList.find((b) => b.id === floor?.buildingId);
      setActiveArea(activeArea || null);
      setActiveFloor(floor || null);
      setActiveBuilding(building || null);
      setFloorImage(floor?.floorImage || '');
    }
  }, [activeTrack, maskedAreaData, floorData]);
  
  return (
    <Dialog
      open={openTrackDetail}
      onClose={() => {setOpenTrackDetail(false)}}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
      maxWidth="xl"
      fullWidth
    >
      <DialogTitle id="alert-dialog-title">{person.name}</DialogTitle>
    </Dialog>
  );

};


export default TrackingDetailPopup;