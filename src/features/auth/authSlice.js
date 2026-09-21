import { createSlice } from "@reduxjs/toolkit";

const authSlice = createSlice({
    name: "auth",
    initialState: {
        user: null,
        store: null,
        loading: true,
    },
    reducers: {
        setUser(state, action) {
            state.user = action.payload;
        },
        setStore(state, action) {
            state.store = action.payload;
        },
        setAuthLoading(state, action) {
            state.loading = action.payload;
        },
        logout(state) {
            state.user = null;
            state.store = null;
            state.loading = false;
            localStorage.removeItem("token");
        },
    },
});

export const { setUser, setStore, setAuthLoading, logout } = authSlice.actions;
export default authSlice.reducer;
