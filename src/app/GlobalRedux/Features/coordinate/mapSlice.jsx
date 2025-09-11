'use client';

import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  coordinates: {}, // { [id]: { x, y, sizex, sizey, bbox, station } }
  // other state...
};

const mapSlice = createSlice({
  name: 'map',
  initialState,
  reducers: {
    setCoordinates: (state, action) => {
      const { id, ...coords } = action.payload;
      if (id) {
        state.coordinates[id] = coords;
      }
    },
    // other reducers...
  },
});

export const { setCoordinates } = mapSlice.actions;

export default mapSlice.reducer;
