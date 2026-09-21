import { createSlice } from "@reduxjs/toolkit";

const pageFieldSlice = createSlice({
    name: "pagefield",
    initialState: {
        data: [],
        fetched: false,
    },
    reducers: {
        setPageFields(state, action) {
            state.data = action.payload;
            state.fetched = true;
        },
        clearPageFields(state) {
            state.data = [];
            state.fetched = false;
        },
    },
});

export const { setPageFields, clearPageFields } = pageFieldSlice.actions;
export default pageFieldSlice.reducer;
