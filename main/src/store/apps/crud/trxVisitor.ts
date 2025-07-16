import axiosServices from "../../../utils/axios";
import { createSlice } from "@reduxjs/toolkit";
import { AppDispatch } from "src/store/Store";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createAsyncThunk } from "@reduxjs/toolkit";

const API_URL = "/api/TrxVisitor/";

export type trxVisitorType = {
    id: number,
    checkin_at: string,
    checkout_at: string,
    deny_at: string,
    block_at: string,
    unblock_at: string,
    checkin_by: string,
    checkout_by: string,
    deny_by: string,
    deny_reason: string,
    block_by: string,
    block_reason: string,
    visitor_status: string,
    invitation_created_at: string,
    visitor_group_code: string,
    visitor_number: string,
    vehicle_plate_number: string,
    remarks: string,
    site_id: string,
    parking_id: string,
    visitor_id: string,
}