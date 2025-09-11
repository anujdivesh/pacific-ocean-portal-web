// offcanvasSlice.js
import { createSlice } from '@reduxjs/toolkit';

const offcanvasSlice = createSlice({
  name: 'offcanvas',
  initialState: {
    isVisible: false,
    currentId: null, // Add this to track the current item id
    selectedTabKey: 'tab4', // Track which tab is active in bottom offcanvas
  },
  reducers: {
    showoffCanvas: (state, action) => {
      state.isVisible = true;
      state.currentId = action.payload; // Set the current id
    },
    hideoffCanvas: (state) => {
      state.isVisible = false;
      state.currentId = null; // Reset the current id
    },
    setSelectedTab: (state, action) => {
      state.selectedTabKey = action.payload || 'tab4';
    },
  },
});

export const { showoffCanvas, hideoffCanvas, setSelectedTab } = offcanvasSlice.actions;
export default offcanvasSlice.reducer;