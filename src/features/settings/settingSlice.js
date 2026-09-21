import { createSlice } from "@reduxjs/toolkit";

const settingsSlice = createSlice({
    name: "settings",
    initialState: {
        data: [],
        fetched: false,
    },
    reducers: {
        setSettings(state, action) {
            state.data = action.payload;
            state.fetched = true;
        },
        clearSettings(state) {
            state.data = [];
            state.fetched = false;
        },
    },
});

export const { setSettings, clearSettings } = settingsSlice.actions;
export default settingsSlice.reducer;
