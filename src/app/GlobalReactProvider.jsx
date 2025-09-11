// app/GlobalReactProvider.jsx
'use client';
import React from 'react';
import StoreProvider from '@/app/GlobalRedux/provider';
export default function GlobalReactProvider({ children }) {
  return <StoreProvider>{children}</StoreProvider>;
}
