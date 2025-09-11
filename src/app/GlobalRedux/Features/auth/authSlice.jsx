// app/GlobalRedux/Features/auth/authSlice.ts
'use client';
import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  isLoggedin: false,
  country:null,
  token:null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    login: (state) => {
      state.isLoggedin = true;
    },
    logout: (state) => {
      state.isLoggedin = false;
    },
    updateCountry: (state, action) => {
      state.country = action.payload; // Update country without changing isLoggedin
    },
    updateToken: (state, action) => {
      state.token = action.payload; // Update country without changing isLoggedin
    },
  },
});

export const { login, logout,updateCountry,updateToken } = authSlice.actions;
export default authSlice.reducer;