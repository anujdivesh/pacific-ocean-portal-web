'use client';
import { createSlice } from '@reduxjs/toolkit'

export const countrySlice = createSlice({
  name: 'country',
  initialState: {
    short_name: 1,
    long_name: 'Pacific Islands',
    west_bound_longitude: 100.0,
    east_bound_longitude: 300.0,
    south_bound_latitude: -45.0,
    north_bound_latitude: 45.0,
  },
  reducers: {
    setShortName(state, action) {
        state.short_name = action.payload;
      },
    setLongName(state, action) {
        state.long_name = action.payload;
      },
    setWestBoundLongitude(state, action) {
        state.west_bound_longitude = action.payload;
      },
      setEastBoundLongitude(state, action) {
        state.east_bound_longitude = action.payload;
      },
      setSouthBoundLatitude(state, action) {
        state.south_bound_latitude = action.payload;
      },
      setNorthBoundLatitude(state, action) {
        state.north_bound_latitude = action.payload;
      },
  },
})

// Action creators are generated for each case reducer function
export const { setShortName, setLongName, setWestBoundLongitude, setEastBoundLongitude, setSouthBoundLatitude, setNorthBoundLatitude } = countrySlice.actions

export default countrySlice.reducer