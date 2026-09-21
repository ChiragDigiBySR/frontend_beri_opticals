import { createSlice } from "@reduxjs/toolkit";

const employeeSlice = createSlice({
    name: "employees",
    initialState: {
        data: [],
        fetched: false,
    },
    reducers: {
        setEmployees(state, action) {
            state.data = action.payload;
            state.fetched = true;
        },
        clearEmployees(state) {
            state.data = [];
            state.fetched = false;
        },
    },
});

export const { setEmployees, clearEmployees } = employeeSlice.actions;
export default employeeSlice.reducer;
